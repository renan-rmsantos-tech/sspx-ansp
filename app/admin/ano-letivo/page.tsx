import { getSchoolYears } from "../_actions/admin-actions";
import { AnoLetivoClient } from "./client";
import { requireAdmin } from "@/lib/auth/authorization";

export default async function AnoLetivoPage() {
  await requireAdmin();
  const { data: years } = await getSchoolYears();

  return <AnoLetivoClient initialYears={years ?? []} />;
}
