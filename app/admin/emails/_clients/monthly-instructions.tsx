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
  previewDonorMonthlyInstructionsTemplate,
  saveDonorMonthlyInstructionsTemplate,
  sendDonorMonthlyInstructionsTest,
} from "../../_actions/donor-monthly-instructions-actions";
import {
  DONOR_MONTHLY_INSTRUCTIONS_SAMPLE_LINK,
  DONOR_MONTHLY_INSTRUCTIONS_TOKENS,
  type DonorMonthlyInstructionsTemplate,
} from "@/lib/email/donor-monthly-instructions-template";
import type { DocumentHeaderData } from "@/lib/documents/document-header";

type Preview = { assunto: string; bodyHtml: string };
type Message = { type: "success" | "error"; text: string };

const CARD = "rounded-lg border border-border bg-surface p-5";

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
  const [notice, setNotice] = useState<Message | null>(null);
  const [testNotice, setTestNotice] = useState<Message | null>(null);
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
      {!resendConfigured && (
        <Notice tone="warn">
          O envio de testes está indisponível. Configure RESEND_API_KEY e RESEND_FROM no servidor.
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Conteúdo das instruções" className={CARD}>
          <p className="text-sm text-muted">
            Enviadas após o cadastro mensal, independentemente da opção por lembretes. O e-mail usa o{" "}
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
                  disabled={busy !== null}
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
                  disabled={busy !== null}
                  maxLength={10000}
                  rows={16}
                  className="resize-y bg-surface leading-relaxed"
                />
              )}
            </Field>
            <div aria-label="Tokens permitidos" className="rounded-md border border-border bg-bg px-4 py-3 text-xs text-muted">
              <p className="font-medium text-fg">Valores disponíveis</p>
              <ul className="mt-2 space-y-1">
                {DONOR_MONTHLY_INSTRUCTIONS_TOKENS.map((token) => (
                  <li key={token.name}>
                    <code className="text-fg">{`{${token.name}}`}</code> — {token.description}
                    {token.requiredInBody ? "; obrigatório no texto" : "; opcional"}
                    {!token.subjectAllowed ? "; somente no texto" : ""}
                  </li>
                ))}
              </ul>
              <p className="mt-2">O link obrigatório do comprovante do primeiro pagamento deve aparecer exatamente uma vez no texto e não pode estar no assunto. Cada pagamento mensal exige seu próprio comprovante; os links posteriores correspondem à parcela indicada. Todos os dados de pagamento marcados como obrigatórios devem constar no texto.</p>
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

        <Section
          title="Pré-visualização"
          description="Exemplo com vencimento no dia 30, ajustado para 28 de fevereiro. O link do primeiro comprovante abaixo é ilustrativo e não permite enviar comprovantes. Cada pagamento mensal exige um comprovante próprio."
          className={CARD}
        >
          {previewDirty && (
            <Notice tone="warn">O texto foi alterado. Atualize a prévia para ver esta versão.</Notice>
          )}
          <div className="overflow-hidden rounded-md border border-border bg-white">
            <div className="border-b border-border px-5 py-3 text-xs text-muted"><span className="font-medium text-fg">Assunto:</span> {preview.assunto}</div>
            <InstitutionalEmailPreview bodyHtml={preview.bodyHtml} header={previewHeader} />
          </div>
          <p className="break-all text-xs text-muted">Link de exemplo sem validade: <code>{DONOR_MONTHLY_INSTRUCTIONS_SAMPLE_LINK}</code></p>
        </Section>
      </div>

      <Section
        title="Enviar e-mail de teste"
        description="Envia o texto da tela apenas ao endereço informado, sem salvar alterações ou registrar um envio para benfeitor. O assunto recebe [TESTE] e o link ilustrativo não funciona."
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
    </div>
  );
}
