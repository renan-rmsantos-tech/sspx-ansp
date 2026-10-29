import { requireAdmin } from "@/lib/auth/authorization";
import { getDonorReports } from "../_actions/donor-report-actions";
import { DonorReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function DonorReportsPage() {
  await requireAdmin();
  const reports = await getDonorReports();

  return <DonorReportsClient initialReports={reports} />;
}
