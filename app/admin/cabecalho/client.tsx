"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_INSTITUTIONAL_FOOTER,
  FOOTER_MAX_LENGTH,
  FOOTER_HELP,
  institutionalFooterError,
  resolveDocumentHeader,
  type DocumentHeaderData,
} from "@/lib/documents/document-header";
import { saveDocumentHeader } from "../_actions/admin-actions";
import { DocumentFooterPreview } from "../_components/document-footer-preview";
import { DocumentHeaderPreview } from "../_components/document-header-preview";
import { Field } from "../_components/field";
import { Notice } from "../_components/notice";
import { PageHeader } from "../_components/page-header";

type HeaderForm = DocumentHeaderData;

const INPUT_CLASS = "h-10 bg-surface";
const CARD_CLASS = "gap-5 rounded-lg border border-border bg-surface p-5 ring-0";

interface CabecalhoClientProps {
  initialHeader: HeaderForm;
}

export function CabecalhoClient({ initialHeader }: CabecalhoClientProps) {
  const [form, setForm] = useState<HeaderForm>(resolveDocumentHeader(initialHeader));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const update = useCallback(<K extends keyof HeaderForm>(key: K, value: HeaderForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStatus("idle");
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setStatus("idle");
    setErrorMsg(null);
    try {
      const validationError = institutionalFooterError(form.rodape_institucional);
      if (validationError) {
        setStatus("error");
        setErrorMsg(validationError);
        return;
      }
      const result = await saveDocumentHeader(form);
      if (result.success) {
        setStatus("saved");
      } else {
        setStatus("error");
        setErrorMsg(result.error ?? "Erro ao salvar.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }, [form]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cabeçalho e rodapé"
        description="Selo da ANSP, cabeçalho e rodapé institucional compartilhados por todos os e-mails e PDFs."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className={CARD_CLASS}>
          <div className="flex items-center gap-2">
            <Checkbox
              id="header-mostrar-selo"
              checked={form.mostrar_selo}
              onCheckedChange={(checked) => update("mostrar_selo", checked === true)}
              data-testid="header-mostrar-selo"
            />
            <label htmlFor="header-mostrar-selo" className="cursor-pointer text-sm text-fg">
              Exibir o selo da ANSP no cabeçalho
            </label>
          </div>

          <Field label="Linha 1 (instituição)" id="header-linha1">
            {(a11y) => (
              <Input
                {...a11y}
                type="text"
                value={form.linha1}
                onChange={(e) => update("linha1", e.target.value)}
                className={INPUT_CLASS}
                data-testid="header-linha1"
              />
            )}
          </Field>
          <Field label="Linha 2 (opcional)" id="header-linha2">
            {(a11y) => (
              <Input
                {...a11y}
                type="text"
                value={form.linha2}
                onChange={(e) => update("linha2", e.target.value)}
                className={INPUT_CLASS}
                data-testid="header-linha2"
              />
            )}
          </Field>
          <Field label="Linha 3 (opcional)" id="header-linha3">
            {(a11y) => (
              <Input
                {...a11y}
                type="text"
                value={form.linha3}
                onChange={(e) => update("linha3", e.target.value)}
                className={INPUT_CLASS}
                data-testid="header-linha3"
              />
            )}
          </Field>

          <div className="space-y-2">
            <Field label="Rodapé institucional" id="institutional-footer" hint={FOOTER_HELP}>
              {(a11y) => (
                <Textarea
                  {...a11y}
                  rows={4}
                  maxLength={FOOTER_MAX_LENGTH}
                  value={form.rodape_institucional ?? ""}
                  onChange={(e) => update("rodape_institucional", e.target.value)}
                  className="resize-y bg-surface leading-relaxed"
                />
              )}
            </Field>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => update("rodape_institucional", DEFAULT_INSTITUTIONAL_FOOTER)}
            >
              Restaurar rodapé padrão
            </Button>
          </div>

          <div className="space-y-3">
            <Button type="button" size="lg" onClick={() => void handleSave()} disabled={saving} data-testid="header-save">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            {status === "saved" && (
              <Notice tone="success" data-testid="header-saved">
                Cabeçalho e rodapé salvos.
              </Notice>
            )}
            {status === "error" && (
              <Notice tone="danger" data-testid="header-error">
                {errorMsg}
              </Notice>
            )}
          </div>
        </Card>

        <div className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Como fica no documento</h2>
          <Card className="gap-0 rounded-lg border border-border bg-white p-6 ring-0">
            <DocumentHeaderPreview header={form} />
            <DocumentFooterPreview header={form} />
            <p className="mt-4 text-center text-xs text-muted">
              Usado nos novos e-mails e em todos os PDFs. Documentos já emitidos e reenvios reservados mantêm a
              configuração original.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
