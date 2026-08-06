"use server";

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { donorPledges } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage";
import { formatCPF } from "@/lib/validations/cpf";
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
    await db.insert(donorPledges).values({
      id: pledgeId,
      nome: data.nome,
      cpf: formatCPF(data.cpf),
      email: data.email,
      telefone: data.telefone || null,
      endereco: data.endereco,
      cep: data.cep,
      priorado_capela: data.priorado_capela,
      frequencia: data.frequencia,
      duracao: data.frequencia === "mensal" ? data.duracao ?? null : null,
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
    });
  } catch (error) {
    console.error(
      "[registerDonorPledge] falha ao salvar:",
      error instanceof Error ? error.message : error
    );

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

  return { success: true };
}
