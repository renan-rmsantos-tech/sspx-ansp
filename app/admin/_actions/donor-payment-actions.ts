"use server";

import { asc, eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { donorPaymentLedger, donorPledges } from "@/lib/db/schema";

export type MonthlyPaymentRow = {
  id: string;
  pledge_id: string;
  nome: string;
  competencia: string;
  due_date: string;
  expected_value: number;
  receipt_path: string | null;
  receipt_name: string | null;
  receipt_uploaded_at: string | null;
};

export type MonthlyPayments = { competencia: string; rows: MonthlyPaymentRow[] };

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Livro mensal de uma competência (`AAAA-MM`) com o nome do benfeitor.
 * Somente leitura: o valor esperado e o comprovante são snapshots do livro;
 * não há estado de conferência bancária. Linhas cujo cadastro não existe
 * mais são omitidas.
 */
export async function getMonthlyPayments(
  month: string
): Promise<{ data: MonthlyPayments | null; error?: string }> {
  await requireAdmin();
  if (!MONTH_PATTERN.test(month)) return { data: null, error: "Mês inválido." };

  try {
    const ledger = await db.query.donorPaymentLedger.findMany({
      columns: {
        id: true,
        pledge_id: true,
        competencia: true,
        due_date: true,
        expected_value: true,
        receipt_path: true,
        receipt_name: true,
        receipt_uploaded_at: true,
      },
      where: eq(donorPaymentLedger.competencia, month),
      orderBy: asc(donorPaymentLedger.due_date),
    });

    const pledgeIds = [...new Set(ledger.map((row) => row.pledge_id))];
    const pledges = pledgeIds.length
      ? await db.query.donorPledges.findMany({
          columns: { id: true, nome: true },
          where: inArray(donorPledges.id, pledgeIds),
        })
      : [];
    const nameById = new Map(pledges.map((pledge) => [pledge.id, pledge.nome]));

    const rows = ledger
      .flatMap((row): MonthlyPaymentRow[] => {
        const nome = nameById.get(row.pledge_id);
        if (nome === undefined) return [];
        return [{
          id: row.id,
          pledge_id: row.pledge_id,
          nome,
          competencia: row.competencia,
          due_date: row.due_date,
          expected_value: Number(row.expected_value),
          receipt_path: row.receipt_path,
          receipt_name: row.receipt_name,
          receipt_uploaded_at: row.receipt_uploaded_at,
        }];
      })
      .sort((a, b) => a.due_date.localeCompare(b.due_date) || a.nome.localeCompare(b.nome, "pt-BR"));

    return { data: { competencia: month, rows } };
  } catch (error) {
    console.error("Erro ao carregar os pagamentos do mês:", error);
    return { data: null, error: "Não foi possível carregar os pagamentos do mês." };
  }
}
