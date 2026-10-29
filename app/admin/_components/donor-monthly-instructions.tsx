"use client";

import { useRef, useState } from "react";
import {
  resolveUncertainDonorMonthlyInstructionsAction,
  sendManualDonorMonthlyInstructionsAction,
} from "@/app/admin/_actions/donor-monthly-instructions-actions";
import { saoPauloDate } from "@/lib/donor-recurrence";

export interface MonthlyInstructionsAttempt {
  generation: number;
  receipt_competencia: string | null;
  status: "pending" | "sending" | "sent" | "failed" | "uncertain";
  sent_at: string | null;
  error_code: string | null;
}

export interface PendingOccurrence {
  competencia: string;
  due_date: string;
}

export interface CurrentReceipt {
  competencia: string;
  status: "Comprovante pendente" | "Comprovante enviado – aguardando conferência";
}

const FAILURE_LABELS: Record<string, string> = {
  provider_rejected: "envio recusado pelo Resend",
  provider_timeout: "tempo de resposta esgotado",
  provider_unavailable: "Resend indisponível",
  configuration: "configuração de envio incompleta",
  database: "falha ao registrar o resultado",
  invalid_recipient: "destinatário inválido",
  unknown: "motivo não confirmado",
};

function monthLabel(month: string) {
  return `${month.slice(5, 7)}/${month.slice(0, 4)}`;
}

function dueLabel(date: string) {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
}

function acceptedAt(value: string) {
  return new Date(value.replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T")
    .replace(/([+-]\d{2})$/, "$1:00")).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short",
    });
}

export function instructionsState(attempt: MonthlyInstructionsAttempt | null) {
  if (!attempt) return "não enviado";
  switch (attempt.status) {
    case "pending": return "Envio pendente; ainda sem aceite do Resend.";
    case "sending": return "Envio em andamento; aceite ainda não registrado.";
    case "sent": return attempt.sent_at
      ? `Aceite pelo Resend registrado em ${acceptedAt(attempt.sent_at)}. Entrega na caixa de entrada não confirmada.`
      : "Aceite pelo Resend registrado. Entrega na caixa de entrada não confirmada.";
    case "failed": return `Falha no envio: ${FAILURE_LABELS[attempt.error_code ?? ""] ?? "motivo não informado"}.`;
    case "uncertain": return "Resultado incerto. Confira o envio no painel do Resend antes de decidir.";
  }
}

function defaultCompetence(attempt: MonthlyInstructionsAttempt | null, occurrences: PendingOccurrence[]) {
  if (attempt && (attempt.status === "pending" || attempt.status === "failed") &&
      occurrences.some((row) => row.competencia === attempt.receipt_competencia)) {
    return attempt.receipt_competencia!;
  }
  const month = saoPauloDate(new Date()).slice(0, 7);
  return occurrences.find((row) => row.competencia >= month)?.competencia ?? "";
}

interface Props {
  pledgeId: string;
  latest: MonthlyInstructionsAttempt | null;
  currentReceipt: CurrentReceipt | null;
  pendingOccurrences: PendingOccurrence[];
  onUpdated: (latest: MonthlyInstructionsAttempt) => void;
}

export function DonorMonthlyInstructions({ pledgeId, latest, currentReceipt, pendingOccurrences, onUpdated }: Props) {
  const [attempt, setAttempt] = useState(latest);
  const [competence, setCompetence] = useState(() => defaultCompetence(latest, pendingOccurrences));
  const [confirmed, setConfirmed] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);

  const needsNewGeneration = Boolean(attempt && (
    attempt.status === "sent" ||
    ((attempt.status === "pending" || attempt.status === "failed") &&
      competence !== attempt.receipt_competencia)
  ));
  const blocked = attempt?.status === "sending" || attempt?.status === "uncertain";
  const actionLabel = !attempt ? "Enviar instruções" : attempt.status === "failed" && !needsNewGeneration
    ? "Tentar envio novamente" : needsNewGeneration ? "Reenviar instruções" : "Enviar instruções";

  function applyLatest(value: MonthlyInstructionsAttempt | null | undefined) {
    if (!value) return;
    setAttempt(value);
    onUpdated(value);
  }

  async function send() {
    if (busyRef.current || !competence || blocked || (needsNewGeneration && !confirmed)) return;
    busyRef.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await sendManualDonorMonthlyInstructionsAction({
        pledgeId, competence, explicitResend: needsNewGeneration,
      });
      if ("latest" in result) applyLatest(result.latest);
      if (result.status === "sent") {
        setFeedback({ message: "Envio aceito pelo Resend. A entrega na caixa de entrada não foi confirmada.", error: false });
      } else if (result.status === "already_sent") {
        setFeedback({ message: "Este envio já havia sido aceito pelo Resend.", error: false });
      } else if (result.status === "in_progress") {
        setFeedback({ message: "O envio já está em andamento. Atualize a lista mais tarde.", error: false });
      } else if (result.status === "uncertain") {
        setFeedback({ message: "O resultado é incerto. Confira no painel do Resend antes de tentar novamente.", error: true });
      } else if (result.status === "unavailable") {
        setFeedback({ message: result.message, error: true });
      } else {
        setFeedback({ message: "Não foi possível enviar. Confira o estado registrado antes de tentar novamente.", error: true });
      }
    } catch {
      setFeedback({ message: "Não foi possível consultar o envio. Atualize a lista antes de tentar novamente.", error: true });
    } finally {
      setConfirmed(false);
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function resolve(resolution: "accepted" | "failed") {
    if (busyRef.current || !reviewed || attempt?.status !== "uncertain") return;
    busyRef.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await resolveUncertainDonorMonthlyInstructionsAction({ pledgeId, resolution });
      if (result.success) {
        applyLatest(result.latest);
        setFeedback({
          message: resolution === "accepted"
            ? "Aceite confirmado após revisão no Resend. A entrega na caixa de entrada não foi confirmada."
            : "Falha confirmada após revisão. Agora é possível tentar novamente.",
          error: false,
        });
      } else setFeedback({ message: result.error, error: true });
    } catch {
      setFeedback({ message: "Não foi possível registrar a revisão. Atualize a lista e tente novamente.", error: true });
    } finally {
      setReviewed(false);
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-cream/60 px-4 py-3 text-sm" aria-label="Instruções do pagamento mensal">
      <p data-testid="donor-current-receipt" className="text-fg">
        Comprovante {currentReceipt ? `de ${monthLabel(currentReceipt.competencia)}` : "atual"}: {currentReceipt?.status ?? "sem ocorrência ativa"}.
      </p>
      <p data-testid="donor-instructions-status" className="mt-2 text-fg" aria-live="polite">
        Instruções do pagamento mensal: {instructionsState(attempt)}
        {attempt?.receipt_competencia ? ` · competência ${monthLabel(attempt.receipt_competencia)}` : ""}
        {attempt ? ` · geração ${attempt.generation}` : ""}
      </p>

      {attempt?.status === "uncertain" ? (
        <div className="mt-3 space-y-2">
          <label className="flex items-start gap-2 text-fg">
            <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} disabled={busy} className="mt-1 accent-accent" />
            Conferi o resultado deste envio no painel do Resend.
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || !reviewed} onClick={() => void resolve("accepted")} className="rounded-md border border-border px-3 py-1.5 font-medium text-accent hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">
              Registrar aceite
            </button>
            <button type="button" disabled={busy || !reviewed} onClick={() => void resolve("failed")} className="rounded-md border border-border px-3 py-1.5 font-medium text-accent hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">
              Registrar falha
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor={`instructions-competence-${pledgeId}`} className="mb-1 block text-muted">Comprovante pendente de</label>
            <select id={`instructions-competence-${pledgeId}`} value={competence}
              onChange={(event) => { setCompetence(event.target.value); setConfirmed(false); setFeedback(null); }}
              disabled={busy || blocked || pendingOccurrences.length === 0}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50">
              <option value="">Selecione uma competência</option>
              {pendingOccurrences.map((row) => (
                <option key={row.competencia} value={row.competencia}>
                  {monthLabel(row.competencia)} · vence em {dueLabel(row.due_date)}
                </option>
              ))}
            </select>
          </div>
          <button type="button" disabled={busy || blocked || !competence || (needsNewGeneration && !confirmed)}
            onClick={() => void send()}
            className="rounded-md border border-accent px-3 py-1.5 font-medium text-accent hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
            data-testid="donor-instructions-send">
            {busy ? "Processando…" : actionLabel}
          </button>
          {pendingOccurrences.length === 0 && <p className="text-muted">Sem ocorrência ativa com comprovante pendente.</p>}
          {needsNewGeneration && competence && (
            <label className="flex w-full items-start gap-2 text-fg">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy} className="mt-1 accent-accent" />
              Confirmo o novo envio para {monthLabel(competence)}. Uma nova geração ficará registrada.
            </label>
          )}
        </div>
      )}
      {feedback && (
        <p className={`mt-2 ${feedback.error ? "text-danger" : "text-success"}`} role={feedback.error ? "alert" : "status"} data-testid="donor-instructions-feedback">
          {feedback.message}
        </p>
      )}
    </section>
  );
}
