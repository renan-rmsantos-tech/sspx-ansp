import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ContractClause } from "@/lib/templates/contract-tokens";
import {
  DocumentHeaderView,
  resolveDocumentHeader,
  type DocumentHeaderData,
} from "./document-header";

// Conteúdo já com os tokens substituídos pelos dados da solicitação.
export interface ResolvedContract {
  titulo: string;
  cabecalho: string;
  clausulas: ContractClause[];
  rodape: string;
  header?: DocumentHeaderData | null;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 64,
    fontFamily: "Times-Roman",
    fontSize: 11,
    lineHeight: 1.5,
    color: "#1a1a1a",
  },
  titulo: {
    fontFamily: "Times-Bold",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  clausulaTitulo: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    marginTop: 12,
    marginBottom: 4,
  },
  paragrafo: {
    textAlign: "justify",
    marginBottom: 6,
  },
  rodape: {
    marginTop: 24,
  },
  rodapeLinha: {
    marginBottom: 4,
  },
});

// Divide o texto em linhas (cada \n é uma quebra) preservando linhas em branco
// como espaçamento, e renderiza cada uma como um parágrafo.
function Paragraphs({
  text,
  justify,
}: {
  text: string;
  justify: boolean;
}) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) =>
        line.trim() === "" ? (
          <View key={i} style={{ height: 6 }} />
        ) : (
          <Text
            key={i}
            style={justify ? styles.paragrafo : styles.rodapeLinha}
          >
            {line}
          </Text>
        )
      )}
    </>
  );
}

function ContractDocument({ contract }: { contract: ResolvedContract }) {
  return (
    <Document title={contract.titulo}>
      <Page size="A4" style={styles.page}>
        <DocumentHeaderView header={resolveDocumentHeader(contract.header)} />
        <Text style={styles.titulo}>{contract.titulo}</Text>

        <Paragraphs text={contract.cabecalho} justify />

        {contract.clausulas.map((clausula, i) => (
          <View key={i} wrap={false}>
            <Text style={styles.clausulaTitulo}>{clausula.titulo}</Text>
            <Paragraphs text={clausula.corpo} justify />
          </View>
        ))}

        <View style={styles.rodape}>
          <Paragraphs text={contract.rodape} justify={false} />
        </View>
      </Page>
    </Document>
  );
}

export function renderContractPdf(contract: ResolvedContract): Promise<Buffer> {
  return renderToBuffer(<ContractDocument contract={contract} />);
}
