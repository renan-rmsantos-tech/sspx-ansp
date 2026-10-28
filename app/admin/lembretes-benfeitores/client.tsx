"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { InstitutionalEmailPreview } from "../_components/institutional-email-preview";
import {
  getDonorReminderDashboard,
  previewDonorReminderTemplate,
  resolveUncertainDonorReminder,
  retryFailedDonorReminder,
  saveDonorReminderTemplate,
  sendDonorReminderTest,
} from "../_actions/donor-reminder-actions";

import { DONOR_REMINDER_SAMPLE_LINK } from "@/lib/email/donor-reminder-template";
import type { DocumentHeaderData } from "@/lib/documents/document-header";

type Template = { assunto: string; corpo: string };
type Preview = { assunto: string; bodyHtml: string };
type Send = Awaited<ReturnType<typeof getDonorReminderDashboard>>["sends"][number];
type Notice = { type: "success" | "error"; text: string };

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
  const [notice, setNotice] = useState<Notice | null>(null);
  const [testNotice, setTestNotice] = useState<Notice | null>(null);
  const [sendNotice, setSendNotice] = useState<Notice | null>(null);
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
      {!resendConfigured && <p role="status" className="rounded-md border border-warn/50 bg-warn/10 px-4 py-3 text-sm text-fg">
        O envio está indisponível. Configure RESEND_API_KEY e RESEND_FROM no servidor.
      </p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5" aria-labelledby="reminder-editor-heading">
          <h2 id="reminder-editor-heading" className="text-base font-semibold text-fg">Conteúdo do lembrete</h2>
          <p className="mt-1 text-sm text-muted">O e-mail usa o <Link href="/admin/cabecalho" className="text-accent underline-offset-2 hover:underline">Cabeçalho e rodapé</Link>.</p>
          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="reminder-subject" className="mb-1.5 block text-sm font-medium text-fg">Assunto</label>
              <input id="reminder-subject" value={template.assunto} onChange={(event) => change("assunto", event.target.value)} maxLength={160}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20" />
            </div>
            <div>
              <label htmlFor="reminder-body" className="mb-1.5 block text-sm font-medium text-fg">Mensagem</label>
              <textarea id="reminder-body" value={template.corpo} onChange={(event) => change("corpo", event.target.value)} maxLength={10000} rows={14}
                className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-fg outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20" />
              <p className="mt-1 text-xs text-muted">Separe os parágrafos com uma linha em branco.</p>
            </div>
            <div aria-label="Tokens permitidos" className="rounded-md border border-border bg-bg px-4 py-3 text-xs text-muted">
              <p className="font-medium text-fg">Valores disponíveis</p>
              <ul className="mt-2 space-y-1">
                {TOKENS.map(([token, label]) => <li key={token}><code className="text-fg">{token}</code> — {label}</li>)}
              </ul>
              <p className="mt-2">No assunto, use os cinco primeiros valores. O link deve aparecer uma vez na mensagem e permanece obrigatório para os lembretes reais.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void save()} disabled={busy !== null || !dirty}
              className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50">
              {busy === "save" ? "Salvando modelo..." : "Salvar modelo"}
            </button>
            <button type="button" onClick={() => void updatePreview()} disabled={busy !== null}
              className="rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50">
              {busy === "preview" ? "Atualizando prévia..." : "Atualizar prévia"}
            </button>
          </div>
          <p role={notice?.type === "error" ? "alert" : "status"} aria-live="polite" className={`mt-2 text-sm ${notice?.type === "error" ? "text-danger" : "text-success"}`}>{notice?.text}</p>
        </section>

        <section role="region" className="rounded-lg border border-border bg-surface p-5" aria-label="Pré-visualização">
          <h2 className="text-base font-semibold text-fg">Pré-visualização</h2>
          <p className="mt-1 text-sm text-muted">Amostra com valores fictícios e o cabeçalho atual.</p>
          {previewDirty && <p role="status" className="mt-2 text-xs text-warn">O texto foi alterado. Atualize a prévia para ver o novo conteúdo.</p>}
          <div className="mt-5 overflow-hidden rounded-md border border-border bg-white">
            <div className="border-b border-border px-5 py-3 text-xs text-muted"><span className="font-medium text-fg">Assunto:</span> {preview.assunto}</div>
            <InstitutionalEmailPreview bodyHtml={preview.bodyHtml} header={previewHeader} />
          </div>
          <p className="mt-3 text-xs text-muted">Link fictício, sem validade para envio de comprovante: <code className="break-all">{DONOR_REMINDER_SAMPLE_LINK}</code></p>
        </section>
      </div>

      <section className="border-t border-border pt-6" aria-labelledby="reminder-test-heading">
        <h2 id="reminder-test-heading" className="text-base font-semibold text-fg">Enviar teste</h2>
        <p className="mt-1 max-w-[70ch] text-sm text-muted">O teste usa o texto na tela, recebe [TESTE] no assunto e vai apenas para o endereço informado. O link de comprovante é fictício e o teste não cria um lembrete programado.</p>
        <form onSubmit={(event) => void sendTest(event)} className="mt-4 flex max-w-[720px] flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label htmlFor="reminder-test-email" className="mb-1.5 block text-sm font-medium text-fg">E-mail de destino do teste</label>
            <input id="reminder-test-email" type="email" required autoComplete="email" maxLength={254} value={testEmail} onChange={(event) => { setTestEmail(event.target.value); setTestNotice(null); }} placeholder="nome@exemplo.com"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20" />
          </div>
          <button type="submit" disabled={busy !== null || !resendConfigured || !testEmail.trim()}
            className="rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50">
            {busy === "test" ? "Enviando teste..." : "Enviar teste"}
          </button>
        </form>
        <p role={testNotice?.type === "error" ? "alert" : "status"} aria-live="polite" className={`mt-2 text-sm ${testNotice?.type === "error" ? "text-danger" : "text-success"}`}>{testNotice?.text}</p>
      </section>

      <section aria-labelledby="reminder-sends-heading">
        <h2 id="reminder-sends-heading" className="text-base font-semibold text-fg">Lembretes que exigem atenção</h2>
        <p className="mt-1 text-sm text-muted">Até 50 falhas, resultados incertos ou envios em andamento. Envios aceitos deixam esta lista; a aceitação pelo Resend não comprova entrega à caixa de entrada.</p>
        <p role={sendNotice?.type === "error" ? "alert" : "status"} aria-live="polite" className={`mt-2 text-sm ${sendNotice?.type === "error" ? "text-danger" : "text-success"}`}>{sendNotice?.text}</p>
        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
          {sends.length === 0 ? <p className="px-5 py-6 text-sm text-muted">Nenhum lembrete exige atenção.</p> :
            <ul className="divide-y divide-border">{sends.map((send) => (
              <li key={send.id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-fg">{send.nome} · {send.kind === "10d" ? "10 dias" : "5 dias"} · {send.competencia}</p>
                  <p className="mt-1 text-muted">Vencimento: {send.due_date} · Tentativas: {send.attempt_count}</p>
                  <p className="mt-1 text-muted">Estado: <span className="font-medium text-fg">{{ sent: "Aceito pelo Resend", failed: "Falhou", sending: "Em andamento", uncertain: "Resultado incerto" }[send.status]}</span>{send.error_code ? ` · ${ERROR_LABELS[send.error_code] ?? "Falha registrada"}` : ""}</p>
                  {send.status === "sent" && send.sent_at && <p className="mt-1 text-xs text-muted">Aceito em {new Date(send.sent_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>}
                  {send.status === "uncertain" && <div className="mt-2 max-w-[65ch] text-xs text-muted">
                    Confira este envio no painel do Resend antes de registrar se foi aceito ou falhou. Uma falha só poderá ser reenviada dentro do prazo.
                    {send.frozen_recipient && <p className="mt-1">Destinatário: <span className="break-all text-fg">{send.frozen_recipient}</span></p>}
                    {send.provider_call_started_at && <p className="mt-1">Tentativa iniciada em {new Date(send.provider_call_started_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>}
                    {send.provider_message_id && <p className="mt-1">ID no Resend: <code className="break-all">{send.provider_message_id}</code></p>}
                    <label className="mt-2 flex items-center gap-2 text-fg"><input type="checkbox" checked={reviewed.includes(send.id)} onChange={(event) => setReviewed((current) => event.target.checked ? [...current, send.id] : current.filter((item) => item !== send.id))} />Consultei o resultado no Resend</label>
                  </div>}
                  {send.status === "failed" && !send.can_retry && <p className="mt-2 text-xs text-muted">Reenvio indisponível: prazo encerrado ou preferência alterada.</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {send.status === "failed" && send.can_retry && <button type="button" onClick={() => void retry(send.id)} disabled={busy !== null || !resendConfigured} className="rounded-md border border-accent px-3 py-2 text-sm font-medium text-accent hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">{busy === send.id ? "Reenviando..." : "Reenviar falha"}</button>}
                  {send.status === "uncertain" && <>
                    <button type="button" onClick={() => void resolve(send.id, "accepted")} disabled={busy !== null || !reviewed.includes(send.id)} className="rounded-md border border-accent px-3 py-2 text-sm font-medium text-accent hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">Registrar aceito</button>
                    <button type="button" onClick={() => void resolve(send.id, "failed")} disabled={busy !== null || !reviewed.includes(send.id)} className="rounded-md border border-danger px-3 py-2 text-sm font-medium text-danger hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50">Registrar falha</button>
                  </>}
                </div>
              </li>
            ))}</ul>}
        </div>
      </section>
    </div>
  );
}
