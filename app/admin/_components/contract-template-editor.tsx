"use client";

import { useState, useCallback, useMemo } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveContractTemplate, type ContractTemplate } from "../_actions/admin-actions";
import {
  AVAILABLE_CONTRACT_TOKENS,
  replaceContractTokens,
  SAMPLE_CONTRACT_DATA,
  type ContractClause,
} from "@/lib/templates/contract-tokens";
import { Field } from "./field";
import { Notice } from "./notice";
import { TokenReference } from "./token-reference";

interface ContractTemplateEditorProps {
  initialTemplate: ContractTemplate | null;
}

const EMPTY = {
  titulo: "CONTRATO DE CONCESSÃO DE BOLSA DE ESTUDOS",
  cabecalho: "",
  clausulas: [] as ContractClause[],
  rodape: "",
};

const FIELD_CLASS = "bg-surface font-mono text-sm";

export function ContractTemplateEditor({
  initialTemplate,
}: ContractTemplateEditorProps) {
  const [titulo, setTitulo] = useState(initialTemplate?.titulo ?? EMPTY.titulo);
  const [cabecalho, setCabecalho] = useState(
    initialTemplate?.cabecalho ?? EMPTY.cabecalho
  );
  const [clausulas, setClausulas] = useState<ContractClause[]>(
    initialTemplate?.clausulas ?? EMPTY.clausulas
  );
  const [rodape, setRodape] = useState(initialTemplate?.rodape ?? EMPTY.rodape);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const clearMessage = useCallback(() => setMessage(null), []);

  const updateClause = useCallback(
    (index: number, field: keyof ContractClause, value: string) => {
      setClausulas((prev) =>
        prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
      );
      clearMessage();
    },
    [clearMessage]
  );

  const addClause = useCallback(() => {
    setClausulas((prev) => [...prev, { titulo: "", corpo: "" }]);
    clearMessage();
  }, [clearMessage]);

  const removeClause = useCallback(
    (index: number) => {
      setClausulas((prev) => prev.filter((_, i) => i !== index));
      clearMessage();
    },
    [clearMessage]
  );

  const moveClause = useCallback(
    (index: number, dir: -1 | 1) => {
      setClausulas((prev) => {
        const next = [...prev];
        const target = index + dir;
        if (target < 0 || target >= next.length) return prev;
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
      clearMessage();
    },
    [clearMessage]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    const result = await saveContractTemplate({
      titulo,
      cabecalho,
      clausulas,
      rodape,
    });
    if (result.success) {
      setMessage({ type: "success", text: "Modelo de contrato salvo com sucesso." });
    } else {
      setMessage({
        type: "error",
        text: result.error ?? "Erro ao salvar modelo.",
      });
    }
    setSaving(false);
  }, [titulo, cabecalho, clausulas, rodape]);

  const preview = useMemo(() => {
    const r = (t: string) => replaceContractTokens(t, SAMPLE_CONTRACT_DATA);
    return {
      titulo: r(titulo),
      cabecalho: r(cabecalho),
      clausulas: clausulas.map((c) => ({
        titulo: r(c.titulo),
        corpo: r(c.corpo),
      })),
      rodape: r(rodape),
    };
  }, [titulo, cabecalho, clausulas, rodape]);

  return (
    <div data-testid="contract-template-editor" className="grid gap-6 lg:grid-cols-[1fr_minmax(0,18rem)]">
      <div className="space-y-5">
        <Field label="Título">
          {(a11y) => (
            <Input
              {...a11y}
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                clearMessage();
              }}
              className={`h-10 ${FIELD_CLASS}`}
              data-testid="field-titulo"
            />
          )}
        </Field>

        <Field label="Cabeçalho (partes)">
          {(a11y) => (
            <Textarea
              {...a11y}
              value={cabecalho}
              onChange={(e) => {
                setCabecalho(e.target.value);
                clearMessage();
              }}
              rows={6}
              className={FIELD_CLASS}
              data-testid="field-cabecalho"
            />
          )}
        </Field>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-fg">Cláusulas</span>
            <Button variant="outline" size="sm" onClick={addClause} data-testid="add-clause">
              <Plus aria-hidden="true" />
              Adicionar cláusula
            </Button>
          </div>
          <div className="space-y-3" data-testid="clauses-list">
            {clausulas.length === 0 && (
              <p className="text-sm text-muted">Nenhuma cláusula adicionada.</p>
            )}
            {clausulas.map((clause, i) => (
              <div
                key={i}
                className="space-y-2 rounded-lg border border-border bg-surface p-3"
                data-testid={`clause-${i}`}
              >
                <div className="flex items-center gap-1.5">
                  <Input
                    value={clause.titulo}
                    onChange={(e) => updateClause(i, "titulo", e.target.value)}
                    placeholder="Título da cláusula"
                    aria-label={`Título da cláusula ${i + 1}`}
                    className={`h-9 flex-1 ${FIELD_CLASS}`}
                    data-testid={`clause-titulo-${i}`}
                  />
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => moveClause(i, -1)}
                    disabled={i === 0}
                    aria-label="Mover para cima"
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => moveClause(i, 1)}
                    disabled={i === clausulas.length - 1}
                    aria-label="Mover para baixo"
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-danger hover:text-danger"
                    onClick={() => removeClause(i)}
                    data-testid={`remove-clause-${i}`}
                    aria-label="Remover cláusula"
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
                <Textarea
                  value={clause.corpo}
                  onChange={(e) => updateClause(i, "corpo", e.target.value)}
                  placeholder="Texto da cláusula"
                  aria-label={`Texto da cláusula ${i + 1}`}
                  rows={4}
                  className={FIELD_CLASS}
                  data-testid={`clause-corpo-${i}`}
                />
              </div>
            ))}
          </div>
        </div>

        <Field label="Rodapé (fecho e assinaturas)">
          {(a11y) => (
            <Textarea
              {...a11y}
              value={rodape}
              onChange={(e) => {
                setRodape(e.target.value);
                clearMessage();
              }}
              rows={6}
              className={FIELD_CLASS}
              data-testid="field-rodape"
            />
          )}
        </Field>

        {message && (
          <Notice tone={message.type === "success" ? "success" : "danger"} data-testid="contract-save-message">
            {message.text}
          </Notice>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={() => void handleSave()} disabled={saving} data-testid="save-contract-button">
            {saving ? "Salvando…" : "Salvar modelo"}
          </Button>
        </div>

        <div
          className="rounded-lg border border-border bg-cream/60 p-6"
          data-testid="contract-preview"
        >
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            Pré-visualização
          </h3>
          <div className="text-sm leading-relaxed text-fg">
            <p className="mb-4 text-center text-sm font-semibold">
              {preview.titulo}
            </p>
            <div className="whitespace-pre-wrap">{preview.cabecalho}</div>
            {preview.clausulas.map((c, i) => (
              <div key={i} className="mt-3">
                <p className="font-semibold">{c.titulo}</p>
                <div className="whitespace-pre-wrap">{c.corpo}</div>
              </div>
            ))}
            <div className="mt-5 whitespace-pre-wrap">{preview.rodape}</div>
          </div>
        </div>
      </div>

      <TokenReference
        tokens={AVAILABLE_CONTRACT_TOKENS}
        description="Clique para copiar e cole no texto. Cada campo é substituído pelos dados da família ao gerar o contrato em PDF."
        data-testid="contract-token-reference"
        itemTestId="contract-token-item"
      />
    </div>
  );
}
