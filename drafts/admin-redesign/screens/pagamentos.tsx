"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import type { ScreenProps } from "../shell";
import { PAYMENTS, currency, formatDate, type PaymentFixture } from "../fixtures";
import { ActionBar, Button, Field, Notice, PageHeader, RecordRow, Section, StatTile, StatusPill, TextInput } from "../ui";

const STATE = {
  aguardando: { label: "Aguardando conferência", tone: "warn" as const },
  confirmado: { label: "Confirmado no extrato", tone: "success" as const },
  nao_identificado: { label: "Não identificado", tone: "danger" as const },
};

export function PagamentosScreen(_: ScreenProps) {
  const [rows, setRows] = useState(PAYMENTS);
  const expected = rows.reduce((s, r) => s + r.esperado, 0);
  const received = rows.reduce((s, r) => s + r.recebido, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagamentos"
        description="Confira no extrato bancário os créditos esperados no mês. Um comprovante enviado não confirma o recebimento."
        odId="pagamentos-header"
        action={
          <>
            <Field label="Mês" className="w-40">
              {(a11y) => <TextInput {...a11y} type="month" defaultValue="2026-10" max="2026-10" />}
            </Field>
            <Button variant="outline" size="lg" className="self-end"><Download aria-hidden /> Baixar CSV</Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3" data-od-id="pagamentos-totais">
        <StatTile label="Esperado em outubro" value={currency.format(expected)} />
        <StatTile label="Recebido no extrato" value={currency.format(received)} tone="success" />
        <StatTile label="Em aberto" value={currency.format(expected - received)} tone="warn" hint={`${rows.filter((r) => r.estado === "aguardando").length} pagamentos aguardando`} />
      </div>

      <Section title="Pagamentos do mês" description="Abra um pagamento para registrar o crédito encontrado no extrato." odId="pagamentos-lista">
        <div className="space-y-3">
          {[...rows].sort((a, b) => (a.estado === "aguardando" ? -1 : 1) - (b.estado === "aguardando" ? -1 : 1)).map((row, index) => (
            <PaymentRow key={row.id} row={row} defaultOpen={index === 0} onChange={(next) => setRows((prev) => prev.map((r) => (r.id === next.id ? next : r)))} />
          ))}
        </div>
      </Section>

      <Section title="Pendências de meses anteriores">
        <Notice tone="success">Nenhuma pendência com mais de um mês.</Notice>
      </Section>
    </div>
  );
}

function PaymentRow({ row, defaultOpen, onChange }: { row: PaymentFixture; defaultOpen: boolean; onChange: (r: PaymentFixture) => void }) {
  const [amount, setAmount] = useState(String(row.recebido || row.esperado));
  const [date, setDate] = useState(row.estado === "confirmado" ? row.vencimento : "");
  const state = STATE[row.estado];
  return (
    <RecordRow
      odId={`pagamento-${row.id}`}
      defaultOpen={defaultOpen}
      title={row.benfeitor}
      meta={
        <>
          <span className="font-medium text-fg">{currency.format(row.esperado)}</span>
          <span>{row.frequencia === "mensal" ? "Mensal" : "Doação única"}</span>
          <span>Vencimento {formatDate(row.vencimento)}</span>
          <span>{row.comprovante === "enviado" || row.comprovante === "anexado" ? "Comprovante disponível" : "Sem comprovante"}</span>
        </>
      }
      status={<StatusPill tone={state.tone}>{state.label}</StatusPill>}
    >
      {row.estado === "confirmado" ? (
        <Notice tone="success" title={`Crédito de ${currency.format(row.recebido)} confirmado`} action={<Button size="sm" variant="ghost" onClick={() => onChange({ ...row, estado: "aguardando", recebido: 0 })}>Desfazer</Button>}>
          Conferido em {formatDate(row.vencimento)} pela Administração.
        </Notice>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onChange({ ...row, estado: "confirmado", recebido: Number(amount) });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Valor encontrado no extrato">
              {(a11y) => <TextInput {...a11y} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />}
            </Field>
            <Field label="Data do crédito">
              {(a11y) => <TextInput {...a11y} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
            </Field>
            <Field label="Observação (opcional)">
              {(a11y) => <TextInput {...a11y} placeholder="Ex.: valor diferente do combinado" />}
            </Field>
          </div>
          <ActionBar note={row.comprovante !== "pendente" ? "Comprovante enviado pelo benfeitor disponível para consulta." : undefined}>
            <Button type="submit" size="lg">Confirmar crédito</Button>
            <Button type="button" size="lg" variant="outline" onClick={() => onChange({ ...row, estado: "nao_identificado" })}>Não encontrei no extrato</Button>
            {row.comprovante !== "pendente" && <Button type="button" size="lg" variant="ghost">Ver comprovante</Button>}
          </ActionBar>
        </form>
      )}
    </RecordRow>
  );
}
