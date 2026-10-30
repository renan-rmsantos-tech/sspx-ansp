"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Download, FileText } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { getDonorFinancialReport, type FinancialFilters } from "../_actions/donor-financial-report-actions";
import { Field } from "../_components/field";
import { Notice } from "../_components/notice";
import { Section } from "../_components/section";
import { StatTile } from "../_components/stat-tile";

type Report = Awaited<ReturnType<typeof getDonorFinancialReport>>;

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const FREQUENCY_LABELS = { mensal: "Mensal", unica: "Doação única" } as const;
const INPUT_CLASS = "h-10 bg-surface";
const SELECT_CLASS = "w-full [&>select]:h-10 [&>select]:bg-surface";
const CARD_CLASS = "gap-4 rounded-lg border border-border bg-surface p-5 ring-0";
const VALUE_COLUMNS = ["Previsto", "Recebido", "Em aberto", "Não identificado/divergente"];

/** Tabela de valores: primeira coluna como cabeçalho de linha, demais à direita. */
function ValuesTable({
  caption,
  columns,
  rows,
  emptyText,
}: {
  caption: string;
  columns: string[];
  rows: { key: string; head: ReactNode; cells: ReactNode[] }[];
  emptyText: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
            {columns.map((column, index) => (
              <th key={column} scope="col" className={cn("py-2 pr-3 font-medium", index > 0 && "text-right", index === columns.length - 1 && "pr-0")}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-4 text-center text-muted">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.key} className="border-b border-border/60 last:border-0">
                <th scope="row" className="py-2 pr-3 font-normal text-fg">
                  {row.head}
                </th>
                {row.cells.map((cell, index) => (
                  <td key={index} className={cn("py-2 pr-3 text-right tabular-nums", index === row.cells.length - 1 && "pr-0")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function FinancialReport({ initialReport }: { initialReport: Report }) {
  const [report, setReport] = useState(initialReport);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const filters = report.filters;
  const download = new URLSearchParams({
    from: filters.from,
    to: filters.to,
    ...(filters.frequency ? { frequency: filters.frequency } : {}),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next: FinancialFilters = {
      from: String(form.get("from")),
      to: String(form.get("to")),
      frequency: (form.get("frequency") || undefined) as FinancialFilters["frequency"],
    };
    startTransition(async () => {
      try {
        setReport(await getDonorFinancialReport(next));
        setError("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível carregar o relatório.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className={CARD_CLASS}>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <Field label="De">
            {(a11y) => <Input {...a11y} name="from" type="month" required defaultValue={filters.from} className={INPUT_CLASS} />}
          </Field>
          <Field label="Até">
            {(a11y) => <Input {...a11y} name="to" type="month" required defaultValue={filters.to} className={INPUT_CLASS} />}
          </Field>
          <Field label="Frequência">
            {(a11y) => (
              <NativeSelect {...a11y} name="frequency" defaultValue={filters.frequency ?? ""} className={SELECT_CLASS}>
                <NativeSelectOption value="">Todas</NativeSelectOption>
                <NativeSelectOption value="mensal">Mensal</NativeSelectOption>
                <NativeSelectOption value="unica">Doação única</NativeSelectOption>
              </NativeSelect>
            )}
          </Field>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Atualizando…" : "Aplicar filtros"}
          </Button>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-sm text-muted">Valores do registro de pagamentos conferidos no extrato bancário.</p>
          <div className="flex flex-wrap gap-2">
            <a href={`/admin/relatorios/financeiro/export?${download}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
              <Download aria-hidden="true" /> Baixar CSV
            </a>
            <a href={`/admin/relatorios/financeiro/pdf?${download}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
              <FileText aria-hidden="true" /> Baixar PDF
            </a>
          </div>
        </div>
      </Card>

      {error && <Notice tone="danger">{error}</Notice>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Previsto" value={brl(report.summary.previsto)} />
        <StatTile label="Recebido confirmado" value={brl(report.summary.recebido)} tone="success" />
        <StatTile label="Em aberto" value={brl(report.summary.emAberto)} tone="warn" />
        <StatTile label="Não identificado/divergente" value={brl(report.summary.naoIdentificadoDivergente)} tone="danger" />
      </div>

      <Section title="Valores por frequência" description="Compromissos mensais e doações únicas no período.">
        <Card className={CARD_CLASS}>
          <ValuesTable
            caption="Valores por frequência"
            columns={["Frequência", ...VALUE_COLUMNS]}
            emptyText="Sem valores no período."
            rows={(["mensal", "unica"] as const).map((frequency) => ({
              key: frequency,
              head: FREQUENCY_LABELS[frequency],
              cells: [
                brl(report.byFrequency[frequency].previsto),
                brl(report.byFrequency[frequency].recebido),
                brl(report.byFrequency[frequency].emAberto),
                brl(report.byFrequency[frequency].naoIdentificadoDivergente),
              ],
            }))}
          />
        </Card>
      </Section>

      <Section title="Valores por mês" description="Previsto e recebido em cada competência; valores exatos na tabela.">
        <Card className={CARD_CLASS}>
          {report.months.length > 0 && (
            <div role="img" aria-label="Gráfico de valores previstos e recebidos por mês; valores exatos na tabela seguinte" className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={report.months.map((row) => ({ month: row.month, previsto: row.previsto / 100, recebido: row.recebido / 100 }))}
                  accessibilityLayer
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                  <Tooltip formatter={(value) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                  <Bar dataKey="previsto" name="Previsto" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recebido" name="Recebido" fill="var(--color-gold)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <ValuesTable
            caption="Valores por mês"
            columns={["Mês", ...VALUE_COLUMNS]}
            emptyText="Nenhum mês no período."
            rows={report.months.map((row) => ({
              key: row.month,
              head: row.month,
              cells: [brl(row.previsto), brl(row.recebido), brl(row.emAberto), brl(row.naoIdentificadoDivergente)],
            }))}
          />
        </Card>
      </Section>

      <Section title="Valores por benfeitor e frequência" description="Quanto cada benfeitor pagou e ainda deve no período.">
        <Card className={CARD_CLASS}>
          <ValuesTable
            caption="Valores por benfeitor e frequência"
            columns={["Benfeitor", "Frequência", "Pago", "Devido", "Parcelas em atraso"]}
            emptyText="Nenhum benfeitor no período."
            rows={report.donors.map((row) => ({
              key: `${row.donorId}:${row.frequency}`,
              head: row.donorName,
              cells: [FREQUENCY_LABELS[row.frequency as keyof typeof FREQUENCY_LABELS] ?? row.frequency, brl(row.pago), brl(row.devido), row.parcelasEmAtraso],
            }))}
          />
        </Card>
      </Section>
    </div>
  );
}
