"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getDonorFinancialReport, type FinancialFilters } from "../_actions/donor-financial-report-actions";

type Report = Awaited<ReturnType<typeof getDonorFinancialReport>>;
const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FinancialReport({ initialReport }: { initialReport: Report }) {
  const [report, setReport] = useState(initialReport);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const filters = report.filters;
  const download = new URLSearchParams({ from: filters.from, to: filters.to, ...(filters.frequency ? { frequency: filters.frequency } : {}) });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next: FinancialFilters = { from: String(form.get("from")), to: String(form.get("to")), frequency: (form.get("frequency") || undefined) as FinancialFilters["frequency"] };
    startTransition(async () => { try { setReport(await getDonorFinancialReport(next)); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar o relatório."); } });
  }
  return <section aria-labelledby="financial-title" className="mt-10 space-y-6">
    <div><h2 id="financial-title" className="font-heading text-xl font-semibold">Relatório financeiro</h2><p className="text-sm text-muted">Valores do registro de pagamentos conferidos no extrato bancário.</p></div>
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">De <input name="from" type="month" required defaultValue={filters.from} className="block rounded border border-border p-2" /></label>
      <label className="text-sm">Até <input name="to" type="month" required defaultValue={filters.to} className="block rounded border border-border p-2" /></label>
      <label className="text-sm">Frequência <select name="frequency" defaultValue={filters.frequency ?? ""} className="block rounded border border-border p-2"><option value="">Todas</option><option value="mensal">Mensal</option><option value="unica">Uma vez</option></select></label>
      <button type="submit" disabled={pending} className="rounded bg-accent px-4 py-2 text-white">{pending ? "Carregando…" : "Filtrar"}</button>
      <a href={`/admin/relatorios/financeiro/export?${download}`} className="rounded border border-border px-4 py-2 text-sm">Baixar CSV</a>
      <a href={`/admin/relatorios/financeiro/pdf?${download}`} className="rounded border border-border px-4 py-2 text-sm">Baixar PDF</a>
    </form>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{([ ["Previsto", report.summary.previsto], ["Recebido confirmado", report.summary.recebido], ["Em aberto", report.summary.emAberto], ["Não identificado/divergente", report.summary.naoIdentificadoDivergente] ] as const).map(([label, value]) => <div key={label} className="rounded border border-border p-4"><p className="text-sm text-muted">{label}</p><p className="text-lg font-semibold">{brl(value)}</p></div>)}</div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="text-left font-semibold">Valores por frequência</caption><thead><tr><th scope="col">Frequência</th><th scope="col">Previsto</th><th scope="col">Recebido</th><th scope="col">Em aberto</th><th scope="col">Não identificado/divergente</th></tr></thead><tbody>{(["mensal", "unica"] as const).map(frequency => <tr key={frequency} className="border-t border-border"><th scope="row">{frequency === "mensal" ? "Mensal" : "Uma vez"}</th><td>{brl(report.byFrequency[frequency].previsto)}</td><td>{brl(report.byFrequency[frequency].recebido)}</td><td>{brl(report.byFrequency[frequency].emAberto)}</td><td>{brl(report.byFrequency[frequency].naoIdentificadoDivergente)}</td></tr>)}</tbody></table></div>
    <div role="img" aria-label="Gráfico de valores previstos e recebidos por mês; valores exatos na tabela seguinte" className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={report.months.map(row => ({ month: row.month, previsto: row.previsto / 100, recebido: row.recebido / 100 }))} accessibilityLayer><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={value => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} /><Bar dataKey="previsto" name="Previsto" fill="var(--accent)" /><Bar dataKey="recebido" name="Recebido" fill="var(--gold)" /></BarChart></ResponsiveContainer></div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="text-left font-semibold">Valores por mês</caption><thead><tr><th scope="col">Mês</th><th scope="col">Previsto</th><th scope="col">Recebido</th><th scope="col">Em aberto</th><th scope="col">Não identificado/divergente</th></tr></thead><tbody>{report.months.map(row => <tr key={row.month} className="border-t border-border"><th scope="row">{row.month}</th><td>{brl(row.previsto)}</td><td>{brl(row.recebido)}</td><td>{brl(row.emAberto)}</td><td>{brl(row.naoIdentificadoDivergente)}</td></tr>)}</tbody></table></div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="text-left font-semibold">Valores por benfeitor e frequência</caption><thead><tr><th scope="col">Benfeitor</th><th scope="col">Frequência</th><th scope="col">Pago</th><th scope="col">Devido</th><th scope="col">Parcelas em atraso</th></tr></thead><tbody>{report.donors.map(row => <tr key={`${row.donorId}:${row.frequency}`} className="border-t border-border"><th scope="row">{row.donorName}</th><td>{row.frequency === "mensal" ? "Mensal" : "Uma vez"}</td><td>{brl(row.pago)}</td><td>{brl(row.devido)}</td><td>{row.parcelasEmAtraso}</td></tr>)}</tbody></table></div>
  </section>;
}
