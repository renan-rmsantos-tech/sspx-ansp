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
  getDonorReminderDashboard,
  previewDonorReminderTemplate,
  resolveUncertainDonorReminder,
  retryFailedDonorReminder,
  saveDonorReminderTemplate,
  sendDonorReminderTest,
} from "../../_actions/donor-reminder-actions";
import { DONOR_REMINDER_SAMPLE_LINK } from "@/lib/email/donor-reminder-template";
import type { DocumentHeaderData } from "@/lib/documents/document-header";

type Template = { assunto: string; corpo: string };
type Preview = { assunto: string; bodyHtml: string };
type Send = Awaited<ReturnType<typeof getDonorReminderDashboard>>["sends"][number];
type Message = { type: "success" | "error"; text: string };

const CARD = "rounded-lg border border-border bg-surface p-5";

const TOKENS = [
  ["{nome}", "nome do benfeitor"],
  ["{valor}", "valor mensal"],
  ["{data_vencimento}", "data do vencimento"],
  ["{mes_referencia}", "mês da contribuição"],
  ["{chave_pix}", "chave Pix"],
  ["{link_comprovante}", "link do comprovante, obrigatório uma vez no texto"],
] as const;

const ERROR_LABELS: Record<string, string> = {
  provider_rejected: "Envio recusado pelo Resend",
  provider_timeout: "Tempo de resposta esgotado; confira o Resend",
  provider_unavailable: "Resend indisponível; confira o painel",
  configuration: "Configuração de envio incompleta",
  database: "Falha ao registrar o resultado",
  invalid_recipient: "Destinatário inválido",
  unknown: "Resultado não confirmado",
};

const STATUS_LABELS: Record<Send["status"], string> = {
  sent: "Aceito pelo Resend",
  failed: "Falhou",
  sending: "Em andamento",
  uncertain: "Resultado incerto",
};

function resultLabel(status: string) {
  const labels: Record<string, string> = {
    sent: "Envio aceito pelo Resend.",
    already_sent: "Este lembrete já foi aceito pelo Resend.",
    in_progress: "O envio está em andamento. Aguarde antes de tentar novamente.",
    skipped_paid: "A contribuição já foi confirmada; lembrete não enviado.",
    skipped_receipt: "O comprovante desta competência já foi enviado; lembrete dispensado.",
    expired: "O prazo de reenvio terminou ou o lembrete não está mais elegível.",
    uncertain: "Resultado incerto. Confira o Resend antes de registrar o resultado.",
    failed: "O envio falhou. Confira a configuração e tente novamente dentro do prazo.",
  };
  return labels[status] ?? "Não foi possível concluir a operação.";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function DonorReminderClient({
  initialTemplate, initialPreview, initialSends, header, resendConfigured,
}: {
  initialTemplate: Template;
  initialPreview: Preview;
  initialSends: Send[];
  header: DocumentHeaderData;
  resendConfigured: boolean;
}) {
  const [template, setTemplate] = useState(initialTemplate);
  const [saved, setSaved] = useState(initialTemplate);
  const [preview, setPreview] = useState(initialPreview);
  const [previewHeader, setPreviewHeader] = useState(header);
  const [previewed, setPreviewed] = useState(initialTemplate);
  const [sends, setSends] = useState(initialSends);
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState<"save" | "preview" | "test" | string | null>(null);
  const [notice, setNotice] = useState<Message | null>(null);
  const [testNotice, setTestNotice] = useState<Message | null>(null);
  const [sendNotice, setSendNotice] = useState<Message | null>(null);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const dirty = template.assunto !== saved.assunto || template.corpo !== saved.corpo;
  const previewDirty = template.assunto !== previewed.assunto || template.corpo !== previewed.corpo;

  function change(field: keyof Template, value: string) {
    setTemplate((current) => ({ ...current, [field]: value }));
    setNotice(null);
    setTestNotice(null);
  }

  async function updatePreview() {
    setBusy("preview");
    setNotice(null);
    try {
      const result = await previewDonorReminderTemplate(template);
      if (result.success && result.preview) {
        setPreview(result.preview);
        setPreviewHeader(result.preview.header);
        setPreviewed(template);
      } else {
        setNotice({ type: "error", text: result.error ?? "Não foi possível atualizar a prévia." });
      }
    } catch {
      setNotice({ type: "error", text: "Não foi possível atualizar a prévia. Tente novamente." });
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    setNotice(null);
    try {
      const result = await saveDonorReminderTemplate(template);
      if (result.success && result.template) {
        setSaved(result.template);
        setTemplate(result.template);
        setNotice({ type: "success", text: "Modelo salvo. Os próximos lembretes usarão este texto." });
      } else {
        setNotice({ type: "error", text: result.error ?? "Não foi possível salvar o modelo." });
      }
    } catch {
      setNotice({ type: "error", text: "Não foi possível salvar o modelo. Tente novamente." });
    } finally {
      setBusy(null);
    }
  }

  async function sendTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("test");
    setTestNotice(null);
    try {
      const result = await sendDonorReminderTest({ ...template, email: testEmail });
      setTestNotice(result.success
        ? { type: "success", text: `Teste aceito pelo Resend para ${testEmail.trim()}.` }
        : { type: "error", text: result.error ?? "Não foi possível enviar o teste." });
    } catch {
      setTestNotice({ type: "error", text: "Não foi possível enviar o teste. Tente novamente." });
    } finally {
      setBusy(null);
    }
  }

  async function refreshSends() {
    const result = await getDonorReminderDashboard();
    setSends(result.sends);
  }

  async function retry(id: string) {
    setBusy(id);
    setSendNotice(null);
    try {
      const result = await retryFailedDonorReminder(id);
      await refreshSends();
      setSendNotice({
        type: result.status === "sent" || result.status === "already_sent" ? "success" : "error",
        text: resultLabel(result.status),
      });
    } catch {
      setSendNotice({ type: "error", text: "Não foi possível consultar o resultado. Atualize a página." });
    } finally {
      setBusy(null);
    }
  }

  async function resolve(id: string, resolution: "accepted" | "failed") {
    setBusy(id);
    setSendNotice(null);
    try {
      const result = await resolveUncertainDonorReminder(id, resolution);
      if (result.success) {
        await refreshSends();
        setReviewed((current) => current.filter((item) => item !== id));
        setSendNotice({ type: "success", text: resolution === "accepted"
          ? "Envio registrado como aceito pelo Resend."
          : "Envio registrado como falha. O reenvio depende do prazo e da preferência atual." });
      } else {
        setSendNotice({ type: "error", text: result.error ?? "Não foi possível registrar a revisão." });
      }
    } catch {
      setSendNotice({ type: "error", text: "Não foi possível registrar a revisão. Tente novamente." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      {!resendConfigured && (
        <Notice tone="warn">O envio está indisponível. Configure RESEND_API_KEY e RESEND_FROM no servidor.</Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Conteúdo do lembrete" className={CARD}>
          <p className="text-sm text-muted">
            Enviado 10 e 5 dias antes do vencimento a quem optou por lembretes. O e-mail usa o{" "}
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
                  rows={14}
                  className="resize-y bg-surface leading-relaxed"
                />
              )}
            </Field>
            <div aria-label="Tokens permitidos" className="rounded-md border border-border bg-bg px-4 py-3 text-xs text-muted">
              <p className="font-medium text-fg">Valores disponíveis</p>
              <ul className="mt-2 space-y-1">
                {TOKENS.map(([token, label]) => <li key={token}><code className="text-fg">{token}</code> — {label}</li>)}
              </ul>
              <p className="mt-2">No assunto, use os cinco primeiros valores. O link deve aparecer uma vez na mensagem e permanece obrigatório para os lembretes reais.</p>
            </div>
          </div>
          {notice && (
            <Notice tone={notice.type === "error" ? "danger" : "success"}>{notice.text}</Notice>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button size="lg" onClick={() => void save()} disabled={busy !== null || !dirty}>
              {busy === "save" ? "Salvando modelo…" : "Salvar modelo"}
            </Button>
            <Button variant="outline" size="lg" onClick={() => void updatePreview()} disabled={busy !== null}>
              {busy === "preview" ? "Atualizando prévia…" : "Atualizar prévia"}
            </Button>
          </div>
        </Section>

        <Section title="Pré-visualização" description="Amostra com valores fictícios e o cabeçalho atual." className={CARD}>
          {previewDirty && (
            <Notice tone="warn">O texto foi alterado. Atualize a prévia para ver o novo conteúdo.</Notice>
          )}
          <div className="overflow-hidden rounded-md border border-border bg-white">
            <div className="border-b border-border px-5 py-3 text-xs text-muted"><span className="font-medium text-fg">Assunto:</span> {preview.assunto}</div>
            <InstitutionalEmailPreview bodyHtml={preview.bodyHtml} header={previewHeader} />
          </div>
          <p className="text-xs text-muted">Link fictício, sem validade para envio de comprovante: <code className="break-all">{DONOR_REMINDER_SAMPLE_LINK}</code></p>
        </Section>
      </div>

      <Section
        title="Enviar teste"
        description="O teste usa o texto na tela, recebe [TESTE] no assunto e vai apenas para o endereço informado. O link de comprovante é fictício e o teste não cria um lembrete programado."
        className="border-t border-border pt-6"
      >
        <form onSubmit={(event) => void sendTest(event)} className="flex max-w-[720px] flex-wrap items-end gap-3">
          <Field label="E-mail de destino do teste" className="min-w-[240px] flex-1">
            {(a11y) => (
              <Input
                {...a11y}
                type="email"
                required
                autoComplete="email"
                maxLength={254}
                value={testEmail}
                onChange={(event) => { setTestEmail(event.target.value); setTestNotice(null); }}
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
            disabled={busy !== null || !resendConfigured || !testEmail.trim()}
          >
            {busy === "test" ? "Enviando teste…" : "Enviar teste"}
          </Button>
        </form>
        {testNotice && (
          <Notice tone={testNotice.type === "error" ? "danger" : "success"}>{testNotice.text}</Notice>
        )}
      </Section>

      <Section
        title="Lembretes que exigem atenção"
        description="Até 50 falhas, resultados incertos ou envios em andamento. Envios aceitos deixam esta lista; a aceitação pelo Resend não comprova entrega à caixa de entrada."
      >
        {sendNotice && (
          <Notice tone={sendNotice.type === "error" ? "danger" : "success"}>{sendNotice.text}</Notice>
        )}
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {sends.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">Nenhum lembrete exige atenção.</p>
          ) : (
            <ul className="divide-y divide-border">
              {sends.map((send) => (
                <li key={send.id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-fg">{send.nome} · {send.kind === "10d" ? "10 dias" : "5 dias"} · {send.competencia}</p>
                    <p className="mt-1 text-muted">Vencimento: {send.due_date} · Tentativas: {send.attempt_count}</p>
                    <p className="mt-1 text-muted">
                      Estado: <span className="font-medium text-fg">{STATUS_LABELS[send.status]}</span>
                      {send.error_code ? ` · ${ERROR_LABELS[send.error_code] ?? "Falha registrada"}` : ""}
                    </p>
                    {send.status === "sent" && send.sent_at && <p className="mt-1 text-xs text-muted">Aceito em {formatDateTime(send.sent_at)}</p>}
                    {send.status === "uncertain" && (
                      <div className="mt-2 max-w-[65ch] text-xs text-muted">
                        Confira este envio no painel do Resend antes de registrar se foi aceito ou falhou. Uma falha só poderá ser reenviada dentro do prazo.
                        {send.frozen_recipient && <p className="mt-1">Destinatário: <span className="break-all text-fg">{send.frozen_recipient}</span></p>}
                        {send.provider_call_started_at && <p className="mt-1">Tentativa iniciada em {formatDateTime(send.provider_call_started_at)}</p>}
                        {send.provider_message_id && <p className="mt-1">ID no Resend: <code className="break-all">{send.provider_message_id}</code></p>}
                        <label className="mt-2 flex items-center gap-2 text-fg">
                          <input
                            type="checkbox"
                            className="size-4 accent-accent"
                            checked={reviewed.includes(send.id)}
                            onChange={(event) => setReviewed((current) => event.target.checked ? [...current, send.id] : current.filter((item) => item !== send.id))}
                          />
                          Consultei o resultado no Resend
                        </label>
                      </div>
                    )}
                    {send.status === "failed" && !send.can_retry && <p className="mt-2 text-xs text-muted">Reenvio indisponível: prazo encerrado ou preferência alterada.</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {send.status === "failed" && send.can_retry && (
                      <Button variant="outline" size="sm" onClick={() => void retry(send.id)} disabled={busy !== null || !resendConfigured}>
                        {busy === send.id ? "Reenviando…" : "Reenviar falha"}
                      </Button>
                    )}
                    {send.status === "uncertain" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => void resolve(send.id, "accepted")} disabled={busy !== null || !reviewed.includes(send.id)}>
                          Registrar aceito
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => void resolve(send.id, "failed")} disabled={busy !== null || !reviewed.includes(send.id)}>
                          Registrar falha
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>
    </div>
  );
}
