"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  getDonorReports,
  type DonorReportCategory,
  type DonorReportFilters,
  type DonorReports,
} from "../_actions/donor-report-actions";
import { Field } from "../_components/field";
import { Notice } from "../_components/notice";
import { PageHeader } from "../_components/page-header";
import { Section } from "../_components/section";
import { DonorReportCharts } from "./reports-charts";

const INPUT_CLASS = "h-10 bg-surface";
const SELECT_CLASS = "w-full [&>select]:h-10 [&>select]:bg-surface";
const CARD_CLASS = "gap-4 rounded-lg border border-border bg-surface p-5 ring-0";

function ReportSeries({
  title,
  description,
  categories,
  chart = true,
}: {
  title: string;
  description: string;
  categories: DonorReportCategory[];
  chart?: boolean;
}) {
  return (
    <Section title={title} description={description}>
      <Card className={CARD_CLASS}>
        {chart && <DonorReportCharts categories={categories} label={title} />}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[280px] border-collapse text-left text-sm">
            <caption className="sr-only">{title}: quantidade de cadastros por categoria</caption>
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Categoria</th>
                <th scope="col" className="py-2 text-right font-medium">Cadastros</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.key} className="border-b border-border/60 last:border-0">
                  <th scope="row" className="py-2 pr-3 font-normal text-fg">{category.label}</th>
                  <td className="py-2 text-right tabular-nums">{category.count}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <th scope="row" className="border-t border-border pt-3 pr-3">Total de cadastros</th>
                <td className="border-t border-border pt-3 text-right tabular-nums">
                  {categories.reduce((sum, category) => sum + category.count, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </Section>
  );
}

export function DonorReportsClient({ initialReports }: { initialReports: DonorReports }) {
  const [reports, setReports] = useState(initialReports);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const filters: DonorReportFilters = {
      from: String(form.get("from") || "") || undefined,
      to: String(form.get("to") || "") || undefined,
      frequency: (String(form.get("frequency") || "") || undefined) as DonorReportFilters["frequency"],
    };
    setError("");
    startTransition(async () => {
      try {
        setReports(await getDonorReports(filters));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o relatório.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Distribuição dos cadastros de benfeitores por residência e por priorado ou capela."
      />

      <Card className={CARD_CLASS}>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <Field label="Data inicial">
            {(a11y) => (
              <Input {...a11y} type="date" name="from" defaultValue={reports.filters.from ?? ""} className={INPUT_CLASS} />
            )}
          </Field>
          <Field label="Data final">
            {(a11y) => (
              <Input {...a11y} type="date" name="to" defaultValue={reports.filters.to ?? ""} className={INPUT_CLASS} />
            )}
          </Field>
          <Field label="Frequência">
            {(a11y) => (
              <NativeSelect {...a11y} name="frequency" defaultValue={reports.filters.frequency ?? ""} className={SELECT_CLASS}>
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
        <p aria-live="polite" className="border-t border-border pt-4 text-sm text-muted">
          População selecionada: <strong className="text-fg">{reports.total} cadastros</strong>
        </p>
      </Card>

      {error && <Notice tone="danger">{error}</Notice>}

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportSeries
          title="Estado de residência"
          description="Local de residência informado no cadastro."
          categories={reports.residenceByState}
        />
        <ReportSeries
          title="Priorado ou capela"
          description="Vínculo selecionado pelo benfeitor."
          chart={false}
          categories={[...reports.prioryOrChapel].sort(
            (a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR")
          )}
        />
      </div>
    </div>
  );
}
