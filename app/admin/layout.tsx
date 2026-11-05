import { logout } from "@/app/login/_actions/auth-actions";
import { ServerActionsProvider } from "@/components/server-actions";
import { requireStaff } from "@/lib/auth/authorization";
import * as adminActions from "./_actions/admin-actions";
import { getAdminHomeSummary } from "./_actions/admin-home-actions";
import * as donorEmailActions from "./_actions/donor-email-actions";
import * as donorFinancialReportActions from "./_actions/donor-financial-report-actions";
import * as donorMonthlyInstructionsActions from "./_actions/donor-monthly-instructions-actions";
import * as donorPaymentConferenceActions from "./_actions/donor-payment-conference-actions";
import * as donorReceiptActions from "./_actions/donor-receipt-actions";
import * as donorReminderActions from "./_actions/donor-reminder-actions";
import * as donorReportActions from "./_actions/donor-report-actions";
import * as observationActions from "./_actions/observation-actions";
import * as staffActions from "./_actions/staff-actions";
import { AdminShell } from "./_components/admin-shell";

// As views do painel recebem as server actions pelo contexto, não por import,
// para renderizarem com fixtures na galeria de protótipos.
const actions = {
  ...adminActions,
  ...donorEmailActions,
  ...donorFinancialReportActions,
  ...donorMonthlyInstructionsActions,
  ...donorPaymentConferenceActions,
  ...donorReceiptActions,
  ...donorReminderActions,
  ...donorReportActions,
  ...observationActions,
  ...staffActions,
};

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
    <ServerActionsProvider actions={actions}>
      <AdminShell staff={{ email: staff.email, role: staff.role }} counts={counts} onLogout={logout}>
        {children}
      </AdminShell>
    </ServerActionsProvider>
  );
}
