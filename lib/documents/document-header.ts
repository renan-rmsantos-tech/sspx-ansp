// Configuração institucional compartilhada por PDFs e e-mails.
export interface DocumentHeaderData {
  linha1: string;
  linha2: string;
  linha3: string;
  mostrar_selo: boolean;
  rodape_institucional?: string | null;
}

export const DEFAULT_INSTITUTIONAL_FOOTER =
  "Arca Nossa Senhora da Providência\nObra de Assistência Educacional Católica";
export const FOOTER_MAX_LENGTH = 323; // 4 × 80 caracteres + 3 quebras de linha.
export const FOOTER_HELP = "Até 4 linhas de 80 caracteres cada. Deixe vazio para ocultar em e-mails e PDFs.";

export function institutionalFooterError(value: unknown): string | null {
  if (typeof value !== "string" || value.length > FOOTER_MAX_LENGTH ||
      value.split("\n").length > 4 || value.split("\n").some(line => line.length > 80) ||
      /[\x00-\x09\x0b-\x1f\x7f]/.test(value)) {
    return "Use até 4 linhas de 80 caracteres cada, sem caracteres de controle.";
  }
  return null;
}

export const DEFAULT_DOCUMENT_HEADER: DocumentHeaderData = {
  linha1: "Arca Nossa Senhora da Providência",
  linha2: "",
  linha3: "",
  mostrar_selo: true,
  rodape_institucional: DEFAULT_INSTITUTIONAL_FOOTER,
};

export function resolveDocumentHeader(
  header: Partial<DocumentHeaderData> | null | undefined
): DocumentHeaderData {
  return {
    linha1: header?.linha1?.trim()
      ? header.linha1
      : DEFAULT_DOCUMENT_HEADER.linha1,
    linha2: header?.linha2 ?? DEFAULT_DOCUMENT_HEADER.linha2,
    linha3: header?.linha3 ?? DEFAULT_DOCUMENT_HEADER.linha3,
    rodape_institucional: header?.rodape_institucional ?? DEFAULT_INSTITUTIONAL_FOOTER,
    mostrar_selo: header?.mostrar_selo ?? DEFAULT_DOCUMENT_HEADER.mostrar_selo,
  };
}
