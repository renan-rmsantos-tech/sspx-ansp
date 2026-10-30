export type FinancialLedgerRow = {
  donorId: string;
  donorName: string;
  frequency: "mensal" | "unica";
  month: string;
  dueCents: number;
  receivedCents: number;
  status: string;
  overdue: boolean;
};

export function aggregateFinancialReport(rows: FinancialLedgerRow[]) {
  const summary = { previsto: 0, recebido: 0, emAberto: 0, naoIdentificadoDivergente: 0 };
  const months = new Map<string, typeof summary>();
  const donors = new Map<string, { donorId: string; donorName: string; frequency: string; pago: number; devido: number; parcelasEmAtraso: number }>();
  const byFrequency = { mensal: { previsto: 0, recebido: 0, emAberto: 0, naoIdentificadoDivergente: 0 }, unica: { previsto: 0, recebido: 0, emAberto: 0, naoIdentificadoDivergente: 0 } };
  for (const row of rows) {
    const received = row.status === "confirmado" || row.status === "divergente" ? row.receivedCents : 0;
    const open = Math.max(0, row.dueCents - received);
    const disputed = row.status === "nao_identificado" || row.status === "divergente" ? row.receivedCents : 0;
    for (const target of [summary, byFrequency[row.frequency], months.get(row.month) ?? (() => { const value = { previsto: 0, recebido: 0, emAberto: 0, naoIdentificadoDivergente: 0 }; months.set(row.month, value); return value; })()]) {
      target.previsto += row.dueCents;
      target.recebido += received;
      target.emAberto += open;
      target.naoIdentificadoDivergente += disputed;
    }
    const key = `${row.donorId}:${row.frequency}`;
    const donor = donors.get(key) ?? { donorId: row.donorId, donorName: row.donorName, frequency: row.frequency, pago: 0, devido: 0, parcelasEmAtraso: 0 };
    donor.pago += received;
    donor.devido += open;
    donor.parcelasEmAtraso += Number(row.overdue && open > 0);
    donors.set(key, donor);
  }
  return { summary, byFrequency, months: [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, totals]) => ({ month, ...totals })), donors: [...donors.values()] };
}
