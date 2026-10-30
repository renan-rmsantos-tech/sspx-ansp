"use server";

import { and, eq, gte, lte } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { donorPaymentLedger, donorPledges } from "@/lib/db/schema";
import { aggregateFinancialReport, type FinancialLedgerRow } from "@/lib/donor-financial-report";

export type FinancialFilters = { from: string; to: string; frequency?: "mensal" | "unica" };
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
function validateFinancialFilters(filters: FinancialFilters) {
  const { from, to, frequency } = filters;
  if (!monthPattern.test(from) || !monthPattern.test(to) || from > to ||
      (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5)) - Number(from.slice(5)) >= 24 ||
      (frequency !== undefined && frequency !== "mensal" && frequency !== "unica")) {
    throw new Error("Período ou frequência inválidos. Selecione até 24 meses.");
  }
  return filters;
}

function cents(value: number) { return Math.round(value * 100); }

export async function getDonorFinancialReport(input: FinancialFilters) {
  await requireAdmin();
  const filters = validateFinancialFilters(input);
  const rows = await db.select({
    donorId: donorPledges.id, donorName: donorPledges.nome, frequency: donorPledges.frequencia,
    month: donorPaymentLedger.competencia, dueDate: donorPaymentLedger.due_date,
    due: donorPaymentLedger.expected_value, received: donorPaymentLedger.received_value,
    status: donorPaymentLedger.status,
  }).from(donorPaymentLedger).innerJoin(donorPledges, eq(donorPaymentLedger.pledge_id, donorPledges.id)).where(and(
    gte(donorPaymentLedger.competencia, filters.from), lte(donorPaymentLedger.competencia, filters.to),
    filters.frequency ? eq(donorPledges.frequencia, filters.frequency) : undefined,
  )).orderBy(donorPaymentLedger.competencia, donorPledges.nome);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const ledgerRows: FinancialLedgerRow[] = rows.map(row => ({
    donorId: row.donorId, donorName: row.donorName, frequency: row.frequency,
    month: row.month, dueCents: cents(row.due), receivedCents: cents(row.received),
    status: row.status, overdue: row.dueDate < today,
  }));
  const result = aggregateFinancialReport(ledgerRows);
  const months = [];
  const start = Number(filters.from.slice(0, 4)) * 12 + Number(filters.from.slice(5)) - 1;
  const end = Number(filters.to.slice(0, 4)) * 12 + Number(filters.to.slice(5)) - 1;
  for (let index = start; index <= end; index++) {
    const month = `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, "0")}`;
    months.push(result.months.find(row => row.month === month) ?? { month, previsto: 0, recebido: 0, emAberto: 0, naoIdentificadoDivergente: 0 });
  }
  return { filters, ...result, months };
}
