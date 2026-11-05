import type { DocumentHeaderData } from "@/lib/documents/document-header";

export const documentHeader: DocumentHeaderData = {
  linha1: "Arca Nossa Senhora da Providência",
  linha2: "Mantenedora do Colégio São José — Itatiba/SP",
  linha3: "CNPJ 42.736.079/0001-63",
  mostrar_selo: true,
  rodape_institucional: "Arca Nossa Senhora da Providência\nObra de Assistência Educacional Católica",
};

/** Só a linha 1, sem selo e sem rodapé: o mínimo que um documento mostra. */
export const minimalHeader: DocumentHeaderData = {
  linha1: "Arca Nossa Senhora da Providência",
  linha2: "",
  linha3: "",
  mostrar_selo: false,
  rodape_institucional: "",
};

/** Rodapé com cinco linhas: a validação local recusa ao salvar. */
export const overlongFooterHeader: DocumentHeaderData = {
  ...documentHeader,
  rodape_institucional:
    "Arca Nossa Senhora da Providência\nObra de Assistência Educacional Católica\nRua Maurício F. Klabin, 223 — Vila Mariana — São Paulo/SP\nCEP 04120-020\nCNPJ 42.736.079/0001-63",
};

export const footerError = "Use até 4 linhas de 80 caracteres cada, sem caracteres de controle.";
