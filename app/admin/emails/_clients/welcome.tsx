"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "../../_components/field";
import { InstitutionalEmailPreview } from "../../_components/institutional-email-preview";
import { Notice } from "../../_components/notice";
import { Section } from "../../_components/section";
import {
  retryDonorWelcomeEmail,
  saveDonorEmailTemplate,
  sendDonorTestEmail,
} from "../../_actions/donor-email-actions";
import { renderDonorWelcomeEmail } from "@/lib/email/donor-welcome-template";
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

type Message = { type: "success" | "error"; text: string };

const CARD = "rounded-lg border border-border bg-surface p-5";

export function DonorEmailClient({
  initialTemplate,
  initialPending,
  header,
  resendConfigured,
}: {
  initialTemplate: EmailTemplate;
  initialPending: PendingDonor[];
  header: DocumentHeaderData;
  resendConfigured: boolean;
}) {
  const [template, setTemplate] = useState(initialTemplate);
  const [saved, setSaved] = useState(initialTemplate);
  const [pending, setPending] = useState(initialPending);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [retryError, setRetryError] = useState<{ id: string; text: string } | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testMessage, setTestMessage] = useState<Message | null>(null);
  const dirty = template.assunto !== saved.assunto || template.corpo !== saved.corpo;

  function change(field: keyof EmailTemplate, value: string) {
    setTemplate((current) => ({ ...current, [field]: value }));
    setMessage(null);
    setTestMessage(null);
  }

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
      if (result.status === "sent" || result.status === "already_sent" || result.success) {
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
      {!resendConfigured && (
        <Notice tone="warn">
          O envio está indisponível. Configure RESEND_API_KEY e RESEND_FROM no servidor para enviar e-mails.
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Conteúdo da mensagem" className={CARD}>
          <p className="text-sm text-muted">
            Enviada uma vez, logo após o cadastro do benfeitor. O e-mail usa o{" "}
            <Link href="/admin/cabecalho" className="font-medium text-accent underline-offset-2 hover:underline">
              Cabeçalho e rodapé
            </Link>
            .
          </p>
          <div className="space-y-4 pt-2">
            <Field label="Assunto">
              {(a11y) => (
                <Input
                  {...a11y}
                  value={template.assunto}
                  onChange={(event) => change("assunto", event.target.value)}
                  maxLength={160}
                  className="h-10 bg-surface"
                />
              )}
            </Field>
            <Field label="Mensagem" hint="Separe os parágrafos com uma linha em branco.">
              {(a11y) => (
                <Textarea
                  {...a11y}
                  value={template.corpo}
                  onChange={(event) => change("corpo", event.target.value)}
                  maxLength={10000}
                  rows={16}
                  className="resize-y bg-surface leading-relaxed"
                />
              )}
            </Field>
          </div>
          {message && (
            <Notice tone={message.type === "error" ? "danger" : "success"}>{message.text}</Notice>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button size="lg" onClick={() => void save()} disabled={saving || !dirty}>
              {saving ? "Salvando…" : "Salvar modelo"}
            </Button>
          </div>
        </Section>

        <Section
          title="Pré-visualização"
          description="Esta é uma amostra do texto em HTML enviado ao benfeitor."
          className={CARD}
        >
          <div className="overflow-hidden rounded-md border border-border bg-white">
            <div className="border-b border-border px-5 py-3 text-xs text-muted">
              <span className="font-medium text-fg">Assunto:</span> {template.assunto || "—"}
            </div>
            <InstitutionalEmailPreview bodyHtml={renderDonorWelcomeEmail(template.corpo).bodyHtml} header={header} />
          </div>
        </Section>
      </div>

      <Section
        title="Enviar e-mail de teste"
        description="Envie o texto que está na tela para conferir o resultado. O teste não salva alterações e o assunto recebe [TESTE]."
        className="border-t border-border pt-6"
      >
        <form onSubmit={(event) => void sendTest(event)} className="flex max-w-[720px] flex-wrap items-end gap-3">
          <Field label="E-mail de destino" className="min-w-[240px] flex-1">
            {(a11y) => (
              <Input
                {...a11y}
                type="email"
                required
                autoComplete="email"
                maxLength={254}
                value={testEmail}
                onChange={(event) => { setTestEmail(event.target.value); setTestMessage(null); }}
                placeholder="nome@exemplo.com"
                className="h-10 bg-surface"
              />
            )}
          </Field>
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="h-10"
            disabled={sendingTest || !resendConfigured || !testEmail.trim()}
          >
            {sendingTest ? "Enviando…" : "Enviar teste"}
          </Button>
        </form>
        {testMessage && (
          <Notice tone={testMessage.type === "error" ? "danger" : "success"}>{testMessage.text}</Notice>
        )}
      </Section>

      <Section
        title="Envios pendentes"
        description="Até 50 cadastros sem envio confirmado. Use o reenvio após resolver uma falha no Resend."
      >
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void retry(donor.id)}
                    disabled={sendingId !== null || !resendConfigured}
                    aria-label={`Enviar e-mail para ${donor.nome}`}
                  >
                    {sendingId === donor.id ? "Enviando…" : "Enviar e-mail"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>
    </div>
  );
}
