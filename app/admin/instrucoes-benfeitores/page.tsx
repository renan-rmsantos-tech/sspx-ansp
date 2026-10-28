import { requireAdmin } from "@/lib/auth/authorization";
import { renderDonorMonthlyInstructionsPreview } from "@/lib/email/donor-monthly-instructions-template";
import { getDonorMonthlyInstructionsSettings } from "../_actions/donor-monthly-instructions-actions";
import { DonorMonthlyInstructionsClient } from "./client";

export default async function DonorMonthlyInstructionsPage() {
  await requireAdmin();
  const { template, header } = await getDonorMonthlyInstructionsSettings();
  const preview = renderDonorMonthlyInstructionsPreview(template, header);

  return (
    <div className="max-w-[1200px]">
      <h1 className="font-heading text-[22px] font-semibold leading-tight tracking-tight">
        Instruções de pagamento mensal
      </h1>
      <p className="mt-1 max-w-[70ch] text-sm text-muted">
        Mensagem enviada após o cadastro mensal, independentemente da opção por lembretes.
        As alterações são usadas nos próximos envios.
      </p>
      <div className="mt-6">
        <DonorMonthlyInstructionsClient
          initialTemplate={template}
          initialPreview={{ assunto: preview.assunto, bodyHtml: preview.bodyHtml }}
          header={header}
          resendConfigured={Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM)}
        />
      </div>
    </div>
  );
}
