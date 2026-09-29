"use client";

import { useState, useCallback } from "react";
import { DocumentHeaderPreview } from "../_components/document-header-preview";
import { saveDocumentHeader } from "../_actions/admin-actions";

interface HeaderForm {
  linha1: string;
  linha2: string;
  linha3: string;
  mostrar_selo: boolean;
}

const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent";

interface CabecalhoClientProps {
  initialHeader: HeaderForm;
}

export function CabecalhoClient({ initialHeader }: CabecalhoClientProps) {
  const [form, setForm] = useState<HeaderForm>(initialHeader);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const update = useCallback(
    <K extends keyof HeaderForm>(key: K, value: HeaderForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setStatus("idle");
    },
    []
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setStatus("idle");
    setErrorMsg(null);
    const result = await saveDocumentHeader(form);
    setSaving(false);
    if (result.success) {
      setStatus("saved");
    } else {
      setStatus("error");
      setErrorMsg(result.error ?? "Erro ao salvar.");
    }
  }, [form]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Editor */}
      <div className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-fg">Configuração</h2>

        <label className="mt-4 flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={form.mostrar_selo}
            onChange={(e) => update("mostrar_selo", e.target.checked)}
            className="size-4 accent-[var(--accent)]"
            data-testid="header-mostrar-selo"
          />
          Exibir o selo da ANSP no cabeçalho
        </label>

        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="header-linha1"
              className="mb-1.5 block text-sm font-medium text-fg"
            >
              Linha 1 (instituição)
            </label>
            <input
              id="header-linha1"
              type="text"
              value={form.linha1}
              onChange={(e) => update("linha1", e.target.value)}
              className={inputClass}
              data-testid="header-linha1"
            />
          </div>
          <div>
            <label
              htmlFor="header-linha2"
              className="mb-1.5 block text-sm font-medium text-fg"
            >
              Linha 2 <span className="text-muted">(opcional)</span>
            </label>
            <input
              id="header-linha2"
              type="text"
              value={form.linha2}
              onChange={(e) => update("linha2", e.target.value)}
              className={inputClass}
              data-testid="header-linha2"
            />
          </div>
          <div>
            <label
              htmlFor="header-linha3"
              className="mb-1.5 block text-sm font-medium text-fg"
            >
              Linha 3 <span className="text-muted">(opcional)</span>
            </label>
            <input
              id="header-linha3"
              type="text"
              value={form.linha3}
              onChange={(e) => update("linha3", e.target.value)}
              className={inputClass}
              data-testid="header-linha3"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            data-testid="header-save"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
          {status === "saved" && (
            <span className="text-sm text-success" data-testid="header-saved">
              Cabeçalho salvo.
            </span>
          )}
          {status === "error" && (
            <span className="text-sm text-danger" data-testid="header-error">
              {errorMsg}
            </span>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-fg">Pré-visualização</h2>
        <div className="mt-4 rounded-md border border-border bg-white p-6">
          <DocumentHeaderPreview header={form} />
          <p className="mt-4 text-center text-xs text-muted">
            O cabeçalho acima aparece no topo dos PDFs de Decisão e de Contrato.
          </p>
        </div>
      </div>
    </div>
  );
}
