import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/authorization";
import { saoPauloDate } from "@/lib/donor-recurrence";
import { getDonorFinancialReport } from "../_actions/donor-financial-report-actions";
import { getDonorReports } from "../_actions/donor-report-actions";
import { PageHeader } from "../_components/page-header";
import { RelatoriosTabs } from "./relatorios-tabs";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireAdmin();
  const month = saoPauloDate(new Date()).slice(0, 7);
  const [reports, financial] = await Promise.all([
    getDonorReports(),
    getDonorFinancialReport({ from: month, to: month }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Consultas sobre os cadastros de benfeitores e sobre o movimento financeiro conferido no extrato."
      />
      <Suspense fallback={null}>
        <RelatoriosTabs reports={reports} financial={financial} />
      </Suspense>
    </div>
  );
}
