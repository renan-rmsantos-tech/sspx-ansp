import { requireStaff } from "@/lib/auth/authorization";
import { getAdminHomeSummary } from "./_actions/admin-home-actions";
import { AdminHome } from "./_components/admin-home";

export default async function AdminHomePage() {
  const staff = await requireStaff();
  const { data, error } = await getAdminHomeSummary();
  return <AdminHome summary={data} role={staff.role} error={error} />;
}
