import { getSchoolYears } from "../_actions/admin-actions";
import { AnoLetivoClient } from "./client";
import { requireAdmin } from "@/lib/auth/authorization";

export default async function AnoLetivoPage() {
  await requireAdmin();
  const { data: years, error } = await getSchoolYears();

  return <AnoLetivoClient initialYears={years ?? []} error={error ?? undefined} />;
}
