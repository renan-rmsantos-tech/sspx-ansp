import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  DocumentHeaderView,
  resolveDocumentHeader,
  type DocumentHeaderData,
} from "./document-header";

// Conteúdo da decisão já com os tokens substituídos pelos dados da solicitação.
export interface ResolvedDecision {
  titulo: string;
  cabecalho: string;
  corpo: string;
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
  cabecalho: {
    fontFamily: "Times-Bold",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  cabecalhoLinha: {
    fontFamily: "Times-Bold",
    fontSize: 13,
    textAlign: "center",
  },
  paragrafo: {
    textAlign: "justify",
    marginBottom: 6,
  },
  rodape: {
    marginTop: 28,
  },
  rodapeLinha: {
    marginBottom: 4,
  },
});

// Divide o texto em linhas (cada \n é uma quebra) preservando linhas em branco
// como espaçamento, e renderiza cada uma com o estilo informado.
function Paragraphs({
  text,
  lineStyle,
}: {
  text: string;
  lineStyle: (typeof styles)[keyof typeof styles];
}) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) =>
        line.trim() === "" ? (
          <View key={i} style={{ height: 6 }} />
        ) : (
          <Text key={i} style={lineStyle}>
            {line}
          </Text>
        )
      )}
    </>
  );
}

function DecisionDocument({ decision }: { decision: ResolvedDecision }) {
  return (
    <Document title={decision.titulo}>
      <Page size="A4" style={styles.page}>
        <DocumentHeaderView header={resolveDocumentHeader(decision.header)} />
        <View style={styles.cabecalho}>
          <Paragraphs text={decision.cabecalho} lineStyle={styles.cabecalhoLinha} />
        </View>

        <Paragraphs text={decision.corpo} lineStyle={styles.paragrafo} />

        <View style={styles.rodape}>
          <Paragraphs text={decision.rodape} lineStyle={styles.rodapeLinha} />
        </View>
      </Page>
    </Document>
  );
}

export function renderDecisionPdf(decision: ResolvedDecision): Promise<Buffer> {
  return renderToBuffer(<DecisionDocument decision={decision} />);
}
