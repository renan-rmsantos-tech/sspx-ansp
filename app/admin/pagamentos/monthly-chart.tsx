"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import type { getDonorPaymentConference } from "../_actions/donor-payment-conference-actions";
import { Section } from "../_components/section";

type Series = Awaited<ReturnType<typeof getDonorPaymentConference>>["series"];

const brl = (value: string | number) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const COLUMNS = ["Esperado", "Recebido no extrato", "Comprovantes pendentes", "Comprovantes enviados", "Pendentes em atraso"];

/** Esperado × recebido nos últimos doze meses, com a tabela de valores exatos. */
export function MonthlyChart({ series, coverageStart }: { series: Series; coverageStart: string | null }) {
  const chartData = series.map((row) => ({ month: row.month, expected: Number(row.expected), received: Number(row.received) }));

  return (
    <Section
      title="Esperado e recebido por mês"
      description={`Valores recebidos confirmados no extrato. Cobertura mensal a partir de ${coverageStart ?? "data não informada"}; registros únicos históricos aguardam verificação individual.`}
    >
      <Card className="gap-4 rounded-lg border border-border bg-surface p-5 ring-0">
        {chartData.length > 0 && (
          <div
            role="img"
            aria-label="Gráfico de valores esperados e recebidos por mês; valores exatos na tabela abaixo"
            className="h-64 w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                <YAxis tickFormatter={(value) => brl(value)} tick={{ fill: "var(--color-muted)", fontSize: 12 }} width={92} />
                <Tooltip formatter={(value) => brl(Number(value))} />
                <Bar dataKey="expected" name="Esperado" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received" name="Recebido no extrato" fill="var(--color-gold)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {series.length === 0 ? (
          <p className="text-sm text-muted">Não há meses cobertos neste período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <caption className="sr-only">Valores mensais exatos e situação dos comprovantes</caption>
              <thead>
                <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">Mês</th>
                  {COLUMNS.map((column) => (
                    <th key={column} scope="col" className="py-2 pr-3 text-right font-medium last:pr-0">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {series.map((row) => (
                  <tr key={row.month} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="py-2 pr-3 font-normal text-fg">{row.month}</th>
                    <td className="py-2 pr-3 text-right tabular-nums">{brl(row.expected)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{brl(row.received)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.receipt_pending}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.receipt_sent}</td>
                    <td className="py-2 text-right tabular-nums">{row.overdue_missing_receipt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Section>
  );
}
