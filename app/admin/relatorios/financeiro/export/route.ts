import { NextRequest } from "next/server";
import { getDonorFinancialReport } from "@/app/admin/_actions/donor-financial-report-actions";
import { serializeFinancialReportCsv } from "@/lib/donor-financial-report-csv";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const report = await getDonorFinancialReport({ from: params.get("from") ?? "", to: params.get("to") ?? "", frequency: (params.get("frequency") || undefined) as "mensal" | "unica" | undefined });
    return new Response(serializeFinancialReportCsv(report), { headers: {
      "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="relatorio-financeiro-${report.filters.from}-${report.filters.to}.csv"`,
      "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    return new Response(error instanceof Error && error.message.includes("Período") ? "Filtros inválidos." : "Não autorizado.", { status: error instanceof Error && error.message.includes("Período") ? 400 : 403, headers: { "Cache-Control": "no-store" } });
  }
}
