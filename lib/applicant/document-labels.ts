/** Rótulos das categorias de `documents` e das pendências, em pt-BR. */
export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  declaracao_vaga: "Declaração de Vaga do Colégio",
  carta_recomendacao: "Carta de Recomendação do Padre",
  rg_pai: "RG do Pai",
  rg_mae: "RG da Mãe",
  certidao_casamento: "Certidão de Casamento",
  certidao: "Certidão de Casamento",
  comprovante_endereco: "Comprovante de Endereço",
  extrato_ir: "Extrato IR",
  extrato_bancario: "Extrato Bancário",
  rg_aluno: "RG do Aluno",
  certidao_nascimento: "Certidão de Nascimento",
  outro: "Outro documento",
};

/** Categorias que a equipe pode pedir de novo; as de aluno exigem o aluno. */
export const REQUESTABLE_CATEGORIES = [
  "declaracao_vaga",
  "carta_recomendacao",
  "rg_pai",
  "rg_mae",
  "certidao_casamento",
  "comprovante_endereco",
  "extrato_ir",
  "extrato_bancario",
  "rg_aluno",
  "certidao_nascimento",
  "outro",
] as const;

export type RequestableCategory = (typeof REQUESTABLE_CATEGORIES)[number];

export const STUDENT_CATEGORIES = new Set<string>(["rg_aluno", "certidao_nascimento"]);

export const MAX_REQUEST_REASON = 500;

export function documentLabel(categoria: string | null | undefined, studentName?: string | null): string {
  if (!categoria) return "Documento";
  const base =
    DOCUMENT_CATEGORY_LABELS[categoria] ??
    (categoria.startsWith("rg_aluno")
      ? DOCUMENT_CATEGORY_LABELS.rg_aluno
      : categoria.startsWith("certidao_nascimento")
        ? DOCUMENT_CATEGORY_LABELS.certidao_nascimento
        : categoria);
  return studentName ? `${base} — ${studentName}` : base;
}
