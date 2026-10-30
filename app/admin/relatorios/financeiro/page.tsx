import { requireAdmin } from "@/lib/auth/authorization";
import { getDonorFinancialReport } from "../../_actions/donor-financial-report-actions";
import { FinancialReport } from "../financial-report";
export const dynamic = "force-dynamic";
export default async function FinancialReportPage() {
  await requireAdmin();
  const month = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 7);
  const financial = await getDonorFinancialReport({ from: month, to: month });
  return <div><h1 className="font-heading text-[22px] font-semibold">Relatório financeiro</h1><FinancialReport initialReport={financial} /></div>;
}
