"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/components/server-actions";
import type { DocumentRequestsData, DocumentRequestView } from "../_actions/document-request-actions";
import {
  DOCUMENT_CATEGORY_LABELS,
  MAX_REQUEST_REASON,
  REQUESTABLE_CATEGORIES,
  STUDENT_CATEGORIES,
} from "@/lib/applicant/document-labels";
import { DocumentPreview } from "./document-preview";
import { Field } from "./field";
import { Notice } from "./notice";
import { StatusPill, type Tone } from "./status-pill";

const STATUS: Record<DocumentRequestView["status"], { label: string; tone: Tone }> = {
  aberta: { label: "Aguardando a família", tone: "warn" },
  reenviada: { label: "Reenviado — conferir", tone: "accent" },
  resolvida: { label: "Resolvida", tone: "success" },
  cancelada: { label: "Cancelada", tone: "neutral" },
};

const FAMILY_CATEGORIES = REQUESTABLE_CATEGORIES.filter((c) => !STUDENT_CATEGORIES.has(c) && c !== "outro");

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/** Valor do select: categoria da família, `outro`, ou `categoria:aluno`. */
function parseChoice(value: string): { categoria: string; student_id: string | null } {
  const [categoria, studentId] = value.split(":");
  return { categoria, student_id: studentId ?? null };
}

function RequestRow({
  request,
  onResolve,
  onCancel,
  busy,
}: {
  request: DocumentRequestView;
  onResolve: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const status = STATUS[request.status];
  return (
    <li className="space-y-2 py-3" data-testid={`document-request-${request.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-fg">{request.label}</p>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>
      <p className="text-sm text-fg">
        <span className="text-muted">Motivo: </span>
        {request.motivo}
      </p>
      <p className="text-xs text-muted">
        Pedida em {formatDateTime(request.created_at)}
        {request.status === "aberta" &&
          (request.notified_at ? ` · família avisada em ${formatDateTime(request.notified_at)}` : " · aviso por e-mail não enviado")}
        {request.resubmitted_at && ` · reenviada em ${formatDateTime(request.resubmitted_at)}`}
        {request.resolved_at && request.status !== "reenviada" && ` · encerrada em ${formatDateTime(request.resolved_at)}`}
      </p>
      {request.documents.length > 0 && (
        <DocumentPreview documents={request.documents as unknown as Array<Record<string, unknown>>} />
      )}
      {(request.status === "reenviada" || request.status === "aberta") && (
        <div className="flex flex-wrap gap-2">
          {request.status === "reenviada" && (
            <Button size="sm" onClick={onResolve} disabled={busy} data-testid={`resolve-request-${request.id}`}>
              Marcar como resolvida
            </Button>
          )}
          {request.status === "aberta" && (
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy} data-testid={`cancel-request-${request.id}`}>
              Cancelar pedido
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Pendências de documento da solicitação: a equipe pede o reenvio de um
 * documento, a família recebe um e-mail e reenvia pela conta.
 */
export function DocumentRequests({
  applicationId,
  students,
  initialData = null,
}: {
  applicationId: string;
  students: Array<{ id: string; nome: string }>;
  /** Dados já carregados (protótipos); sem eles, o painel busca no servidor. */
  initialData?: DocumentRequestsData | null;
}) {
  const getDocumentRequests = useServerAction("getDocumentRequests");
  const createDocumentRequest = useServerAction("createDocumentRequest");
  const resendDocumentRequestNotice = useServerAction("resendDocumentRequestNotice");
  const resolveDocumentRequest = useServerAction("resolveDocumentRequest");
  const cancelDocumentRequest = useServerAction("cancelDocumentRequest");

  const [data, setData] = useState<DocumentRequestsData | null>(initialData);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [choice, setChoice] = useState("");
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger" | "warn"; text: string } | null>(null);

  useEffect(() => {
    if (initialData) return;
    let cancelled = false;
    getDocumentRequests(applicationId)
      .then((result) => {
        if (cancelled) return;
        if (result.success && result.data) setData(result.data);
        else setLoadError(result.success ? "Erro ao carregar as pendências." : result.error);
      })
      .catch(() => !cancelled && setLoadError("Erro ao carregar as pendências."));
    return () => {
      cancelled = true;
    };
  }, [applicationId, getDocumentRequests, initialData]);

  async function run(
    action: () => Promise<{ success: boolean; error?: string; data?: DocumentRequestsData; emailSent?: boolean }>,
    successText: (emailSent?: boolean) => { tone: "success" | "warn"; text: string } | null
  ) {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await action();
      if (result.success) {
        if (result.data) setData(result.data);
        setFeedback(successText(result.emailSent));
        return true;
      }
      setFeedback({ tone: "danger", text: result.error ?? "Não foi possível concluir a ação." });
    } catch {
      setFeedback({ tone: "danger", text: "Erro de conexão. Tente novamente." });
    } finally {
      setBusy(false);
    }
    return false;
  }

  async function submit() {
    const { categoria, student_id } = parseChoice(choice);
    const created = await run(
      () => createDocumentRequest(applicationId, { categoria, student_id, motivo }),
      (emailSent) =>
        emailSent
          ? { tone: "success", text: "Pendência registrada. A família foi avisada por e-mail." }
          : { tone: "warn", text: "Pendência registrada, mas o e-mail não foi enviado. Use “Reenviar aviso por e-mail”." }
    );
    if (created) {
      setChoice("");
      setMotivo("");
    }
  }

  if (loadError) return <Notice tone="danger">{loadError}</Notice>;
  if (!data) return <p className="text-sm text-muted">Carregando pendências…</p>;

  const requests = data.requests;
  const openWithoutNotice = requests.some((request) => request.status === "aberta" && !request.notified_at);
  const hasOpen = requests.some((request) => request.status === "aberta");
  const studentChoice = STUDENT_CATEGORIES.has(parseChoice(choice).categoria);

  return (
    <section className="space-y-4 border-t border-border pt-5" aria-labelledby="document-requests-title" data-testid="document-requests">
      <div>
        <h3 id="document-requests-title" className="text-sm font-semibold text-fg">
          Pendências de documentos
        </h3>
        <p className="mt-1 text-sm text-muted">
          Peça à família o reenvio de um documento ilegível, divergente ou faltando. A família recebe um e-mail e
          reenvia pela conta; os arquivos novos aparecem aqui.
        </p>
      </div>

      {requests.length > 0 && (
        <ul className="divide-y divide-border/60">
          {requests.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              busy={busy}
              onResolve={() =>
                void run(() => resolveDocumentRequest(applicationId, request.id), () => ({ tone: "success", text: "Pendência resolvida." }))
              }
              onCancel={() =>
                void run(() => cancelDocumentRequest(applicationId, request.id), () => ({ tone: "success", text: "Pedido cancelado." }))
              }
            />
          ))}
        </ul>
      )}

      {feedback && (
        <Notice tone={feedback.tone} data-testid="document-request-feedback">
          {feedback.text}
        </Notice>
      )}

      {!data.accountEmail ? (
        <Notice tone="neutral" data-testid="document-request-no-account">
          Esta solicitação foi enviada antes das contas de solicitante. Quando a família criar a conta em
          /solicitar-bolsa com o mesmo e-mail da solicitação, ela fica ligada à conta e você poderá pedir documentos
          por aqui. Até lá, peça o documento por telefone ou e-mail.
        </Notice>
      ) : (
        <div className="space-y-3 rounded-md border border-border bg-bg/50 p-4">
          <Field label="Documento a reenviar">
            {(a11y) => (
              <NativeSelect
                {...a11y}
                value={choice}
                onChange={(event) => setChoice(event.target.value)}
                className="w-full [&>select]:h-10 [&>select]:bg-surface"
                data-testid="document-request-category"
              >
                <NativeSelectOption value="">Selecione…</NativeSelectOption>
                <NativeSelectOptGroup label="Família">
                  {FAMILY_CATEGORIES.map((categoria) => (
                    <NativeSelectOption key={categoria} value={categoria}>
                      {DOCUMENT_CATEGORY_LABELS[categoria]}
                    </NativeSelectOption>
                  ))}
                </NativeSelectOptGroup>
                {students.map((student) => (
                  <NativeSelectOptGroup key={student.id} label={`Aluno: ${student.nome}`}>
                    {[...STUDENT_CATEGORIES].map((categoria) => (
                      <NativeSelectOption key={categoria} value={`${categoria}:${student.id}`}>
                        {DOCUMENT_CATEGORY_LABELS[categoria]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelectOptGroup>
                ))}
                <NativeSelectOption value="outro">{DOCUMENT_CATEGORY_LABELS.outro}</NativeSelectOption>
              </NativeSelect>
            )}
          </Field>
          <Field
            label="Motivo, para a família"
            hint={`Diga o que precisa ser corrigido. A família lê este texto no e-mail. Até ${MAX_REQUEST_REASON} caracteres.`}
          >
            {(a11y) => (
              <Textarea
                {...a11y}
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                maxLength={MAX_REQUEST_REASON}
                rows={3}
                className="bg-surface"
                placeholder={
                  studentChoice ? "Ex.: a certidão enviada é de outra criança." : "Ex.: o RG está ilegível; envie uma foto nítida da frente e do verso."
                }
                data-testid="document-request-reason"
              />
            )}
          </Field>
          <p className="text-xs text-muted">O aviso vai para {data.accountEmail}.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              disabled={busy || !choice || !motivo.trim()}
              onClick={() => void submit()}
              data-testid="document-request-submit"
            >
              {busy ? "Enviando…" : "Pedir documento e avisar a família"}
            </Button>
            {hasOpen && (
              <Button
                size="lg"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => resendDocumentRequestNotice(applicationId),
                    () => ({ tone: "success", text: "Aviso reenviado por e-mail." })
                  )
                }
                data-testid="document-request-resend"
              >
                {openWithoutNotice ? "Reenviar aviso por e-mail" : "Avisar a família de novo"}
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
