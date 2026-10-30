import { requireStaff } from "@/lib/auth/authorization";
import { getAdminHomeSummary } from "./_actions/admin-home-actions";
import { AdminShell } from "./_components/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await requireStaff();
  // Contadores do menu. Uma falha de leitura só omite os badges.
  const { data } = await getAdminHomeSummary();
  const counts = data
    ? { pendingApplications: data.applications.pendente, pendingWelcome: data.donors.pendingWelcome }
    : null;

  return (
    <AdminShell staff={{ email: staff.email, role: staff.role }} counts={counts}>
      {children}
    </AdminShell>
  );
}
