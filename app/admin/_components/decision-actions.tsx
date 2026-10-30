"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataGrid, DataItem } from "./data-grid";
import { Field } from "./field";
import { Notice } from "./notice";
import type { DecisionHandler } from "./application-card";
import { approveApplication, rejectApplication } from "../_actions/admin-actions";

interface DecisionActionsProps {
  applicationId: string;
  requestedDiscount: number;
  /** Soma das rendas declaradas (quando o detalhe já carregou). */
  familyIncome?: number;
  /** Soma das mensalidades dos alunos. */
  monthlyTuition?: number;
  onDecision: DecisionHandler;
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatCurrency(value?: number): string {
  return value == null ? "—" : currency.format(value);
}

export function DecisionActions({
  applicationId,
  requestedDiscount,
  familyIncome,
  monthlyTuition,
  onDecision,
}: DecisionActionsProps) {
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [discount, setDiscount] = useState(String(requestedDiscount));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    const approving = mode === "approve";
    const discountNum = Number(discount);
    if (approving && (discount.trim() === "" || isNaN(discountNum) || discountNum < 0 || discountNum > 100)) {
      setError("Desconto deve estar entre 0 e 100.");
      return;
    }

    setSubmitting(true);
    setError(null);

    // A lista só é atualizada após o servidor confirmar: um update otimista
    // deixaria desconto e data de decisão fantasmas quando a action falha.
    try {
      const result = approving
        ? await approveApplication(applicationId, discountNum, reason || undefined)
        : await rejectApplication(applicationId, reason || undefined);
      if (result.success) {
        onDecision(applicationId, approving ? "aprovada" : "rejeitada", approving ? discountNum : null, reason || null);
      } else {
        setError(result.error ?? (approving ? "Erro ao aprovar." : "Erro ao rejeitar."));
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }, [mode, applicationId, discount, reason, onDecision]);

  if (mode === "idle") {
    return (
      <div className="space-y-4" data-testid="decision-actions">
        <DataGrid cols={3}>
          <DataItem label="Desconto solicitado" value={`${requestedDiscount}%`} />
          <DataItem label="Renda familiar" value={formatCurrency(familyIncome)} />
          <DataItem label="Mensalidades" value={formatCurrency(monthlyTuition)} />
        </DataGrid>
        <Notice>
          Confira os documentos e a renda antes de decidir. A família recebe a carta com o texto configurado em
          Modelos de documentos.
        </Notice>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={() => setMode("approve")} data-testid="approve-trigger">
            Aprovar solicitação
          </Button>
          <Button size="lg" variant="destructive" onClick={() => setMode("reject")} data-testid="reject-trigger">
            Rejeitar
          </Button>
        </div>
      </div>
    );
  }

  const approving = mode === "approve";

  return (
    <form
      className="max-w-xl space-y-4 rounded-lg border border-border bg-cream/50 p-5"
      data-testid={approving ? "approve-form" : "reject-form"}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div>
        <h3 className="font-heading text-lg font-semibold text-fg">
          {approving ? "Aprovar solicitação" : "Rejeitar solicitação"}
        </h3>
        <p className="mt-1 text-sm text-muted">
          {approving
            ? "Informe o percentual concedido. Ele aparece na carta e no contrato."
            : "Esta ação é definitiva e a família será informada."}
        </p>
      </div>

      {approving && (
        <Field label="Desconto concedido (%)" hint={`Solicitado: ${requestedDiscount}%`} className="max-w-52">
          {(a11y) => (
            <Input
              {...a11y}
              type="number"
              min={0}
              max={100}
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
              className="h-10 bg-surface"
              data-testid="discount-input"
            />
          )}
        </Field>
      )}

      <Field label="Motivo (opcional)" hint="Aparece na carta de decisão quando preenchido.">
        {(a11y) => (
          <Textarea
            {...a11y}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className="bg-surface"
            data-testid="reason-input"
          />
        )}
      </Field>

      {error && (
        <Notice tone="danger" data-testid="decision-error">
          {error}
        </Notice>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="lg"
          variant={approving ? "default" : "destructive"}
          disabled={submitting}
          data-testid="confirm-decision"
        >
          {submitting ? "Registrando…" : approving ? "Confirmar aprovação" : "Confirmar rejeição"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="ghost"
          disabled={submitting}
          onClick={() => {
            setMode("idle");
            setError(null);
          }}
          data-testid="cancel-decision"
        >
          Voltar
        </Button>
      </div>
    </form>
  );
}
