import { requireAdmin } from "@/lib/auth/authorization";
import { getDonorEmailSettings } from "../_actions/donor-email-actions";
import { DonorEmailClient } from "./client";

export default async function DonorEmailPage() {
  await requireAdmin();
  const { template, pending } = await getDonorEmailSettings();
  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);

  return (
    <div className="max-w-[1200px]">
      <h1 className="font-heading text-[22px] font-semibold leading-tight tracking-tight">
        E-mail para Benfeitores
      </h1>
      <p className="mt-1 max-w-[70ch] text-sm text-muted">
        Mensagem enviada após o cadastro de um benfeitor. As alterações são usadas nos próximos envios.
      </p>
      <div className="mt-6">
        <DonorEmailClient
          initialTemplate={template}
          initialPending={pending}
          smtpConfigured={smtpConfigured}
        />
      </div>
    </div>
  );
}
