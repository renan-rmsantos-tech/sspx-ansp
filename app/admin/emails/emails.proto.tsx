import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { ServerActionsProvider } from "@/components/server-actions";
import { renderDonorMonthlyInstructionsPreview } from "@/lib/email/donor-monthly-instructions-template";
import { renderDonorReminderPreview } from "@/lib/email/donor-reminder-template";
import { fixtureActions } from "@/proto/server-actions.fixtures";
import { PageHeader } from "../_components/page-header";
import { EmailsTabs, type EmailTab } from "./emails-tabs";
import { emailHeader, emailsProps, reminderSendsNeedingAttention } from "./emails.fixtures";

export const meta = definePrototype({
  title: "E-mails aos benfeitores",
  route: "/admin/emails",
  roles: ["admin"],
  states: [
    { id: "boas-vindas-pendentes", label: "Boas-vindas com envios pendentes" },
    { id: "boas-vindas-em-dia", label: "Boas-vindas sem pendências" },
    { id: "envio-indisponivel", label: "Resend não configurado" },
    { id: "instrucoes", label: "Instruções de pagamento" },
    { id: "lembretes-atencao", label: "Lembretes com falhas e resultados incertos" },
    { id: "lembretes-em-dia", label: "Lembretes sem pendências" },
  ],
});

const TAB_BY_STATE: Record<string, EmailTab> = {
  instrucoes: "instrucoes",
  "lembretes-atencao": "lembretes",
  "lembretes-em-dia": "lembretes",
};

/** Respostas no formato das actions reais, para salvar, prévia e reenvio funcionarem na galeria. */
const actions = fixtureActions({
  saveDonorReminderTemplate: async (template) => ({ success: true as const, template }),
  previewDonorReminderTemplate: async (template) => {
    const preview = renderDonorReminderPreview(template, emailHeader);
    return { success: true as const, preview: { assunto: preview.assunto, bodyHtml: preview.bodyHtml, header: emailHeader } };
  },
  saveDonorMonthlyInstructionsTemplate: async (template) => ({ success: true as const, template }),
  previewDonorMonthlyInstructionsTemplate: async (template) => {
    const preview = renderDonorMonthlyInstructionsPreview(template, emailHeader);
    return { success: true as const, preview: { assunto: preview.assunto, bodyHtml: preview.bodyHtml, header: emailHeader } };
  },
  retryFailedDonorReminder: async () => ({ status: "sent" as const, sent_at: "2026-11-04T12:30:00.000Z" }),
  getDonorReminderDashboard: async () => ({
    template: emailsProps().reminders.initialTemplate,
    header: emailHeader,
    sends: reminderSendsNeedingAttention.filter((send) => send.status !== "failed" || !send.can_retry),
  }),
});

export default function Prototype({ state }: PrototypeProps) {
  const props = emailsProps({
    pending: state === "boas-vindas-em-dia" ? [] : undefined,
    sends: state === "lembretes-em-dia" ? [] : undefined,
    resendConfigured: state !== "envio-indisponivel",
  });

  return (
    <ServerActionsProvider actions={actions}>
      <PageHeader
        title="E-mails aos benfeitores"
        description="Textos das mensagens automáticas. As alterações valem para os próximos envios; o cabeçalho e o rodapé vêm de Cabeçalho e rodapé."
      />
      <EmailsTabs {...props} defaultTab={TAB_BY_STATE[state] ?? "boas-vindas"} />
    </ServerActionsProvider>
  );
}
