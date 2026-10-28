import { Text, View } from "@react-pdf/renderer";
import { resolveDocumentHeader, type DocumentHeaderData } from "@/lib/documents/document-header";

// Four 80-character lines can wrap to eight lines at 8pt within the A4 margins.
// Reserve 100pt above the 24pt bottom margin, including the separator and padding.
export function institutionalFooterPageStyle(header?: DocumentHeaderData | null) {
  return resolveDocumentHeader(header).rodape_institucional?.trim() ? { paddingBottom: 124 } : {};
}

export function DocumentFooterView({ header }: { header?: DocumentHeaderData | null }) {
  const footer = resolveDocumentHeader(header).rodape_institucional;
  if (!footer?.trim()) return null;
  return <View fixed style={{ position: "absolute", bottom: 24, left: 48, right: 48, borderTopWidth: 0.5, borderTopColor: "#c9a84c", paddingTop: 8, textAlign: "center" }}>
    {footer.split("\n").map((line, index) => <Text key={index} hyphenationCallback={word => Array.from(word)} style={{ fontFamily: "Helvetica", fontSize: 8, lineHeight: 1.3, color: "#444" }}>{line || " "}</Text>)}
  </View>;
}
