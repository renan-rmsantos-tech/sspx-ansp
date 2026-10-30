import { escapeCsvCell } from "@/lib/donor-conference-csv";
import type { getDonorFinancialReport } from "@/app/admin/_actions/donor-financial-report-actions";

type Report = Awaited<ReturnType<typeof getDonorFinancialReport>>;
export function serializeFinancialReportCsv(report: Report): string {
  const lines: unknown[][] = [
    ["Relatório financeiro", report.filters.from, report.filters.to, report.filters.frequency ?? "Todas"],
    ["Previsto", "Recebido confirmado", "Em aberto", "Não identificado/divergente"],
    [report.summary.previsto / 100, report.summary.recebido / 100, report.summary.emAberto / 100, report.summary.naoIdentificadoDivergente / 100],
    [],
    ["Frequência", "Previsto", "Recebido confirmado", "Em aberto", "Não identificado/divergente"],
    ...(["mensal", "unica"] as const).map(frequency => [frequency, report.byFrequency[frequency].previsto / 100, report.byFrequency[frequency].recebido / 100, report.byFrequency[frequency].emAberto / 100, report.byFrequency[frequency].naoIdentificadoDivergente / 100]),
    [],
    ["Competência", "Previsto", "Recebido confirmado", "Em aberto", "Não identificado/divergente"],
    ...report.months.map(row => [row.month, row.previsto / 100, row.recebido / 100, row.emAberto / 100, row.naoIdentificadoDivergente / 100]),
    [],
    ["Benfeitor", "Frequência", "Pago", "Devido", "Parcelas em atraso"],
    ...report.donors.map(row => [row.donorName, row.frequency, row.pago / 100, row.devido / 100, row.parcelasEmAtraso]),
  ];
  return "\uFEFF" + lines.map(line => line.map(escapeCsvCell).join(",")).join("\r\n") + "\r\n";
}
