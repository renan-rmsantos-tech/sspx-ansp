import type { ComponentProps } from "react";
import type { DocumentHeaderData } from "@/lib/documents/document-header";
import {
  DONOR_MONTHLY_INSTRUCTIONS_BODY,
  DONOR_MONTHLY_INSTRUCTIONS_SUBJECT,
  renderDonorMonthlyInstructionsPreview,
} from "@/lib/email/donor-monthly-instructions-template";
import {
  DONOR_REMINDER_BODY,
  DONOR_REMINDER_SUBJECT,
  renderDonorReminderPreview,
} from "@/lib/email/donor-reminder-template";
import { DONOR_WELCOME_BODY, DONOR_WELCOME_SUBJECT } from "@/lib/email/donor-welcome-template";
import type { EmailsTabs } from "./emails-tabs";

type Props = ComponentProps<typeof EmailsTabs>;
type PendingDonor = Props["welcome"]["initialPending"][number];
type ReminderSend = Props["reminders"]["initialSends"][number];

export const emailHeader: DocumentHeaderData = {
  linha1: "Arca Nossa Senhora da Providência",
  linha2: "Mantenedora do Colégio São José — Itatiba/SP",
  linha3: "",
  mostrar_selo: true,
  rodape_institucional: "Arca Nossa Senhora da Providência\nObra de Assistência Educacional Católica",
};

export const pendingWelcome: PendingDonor[] = [
  {
    id: "5f0c7a1e-2b4d-4e8f-9a31-1c2d3e4f5a61",
    nome: "Teresa de Jesus Oliveira",
    email: "teresa.oliveira@example.com",
    created_at: "2026-11-03T14:12:00.000Z",
  },
  {
    id: "6a1d8b2f-3c5e-4f90-8b42-2d3e4f5a6b72",
    nome: "João Batista Pereira",
    email: "joao.pereira@example.com",
    created_at: "2026-11-02T09:40:00.000Z",
  },
  {
    id: "7b2e9c30-4d6f-4a01-9c53-3e4f5a6b7c83",
    nome: "Luísa Fernanda Rocha",
    email: "luisa.rocha@example.com",
    created_at: "2026-10-30T19:05:00.000Z",
  },
];

const reminderTemplate = { assunto: DONOR_REMINDER_SUBJECT, corpo: DONOR_REMINDER_BODY };
const monthlyTemplate = { assunto: DONOR_MONTHLY_INSTRUCTIONS_SUBJECT, corpo: DONOR_MONTHLY_INSTRUCTIONS_BODY };
const reminderPreview = renderDonorReminderPreview(reminderTemplate, emailHeader);
const monthlyPreview = renderDonorMonthlyInstructionsPreview(monthlyTemplate, emailHeader);

const baseSend: Omit<ReminderSend, "id" | "nome" | "status"> = {
  competencia: "2026-11",
  kind: "10d",
  due_date: "2026-11-15",
  sent_at: null,
  error_code: null,
  attempt_count: 1,
  reservation_expires_at: null,
  provider_message_id: null,
  provider_call_started_at: null,
  frozen_recipient: null,
  can_retry: false,
};

export const reminderSendsNeedingAttention: ReminderSend[] = [
  {
    ...baseSend,
    id: "8c3f0d41-5e70-4b12-8d64-4f5a6b7c8d94",
    nome: "Carlos Eduardo Mendes",
    status: "failed",
    error_code: "provider_rejected",
    can_retry: true,
  },
  {
    ...baseSend,
    id: "9d4a1e52-6f81-4c23-9e75-5a6b7c8d9ea5",
    nome: "Maria Aparecida Souza",
    status: "uncertain",
    kind: "5d",
    due_date: "2026-11-09",
    error_code: "unknown",
    frozen_recipient: "maria.souza@example.com",
    provider_call_started_at: "2026-11-04T11:02:00.000Z",
    provider_message_id: "re_4f8a2c91-7d3b-4e6a-b1c5-0a9e8d7c6b5a",
  },
  {
    ...baseSend,
    id: "ae5b2f63-7092-4d34-8f86-6b7c8d9eafb6",
    nome: "Ana Clara Lima",
    status: "failed",
    competencia: "2026-10",
    due_date: "2026-10-20",
    error_code: "invalid_recipient",
    attempt_count: 2,
    can_retry: false,
  },
  {
    ...baseSend,
    id: "bf6c3074-81a3-4e45-9a97-7c8d9eb0c0c7",
    nome: "João Batista Pereira",
    status: "sending",
    due_date: "2026-11-09",
    kind: "5d",
  },
];

export function emailsProps({
  pending = pendingWelcome,
  sends = reminderSendsNeedingAttention,
  resendConfigured = true,
}: {
  pending?: PendingDonor[];
  sends?: ReminderSend[];
  resendConfigured?: boolean;
} = {}): Omit<Props, "defaultTab"> {
  return {
    welcome: {
      initialTemplate: { assunto: DONOR_WELCOME_SUBJECT, corpo: DONOR_WELCOME_BODY },
      initialPending: pending,
      header: emailHeader,
      resendConfigured,
    },
    monthly: {
      initialTemplate: monthlyTemplate,
      initialPreview: { assunto: monthlyPreview.assunto, bodyHtml: monthlyPreview.bodyHtml },
      header: emailHeader,
      resendConfigured,
    },
    reminders: {
      initialTemplate: reminderTemplate,
      initialPreview: { assunto: reminderPreview.assunto, bodyHtml: reminderPreview.bodyHtml },
      initialSends: sends,
      header: emailHeader,
      resendConfigured,
    },
  };
}
