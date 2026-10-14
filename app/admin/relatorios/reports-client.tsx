"use client";

import { useState, useTransition, type FormEvent } from "react";
import { getDonorReports, type DonorReportCategory, type DonorReportFilters, type DonorReports } from "../_actions/donor-report-actions";
import { DonorReportCharts } from "./reports-charts";

function ReportSeries({ title, description, categories }: { title: string; description: string; categories: DonorReportCategory[] }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4" aria-labelledby={`${title}-heading`}>
      <h2 id={`${title}-heading`} className="font-heading text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <div className="mt-4"><DonorReportCharts categories={categories} label={title} /></div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-left text-sm">
          <caption className="sr-only">{title}: quantidade de cadastros por categoria</caption>
          <thead><tr className="border-b border-border text-muted"><th scope="col" className="py-2 pr-3 font-medium">Categoria</th><th scope="col" className="py-2 text-right font-medium">Cadastros</th></tr></thead>
          <tbody>{categories.map((category) => <tr key={category.key} className="border-b border-border last:border-0"><th scope="row" className="py-2 pr-3 font-normal">{category.label}</th><td className="py-2 text-right tabular-nums">{category.count}</td></tr>)}</tbody>
          <tfoot><tr className="font-semibold"><th scope="row" className="pt-3 pr-3">Total de cadastros</th><td className="pt-3 text-right tabular-nums">{categories.reduce((sum, category) => sum + category.count, 0)}</td></tr></tfoot>
        </table>
      </div>
    </section>
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
    <div className="mt-6 space-y-6">
      <form onSubmit={submit} className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <label className="flex flex-col gap-1.5 text-sm font-medium">Data inicial<input type="date" name="from" defaultValue={reports.filters.from ?? ""} className="min-h-10 rounded-md border border-border bg-bg px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" /></label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">Data final<input type="date" name="to" defaultValue={reports.filters.to ?? ""} className="min-h-10 rounded-md border border-border bg-bg px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" /></label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">Frequência<select name="frequency" defaultValue={reports.filters.frequency ?? ""} className="min-h-10 rounded-md border border-border bg-bg px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><option value="">Todas</option><option value="mensal">Mensal</option><option value="unica">Única</option></select></label>
        <button type="submit" disabled={pending} className="min-h-10 rounded-md bg-accent px-4 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60">{pending ? "Atualizando…" : "Aplicar filtros"}</button>
      </form>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <p aria-live="polite" className="rounded-md border border-border bg-surface px-4 py-3 text-sm">População selecionada: <strong>{reports.total} cadastros</strong></p>
      <div className="grid gap-5 xl:grid-cols-2">
        <ReportSeries title="Residência" description="Local de residência informado no cadastro." categories={reports.residenceByState} />
        <ReportSeries title="Priorado ou capela" description="Vínculo selecionado pelo benfeitor." categories={reports.prioryOrChapel} />
      </div>
    </div>
  );
}
