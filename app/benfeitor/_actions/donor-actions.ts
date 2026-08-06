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

  if (!data.recibo_path.startsWith("pending/")) {
    return {
      success: false,
      errors: { recibo_path: ["Arquivo de recibo inválido. Envie novamente."] },
    };
  }

  const pledgeId = randomUUID();
  const filename = data.recibo_path.split("/").pop() || "recibo";
  const finalPath = `donors/${pledgeId}/recibo/${filename}`;
  const storage = getStorage();

  try {
    await storage.move(data.recibo_path, finalPath);
  } catch {
    return {
      success: false,
      errors: { _form: ["Erro ao registrar sua doação. Tente novamente."] },
    };
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
      frequencia: data.frequencia,
      duracao: data.frequencia === "mensal" ? data.duracao ?? null : null,
      valor: data.valor,
      meio_pagamento: null,
      data_pagamento: data.data_pagamento || null,
      lembrete_canal: data.lembrete_canal || null,
      recibo_path: finalPath,
      recibo_nome: data.recibo_nome,
      observacoes: data.observacoes || null,
    });
  } catch (error) {
    console.error(
      "[registerDonorPledge] falha ao salvar:",
      error instanceof Error ? error.message : error
    );

    // Devolve o recibo para pending/ para que o reenvio do formulário
    // (que referencia o caminho original) continue funcionando.
    try {
      await storage.move(finalPath, data.recibo_path);
    } catch {
      // Se nem o move de volta funcionar, o arquivo fica em donors/ órfão —
      // preferível a perder o recibo.
    }

    return {
      success: false,
      errors: { _form: ["Erro ao registrar sua doação. Tente novamente."] },
    };
  }

  return { success: true };
}
