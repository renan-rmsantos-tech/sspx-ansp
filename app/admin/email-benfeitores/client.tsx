"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { DocumentHeaderPreview } from "../_components/document-header-preview";
import {
  retryDonorWelcomeEmail,
  saveDonorEmailTemplate,
  sendDonorTestEmail,
} from "../_actions/donor-email-actions";
import { DONOR_EMAIL_FOOTER } from "@/lib/email/donor-welcome-template";
import type { DocumentHeaderData } from "@/lib/documents/document-header";

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
  header,
  smtpConfigured,
}: {
  initialTemplate: EmailTemplate;
  initialPending: PendingDonor[];
  header: DocumentHeaderData;
  smtpConfigured: boolean;
}) {
  const [template, setTemplate] = useState(initialTemplate);
  const [saved, setSaved] = useState(initialTemplate);
  const [pending, setPending] = useState(initialPending);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [retryError, setRetryError] = useState<{ id: string; text: string } | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testMessage, setTestMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
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

  async function sendTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingTest) return;
    setSendingTest(true);
    setTestMessage(null);
    try {
      const result = await sendDonorTestEmail({ email: testEmail, ...template });
      setTestMessage(result.success
        ? { type: "success", text: `E-mail de teste enviado para ${testEmail.trim()}.` }
        : { type: "error", text: result.error ?? "Não foi possível enviar o teste." });
    } catch {
      setTestMessage({ type: "error", text: "Não foi possível enviar o teste. Tente novamente." });
    } finally {
      setSendingTest(false);
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
          <p className="mt-1 text-sm text-muted">
            O e-mail usa o <Link href="/admin/cabecalho" className="font-medium text-accent underline-offset-2 hover:underline">Cabeçalho dos Documentos</Link> e a assinatura institucional.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="donor-email-subject" className="mb-1.5 block text-sm font-medium text-fg">Assunto</label>
              <input
                id="donor-email-subject"
                value={template.assunto}
                onChange={(event) => { setTemplate((value) => ({ ...value, assunto: event.target.value })); setMessage(null); setTestMessage(null); }}
                maxLength={160}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
              />
            </div>
            <div>
              <label htmlFor="donor-email-body" className="mb-1.5 block text-sm font-medium text-fg">Mensagem</label>
              <textarea
                id="donor-email-body"
                value={template.corpo}
                onChange={(event) => { setTemplate((value) => ({ ...value, corpo: event.target.value })); setMessage(null); setTestMessage(null); }}
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
            <div className="px-6 pt-5"><DocumentHeaderPreview header={header} /></div>
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

      <section className="border-t border-border pt-6" aria-labelledby="test-email-heading">
        <h2 id="test-email-heading" className="text-base font-semibold text-fg">Enviar e-mail de teste</h2>
        <p className="mt-1 max-w-[70ch] text-sm text-muted">
          Envie o texto que está na tela para conferir o resultado. O teste não salva alterações e o assunto recebe [TESTE].
        </p>
        <form onSubmit={(event) => void sendTest(event)} className="mt-4 flex max-w-[720px] flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label htmlFor="donor-test-email" className="mb-1.5 block text-sm font-medium text-fg">E-mail de destino</label>
            <input
              id="donor-test-email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
              value={testEmail}
              onChange={(event) => { setTestEmail(event.target.value); setTestMessage(null); }}
              placeholder="nome@exemplo.com"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none placeholder:text-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
            />
          </div>
          <button
            type="submit"
            disabled={sendingTest || !smtpConfigured || !testEmail.trim()}
            className="rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sendingTest ? "Enviando..." : "Enviar teste"}
          </button>
        </form>
        <p role={testMessage?.type === "error" ? "alert" : "status"} aria-live="polite" className={`mt-2 text-sm ${testMessage?.type === "error" ? "text-danger" : "text-success"}`}>
          {testMessage?.text}
        </p>
      </section>

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
