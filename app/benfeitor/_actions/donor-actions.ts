"use server";

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { donorMonthlyInstructionSends, donorPaymentLedger, donorPledges } from "@/lib/db/schema";
import { firstMonthlyOccurrence } from "@/lib/donor-payment-ledger";
import { saoPauloDate } from "@/lib/donor-recurrence";
import { getStorage } from "@/lib/storage";
import { formatCPF } from "@/lib/validations/cpf";
import { sendDonorWelcomeEmail } from "@/lib/email/send-donor-welcome";
import { monthlyInstructionsProviderKey } from "@/lib/email/donor-monthly-instructions-template";
import { sendDonorMonthlyInstructions } from "@/lib/email/send-donor-monthly-instructions";
import {
  donorPledgeSchema,
  type DonorPledge,
} from "@/lib/validations/donor-schema";

export async function registerDonorPledge(
  input: DonorPledge
): Promise<{ success: boolean; errors?: Record<string, string[]> }> {
  const result = donorPledgeSchema.safeParse(input);

  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".") || "_form";
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    return { success: false, errors: fieldErrors };
  }

  const data = result.data;
  const isUnica = data.frequencia === "unica";
  const pledgeId = randomUUID();
  const storage = getStorage();

  let finalReciboPath: string | null = null;
  let finalReciboNome: string | null = null;
  let pendingReciboPath: string | null = null;

  if (isUnica) {
    if (!data.recibo_path?.startsWith("pending/")) {
      return {
        success: false,
        errors: { recibo_path: ["Arquivo de recibo inválido. Envie novamente."] },
      };
    }

    pendingReciboPath = data.recibo_path;
    const filename = data.recibo_path.split("/").pop() || "recibo";
    finalReciboPath = `donors/${pledgeId}/recibo/${filename}`;
    finalReciboNome = data.recibo_nome || filename;

    try {
      await storage.move(data.recibo_path, finalReciboPath);
    } catch {
      return {
        success: false,
        errors: { _form: ["Erro ao registrar sua doação. Tente novamente."] },
      };
    }
  }

  try {
    const registeredAt = new Date().toISOString();
    const pledgeValues = {
      id: pledgeId,
      nome: data.nome,
      cpf: formatCPF(data.cpf),
      email: data.email.trim(),
      telefone: data.telefone || null,
      endereco: data.endereco,
      cep: data.cep,
      priorado_capela: data.priorado_capela,
      residence_city: data.residence_city,
      residence_state: data.residence_state,
      residence_source: "confirmed",
      frequencia: data.frequencia,
      duracao: data.frequencia === "mensal" ? data.duracao ?? null : null,
      dia_vencimento: isUnica ? null : data.dia_vencimento!,
      valor: data.valor,
      meio_pagamento: null,
      data_pagamento: isUnica ? data.data_pagamento || null : null,
      lembrete_canal:
        data.frequencia === "mensal" && data.lembrete_canal === "email"
          ? "email"
          : null,
      recibo_path: finalReciboPath,
      recibo_nome: finalReciboNome,
      observacoes: data.observacoes || null,
      created_at: registeredAt,
    } satisfies typeof donorPledges.$inferInsert;

    await db.transaction(async (tx) => {
      await tx.insert(donorPledges).values(pledgeValues);
      if (isUnica) {
        const paymentDate = pledgeValues.data_pagamento ?? saoPauloDate(new Date(registeredAt));
        await tx.insert(donorPaymentLedger).values({
          pledge_id: pledgeId,
          competencia: paymentDate.slice(0, 7),
          due_date: paymentDate,
          expected_value: data.valor,
          receipt_path: finalReciboPath,
          receipt_name: finalReciboNome,
          receipt_uploaded_at: registeredAt,
        });
      }
      if (!isUnica) {
        const occurrence = firstMonthlyOccurrence(pledgeValues);
        if (!occurrence) throw new Error("Invalid monthly recurrence");
        await tx.insert(donorPaymentLedger).values({
          pledge_id: pledgeId,
          competencia: occurrence.competence,
          due_date: occurrence.dueDate,
          expected_value: data.valor,
        });
        await tx.insert(donorMonthlyInstructionSends).values({
          pledge_id: pledgeId,
          generation: 1,
          receipt_competencia: occurrence.competence,
          status: "pending",
          provider_idempotency_key: monthlyInstructionsProviderKey(pledgeId, 1),
        });
      }
    });
  } catch {
    console.error("[registerDonorPledge] falha ao salvar cadastro.");

    if (finalReciboPath && pendingReciboPath) {
      try {
        await storage.move(finalReciboPath, pendingReciboPath);
      } catch {
        // Preferível deixar o recibo em donors/ órfão a perdê-lo.
      }
    }

    return {
      success: false,
      errors: { _form: ["Erro ao registrar sua doação. Tente novamente."] },
    };
  }

  if (!isUnica) {
    try {
      const instructions = await sendDonorMonthlyInstructions(pledgeId);
      if (instructions.status === "failed" || instructions.status === "uncertain") {
        console.error("[registerDonorPledge] instruções mensais não confirmadas.");
      }
    } catch {
      // A tentativa pendente continua visível para recuperação administrativa.
      console.error("[registerDonorPledge] instruções mensais não confirmadas.");
    }
  }

  try {
    const emailResult = await sendDonorWelcomeEmail({ id: pledgeId, email: data.email.trim() });
    if (emailResult.status === "failed") {
      console.error("[registerDonorPledge] e-mail de boas-vindas não enviado.");
    }
  } catch {
    // O cadastro já foi salvo. O admin poderá reenviar o e-mail pendente.
    console.error("[registerDonorPledge] e-mail de boas-vindas não enviado.");
  }

  return { success: true };
}
