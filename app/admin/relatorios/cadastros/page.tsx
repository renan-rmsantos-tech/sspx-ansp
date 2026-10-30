import { requireAdmin } from "@/lib/auth/authorization";
import { getDonorReports } from "../../_actions/donor-report-actions";
import { DonorReportsClient } from "../reports-client";
export const dynamic = "force-dynamic";
export default async function DonorReportsPage() {
  await requireAdmin();
  const reports = await getDonorReports();
  return <div><h1 className="font-heading text-[22px] font-semibold">Cadastros de benfeitores</h1><p className="mt-1 text-sm text-muted">Distribuição dos cadastros por residência e por priorado ou capela.</p><DonorReportsClient initialReports={reports} /></div>;
}
