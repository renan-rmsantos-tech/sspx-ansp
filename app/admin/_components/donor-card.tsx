"use client";

import { useState, useCallback, useRef, type FormEvent } from "react";
import {
  deleteDonorPledge,
  exportDonorPledge,
  getDocumentUrl,
  updateDonorDueDay,
} from "../_actions/admin-actions";
import { ReceiptLinkControl } from "./receipt-link-control";
import { PdfPreviewModal } from "./pdf-preview-modal";
import { prioradoCapelaLabel } from "@/lib/data/priorados-capelas";
import { formatDonorDate } from "@/lib/donor-date";
import { markDonorWelcomeEmailSent, unmarkDonorWelcomeEmailSent, retryDonorWelcomeEmail } from "@/app/admin/_actions/donor-email-actions";
import { DonorMonthlyInstructions, type CurrentReceipt, type MonthlyInstructionsAttempt, type PendingOccurrence } from "./donor-monthly-instructions";

export interface DonorPledge {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone?: string | null;
  endereco?: string | null;
  cep?: string | null;
  priorado_capela?: string | null;
  welcome_email_sent_at?: string | null;
  welcome_email_in_progress?: boolean;
  frequencia: "unica" | "mensal";
  duracao?: "um_ano" | "indeterminado" | null;
  valor: number;
  data_pagamento?: string | null;
  dia_vencimento?: number | null;
  next_due_date?: string | null;
  latest_reminder?: {
    kind: "10d" | "5d";
    competencia: string;
    status: "sending" | "sent" | "failed" | "uncertain";
    sent_at: string | null;
    error_code: string | null;
  } | null;
  latest_instructions?: MonthlyInstructionsAttempt | null;
  current_receipt?: CurrentReceipt | null;
  pending_occurrences?: PendingOccurrence[];
  lembrete_canal?: "whatsapp" | "email" | null;
  recibo_path?: string | null;
  recibo_nome?: string | null;
  observacoes?: string | null;
  created_at: string;
}

export const FREQUENCIA_LABELS: Record<DonorPledge["frequencia"], string> = {
  unica: "Única",
  mensal: "Mensal",
};

const DURACAO_LABELS: Record<NonNullable<DonorPledge["duracao"]>, string> = {
  um_ano: "Por um ano",
  indeterminado: "Indeterminado",
};

const CANAL_LABELS: Record<NonNullable<DonorPledge["lembrete_canal"]>, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
};

const FREQUENCIA_COLORS: Record<DonorPledge["frequencia"], string> = {
  mensal: "bg-success/15 text-success",
  unica: "bg-accent/15 text-accent",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Formata 'YYYY-MM-DD' como 'DD/MM/YYYY' sem depender de fuso horário.
function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return d && m && y ? `${d}/${m}/${y}` : isoDate;
}

function formatAcceptedAt(value: string): string {
  const normalized = value
    .replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T")
    .replace(/([+-]\d{2})$/, "$1:00");
  return new Date(normalized).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

const REMINDER_FAILURE_LABELS: Record<string, string> = {
  provider_rejected: "envio recusado pelo Resend",
  provider_timeout: "tempo de resposta esgotado",
  provider_unavailable: "Resend indisponível",
  configuration: "configuração de envio incompleta",
  database: "falha ao registrar o resultado",
  invalid_recipient: "destinatário inválido",
  unknown: "motivo não confirmado",
};

function reminderState(reminder: NonNullable<DonorPledge["latest_reminder"]>): string {
  switch (reminder.status) {
    case "sending":
      return "Envio em andamento; aceitação ainda não registrada.";
    case "sent":
      return reminder.sent_at
        ? `Aceito pelo Resend em ${formatAcceptedAt(reminder.sent_at)}. Entrega na caixa de entrada não confirmada.`
        : "Aceito pelo Resend. Entrega na caixa de entrada não confirmada.";
    case "failed":
      return reminder.error_code
        ? `Falha no envio: ${REMINDER_FAILURE_LABELS[reminder.error_code] ?? "motivo não informado"}.`
        : "Falha no envio registrada.";
    case "uncertain":
      return "Resultado incerto; verificar no Resend antes de reenviar.";
  }
}

interface DonorCardProps {
  donor: DonorPledge;
  onDelete: (id: string) => void;
  onWelcomeSent?: (id: string, sentAt: string | null) => void;
  onDueDayUpdated: (id: string, day: number, nextDueDate: string | null) => void;
  onInstructionsUpdated?: (id: string, latest: MonthlyInstructionsAttempt) => void;
}

export function DonorCard({ donor, onDelete, onWelcomeSent, onDueDayUpdated, onInstructionsUpdated }: DonorCardProps) {
  const [markingWelcome, setMarkingWelcome] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [reciboLoading, setReciboLoading] = useState(false);
  const [reciboError, setReciboError] = useState<string | null>(null);
  const [preview, setPreview] = useState<
    { pdfBase64: string; filename: string } | null
  >(null);
  const [welcomeSentAt, setWelcomeSentAt] = useState(donor.welcome_email_sent_at ?? null);
  const [welcomeInProgress, setWelcomeInProgress] = useState(donor.welcome_email_in_progress ?? false);
  const [sendingWelcome, setSendingWelcome] = useState(false);
  const [welcomeError, setWelcomeError] = useState<string | null>(null);
  const [editingDueDay, setEditingDueDay] = useState(false);
  const [draftDueDay, setDraftDueDay] = useState(String(donor.dia_vencimento ?? ""));
  const [savingDueDay, setSavingDueDay] = useState(false);
  const savingDueDayRef = useRef(false);
  const [dueDayFeedback, setDueDayFeedback] = useState<{ message: string; error: boolean } | null>(null);

  const handleSaveDueDay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingDueDayRef.current) return;
    const day = Number(draftDueDay);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      setDueDayFeedback({ message: "Informe um dia inteiro entre 1 e 31.", error: true });
      return;
    }

    savingDueDayRef.current = true;
    setSavingDueDay(true);
    setDueDayFeedback(null);
    try {
      const result = await updateDonorDueDay(donor.id, day);
      if (result.success) {
        onDueDayUpdated(donor.id, result.dia_vencimento, result.next_due_date);
        setDraftDueDay(String(result.dia_vencimento));
        setEditingDueDay(false);
        setDueDayFeedback({ message: "Dia de vencimento atualizado.", error: false });
      } else {
        setDueDayFeedback({ message: result.error, error: true });
      }
    } catch {
      setDueDayFeedback({ message: "Não foi possível atualizar o dia. Tente novamente.", error: true });
    } finally {
      savingDueDayRef.current = false;
      setSavingDueDay(false);
    }
  };

  const handleSendWelcome = useCallback(async () => {
    if (sendingWelcome || markingWelcome || welcomeSentAt || welcomeInProgress) return;
    setSendingWelcome(true);
    setWelcomeError(null);
    try {
      const result = await retryDonorWelcomeEmail(donor.id);
      if (result.status === "sent" || result.status === "already_sent") {
        setWelcomeSentAt(result.sent_at ?? new Date().toISOString());
        onWelcomeSent?.(donor.id, result.sent_at ?? new Date().toISOString());
        setWelcomeInProgress(false);
      } else if (result.status === "in_progress") {
        setWelcomeInProgress(true);
        setWelcomeError(result.error ?? "O envio deste e-mail já está em andamento.");
      } else {
        setWelcomeError(result.error ?? "Não foi possível enviar. Tente novamente.");
      }
    } catch {
      setWelcomeError("Não foi possível enviar. Tente novamente.");
    } finally {
      setSendingWelcome(false);
    }
  }, [donor.id, sendingWelcome, markingWelcome, welcomeInProgress, welcomeSentAt, onWelcomeSent]);

  const handleMarkWelcome = async () => {
    if (markingWelcome || sendingWelcome || welcomeSentAt || welcomeInProgress) return;
    setMarkingWelcome(true);
    setWelcomeError(null);
    try {
      const result = await markDonorWelcomeEmailSent(donor.id);
      if (result.success && result.sent_at) {
        setWelcomeSentAt(result.sent_at);
        onWelcomeSent?.(donor.id, result.sent_at);
      } else setWelcomeError(result.error ?? "Não foi possível registrar o envio.");
    } catch {
      setWelcomeError("Não foi possível registrar o envio. Tente novamente.");
    } finally {
      setMarkingWelcome(false);
    }
  };

  const handleUnmarkWelcome = async () => {
    if (markingWelcome || sendingWelcome || !welcomeSentAt || welcomeInProgress) return;
    setMarkingWelcome(true);
    setWelcomeError(null);
    try {
      const result = await unmarkDonorWelcomeEmailSent(donor.id);
      if (result.success) {
        setWelcomeSentAt(null);
        onWelcomeSent?.(donor.id, null);
      } else setWelcomeError(result.error ?? "Não foi possível desmarcar o envio.");
    } catch {
      setWelcomeError("Não foi possível desmarcar o envio. Tente novamente.");
    } finally {
      setMarkingWelcome(false);
    }
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    const result = await exportDonorPledge(donor.id);
    if ("pdfBase64" in result) {
      setPreview({ pdfBase64: result.pdfBase64, filename: result.filename });
    } else {
      setExportError(result.error);
    }
    setExporting(false);
  }, [donor.id]);

  const handleOpenRecibo = useCallback(async () => {
    if (!donor.recibo_path) return;
    setReciboLoading(true);
    setReciboError(null);
    const result = await getDocumentUrl(donor.recibo_path);
    setReciboLoading(false);
    if ("url" in result) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    } else {
      setReciboError(result.error);
    }
  }, [donor.recibo_path]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setError(null);
    const result = await deleteDonorPledge(donor.id);
    setDeleting(false);
    if (result.success) {
      onDelete(donor.id);
    } else {
      setError(result.error ?? "Erro ao excluir.");
      setConfirming(false);
    }
  }, [donor.id, onDelete]);

  return (
    <div
      className="rounded-lg border border-border bg-surface p-4"
      data-testid={`donor-card-${donor.id}`}
    >
      {preview && (
        <PdfPreviewModal
          pdfBase64={preview.pdfBase64}
          filename={preview.filename}
          title="Cadastro de Benfeitor"
          onClose={() => setPreview(null)}
        />
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-fg">{donor.nome}</span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${FREQUENCIA_COLORS[donor.frequencia]}`}
              data-testid="frequencia-badge"
            >
              {FREQUENCIA_LABELS[donor.frequencia]}
              {donor.frequencia === "mensal" && donor.duracao
                ? ` · ${DURACAO_LABELS[donor.duracao]}`
                : ""}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <a
              href={`mailto:${donor.email}`}
              className="hover:text-accent hover:underline"
            >
              {donor.email}
            </a>
            <span>CPF: {donor.cpf}</span>
            {donor.telefone && <span>{donor.telefone}</span>}
            {donor.endereco && <span>{donor.endereco}</span>}
            {donor.cep && <span>CEP: {donor.cep}</span>}
            {donor.priorado_capela && (
              <span>
                Priorado/Capela: {prioradoCapelaLabel(donor.priorado_capela)}
              </span>
            )}
            <span>Cadastro: {formatDonorDate(donor.created_at)}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span>
              <span className="text-muted">Valor: </span>
              <span className="font-semibold text-fg">
                {currency.format(donor.valor)}
                {donor.frequencia === "mensal" ? "/mês" : ""}
              </span>
            </span>
            {donor.frequencia === "unica" && donor.data_pagamento && (
              <span>
                <span className="text-muted">Pagamento: </span>
                <span className="text-fg">{formatDateBR(donor.data_pagamento)}</span>
              </span>
            )}
            {donor.lembrete_canal && (
              <span>
                <span className="text-muted">Lembrete: </span>
                <span className="text-fg">{CANAL_LABELS[donor.lembrete_canal]}</span>
              </span>
            )}
            {donor.recibo_nome && (
              <span>
                <span className="text-muted">Recibo: </span>
                <span className="text-fg">{donor.recibo_nome}</span>
              </span>
            )}
          </div>

          {donor.frequencia === "mensal" && (
            <div className="mt-3 text-sm" data-testid="donor-due-day">
              <p className="text-fg">
                Dia de vencimento: <span className="font-medium">{donor.dia_vencimento ?? "Não informado"}</span>
                {donor.dia_vencimento ? " de cada mês" : ""}
                <span className="ml-3 text-muted">
                  Próximo vencimento: {donor.next_due_date
                    ? formatDateBR(donor.next_due_date)
                    : donor.duracao === "um_ano" && donor.dia_vencimento
                      ? "Encerrado"
                      : "Não disponível"}
                </span>
              </p>
              <p className="mt-1 text-muted" data-testid="donor-reminder-status">
                Último lembrete: {donor.latest_reminder
                  ? <>
                      {donor.latest_reminder.kind === "10d" ? "10 dias" : "5 dias"} antes
                      {" · competência "}{donor.latest_reminder.competencia.slice(5, 7)}/{donor.latest_reminder.competencia.slice(0, 4)}
                      {" · "}{reminderState(donor.latest_reminder)}
                    </>
                  : donor.lembrete_canal === "email"
                    ? "Nenhum envio registrado."
                    : "Lembretes por e-mail desativados."}
              </p>
              {editingDueDay ? (
                <form noValidate onSubmit={(event) => void handleSaveDueDay(event)} className="mt-2 flex flex-wrap items-end gap-2">
                  <div>
                    <label htmlFor={`due-day-${donor.id}`} className="mb-1 block text-muted">Novo dia de vencimento</label>
                    <input
                      id={`due-day-${donor.id}`}
                      type="number"
                      min="1"
                      max="31"
                      step="1"
                      required
                      value={draftDueDay}
                      onChange={(event) => setDraftDueDay(event.target.value)}
                      disabled={savingDueDay}
                      aria-describedby={`due-day-help-${donor.id}`}
                      className="w-24 rounded-md border border-border bg-surface px-3 py-1.5 text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                    />
                    <p id={`due-day-help-${donor.id}`} className="mt-1 text-xs text-muted">De 1 a 31. Em meses mais curtos, vale o último dia.</p>
                  </div>
                  <button type="submit" disabled={savingDueDay} className="rounded-md border border-accent px-3 py-1.5 font-medium text-accent hover:bg-bg disabled:opacity-50">
                    {savingDueDay ? "Salvando…" : "Salvar dia"}
                  </button>
                  <button type="button" disabled={savingDueDay} onClick={() => { setEditingDueDay(false); setDraftDueDay(String(donor.dia_vencimento ?? "")); setDueDayFeedback(null); }} className="rounded-md border border-border px-3 py-1.5 text-muted hover:bg-bg disabled:opacity-50">
                    Cancelar
                  </button>
                </form>
              ) : (
                <button type="button" onClick={() => { setEditingDueDay(true); setDueDayFeedback(null); }} className="mt-2 rounded-md border border-border px-3 py-1.5 font-medium text-accent hover:bg-bg">
                  Alterar dia de vencimento
                </button>
              )}
              {dueDayFeedback && (
                <p className={`mt-2 ${dueDayFeedback.error ? "text-danger" : "text-success"}`} role={dueDayFeedback.error ? "alert" : "status"}>
                  {dueDayFeedback.message}
                </p>
              )}
            </div>
          )}

          {donor.frequencia === "mensal" && donor.current_receipt?.status === "Comprovante pendente" && <ReceiptLinkControl pledgeId={donor.id} competencia={donor.current_receipt.competencia} />}
          {donor.frequencia === "mensal" && (
            <DonorMonthlyInstructions
              pledgeId={donor.id}
              latest={donor.latest_instructions ?? null}
              currentReceipt={donor.current_receipt ?? null}
              pendingOccurrences={donor.pending_occurrences ?? []}
              onUpdated={(latest) => onInstructionsUpdated?.(donor.id, latest)}
            />
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm" data-testid="donor-welcome-status" aria-live="polite">
            {welcomeSentAt ? (
              <>
                <span className="text-success">Envio de boas-vindas registrado em {formatDonorDate(welcomeSentAt)}.</span>
                <button type="button" onClick={() => void handleUnmarkWelcome()} disabled={markingWelcome || sendingWelcome}
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-accent hover:bg-bg disabled:opacity-50"
                  data-testid="donor-welcome-unmark-sent">
                  {markingWelcome ? "Desmarcando…" : "Desmarcar envio"}
                </button>
              </>
            ) : welcomeInProgress || sendingWelcome ? (
              <span className="text-muted" aria-live="polite">Envio em andamento…</span>
            ) : (
              <>
                <span className="text-muted">E-mail de boas-vindas pendente.</span>
                <button
                  type="button"
                  onClick={() => void handleSendWelcome()}
                  disabled={sendingWelcome || markingWelcome}
                  className="rounded-md border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-bg disabled:opacity-50"
                  data-testid="donor-welcome-send"
                >
                  {sendingWelcome ? "Enviando…" : "Enviar e-mail"}
                </button>
                <button type="button" onClick={() => void handleMarkWelcome()} disabled={markingWelcome || sendingWelcome}
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-accent hover:bg-bg disabled:opacity-50"
                  data-testid="donor-welcome-mark-sent">
                  {markingWelcome ? "Registrando…" : "Marcar como enviado manualmente"}
                </button>
              </>
            )}
          </div>
          {welcomeError && (
            <p className="mt-2 text-sm text-danger" role="alert" data-testid="donor-welcome-error">
              {welcomeError}
            </p>
          )}

          {donor.observacoes && (
            <p className="mt-2 text-sm text-muted">
              <span className="font-medium text-fg">Observações: </span>
              {donor.observacoes}
            </p>
          )}

          {error && (
            <p className="mt-2 text-sm text-danger" data-testid="donor-delete-error">
              {error}
            </p>
          )}
          {exportError && (
            <p className="mt-2 text-sm text-danger" data-testid="donor-export-error">
              {exportError}
            </p>
          )}
          {reciboError && (
            <p className="mt-2 text-sm text-danger" data-testid="donor-recibo-error">
              {reciboError}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
          {donor.recibo_path && (
            <button
              type="button"
              onClick={handleOpenRecibo}
              disabled={reciboLoading}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-accent hover:bg-bg disabled:opacity-50"
              data-testid="donor-recibo-button"
            >
              {reciboLoading ? "Abrindo..." : "Ver recibo"}
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="rounded-md border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-bg disabled:opacity-50"
            data-testid="donor-export-button"
          >
            {exporting ? "Gerando..." : "Visualizar e Imprimir"}
          </button>
          {confirming ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md border border-danger bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-50"
                data-testid="donor-delete-confirm"
              >
                {deleting ? "Excluindo..." : "Confirmar"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted hover:bg-bg disabled:opacity-50"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-danger hover:bg-bg"
              data-testid="donor-delete-button"
            >
              Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
