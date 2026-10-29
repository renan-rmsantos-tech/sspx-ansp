"use client";

import { useState, useCallback, useRef, type FormEvent, type ReactNode } from "react";
import { Mail, Printer, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteDonorPledge,
  exportDonorPledge,
  getDocumentUrl,
  updateDonorDueDay,
} from "../_actions/admin-actions";
import { PdfPreviewModal } from "./pdf-preview-modal";
import { ActionBar } from "./action-bar";
import { DataGrid, DataItem } from "./data-grid";
import { Field } from "./field";
import { InlineConfirm } from "./inline-confirm";
import { Notice } from "./notice";
import { RecordRow } from "./record-row";
import { StatusPill } from "./status-pill";
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
  meio_pagamento?: "cartao" | "boleto" | "transferencia" | "pix" | null;
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

/** Campos comuns às projeções de admin e secretaria, usados pelas seções compartilhadas. */
export type DonorSummary = Pick<
  DonorPledge,
  | "id"
  | "nome"
  | "email"
  | "telefone"
  | "priorado_capela"
  | "frequencia"
  | "duracao"
  | "valor"
  | "meio_pagamento"
  | "data_pagamento"
  | "lembrete_canal"
  | "observacoes"
  | "created_at"
> & { cpf?: string; endereco?: string | null; cep?: string | null };

export const FREQUENCIA_LABELS: Record<DonorPledge["frequencia"], string> = {
  unica: "Doação única",
  mensal: "Mensal",
};

const DURACAO_LABELS: Record<NonNullable<DonorPledge["duracao"]>, string> = {
  um_ano: "por um ano",
  indeterminado: "por tempo indeterminado",
};

const CANAL_LABELS: Record<NonNullable<DonorPledge["lembrete_canal"]>, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
};

const MEIO_LABELS: Record<NonNullable<DonorPledge["meio_pagamento"]>, string> = {
  cartao: "Cartão",
  boleto: "Boleto",
  transferencia: "Transferência",
  pix: "Pix",
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

export function donorAmountLabel(donor: Pick<DonorPledge, "valor" | "frequencia">): string {
  return `${currency.format(donor.valor)}${donor.frequencia === "mensal" ? " por mês" : ""}`;
}

function frequencyLabel(donor: Pick<DonorPledge, "frequencia" | "duracao">): string {
  if (donor.frequencia !== "mensal") return FREQUENCIA_LABELS.unica;
  return donor.duracao ? `Mensal, ${DURACAO_LABELS[donor.duracao]}` : "Mensal";
}

/** Resumo da linha (valor, priorado, vencimento, cadastro), igual para os dois papéis. */
export function DonorRowMeta({ donor, dueDay }: { donor: DonorSummary; dueDay?: number | null }) {
  return (
    <>
      <span className="font-medium text-fg">{donorAmountLabel(donor)}</span>
      {donor.priorado_capela && <span>{prioradoCapelaLabel(donor.priorado_capela)}</span>}
      {donor.frequencia === "mensal" && dueDay && <span>Vence dia {dueDay}</span>}
      <span>Cadastro em {formatDonorDate(donor.created_at)}</span>
    </>
  );
}

export function DonorFrequencyPill({ frequencia }: { frequencia: DonorPledge["frequencia"] }) {
  return (
    <StatusPill tone={frequencia === "mensal" ? "accent" : "neutral"} dot={false} data-testid="frequencia-badge">
      {FREQUENCIA_LABELS[frequencia]}
    </StatusPill>
  );
}

function DetailSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={className ?? "space-y-3"}>
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      {children}
    </section>
  );
}

export function DonorContactSection({ donor }: { donor: DonorSummary }) {
  return (
    <DetailSection title="Contato">
      <DataGrid cols={2}>
        <DataItem
          label="E-mail"
          value={
            <a href={`mailto:${donor.email}`} className="text-accent underline-offset-4 hover:underline">
              {donor.email}
            </a>
          }
        />
        <DataItem label="Telefone" value={donor.telefone} />
        {donor.cpf && <DataItem label="CPF" value={donor.cpf} />}
        <DataItem label="Priorado ou capela" value={donor.priorado_capela ? prioradoCapelaLabel(donor.priorado_capela) : null} />
        {(donor.endereco || donor.cep) && (
          <DataItem
            label="Endereço"
            value={[donor.endereco, donor.cep ? `CEP ${donor.cep}` : null].filter(Boolean).join(" · ")}
            className="sm:col-span-2"
          />
        )}
        {donor.observacoes && <DataItem label="Observações" value={donor.observacoes} className="sm:col-span-2" />}
      </DataGrid>
    </DetailSection>
  );
}

/** Dados da contribuição; `children` recebe o bloco de vencimento/lembrete do admin. */
export function DonorContributionSection({ donor, children }: { donor: DonorSummary; children?: ReactNode }) {
  return (
    <DetailSection title="Contribuição">
      <DataGrid cols={2}>
        <DataItem label="Valor" value={donorAmountLabel(donor)} />
        <DataItem label="Frequência" value={frequencyLabel(donor)} />
        {donor.meio_pagamento && <DataItem label="Meio de pagamento" value={MEIO_LABELS[donor.meio_pagamento]} />}
        {donor.frequencia === "unica" && donor.data_pagamento && (
          <DataItem label="Data do pagamento" value={formatDateBR(donor.data_pagamento)} />
        )}
        {donor.lembrete_canal && <DataItem label="Lembrete" value={CANAL_LABELS[donor.lembrete_canal]} />}
      </DataGrid>
      {children}
    </DetailSection>
  );
}

interface DonorCardProps {
  donor: DonorPledge;
  onDelete: (id: string) => void;
  onWelcomeSent?: (id: string, sentAt: string | null) => void;
  onDueDayUpdated: (id: string, day: number, nextDueDate: string | null) => void;
  onInstructionsUpdated?: (id: string, latest: MonthlyInstructionsAttempt) => void;
  defaultOpen?: boolean;
}

export function DonorCard({ donor, onDelete, onWelcomeSent, onDueDayUpdated, onInstructionsUpdated, defaultOpen = false }: DonorCardProps) {
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

  const mensal = donor.frequencia === "mensal";
  const receiptPending = mensal && donor.current_receipt?.status === "Comprovante pendente";

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

  const welcomeNotice = welcomeSentAt ? (
    <Notice
      tone="success"
      title={`Boas-vindas enviado em ${formatDonorDate(welcomeSentAt)}`}
      data-testid="donor-welcome-status"
      action={
        <Button variant="ghost" size="sm" onClick={() => void handleUnmarkWelcome()} disabled={markingWelcome || sendingWelcome} data-testid="donor-welcome-unmark-sent">
          {markingWelcome ? "Desmarcando…" : "Desmarcar envio"}
        </Button>
      }
    >
      Desmarque se a mensagem não chegou e precisa ser enviada de novo.
    </Notice>
  ) : welcomeInProgress || sendingWelcome ? (
    <Notice tone="neutral" title="Boas-vindas em andamento" data-testid="donor-welcome-status">
      Envio em andamento…
    </Notice>
  ) : (
    <Notice
      tone="warn"
      title="Boas-vindas ainda não enviado"
      data-testid="donor-welcome-status"
      action={
        <>
          <Button size="sm" onClick={() => void handleSendWelcome()} disabled={sendingWelcome || markingWelcome} data-testid="donor-welcome-send">
            <Mail aria-hidden="true" /> {sendingWelcome ? "Enviando…" : "Enviar agora"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleMarkWelcome()} disabled={markingWelcome || sendingWelcome} data-testid="donor-welcome-mark-sent">
            {markingWelcome ? "Registrando…" : "Marcar como enviado"}
          </Button>
        </>
      }
    >
      A mensagem usa o texto configurado em E-mails.
    </Notice>
  );

  return (
    <RecordRow
      data-testid={`donor-card-${donor.id}`}
      defaultOpen={defaultOpen}
      title={donor.nome}
      meta={<DonorRowMeta donor={donor} dueDay={donor.dia_vencimento} />}
      status={
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          {!welcomeSentAt && <StatusPill tone="warn">Boas-vindas pendente</StatusPill>}
          {receiptPending && (
            <StatusPill tone="neutral" dot={false}>
              Sem comprovante do mês
            </StatusPill>
          )}
          <DonorFrequencyPill frequencia={donor.frequencia} />
        </div>
      }
    >
      {preview && (
        <PdfPreviewModal
          pdfBase64={preview.pdfBase64}
          filename={preview.filename}
          title="Cadastro de Benfeitor"
          onClose={() => setPreview(null)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <DonorContactSection donor={donor} />

        <DonorContributionSection donor={donor}>
          {mensal && (
            <div className="space-y-2 text-sm" data-testid="donor-due-day">
              <p className="text-fg">
                Dia de vencimento: <span className="font-medium">{donor.dia_vencimento ?? "Não informado"}</span>
                {donor.dia_vencimento ? " de cada mês" : ""}
                <span className="block text-muted">
                  Próximo vencimento: {donor.next_due_date
                    ? formatDateBR(donor.next_due_date)
                    : donor.duracao === "um_ano" && donor.dia_vencimento
                      ? "Encerrado"
                      : "Não disponível"}
                </span>
              </p>
              <p className="text-muted" data-testid="donor-reminder-status">
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
                <form noValidate onSubmit={(event) => void handleSaveDueDay(event)} className="flex flex-wrap items-end gap-2 pt-1">
                  <Field
                    label="Novo dia de vencimento"
                    hint="De 1 a 31. Em meses mais curtos, vale o último dia."
                    id={`due-day-${donor.id}`}
                    className="w-56"
                  >
                    {(a11y) => (
                      <Input
                        {...a11y}
                        type="number"
                        min="1"
                        max="31"
                        step="1"
                        required
                        value={draftDueDay}
                        onChange={(event) => setDraftDueDay(event.target.value)}
                        disabled={savingDueDay}
                        className="h-9 bg-surface"
                      />
                    )}
                  </Field>
                  <Button type="submit" size="lg" disabled={savingDueDay}>
                    {savingDueDay ? "Salvando…" : "Salvar"}
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="ghost"
                    disabled={savingDueDay}
                    onClick={() => { setEditingDueDay(false); setDraftDueDay(String(donor.dia_vencimento ?? "")); setDueDayFeedback(null); }}
                  >
                    Cancelar
                  </Button>
                </form>
              ) : (
                <Button variant="outline" size="sm" onClick={() => { setEditingDueDay(true); setDueDayFeedback(null); }}>
                  Alterar dia de vencimento
                </Button>
              )}
              {dueDayFeedback && (
                <Notice tone={dueDayFeedback.error ? "danger" : "success"}>{dueDayFeedback.message}</Notice>
              )}
            </div>
          )}
        </DonorContributionSection>
      </div>

      <DetailSection title="E-mails e comprovantes" className="mt-6 space-y-3">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            {welcomeNotice}
            {welcomeError && (
              <Notice tone="danger" data-testid="donor-welcome-error">
                {welcomeError}
              </Notice>
            )}
          </div>
          {mensal ? (
            <DonorMonthlyInstructions
              pledgeId={donor.id}
              latest={donor.latest_instructions ?? null}
              currentReceipt={donor.current_receipt ?? null}
              pendingOccurrences={donor.pending_occurrences ?? []}
              onUpdated={(latest) => onInstructionsUpdated?.(donor.id, latest)}
            />
          ) : (
            <Notice title="Doação única">
              Instruções de pagamento enviadas no cadastro. O crédito é conferido em Pagamentos.
            </Notice>
          )}
        </div>
      </DetailSection>

      {(error || exportError || reciboError) && (
        <div className="mt-4 space-y-2">
          {error && (
            <Notice tone="danger" data-testid="donor-delete-error">
              {error}
            </Notice>
          )}
          {exportError && (
            <Notice tone="danger" data-testid="donor-export-error">
              {exportError}
            </Notice>
          )}
          {reciboError && (
            <Notice tone="danger" data-testid="donor-recibo-error">
              {reciboError}
            </Notice>
          )}
        </div>
      )}

      <ActionBar>
        <Button variant="outline" size="lg" onClick={() => void handleExport()} disabled={exporting} data-testid="donor-export-button">
          <Printer aria-hidden="true" /> {exporting ? "Gerando…" : "Imprimir ficha"}
        </Button>
        {donor.recibo_path && (
          <Button variant="outline" size="lg" onClick={() => void handleOpenRecibo()} disabled={reciboLoading} data-testid="donor-recibo-button">
            <Receipt aria-hidden="true" /> {reciboLoading ? "Abrindo…" : "Ver recibo"}
          </Button>
        )}
        {confirming ? (
          <InlineConfirm
            question="Excluir este cadastro?"
            confirmLabel={deleting ? "Excluindo…" : "Sim, excluir"}
            onConfirm={() => void handleDelete()}
            onCancel={() => setConfirming(false)}
            pending={deleting}
            confirmTestId="donor-delete-confirm"
            className="py-1.5"
          />
        ) : (
          <Button
            variant="ghost"
            size="lg"
            className="text-danger hover:text-danger"
            onClick={() => setConfirming(true)}
            data-testid="donor-delete-button"
          >
            <Trash2 aria-hidden="true" /> Excluir
          </Button>
        )}
      </ActionBar>
    </RecordRow>
  );
}
