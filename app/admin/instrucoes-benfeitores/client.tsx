"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { InstitutionalEmailPreview } from "../_components/institutional-email-preview";
import {
  previewDonorMonthlyInstructionsTemplate,
  saveDonorMonthlyInstructionsTemplate,
  sendDonorMonthlyInstructionsTest,
} from "../_actions/donor-monthly-instructions-actions";
import {
  DONOR_MONTHLY_INSTRUCTIONS_SAMPLE_LINK,
  DONOR_MONTHLY_INSTRUCTIONS_TOKENS,
  type DonorMonthlyInstructionsTemplate,
} from "@/lib/email/donor-monthly-instructions-template";

import type { DocumentHeaderData } from "@/lib/documents/document-header";

type Preview = { assunto: string; bodyHtml: string };
type Notice = { type: "success" | "error"; text: string };

export function DonorMonthlyInstructionsClient({
  initialTemplate, initialPreview, header, resendConfigured,
}: {
  initialTemplate: DonorMonthlyInstructionsTemplate;
  initialPreview: Preview;
  header: DocumentHeaderData;
  resendConfigured: boolean;
}) {
  const [template, setTemplate] = useState(initialTemplate);
  const [saved, setSaved] = useState(initialTemplate);
  const [previewed, setPreviewed] = useState(initialTemplate);
  const [preview, setPreview] = useState(initialPreview);
  const [previewHeader, setPreviewHeader] = useState(header);
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState<"save" | "preview" | "test" | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [testNotice, setTestNotice] = useState<Notice | null>(null);
  const dirty = template.assunto !== saved.assunto || template.corpo !== saved.corpo;
  const previewDirty = template.assunto !== previewed.assunto || template.corpo !== previewed.corpo;

  function change(field: keyof DonorMonthlyInstructionsTemplate, value: string) {
    setTemplate((current) => ({ ...current, [field]: value }));
    setNotice(null);
    setTestNotice(null);
  }

  async function updatePreview() {
    setBusy("preview");
    setNotice(null);
    try {
      const result = await previewDonorMonthlyInstructionsTemplate(template);
      if (result.success) {
        setPreview(result.preview);
        setPreviewHeader(result.preview.header);
        setPreviewed(template);
      } else {
        setNotice({ type: "error", text: result.error });
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
      const result = await saveDonorMonthlyInstructionsTemplate(template);
      if (result.success) {
        setSaved(result.template);
        setTemplate(result.template);
        setNotice({ type: "success", text: "Modelo salvo. Os próximos envios usarão este texto." });
      } else {
        setNotice({ type: "error", text: result.error });
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
      const result = await sendDonorMonthlyInstructionsTest({ ...template, email: testEmail });
      setTestNotice(result.success
        ? { type: "success", text: `Teste aceito pelo Resend para ${testEmail.trim()}.` }
        : { type: "error", text: result.error });
    } catch {
      setTestNotice({ type: "error", text: "Não foi possível enviar o teste. Tente novamente." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      {!resendConfigured && <p role="status" className="rounded-md border border-warn/50 bg-warn/10 px-4 py-3 text-sm text-fg">
        O envio de testes está indisponível. Configure RESEND_API_KEY e RESEND_FROM no servidor.
      </p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5" aria-labelledby="monthly-editor-heading">
          <h2 id="monthly-editor-heading" className="text-base font-semibold text-fg">Conteúdo das instruções</h2>
          <p className="mt-1 text-sm text-muted">O e-mail usa o <Link href="/admin/cabecalho" className="text-accent underline-offset-2 hover:underline">Cabeçalho e rodapé</Link>.</p>
          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="monthly-subject" className="mb-1.5 block text-sm font-medium text-fg">Assunto</label>
              <input id="monthly-subject" value={template.assunto} onChange={(event) => change("assunto", event.target.value)}
                disabled={busy !== null} maxLength={160}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20" />
            </div>
            <div>
              <label htmlFor="monthly-body" className="mb-1.5 block text-sm font-medium text-fg">Mensagem</label>
              <textarea id="monthly-body" value={template.corpo} onChange={(event) => change("corpo", event.target.value)}
                disabled={busy !== null} maxLength={10000} rows={16}
                aria-describedby="monthly-body-help"
                className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-fg outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20" />
              <p id="monthly-body-help" className="mt-1 text-xs text-muted">Separe os parágrafos com uma linha em branco.</p>
            </div>
            <div aria-label="Tokens permitidos" className="rounded-md border border-border bg-bg px-4 py-3 text-xs text-muted">
              <p className="font-medium text-fg">Valores disponíveis</p>
              <ul className="mt-2 space-y-1">
                {DONOR_MONTHLY_INSTRUCTIONS_TOKENS.map((token) => <li key={token.name}>
                  <code className="text-fg">{`{${token.name}}`}</code> — {token.description}
                  {token.requiredInBody ? "; obrigatório no texto" : "; opcional"}
                  {!token.subjectAllowed ? "; somente no texto" : ""}
                </li>)}
              </ul>
              <p className="mt-2">O link obrigatório do comprovante do primeiro pagamento deve aparecer exatamente uma vez no texto e não pode estar no assunto. Cada pagamento mensal exige seu próprio comprovante; os links posteriores correspondem à parcela indicada. Todos os dados de pagamento marcados como obrigatórios devem constar no texto.</p>
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
          {notice && <p role={notice.type === "error" ? "alert" : "status"} aria-live="polite" className={`mt-2 text-sm ${notice.type === "error" ? "text-danger" : "text-success"}`}>{notice.text}</p>}
        </section>

        <section role="region" aria-label="Pré-visualização" className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-fg">Pré-visualização</h2>
          <p className="mt-1 text-sm text-muted">Exemplo com vencimento no dia 30, ajustado para 28 de fevereiro. O link do primeiro comprovante abaixo é ilustrativo e não permite enviar comprovantes. Cada pagamento mensal exige um comprovante próprio.</p>
          {previewDirty && <p role="status" className="mt-2 text-sm text-warn">O texto foi alterado. Atualize a prévia para ver esta versão.</p>}
          <div className="mt-5 overflow-hidden rounded-md border border-border bg-white">
            <div className="border-b border-border px-5 py-3 text-xs text-muted"><span className="font-medium text-fg">Assunto:</span> {preview.assunto}</div>
            <InstitutionalEmailPreview bodyHtml={preview.bodyHtml} header={previewHeader} />
          </div>
          <p className="mt-2 break-all text-xs text-muted">Link de exemplo sem validade: <code>{DONOR_MONTHLY_INSTRUCTIONS_SAMPLE_LINK}</code></p>
        </section>
      </div>

      <section className="border-t border-border pt-6" aria-labelledby="monthly-test-heading">
        <h2 id="monthly-test-heading" className="text-base font-semibold text-fg">Enviar e-mail de teste</h2>
        <p className="mt-1 max-w-[70ch] text-sm text-muted">Envia o texto da tela apenas ao endereço informado, sem salvar alterações ou registrar um envio para benfeitor. O assunto recebe [TESTE] e o link ilustrativo não funciona.</p>
        <form onSubmit={(event) => void sendTest(event)} className="mt-4 flex max-w-[720px] flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label htmlFor="monthly-test-email" className="mb-1.5 block text-sm font-medium text-fg">E-mail de destino do teste</label>
            <input id="monthly-test-email" type="email" required autoComplete="email" maxLength={254} value={testEmail}
              onChange={(event) => { setTestEmail(event.target.value); setTestNotice(null); }}
              placeholder="nome@exemplo.com"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none placeholder:text-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20" />
          </div>
          <button type="submit" disabled={busy !== null || !resendConfigured || !testEmail.trim()}
            className="rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50">
            {busy === "test" ? "Enviando teste..." : "Enviar teste"}
          </button>
        </form>
        {testNotice && <p role={testNotice.type === "error" ? "alert" : "status"} aria-live="polite" className={`mt-2 text-sm ${testNotice.type === "error" ? "text-danger" : "text-success"}`}>{testNotice.text}</p>}
      </section>
    </div>
  );
}
