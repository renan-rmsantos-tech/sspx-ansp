"use client";

import { useMemo } from "react";
import { replaceTokens, type TokenData } from "@/lib/templates/token-replacer";

const SAMPLE_DATA: TokenData = {
  nome_pai: "João da Silva",
  nome_mae: "Maria da Silva",
  escola: "Colégio São José",
  alunos: ["Pedro da Silva", "Ana da Silva"],
  desconto: "50",
  data: new Date().toLocaleDateString("pt-BR"),
  motivo: "Renda familiar insuficiente para custear a mensalidade integral",
  ano_letivo: "2026",
};

interface TemplatePreviewProps {
  cabecalho: string;
  corpo: string;
  rodape: string;
}

export function TemplatePreview({
  cabecalho,
  corpo,
  rodape,
}: TemplatePreviewProps) {
  const rendered = useMemo(() => {
    const full = [cabecalho, corpo, rodape].join("\n\n");
    return replaceTokens(full, SAMPLE_DATA);
  }, [cabecalho, corpo, rodape]);

  return (
    <div
      className="rounded-lg border border-border bg-cream/60 p-6"
      data-testid="template-preview"
    >
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
        Pré-visualização
      </h3>
      <div className="whitespace-pre-wrap font-body text-sm leading-relaxed text-fg">
        {rendered}
      </div>
    </div>
  );
}

export { SAMPLE_DATA };
