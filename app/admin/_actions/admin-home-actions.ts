"use server";

import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { donorPaymentLedger, schoolYears } from "@/lib/db/schema";
import { hasMonthlyReceipt } from "@/lib/donor-payment-ledger";
import { saoPauloDate } from "@/lib/donor-recurrence";

export type AdminHomeSummary = {
  schoolYear: { nome: string } | null;
  applications: { total: number; pendente: number; aprovada: number; rejeitada: number };
  donors: { total: number; mensal: number; unica: number; monthlyAmount: number; pendingWelcome: number };
  payments: { competencia: string; expectedAmount: number; count: number; withReceipt: number };
};

/** Competência corrente no fuso de São Paulo (`AAAA-MM`). */
function currentCompetencia(): string {
  return saoPauloDate(new Date()).slice(0, 7);
}

/**
 * Resumo do Início e contadores do menu. Somente leitura; erros de banco
 * voltam em `error` para a página exibir um aviso em vez de quebrar.
 */
export async function getAdminHomeSummary(): Promise<{ data: AdminHomeSummary | null; error?: string }> {
  await requireStaff();

  try {
    const competencia = currentCompetencia();
    const [schoolYear, applications, donors, ledger] = await Promise.all([
      db.query.schoolYears.findFirst({
        columns: { nome: true },
        where: eq(schoolYears.ativo, true),
      }),
      db.query.applications.findMany({ columns: { status: true } }),
      db.query.donorPledges.findMany({
        columns: { frequencia: true, valor: true, welcome_email_sent_at: true },
      }),
      db.query.donorPaymentLedger.findMany({
        columns: {
          expected_value: true,
          receipt_path: true,
          receipt_name: true,
          receipt_uploaded_at: true,
        },
        where: eq(donorPaymentLedger.competencia, competencia),
      }),
    ]);

    const countStatus = (status: string) => applications.filter((row) => row.status === status).length;
    const monthly = donors.filter((row) => row.frequencia === "mensal");

    return {
      data: {
        schoolYear: schoolYear ? { nome: schoolYear.nome } : null,
        applications: {
          total: applications.length,
          pendente: countStatus("pendente"),
          aprovada: countStatus("aprovada"),
          rejeitada: countStatus("rejeitada"),
        },
        donors: {
          total: donors.length,
          mensal: monthly.length,
          unica: donors.length - monthly.length,
          monthlyAmount: monthly.reduce((sum, row) => sum + Number(row.valor), 0),
          pendingWelcome: donors.filter((row) => !row.welcome_email_sent_at).length,
        },
        payments: {
          competencia,
          expectedAmount: ledger.reduce((sum, row) => sum + Number(row.expected_value), 0),
          count: ledger.length,
          withReceipt: ledger.filter((row) => hasMonthlyReceipt(row)).length,
        },
      },
    };
  } catch (error) {
    console.error("Erro ao carregar o resumo do painel:", error);
    return { data: null, error: "Não foi possível carregar o resumo." };
  }
}
