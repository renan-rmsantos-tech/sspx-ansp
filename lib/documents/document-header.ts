// Configuração institucional compartilhada por PDFs e e-mails.
export interface DocumentHeaderData {
  linha1: string;
  linha2: string;
  linha3: string;
  mostrar_selo: boolean;
}

export const DEFAULT_DOCUMENT_HEADER: DocumentHeaderData = {
  linha1: "Arca Nossa Senhora da Providência",
  linha2: "",
  linha3: "",
  mostrar_selo: true,
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
    mostrar_selo: header?.mostrar_selo ?? DEFAULT_DOCUMENT_HEADER.mostrar_selo,
  };
}
