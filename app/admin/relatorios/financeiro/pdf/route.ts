import { NextRequest } from "next/server";
import { getDonorFinancialReport } from "@/app/admin/_actions/donor-financial-report-actions";
import { loadDocumentHeader } from "@/lib/documents/document-header-store";
import { renderFinancialReportPdf } from "@/lib/pdf/financial-report-pdf";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const report = await getDonorFinancialReport({ from: params.get("from") ?? "", to: params.get("to") ?? "", frequency: (params.get("frequency") || undefined) as "mensal" | "unica" | undefined });
    const header = await loadDocumentHeader();
    const pdf = await renderFinancialReportPdf(report, header);
    return new Response(new Uint8Array(pdf), { headers: {
      "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="relatorio-financeiro-${report.filters.from}_${report.filters.to}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    const invalid = error instanceof Error && error.message.includes("Período");
    return new Response(invalid ? "Filtros inválidos." : "Não autorizado.", { status: invalid ? 400 : 403, headers: { "Cache-Control": "no-store" } });
  }
}
