import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { getDonorFinancialReport } from "@/app/admin/_actions/donor-financial-report-actions";
import type { DocumentHeaderData } from "./document-header";
import { DocumentHeaderView, resolveDocumentHeader } from "./document-header";
import { DocumentFooterView, institutionalFooterPageStyle } from "./document-footer";
import { COMMUNICATION_FONTS } from "@/lib/documents/communication-fonts";

type Report = Awaited<ReturnType<typeof getDonorFinancialReport>>;
const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingHorizontal: 48, paddingBottom: 48, fontFamily: COMMUNICATION_FONTS.pdf.body, fontSize: 8, color: "#222" },
  title: { fontFamily: COMMUNICATION_FONTS.pdf.heading, fontSize: 15, marginBottom: 8 },
  section: { fontFamily: COMMUNICATION_FONTS.pdf.heading, fontSize: 10, marginTop: 16, marginBottom: 5 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 4 },
  cell: { flex: 1 }, name: { flex: 2 }, pageNumber: { position: "absolute", bottom: 10, right: 48, fontSize: 8 },
});
const titles = ["Previsto", "Recebido", "Em aberto", "Não identificado/divergente"];
function Totals({ values }: { values: { previsto: number; recebido: number; emAberto: number; naoIdentificadoDivergente: number } }) {
  return <View style={styles.row} wrap={false}>{[values.previsto, values.recebido, values.emAberto, values.naoIdentificadoDivergente].map((value, i) => <Text key={i} style={styles.cell}>{money(value)}</Text>)}</View>;
}
function FinancialReportDocument({ report, header }: { report: Report; header: DocumentHeaderData }) {
  return <Document title="Relatório financeiro"><Page size="A4" style={[styles.page, institutionalFooterPageStyle(header)]}>
    <DocumentHeaderView header={resolveDocumentHeader(header)} />
    <Text style={styles.title}>Relatório financeiro</Text>
    <Text>Período: {report.filters.from} a {report.filters.to} | Frequência: {report.filters.frequency === "mensal" ? "Mensal" : report.filters.frequency === "unica" ? "Uma vez" : "Todas"}</Text>
    <Text style={styles.section}>Totais</Text><Text>{titles.join(" | ")}</Text><Totals values={report.summary} />
    <Text style={styles.section}>Valores por frequência</Text>
    {(["mensal", "unica"] as const).map(f => <View key={f} wrap={false}><Text>{f === "mensal" ? "Mensal" : "Uma vez"}</Text><Totals values={report.byFrequency[f]} /></View>)}
    <Text style={styles.section}>Valores por mês</Text>
    {report.months.map(row => <View key={row.month} wrap={false}><Text>{row.month}</Text><Totals values={row} /></View>)}
    <Text style={styles.section}>Valores por benfeitor e frequência</Text>
    <View style={styles.row} wrap={false}><Text style={styles.name}>Benfeitor</Text><Text style={styles.cell}>Frequência</Text><Text style={styles.cell}>Pago</Text><Text style={styles.cell}>Devido</Text><Text style={styles.cell}>Atrasos</Text></View>
    {report.donors.map(row => <View key={`${row.donorId}:${row.frequency}`} style={styles.row} wrap={false}><Text style={styles.name}>{row.donorName}</Text><Text style={styles.cell}>{row.frequency === "mensal" ? "Mensal" : "Uma vez"}</Text><Text style={styles.cell}>{money(row.pago)}</Text><Text style={styles.cell}>{money(row.devido)}</Text><Text style={styles.cell}>{row.parcelasEmAtraso}</Text></View>)}
    <DocumentFooterView header={header} />
    <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
  </Page></Document>;
}
export function renderFinancialReportPdf(report: Report, header: DocumentHeaderData): Promise<Buffer> {
  return renderToBuffer(<FinancialReportDocument report={report} header={header} />);
}
