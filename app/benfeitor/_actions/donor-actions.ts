"use server";

import { db } from "@/lib/db";
import { donorPledges } from "@/lib/db/schema";
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

  try {
    await db.insert(donorPledges).values({
      nome: data.nome,
      cpf: formatCPF(data.cpf),
      email: data.email,
      telefone: data.telefone || null,
      frequencia: data.frequencia,
      duracao: data.frequencia === "mensal" ? data.duracao ?? null : null,
      valor: data.valor,
      meio_pagamento: data.meio_pagamento,
      data_pagamento: data.data_pagamento || null,
      lembrete_canal: data.lembrete_canal || null,
      observacoes: data.observacoes || null,
    });
  } catch {
    return {
      success: false,
      errors: { _form: ["Erro ao registrar sua doação. Tente novamente."] },
    };
  }

  return { success: true };
}
