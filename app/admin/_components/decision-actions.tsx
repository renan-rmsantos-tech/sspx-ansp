"use client";

import { useState, useCallback } from "react";
import {
  approveApplication,
  rejectApplication,
} from "../_actions/admin-actions";

interface DecisionActionsProps {
  applicationId: string;
  requestedDiscount: number;
  onDecision: (id: string, status: string, desconto_concedido?: number | null) => void;
  embedded?: boolean;
}

export function DecisionActions({
  applicationId,
  requestedDiscount,
  onDecision,
  embedded = false,
}: DecisionActionsProps) {
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [discount, setDiscount] = useState(String(requestedDiscount));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discountId = `discount-${applicationId}`;
  const reasonId = `reason-${applicationId}`;
  const outerClass = embedded ? "" : "mt-4";

  const handleApprove = useCallback(async () => {
    const discountNum = Number(discount);
    if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      setError("Desconto deve estar entre 0 e 100.");
      return;
    }

    setSubmitting(true);
    setError(null);

    // A lista só é atualizada após o servidor confirmar: o update otimista
    // anterior deixava desconto e data de decisão fantasmas quando a action
    // falhava.
    try {
      const result = await approveApplication(
        applicationId,
        discountNum,
        reason || undefined
      );
      if (result.success) {
        onDecision(applicationId, "aprovada", discountNum);
      } else {
        setError(result.error ?? "Erro ao aprovar.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }, [applicationId, discount, reason, onDecision]);

  const handleReject = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    try {
      const result = await rejectApplication(applicationId, reason || undefined);
      if (result.success) {
        onDecision(applicationId, "rejeitada");
      } else {
        setError(result.error ?? "Erro ao rejeitar.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }, [applicationId, reason, onDecision]);

  if (mode === "idle") {
    return (
      <div className={`${outerClass} flex flex-wrap gap-2`} data-testid="decision-actions">
        <p className="mb-1 w-full text-sm text-muted">
          Analise os documentos e dados financeiros antes de decidir.
        </p>
        <button
          type="button"
          onClick={() => setMode("approve")}
          className="rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90"
          data-testid="approve-trigger"
        >
          Aprovar
        </button>
        <button
          type="button"
          onClick={() => setMode("reject")}
          className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90"
          data-testid="reject-trigger"
        >
          Rejeitar
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${outerClass} rounded-lg border border-border bg-cream p-4`}
      data-testid={mode === "approve" ? "approve-form" : "reject-form"}
    >
      <h4 className="text-sm font-semibold text-fg">
        {mode === "approve" ? "Aprovar Solicitação" : "Rejeitar Solicitação"}
      </h4>

      {mode === "reject" && (
        <p className="mt-2 text-sm text-danger">
          Esta ação é definitiva. A família será notificada da rejeição.
        </p>
      )}

      {mode === "approve" && (
        <div className="mt-3">
          <label htmlFor={discountId} className="block text-sm text-muted">
            Desconto (%)
          </label>
          <input
            id={discountId}
            type="number"
            min="0"
            max="100"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="mt-1 w-24 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg"
            data-testid="discount-input"
          />
        </div>
      )}

      <div className="mt-3">
        <label htmlFor={reasonId} className="block text-sm text-muted">
          Motivo (opcional)
        </label>
        <textarea
          id={reasonId}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg"
          data-testid="reason-input"
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-danger" data-testid="decision-error">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={mode === "approve" ? handleApprove : handleReject}
          disabled={submitting}
          className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
            mode === "approve"
              ? "bg-success hover:bg-success/90"
              : "bg-danger hover:bg-danger/90"
          }`}
          data-testid="confirm-decision"
        >
          {submitting
            ? "Processando..."
            : mode === "approve"
              ? "Confirmar aprovação"
              : "Confirmar rejeição"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("idle");
            setError(null);
          }}
          className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:bg-bg"
          data-testid="cancel-decision"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
