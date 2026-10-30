"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { ReceiptLinkControl } from "../_components/receipt-link-control";
import { MonthlyChart } from "./monthly-chart";
import { confirmDonorPayment, getDonorPaymentConference, getDonorPaymentReceiptUrl, markDonorPaymentNotIdentified, resetDonorPayment } from "../_actions/donor-payment-conference-actions";

type Data = Awaited<ReturnType<typeof getDonorPaymentConference>>;
type Row = Data["rows"][number];
const money = (value: string) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const bankLabel = (row: Row) => ({ pendente: row.frequency === "unica" ? "Aguardando conferência" : "Aguardando conferência", confirmado: "Confirmado no extrato", divergente: "Divergente", nao_identificado: "Não identificado" })[row.status] ?? "Aguardando conferência";
function PaymentRow({ row, refresh }: { row: Row; refresh: () => Promise<void> }) {
  const [amount, setAmount] = useState(row.received_value === "0.00" ? row.expected_value : row.received_value);
  const [date, setDate] = useState(row.credit_date ?? "");
  const [note, setNote] = useState(row.note ?? "");
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const [preview, setPreview] = useState<{ url: string; type: string } | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (preview) closeButton.current?.focus(); }, [preview]);
  const closePreview = () => { setPreview(null); trigger.current?.focus(); };
  const run = (action: () => Promise<unknown>) => start(async () => { setError(""); try { await action(); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar. Confira os campos."); } });
  const receipt = row.frequency === "mensal" ? row.receipt_state === "enviado" ? "Comprovante enviado – aguardando conferência" : "Comprovante pendente" : row.has_receipt ? "Comprovante anexado" : "Comprovante não disponível";
  return <li className="rounded-lg border border-border bg-surface p-4 space-y-3" data-testid={`payment-${row.id}`}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{row.donor_name}</h3><p className="text-sm text-muted">{row.frequency === "mensal" ? "Mensal" : "Uma vez"} · {row.competencia} · vencimento {row.due_date}</p>{row.legacy_one_time && <p className="text-sm">Registro histórico: crédito ainda não verificado.</p>}</div><div className="text-sm text-right"><strong>{bankLabel(row)}</strong><p>{receipt}</p></div></div>
    {row.missing_monthly_receipt && <p className="rounded border border-amber-600 p-2 text-sm font-semibold">Comprovante mensal em atraso — verificar separadamente do crédito bancário.</p>}
    <p className="text-sm">Esperado: {money(row.expected_value)} · Recebido no extrato: {money(row.received_value)} · Em aberto: {money(row.outstanding)}</p>
    {row.confirmed_at && <p className="text-xs text-muted">Conferido em {new Date(row.confirmed_at).toLocaleString("pt-BR")} · responsável {row.confirmed_by}</p>}
    {row.frequency === "mensal" && !row.has_receipt && <ReceiptLinkControl pledgeId={row.pledge_id} competencia={row.competencia} />}
    {row.has_receipt && <button ref={trigger} type="button" className="text-sm text-accent underline focus-visible:outline-2" onClick={() => run(async () => { const result = await getDonorPaymentReceiptUrl(row.id); if ("error" in result) throw new Error(result.error); setPreview({ url: result.url, type: result.type }); })}>Visualizar comprovante</button>}
    {preview && <section aria-label="Prévia do comprovante" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); closePreview(); } }} className="w-full min-w-0 rounded border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2"><h4 className="font-semibold">Prévia do comprovante</h4><button ref={closeButton} type="button" className="rounded border border-border px-3 py-1 focus-visible:outline-2" onClick={closePreview}>Fechar prévia</button></div>
      {preview.type.startsWith("image/") ? <img /* eslint-disable-line @next/next/no-img-element -- Private ticket URL cannot use the image optimizer. */ src={preview.url} alt={`Comprovante de ${row.donor_name}`} className="max-h-[70vh] max-w-full object-contain" /> : preview.type === "application/pdf" ? <iframe src={preview.url} title={`Comprovante de ${row.donor_name}`} className="h-[65vh] w-full min-w-0 border" /> : <a href={preview.url} target="_blank" rel="noopener noreferrer" className="text-accent underline">Abrir em nova aba</a>}
    </section>}
    <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Valor confirmado<input className="mt-1 w-full rounded border border-border p-2" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} aria-invalid={!!error} /></label><label className="text-sm">Data do crédito<input className="mt-1 w-full rounded border border-border p-2" type="date" value={date} onChange={e => setDate(e.target.value)} aria-invalid={!!error} /></label><label className="text-sm">Observação<input className="mt-1 w-full rounded border border-border p-2" value={note} onChange={e => setNote(e.target.value)} maxLength={2000} /></label></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{busy && <p role="status" className="text-sm">Salvando…</p>}
    <div className="flex flex-wrap gap-2"><button disabled={busy} className="rounded bg-accent px-3 py-2 text-sm text-white" onClick={() => run(() => confirmDonorPayment(row.id, amount.replace(",", "."), date, note))}>Confirmar crédito</button><button disabled={busy} className="rounded border border-border px-3 py-2 text-sm" onClick={() => run(() => markDonorPaymentNotIdentified(row.id, note))}>Não identificado</button><button disabled={busy} className="rounded border border-border px-3 py-2 text-sm" onClick={() => run(() => resetDonorPayment(row.id))}>Limpar conferência</button></div>
  </li>;
}
export function ConferenceClient({ initialMonth, initialData }: { initialMonth: string; initialData: Data }) {
  const [month, setMonth] = useState(initialMonth); const [data, setData] = useState(initialData); const [error, setError] = useState(""); const [busy, start] = useTransition();
  const load = async (selected: string) => { const next = await getDonorPaymentConference(selected); setData(next); };
  const change = (selected: string) => { setMonth(selected); start(async () => { setError(""); try { await load(selected); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar o mês."); } }); };
  return <section className="mt-6 space-y-6"><label className="block text-sm font-medium">Mês de referência<input type="month" className="mt-1 block rounded border border-border p-2" value={month} max={initialMonth} onChange={e => change(e.target.value)} /></label><a className="inline-block rounded border border-border px-3 py-2 text-sm" href={`/admin/conferencia-pagamentos/export?month=${encodeURIComponent(month)}`}>Baixar CSV do mês</a>{busy && <p role="status">Carregando…</p>}{error && <p role="alert">{error}</p>}
    <p className="text-sm text-muted">Cobertura mensal a partir de {data.coverage_start ?? "data não informada"}. Registros únicos históricos aguardam verificação individual.</p>
    <dl className="grid gap-3 sm:grid-cols-3">{[["Esperado", data.totals.expected], ["Recebido no extrato", data.totals.received], ["Em aberto", data.totals.outstanding]].map(([label, value]) => <div className="rounded border border-border p-3" key={label}><dt className="text-sm text-muted">{label}</dt><dd className="font-semibold">{money(value)}</dd></div>)}</dl>
    <MonthlyChart series={data.series} coverageStart={data.coverage_start} />
    <section aria-labelledby="expected-heading"><h2 id="expected-heading" className="font-heading text-lg">Pagamentos esperados</h2><ul className="mt-3 space-y-3">{data.rows.map(row => <PaymentRow key={row.id} row={row} refresh={() => load(month)} />)}</ul>{data.rows.length === 0 && <p className="text-sm text-muted">Nenhum pagamento neste mês.</p>}</section>
    <section aria-labelledby="overdue-heading"><h2 id="overdue-heading" className="font-heading text-lg">Pendências com mais de um mês</h2><ul className="mt-3 space-y-3">{data.overdue.map(row => <PaymentRow key={row.id} row={row} refresh={() => load(month)} />)}</ul>{data.overdue.length === 0 && <p className="text-sm text-muted">Nenhuma pendência antiga.</p>}</section>
  </section>;
}
