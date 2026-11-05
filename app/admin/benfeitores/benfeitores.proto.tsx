import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { ServerActionsProvider } from "@/components/server-actions";
import { fixtureActions } from "@/proto/server-actions.fixtures";
import { BenfeitoresClient, SecretariatDonorsClient } from "./client";
import { OPEN_MONTHLY_DONOR_ID, donors, issuedReceiptLink, secretariatDonors } from "./benfeitores.fixtures";

export const meta = definePrototype({
  title: "Benfeitores",
  route: "/admin/benfeitores",
  roles: ["admin", "secretaria"],
  states: [
    { id: "lista", label: "Mensais e doações únicas" },
    { id: "mensal-aberto", label: "Mensal aberto, comprovante do mês pendente" },
    { id: "boas-vindas-pendentes", label: "Só boas-vindas pendentes" },
    { id: "vazia", label: "Nenhum benfeitor cadastrado" },
  ],
});

const SENT_AT = "2026-11-04T13:00:00.000Z";

/** Os envios e o link de comprovante devolvem o formato das actions reais. */
const ACTIONS = fixtureActions({
  issueDonorReceiptRecoveryLink: async () => issuedReceiptLink,
  retryDonorWelcomeEmail: async () => ({ status: "sent", success: true, sent_at: SENT_AT }),
  markDonorWelcomeEmailSent: async () => ({ success: true, sent_at: SENT_AT }),
  unmarkDonorWelcomeEmailSent: async () => ({ success: true }),
});

export default function Prototype({ state, role }: PrototypeProps) {
  const openId = state === "mensal-aberto" ? OPEN_MONTHLY_DONOR_ID : null;

  if (role === "secretaria") {
    return <SecretariatDonorsClient initialDonors={state === "vazia" ? [] : secretariatDonors} initialOpenDonorId={openId} />;
  }

  return (
    <ServerActionsProvider actions={ACTIONS}>
      <BenfeitoresClient
        initialDonors={state === "vazia" ? [] : donors}
        initialWelcomePendingOnly={state === "boas-vindas-pendentes"}
        initialOpenDonorId={openId}
      />
    </ServerActionsProvider>
  );
}
