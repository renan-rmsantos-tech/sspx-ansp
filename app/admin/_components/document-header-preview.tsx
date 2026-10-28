import { COMMUNICATION_FONTS } from "@/lib/documents/communication-fonts";
import { SealLogo } from "@/components/ui/seal-logo";
import {
  resolveDocumentHeader,
  type DocumentHeaderData,
} from "@/lib/documents/document-header";

export function DocumentHeaderPreview({ header }: { header: DocumentHeaderData }) {
  const resolved = resolveDocumentHeader(header);

  return (
    <div className="flex flex-col items-center border-b border-[#c9a84c] pb-4 text-center" style={{ fontFamily: COMMUNICATION_FONTS.html.heading }}>
      {resolved.mostrar_selo && <SealLogo size={64} className="mb-2" />}
      <p className="text-[15px] font-bold text-[#1a1a1a]">
        {resolved.linha1}
      </p>
      {resolved.linha2.trim() !== "" && (
        <p className="mt-0.5 text-[11px] font-bold text-[#444]">{resolved.linha2}</p>
      )}
      {resolved.linha3.trim() !== "" && (
        <p className="font-bold text-[11px] text-[#444]">{resolved.linha3}</p>
      )}
    </div>
  );
}
