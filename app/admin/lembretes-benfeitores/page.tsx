import { requireAdmin } from "@/lib/auth/authorization";
import { getDonorReminderDashboard } from "../_actions/donor-reminder-actions";
import { renderDonorReminderPreview } from "@/lib/email/donor-reminder-template";
import { DonorReminderClient } from "./client";

export default async function DonorReminderPage() {
  await requireAdmin();
  const dashboard = await getDonorReminderDashboard();
  const preview = renderDonorReminderPreview(dashboard.template, dashboard.header);
  return (
    <div className="max-w-[1200px]">
      <h1 className="font-heading text-[22px] font-semibold leading-tight tracking-tight">
        Lembretes de contribuição
      </h1>
      <p className="mt-1 max-w-[70ch] text-sm text-muted">
        Edite o texto enviado antes dos vencimentos e acompanhe os resultados registrados pelo Resend.
      </p>
      <div className="mt-6">
        <DonorReminderClient
          initialTemplate={dashboard.template}
          initialPreview={{ assunto: preview.assunto, bodyHtml: preview.bodyHtml }}
          initialSends={dashboard.sends}
          header={dashboard.header}
          resendConfigured={Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM)}
        />
      </div>
    </div>
  );
}
