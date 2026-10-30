"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { getDonorPaymentConference } from "../_actions/donor-payment-conference-actions";

type Series = Awaited<ReturnType<typeof getDonorPaymentConference>>["series"];
const brl = (value: string | number) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function MonthlyChart({ series, coverageStart }: { series: Series; coverageStart: string | null }) {
  const chartData = series.map(row => ({ month: row.month, expected: Number(row.expected), received: Number(row.received) }));
  return <section aria-labelledby="monthly-chart-title" className="space-y-3">
    <h2 id="monthly-chart-title" className="font-heading text-lg">Esperado e recebido por mês</h2>
    <p className="text-sm text-muted">Valores recebidos confirmados no extrato. Cobertura mensal a partir de {coverageStart ?? "data não informada"}.</p>
    {chartData.length > 0 && <div role="img" aria-label="Gráfico de valores esperados e recebidos por mês; valores exatos na tabela abaixo" className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} accessibilityLayer><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis tickFormatter={value => brl(value)} /><Tooltip formatter={value => brl(Number(value))} /><Bar dataKey="expected" name="Esperado" fill="var(--accent)" /><Bar dataKey="received" name="Recebido no extrato" fill="var(--gold)" /></BarChart></ResponsiveContainer>
    </div>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Valores mensais exatos e situação dos comprovantes</caption><thead><tr className="border-b border-border"><th scope="col" className="p-2">Mês</th><th scope="col" className="p-2">Esperado</th><th scope="col" className="p-2">Recebido no extrato</th><th scope="col" className="p-2">Comprovantes pendentes</th><th scope="col" className="p-2">Comprovantes enviados</th><th scope="col" className="p-2">Pendentes em atraso</th></tr></thead><tbody>{series.map(row => <tr key={row.month} className="border-b border-border"><th scope="row" className="p-2">{row.month}</th><td className="p-2">{brl(row.expected)}</td><td className="p-2">{brl(row.received)}</td><td className="p-2">{row.receipt_pending}</td><td className="p-2">{row.receipt_sent}</td><td className="p-2">{row.overdue_missing_receipt}</td></tr>)}</tbody></table></div>
    {series.length === 0 && <p>Não há meses cobertos neste período.</p>}
  </section>;
}
