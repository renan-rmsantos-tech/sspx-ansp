"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDonorDate } from "@/lib/donor-date";
import { getDocumentUrl } from "../_actions/admin-actions";
import type { MonthlyPaymentRow } from "../_actions/donor-payment-actions";
import { ActionBar } from "../_components/action-bar";
import { competenciaLabel } from "../_components/admin-home";
import { DataGrid, DataItem } from "../_components/data-grid";
import { EmptyState } from "../_components/empty-state";
import { Field } from "../_components/field";
import { Notice } from "../_components/notice";
import { PageHeader } from "../_components/page-header";
import { RecordRow } from "../_components/record-row";
import { Section } from "../_components/section";
import { StatTile } from "../_components/stat-tile";
import { StatusPill } from "../_components/status-pill";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const SCOPE_NOTICE = "A confirmação do crédito no extrato ainda não está disponível neste painel.";

/** Mesma regra de `hasMonthlyReceipt` (lib/donor-payment-ledger.ts), que não pode ser importada no cliente por carregar o `db`. */
function hasMonthlyReceipt(row: MonthlyPaymentRow): boolean {
  return row.receipt_path !== null || row.receipt_name !== null || row.receipt_uploaded_at !== null;
}

function sum(rows: MonthlyPaymentRow[]): number {
  return rows.reduce((total, row) => total + row.expected_value, 0);
}

/** Sem comprovante primeiro; dentro de cada grupo, por vencimento. */
function sortRows(rows: MonthlyPaymentRow[]): MonthlyPaymentRow[] {
  return [...rows].sort((a, b) => {
    const receiptOrder = Number(hasMonthlyReceipt(a)) - Number(hasMonthlyReceipt(b));
    return receiptOrder || a.due_date.localeCompare(b.due_date);
  });
}

export function PagamentosClient({
  competencia,
  rows,
  invalidMonth = false,
  error,
}: {
  competencia: string;
  rows: MonthlyPaymentRow[];
  invalidMonth?: boolean;
  error?: string;
}) {
  const monthLabel = competenciaLabel(competencia);
  const withReceipt = rows.filter((row) => hasMonthlyReceipt(row));
  const withoutReceipt = rows.filter((row) => !hasMonthlyReceipt(row));
  const sorted = sortRows(rows);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagamentos"
        description="Confira no extrato bancário os créditos esperados no mês. Um comprovante enviado não confirma o recebimento."
        action={
          <form method="get" className="flex flex-wrap items-end gap-2">
            <Field label="Mês" id="pagamentos-mes" className="w-44">
              {(a11y) => (
                <Input {...a11y} type="month" name="mes" defaultValue={competencia} className="h-10 bg-surface" />
              )}
            </Field>
            <Button type="submit" variant="outline" size="lg">
              Ver mês
            </Button>
          </form>
        }
      />

      {invalidMonth && (
        <Notice tone="warn" data-testid="pagamentos-invalid-month">
          Mês inválido; mostrando {monthLabel}.
        </Notice>
      )}

      {error && (
        <Notice tone="danger" title="Não foi possível carregar os pagamentos" data-testid="pagamentos-error">
          {error}
        </Notice>
      )}

      <div className="grid gap-3 sm:grid-cols-3" data-testid="pagamentos-totais">
        <StatTile label={`Esperado em ${monthLabel}`} value={currency.format(sum(rows))} data-testid="stat-esperado" />
        <StatTile label="Com comprovante" value={currency.format(sum(withReceipt))} tone="success" data-testid="stat-com-comprovante" />
        <StatTile
          label="Sem comprovante"
          value={currency.format(sum(withoutReceipt))}
          tone="warn"
          hint={`${withoutReceipt.length} ${withoutReceipt.length === 1 ? "pagamento" : "pagamentos"}`}
          data-testid="stat-sem-comprovante"
        />
      </div>

      <Section
        title="Pagamentos do mês"
        description="Abra um pagamento para ver o vencimento e o comprovante enviado pelo benfeitor."
      >
        {sorted.length === 0 ? (
          <EmptyState
            title={`Nenhum pagamento mensal esperado em ${monthLabel}`}
            description="Os pagamentos aparecem aqui quando benfeitores mensais têm vencimento no mês escolhido."
          />
        ) : (
          <div className="space-y-3" data-testid="pagamentos-lista">
            {sorted.map((row, index) => (
              <PaymentRow key={row.id} row={row} defaultOpen={index === 0} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function PaymentRow({ row, defaultOpen }: { row: MonthlyPaymentRow; defaultOpen: boolean }) {
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const hasReceipt = hasMonthlyReceipt(row);

  async function openReceipt() {
    if (!row.receipt_path) return;
    setReceiptLoading(true);
    setReceiptError(null);
    const result = await getDocumentUrl(row.receipt_path);
    setReceiptLoading(false);
    if ("url" in result) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    } else {
      setReceiptError(result.error);
    }
  }

  return (
    <RecordRow
      data-testid={`payment-row-${row.id}`}
      detailTestId={`payment-detail-${row.id}`}
      defaultOpen={defaultOpen}
      title={row.nome}
      meta={
        <>
          <span className="font-medium text-fg">{currency.format(row.expected_value)}</span>
          <span>Mensal</span>
          <span>Vencimento {formatDonorDate(row.due_date)}</span>
          <span>{hasReceipt ? "Comprovante disponível" : "Sem comprovante"}</span>
        </>
      }
      status={<StatusPill tone="warn">Aguardando conferência</StatusPill>}
    >
      <DataGrid>
        <DataItem label="Valor esperado" value={currency.format(row.expected_value)} />
        <DataItem label="Vencimento" value={formatDonorDate(row.due_date)} />
        <DataItem
          label="Comprovante enviado em"
          value={hasReceipt ? formatDonorDate(row.receipt_uploaded_at) : "—"}
        />
      </DataGrid>

      {hasReceipt && (
        <ActionBar note={row.receipt_name ?? undefined}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void openReceipt()}
            disabled={receiptLoading}
            data-testid="payment-receipt-button"
          >
            <Receipt aria-hidden="true" /> {receiptLoading ? "Abrindo…" : "Ver comprovante"}
          </Button>
        </ActionBar>
      )}

      {receiptError && (
        <Notice tone="danger" className="mt-4">
          {receiptError}
        </Notice>
      )}

      <Notice tone="neutral" className="mt-4">
        {SCOPE_NOTICE}
      </Notice>
    </RecordRow>
  );
}
