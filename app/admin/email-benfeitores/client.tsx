"use client";

import { useState } from "react";
import {
  retryDonorWelcomeEmail,
  saveDonorEmailTemplate,
} from "../_actions/donor-email-actions";
import {
  DONOR_EMAIL_FOOTER,
  DONOR_EMAIL_HEADER,
} from "@/lib/email/donor-welcome-template";

interface EmailTemplate {
  assunto: string;
  corpo: string;
}

interface PendingDonor {
  id: string;
  nome: string;
  email: string;
  created_at: string;
}

export function DonorEmailClient({
  initialTemplate,
  initialPending,
  smtpConfigured,
}: {
  initialTemplate: EmailTemplate;
  initialPending: PendingDonor[];
  smtpConfigured: boolean;
}) {
  const [template, setTemplate] = useState(initialTemplate);
  const [saved, setSaved] = useState(initialTemplate);
  const [pending, setPending] = useState(initialPending);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [retryError, setRetryError] = useState<{ id: string; text: string } | null>(null);
  const dirty = template.assunto !== saved.assunto || template.corpo !== saved.corpo;

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveDonorEmailTemplate(template);
      if (result.success) {
        setSaved({ assunto: template.assunto.trim(), corpo: template.corpo.trim() });
        setMessage({ type: "success", text: "Modelo salvo. Os próximos envios usarão este texto." });
      } else {
        setMessage({ type: "error", text: result.error ?? "Não foi possível salvar o modelo." });
      }
    } catch {
      setMessage({ type: "error", text: "Não foi possível salvar o modelo. Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  async function retry(id: string) {
    setSendingId(id);
    setRetryError(null);
    try {
      const result = await retryDonorWelcomeEmail(id);
      if (result.success) {
        setPending((current) => current.filter((donor) => donor.id !== id));
      } else {
        setRetryError({ id, text: result.error ?? "Não foi possível enviar." });
      }
    } catch {
      setRetryError({ id, text: "Não foi possível enviar. Tente novamente." });
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {!smtpConfigured && (
        <div role="status" className="rounded-md border border-warn/50 bg-warn/10 px-4 py-3 text-sm text-fg">
          O envio está indisponível. Configure SMTP_HOST e SMTP_FROM no servidor para enviar e-mails.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5" aria-labelledby="email-editor-heading">
          <h2 id="email-editor-heading" className="text-base font-semibold text-fg">Conteúdo da mensagem</h2>
          <p className="mt-1 text-sm text-muted">O cabeçalho e a assinatura institucionais são incluídos automaticamente.</p>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="donor-email-subject" className="mb-1.5 block text-sm font-medium text-fg">Assunto</label>
              <input
                id="donor-email-subject"
                value={template.assunto}
                onChange={(event) => { setTemplate((value) => ({ ...value, assunto: event.target.value })); setMessage(null); }}
                maxLength={160}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
              />
            </div>
            <div>
              <label htmlFor="donor-email-body" className="mb-1.5 block text-sm font-medium text-fg">Mensagem</label>
              <textarea
                id="donor-email-body"
                value={template.corpo}
                onChange={(event) => { setTemplate((value) => ({ ...value, corpo: event.target.value })); setMessage(null); }}
                maxLength={10000}
                rows={16}
                className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-fg outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
              />
              <p className="mt-1 text-xs text-muted">Separe os parágrafos com uma linha em branco.</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !dirty}
              className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar modelo"}
            </button>
            <span aria-live="polite" className={`text-sm ${message?.type === "error" ? "text-danger" : "text-success"}`}>
              {message?.text}
            </span>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5" aria-labelledby="email-preview-heading">
          <h2 id="email-preview-heading" className="text-base font-semibold text-fg">Pré-visualização</h2>
          <p className="mt-1 text-sm text-muted">Esta é uma amostra do texto em HTML enviado ao benfeitor.</p>
          <div className="mt-5 overflow-hidden rounded-md border border-border bg-white">
            <div className="border-b border-border px-5 py-3 text-xs text-muted">
              <span className="font-medium text-fg">Assunto:</span> {template.assunto || "—"}
            </div>
            <div className="bg-accent px-6 py-5 font-heading text-[19px] font-semibold leading-snug text-white">
              {DONOR_EMAIL_HEADER}
            </div>
            <div className="space-y-4 px-6 py-7 text-sm leading-relaxed text-fg">
              {template.corpo.trim()
                ? template.corpo.trim().split(/\n\s*\n/).map((paragraph, index) => (
                    <p key={index} className="whitespace-pre-line">{paragraph}</p>
                  ))
                : <p className="text-muted">A mensagem aparecerá aqui.</p>}
            </div>
            <div className="whitespace-pre-line border-t border-border px-6 py-5 text-xs leading-relaxed text-muted">
              {DONOR_EMAIL_FOOTER}
            </div>
          </div>
        </section>
      </div>

      <section aria-labelledby="pending-emails-heading">
        <h2 id="pending-emails-heading" className="text-base font-semibold text-fg">Envios pendentes</h2>
        <p className="mt-1 text-sm text-muted">
          Até 50 cadastros sem envio confirmado. Use o reenvio após resolver uma falha de SMTP.
        </p>
        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
          {pending.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">Nenhum e-mail pendente.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pending.map((donor) => (
                <li key={donor.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{donor.nome}</p>
                    <p className="break-all text-sm text-muted">{donor.email}</p>
                    {retryError?.id === donor.id && <p role="alert" className="mt-1 text-xs text-danger">{retryError.text}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => void retry(donor.id)}
                    disabled={sendingId !== null || !smtpConfigured}
                    className="shrink-0 rounded-md border border-accent px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Enviar e-mail para ${donor.nome}`}
                  >
                    {sendingId === donor.id ? "Enviando..." : "Enviar e-mail"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
