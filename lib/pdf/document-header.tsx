import { Image, Text, View, StyleSheet } from "@react-pdf/renderer";
import { SEAL_DATA_URI } from "./seal-image";
import type { DocumentHeaderData } from "@/lib/documents/document-header";

export {
  DEFAULT_DOCUMENT_HEADER,
  resolveDocumentHeader,
} from "@/lib/documents/document-header";
export type { DocumentHeaderData } from "@/lib/documents/document-header";

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    textAlign: "center",
    marginBottom: 22,
    paddingBottom: 14,
    borderBottom: "1pt solid #c9a84c",
  },
  selo: {
    width: 92,
    height: 92,
    marginBottom: 10,
  },
  linha1: {
    fontFamily: "Times-Bold",
    fontSize: 14,
  },
  linha2: {
    fontSize: 10,
    color: "#444",
    marginTop: 2,
  },
  linha3: {
    fontSize: 10,
    color: "#444",
    marginTop: 1,
  },
});

export function DocumentHeaderView({ header }: { header: DocumentHeaderData }) {
  return (
    <View style={styles.wrap}>
      {/* react-pdf Image não suporta alt — regra de HTML não se aplica */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      {header.mostrar_selo && <Image src={SEAL_DATA_URI} style={styles.selo} />}
      {header.linha1.trim() !== "" && (
        <Text style={styles.linha1}>{header.linha1}</Text>
      )}
      {header.linha2.trim() !== "" && (
        <Text style={styles.linha2}>{header.linha2}</Text>
      )}
      {header.linha3.trim() !== "" && (
        <Text style={styles.linha3}>{header.linha3}</Text>
      )}
    </View>
  );
}
