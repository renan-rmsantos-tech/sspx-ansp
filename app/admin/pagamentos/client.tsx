"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { Download, Receipt } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDonorDate } from "@/lib/donor-date";
import { cn } from "@/lib/utils";
import {
  confirmDonorPayment,
  getDonorPaymentConference,
  getDonorPaymentReceiptUrl,
  markDonorPaymentNotIdentified,
  resetDonorPayment,
} from "../_actions/donor-payment-conference-actions";
import { ActionBar } from "../_components/action-bar";
import { competenciaLabel } from "../_components/admin-home";
import { DataGrid, DataItem } from "../_components/data-grid";
import { EmptyState } from "../_components/empty-state";
import { Field } from "../_components/field";
import { Notice } from "../_components/notice";
import { PageHeader } from "../_components/page-header";
import { ReceiptLinkControl } from "../_components/receipt-link-control";
import { RecordRow } from "../_components/record-row";
import { Section } from "../_components/section";
import { StatTile } from "../_components/stat-tile";
import { StatusPill, type Tone } from "../_components/status-pill";
import { MonthlyChart } from "./monthly-chart";

export type ConferenceData = Awaited<ReturnType<typeof getDonorPaymentConference>>;
export type ConferenceRow = ConferenceData["rows"][number];

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const money = (value: string | number) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Vocabulário fechado da situação bancária; o texto acompanha a cor em todo lugar. */
const BANK_STATE: Record<string, { label: string; tone: Tone; notice: "success" | "warn" | "danger" }> = {
  pendente: { label: "Aguardando conferência", tone: "warn", notice: "warn" },
  confirmado: { label: "Confirmado no extrato", tone: "success", notice: "success" },
  divergente: { label: "Divergente", tone: "danger", notice: "warn" },
  nao_identificado: { label: "Não identificado", tone: "danger", notice: "danger" },
};

function bankState(row: ConferenceRow) {
  return BANK_STATE[row.status] ?? BANK_STATE.pendente;
}

/** Situação do comprovante, separada da situação bancária. */
function receiptLabel(row: ConferenceRow): string {
  if (row.frequency === "mensal") {
    return row.receipt_state === "enviado" ? "Comprovante enviado – aguardando conferência" : "Comprovante pendente";
  }
  return row.has_receipt ? "Comprovante anexado" : "Comprovante não disponível";
}

function conferredTitle(row: ConferenceRow): string {
  if (row.status === "confirmado") return `Crédito de ${money(row.received_value)} confirmado no extrato`;
  if (row.status === "divergente") return `Crédito de ${money(row.received_value)} divergente do esperado`;
  return "Crédito não identificado no extrato";
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

/** Aguardando conferência primeiro; dentro de cada grupo, por vencimento e nome. */
function sortRows(rows: ConferenceRow[]): ConferenceRow[] {
  return [...rows].sort((a, b) => {
    const pendingOrder = Number(a.status !== "pendente") - Number(b.status !== "pendente");
    return pendingOrder || a.due_date.localeCompare(b.due_date) || a.donor_name.localeCompare(b.donor_name, "pt-BR");
  });
}

export function PagamentosClient({
  initialMonth,
  currentMonth,
  initialData,
  invalidMonth = false,
  error,
}: {
  initialMonth: string;
  /** Mês corrente em São Paulo; o seletor não aceita meses futuros. */
  currentMonth?: string;
  initialData: ConferenceData | null;
  invalidMonth?: boolean;
  error?: string;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [data, setData] = useState(initialData);
  const [loadError, setLoadError] = useState(error ?? "");
  const [busy, start] = useTransition();
  const maxMonth = currentMonth ?? initialMonth;

  async function load(selected: string) {
    setData(await getDonorPaymentConference(selected));
  }

  function change(selected: string) {
    if (!MONTH_PATTERN.test(selected) || selected > maxMonth) return;
    setMonth(selected);
    start(async () => {
      setLoadError("");
      try {
        await load(selected);
      } catch (cause) {
        setLoadError(cause instanceof Error ? cause.message : "Não foi possível carregar o mês.");
      }
    });
  }

  const refresh = () => load(month);
  const monthLabel = competenciaLabel(month);
  const rows = data ? sortRows(data.rows) : [];
  const pending = rows.filter((row) => row.status === "pendente").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagamentos"
        description="Confira no extrato bancário os créditos esperados no mês. Um comprovante enviado não confirma o recebimento."
        action={
          <>
            <Field label="Mês de referência" id="pagamentos-mes" className="w-44">
              {(a11y) => (
                <Input
                  {...a11y}
                  type="month"
                  value={month}
                  max={maxMonth}
                  onChange={(event) => change(event.target.value)}
                  className="h-9 bg-surface"
                />
              )}
            </Field>
            <a
              href={`/admin/pagamentos/export?month=${encodeURIComponent(month)}`}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "self-end")}
            >
              <Download aria-hidden="true" /> Baixar CSV
            </a>
          </>
        }
      />

      {invalidMonth && (
        <Notice tone="warn" data-testid="pagamentos-invalid-month">
          Mês inválido; mostrando {monthLabel}.
        </Notice>
      )}

      {loadError && (
        <Notice tone="danger" title="Não foi possível carregar os pagamentos" data-testid="pagamentos-error">
          {loadError}
        </Notice>
      )}

      {busy && (
        <p role="status" className="text-sm text-muted">
          Carregando…
        </p>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3" data-testid="pagamentos-totais">
            <StatTile label={`Esperado em ${monthLabel}`} value={money(data.totals.expected)} data-testid="stat-esperado" />
            <StatTile label="Recebido no extrato" value={money(data.totals.received)} tone="success" data-testid="stat-recebido" />
            <StatTile
              label="Em aberto"
              value={money(data.totals.outstanding)}
              tone="warn"
              hint={`${pending} ${pending === 1 ? "pagamento aguardando" : "pagamentos aguardando"} conferência`}
              data-testid="stat-em-aberto"
            />
          </div>

          <Section
            title="Pagamentos do mês"
            description="Abra um pagamento para registrar o crédito encontrado no extrato ou para ver o comprovante enviado."
          >
            {rows.length === 0 ? (
              <EmptyState
                title="Nenhum pagamento neste mês."
                description="Os pagamentos aparecem aqui quando benfeitores têm vencimento no mês escolhido."
              />
            ) : (
              <div className="space-y-3" data-testid="pagamentos-lista">
                {rows.map((row, index) => (
                  <PaymentRow key={row.id} row={row} defaultOpen={index === 0} refresh={refresh} />
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Pendências de meses anteriores"
            description="Pagamentos com mais de um mês ainda em aberto ou sem comprovante mensal."
          >
            {data.overdue.length === 0 ? (
              <Notice tone="success">Nenhuma pendência com mais de um mês.</Notice>
            ) : (
              <div className="space-y-3" data-testid="pagamentos-pendencias">
                {data.overdue.map((row) => (
                  <PaymentRow key={row.id} row={row} defaultOpen={false} refresh={refresh} testIdPrefix="overdue-" />
                ))}
              </div>
            )}
          </Section>

          <MonthlyChart series={data.series} coverageStart={data.coverage_start} />
        </>
      )}
    </div>
  );
}

function PaymentRow({
  row,
  defaultOpen,
  refresh,
  testIdPrefix = "",
}: {
  row: ConferenceRow;
  defaultOpen: boolean;
  refresh: () => Promise<void>;
  /** Um mesmo pagamento pode aparecer no mês e nas pendências; o prefixo evita ids repetidos. */
  testIdPrefix?: string;
}) {
  const [amount, setAmount] = useState(row.received_value === "0.00" ? row.expected_value : row.received_value);
  const [date, setDate] = useState(row.credit_date ?? "");
  const [note, setNote] = useState(row.note ?? "");
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const [preview, setPreview] = useState<{ url: string; type: string } | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (preview) closeButton.current?.focus();
  }, [preview]);

  const state = bankState(row);
  const conferred = row.status !== "pendente";

  const run = (action: () => Promise<unknown>) =>
    start(async () => {
      setError("");
      try {
        await action();
        await refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível salvar. Confira os campos.");
      }
    });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(() => confirmDonorPayment(row.id, amount.replace(",", "."), date, note));
  }

  function openReceipt() {
    start(async () => {
      setError("");
      const result = await getDonorPaymentReceiptUrl(row.id);
      if ("error" in result) {
        setError(result.error ?? "Comprovante não encontrado.");
        return;
      }
      setPreview({ url: result.url, type: result.type });
    });
  }

  function closePreview() {
    setPreview(null);
    trigger.current?.focus();
  }

  const receiptButton = row.has_receipt && (
    <Button ref={trigger} type="button" size="lg" variant="ghost" disabled={busy} onClick={openReceipt}>
      <Receipt aria-hidden="true" /> Ver comprovante
    </Button>
  );

  return (
    <RecordRow
      data-testid={`${testIdPrefix}payment-${row.id}`}
      detailTestId={`${testIdPrefix}payment-detail-${row.id}`}
      defaultOpen={defaultOpen}
      title={row.donor_name}
      meta={
        <>
          <span className="font-medium text-fg">{money(row.expected_value)}</span>
          <span>{row.frequency === "mensal" ? "Mensal" : "Doação única"}</span>
          <span>Vencimento {formatDonorDate(row.due_date)}</span>
          <span>{receiptLabel(row)}</span>
        </>
      }
      status={<StatusPill tone={state.tone}>{state.label}</StatusPill>}
    >
      <div className="space-y-4">
        {row.legacy_one_time && <Notice>Registro histórico: crédito ainda não verificado.</Notice>}
        {row.missing_monthly_receipt && (
          <Notice tone="warn" title="Comprovante mensal em atraso">
            Verificar separadamente do crédito bancário.
          </Notice>
        )}

        <DataGrid cols={4}>
          <DataItem label="Competência" value={competenciaLabel(row.competencia)} />
          <DataItem label="Esperado" value={money(row.expected_value)} />
          <DataItem label="Recebido no extrato" value={money(row.received_value)} data-testid="payment-received" />
          <DataItem label="Em aberto" value={money(row.outstanding)} data-testid="payment-outstanding" />
        </DataGrid>

        {row.frequency === "mensal" && !row.has_receipt && (
          <ReceiptLinkControl pledgeId={row.pledge_id} competencia={row.competencia} />
        )}

        {conferred ? (
          <>
            <Notice tone={state.notice} role="status" title={conferredTitle(row)}>
              {row.confirmed_at && <>Conferido em {formatDateTime(row.confirmed_at)}. </>}
              {row.credit_date && <>Crédito em {formatDonorDate(row.credit_date)}. </>}
              {row.note && <>Observação: {row.note}</>}
            </Notice>
            <ActionBar className="mt-0">
              <Button type="button" size="lg" variant="outline" disabled={busy} onClick={() => run(() => resetDonorPayment(row.id))}>
                Limpar conferência
              </Button>
              {receiptButton}
            </ActionBar>
          </>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Valor encontrado no extrato">
                {(a11y) => (
                  <Input
                    {...a11y}
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    aria-invalid={error ? true : undefined}
                    className="bg-surface"
                  />
                )}
              </Field>
              <Field label="Data do crédito">
                {(a11y) => (
                  <Input
                    {...a11y}
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    aria-invalid={error ? true : undefined}
                    className="bg-surface"
                  />
                )}
              </Field>
              <Field label="Observação" hint="Obrigatória quando o crédito não é encontrado.">
                {(a11y) => (
                  <Input
                    {...a11y}
                    value={note}
                    maxLength={2000}
                    onChange={(event) => setNote(event.target.value)}
                    className="bg-surface"
                  />
                )}
              </Field>
            </div>
            <ActionBar
              className="mt-0"
              note={row.has_receipt ? "Comprovante enviado pelo benfeitor disponível para consulta." : undefined}
            >
              <Button type="submit" size="lg" disabled={busy}>
                Confirmar crédito
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled={busy}
                onClick={() => run(() => markDonorPaymentNotIdentified(row.id, note))}
              >
                Não encontrei no extrato
              </Button>
              {receiptButton}
            </ActionBar>
          </form>
        )}

        {preview && (
          <section
            aria-label="Prévia do comprovante"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                closePreview();
              }
            }}
            className="w-full min-w-0 rounded-lg border border-border bg-bg/60 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="font-heading text-base font-semibold text-fg">Prévia do comprovante</h4>
              <Button ref={closeButton} type="button" variant="outline" size="sm" onClick={closePreview}>
                Fechar prévia
              </Button>
            </div>
            {preview.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL privada com ticket; não passa pelo otimizador de imagens.
              <img src={preview.url} alt={`Comprovante de ${row.donor_name}`} className="max-h-[70vh] max-w-full rounded object-contain" />
            ) : preview.type === "application/pdf" ? (
              <iframe src={preview.url} title={`Comprovante de ${row.donor_name}`} className="h-[65vh] w-full min-w-0 rounded border border-border" />
            ) : (
              <a href={preview.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-accent underline underline-offset-4">
                Abrir em nova aba
              </a>
            )}
          </section>
        )}

        {error && <Notice tone="danger">{error}</Notice>}
        {busy && (
          <p role="status" className="text-sm text-muted">
            Salvando…
          </p>
        )}
      </div>
    </RecordRow>
  );
}
