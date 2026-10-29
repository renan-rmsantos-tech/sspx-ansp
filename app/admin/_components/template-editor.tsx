"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveTemplate } from "../_actions/admin-actions";
import { Field } from "./field";
import { Notice } from "./notice";
import { TemplatePreview } from "./template-preview";
import { TokenReference, type TokenEntry } from "./token-reference";

export const AVAILABLE_TOKENS: readonly TokenEntry[] = [
  { token: "{nome_pai}", desc: "Nome do pai/responsável" },
  { token: "{nome_mae}", desc: "Nome da mãe" },
  { token: "{escola}", desc: "Nome da escola" },
  { token: "{aluno}", desc: "Nome(s) do(s) aluno(s)" },
  { token: "{desconto}", desc: "Desconto concedido (%)" },
  { token: "{data}", desc: "Data da decisão" },
  { token: "{motivo}", desc: "Motivo da decisão" },
  { token: "{ano_letivo}", desc: "Ano letivo" },
];

export type TemplateTipo = "aprovacao" | "rejeicao";

export interface TemplateData {
  id: string;
  tipo: TemplateTipo;
  cabecalho: string;
  corpo: string;
  rodape: string;
}

type TemplateFields = Pick<TemplateData, "cabecalho" | "corpo" | "rodape">;

interface TemplateEditorProps {
  initialTemplates: TemplateData[];
  /** Tipo editado; a página Modelos monta um editor por aba. */
  tipo: TemplateTipo;
}

const FIELD_CLASS = "bg-surface font-mono text-sm";

export function TemplateEditor({ initialTemplates, tipo }: TemplateEditorProps) {
  const [fields, setFields] = useState<TemplateFields>(() => {
    const initial = initialTemplates.find((template) => template.tipo === tipo);
    return {
      cabecalho: initial?.cabecalho ?? "",
      corpo: initial?.corpo ?? "",
      rodape: initial?.rodape ?? "",
    };
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const updateField = useCallback((field: keyof TemplateFields, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
    setMessage(null);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    const result = await saveTemplate({ tipo, ...fields });
    if (result.success) {
      setMessage({ type: "success", text: "Modelo salvo com sucesso." });
    } else {
      setMessage({ type: "error", text: result.error ?? "Erro ao salvar modelo." });
    }
    setSaving(false);
  }, [tipo, fields]);

  return (
    <div data-testid="template-editor" className="grid gap-6 lg:grid-cols-[1fr_minmax(0,18rem)]">
      <div className="space-y-5">
        <Field label="Cabeçalho">
          {(a11y) => (
            <Textarea
              {...a11y}
              value={fields.cabecalho}
              onChange={(event) => updateField("cabecalho", event.target.value)}
              rows={3}
              className={FIELD_CLASS}
              data-testid="field-cabecalho"
            />
          )}
        </Field>
        <Field label="Corpo">
          {(a11y) => (
            <Textarea
              {...a11y}
              value={fields.corpo}
              onChange={(event) => updateField("corpo", event.target.value)}
              rows={10}
              className={FIELD_CLASS}
              data-testid="field-corpo"
            />
          )}
        </Field>
        <Field label="Rodapé">
          {(a11y) => (
            <Textarea
              {...a11y}
              value={fields.rodape}
              onChange={(event) => updateField("rodape", event.target.value)}
              rows={3}
              className={FIELD_CLASS}
              data-testid="field-rodape"
            />
          )}
        </Field>

        {message && (
          <Notice tone={message.type === "success" ? "success" : "danger"} data-testid="save-message">
            {message.text}
          </Notice>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={() => void handleSave()} disabled={saving} data-testid="save-button">
            {saving ? "Salvando…" : "Salvar modelo"}
          </Button>
        </div>

        <TemplatePreview cabecalho={fields.cabecalho} corpo={fields.corpo} rodape={fields.rodape} />
      </div>

      <TokenReference
        tokens={AVAILABLE_TOKENS}
        description="Clique para copiar e cole no texto. Cada campo é substituído pelos dados da solicitação."
        data-testid="token-reference"
        itemTestId="token-item"
      />
    </div>
  );
}
