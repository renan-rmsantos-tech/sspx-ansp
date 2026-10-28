import { COMMUNICATION_FONTS } from "@/lib/documents/communication-fonts";
import { resolveDocumentHeader, type DocumentHeaderData } from "@/lib/documents/document-header";

export function DocumentFooterPreview({ header }: { header: DocumentHeaderData }) {
  const footer = resolveDocumentHeader(header).rodape_institucional;
  if (!footer?.trim()) return <p className="mt-8 text-center text-xs text-muted">Rodapé institucional oculto.</p>;
  return <div className="mt-8 whitespace-pre-wrap break-words border-t border-border pt-4 text-center text-xs leading-relaxed text-[#444]" style={{ fontFamily: COMMUNICATION_FONTS.html.body }} data-testid="footer-preview">{footer}</div>;
}
