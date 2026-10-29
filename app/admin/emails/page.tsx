import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/authorization";
import { renderDonorMonthlyInstructionsPreview } from "@/lib/email/donor-monthly-instructions-template";
import { renderDonorReminderPreview } from "@/lib/email/donor-reminder-template";
import { getDonorEmailSettings } from "../_actions/donor-email-actions";
import { getDonorMonthlyInstructionsSettings } from "../_actions/donor-monthly-instructions-actions";
import { getDonorReminderDashboard } from "../_actions/donor-reminder-actions";
import { PageHeader } from "../_components/page-header";
import { EmailsTabs } from "./emails-tabs";

export default async function EmailsPage() {
  await requireAdmin();
  const [welcome, monthly, reminders] = await Promise.all([
    getDonorEmailSettings(),
    getDonorMonthlyInstructionsSettings(),
    getDonorReminderDashboard(),
  ]);
  const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
  const monthlyPreview = renderDonorMonthlyInstructionsPreview(monthly.template, monthly.header);
  const reminderPreview = renderDonorReminderPreview(reminders.template, reminders.header);

  return (
    <div className="space-y-6">
      <PageHeader
        title="E-mails aos benfeitores"
        description="Textos das mensagens automáticas. As alterações valem para os próximos envios; o cabeçalho e o rodapé vêm de Cabeçalho e rodapé."
      />
      <Suspense fallback={null}>
        <EmailsTabs
          welcome={{
            initialTemplate: welcome.template,
            initialPending: welcome.pending,
            header: welcome.header,
            resendConfigured,
          }}
          monthly={{
            initialTemplate: monthly.template,
            initialPreview: { assunto: monthlyPreview.assunto, bodyHtml: monthlyPreview.bodyHtml },
            header: monthly.header,
            resendConfigured,
          }}
          reminders={{
            initialTemplate: reminders.template,
            initialPreview: { assunto: reminderPreview.assunto, bodyHtml: reminderPreview.bodyHtml },
            initialSends: reminders.sends,
            header: reminders.header,
            resendConfigured,
          }}
        />
      </Suspense>
    </div>
  );
}
