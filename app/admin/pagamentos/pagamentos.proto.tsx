import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { ServerActionsProvider } from "@/components/server-actions";
import { fixtureActions } from "@/proto/server-actions.fixtures";
import { issuedReceiptLink } from "../benfeitores/benfeitores.fixtures";
import { PagamentosClient } from "./client";
import {
  CURRENT_MONTH,
  conferenceByMonth,
  emptyConference,
  novemberConference,
  octoberConference,
  receiptPreview,
} from "./pagamentos.fixtures";

export const meta = definePrototype({
  title: "Pagamentos",
  spec: "painel",
  route: "/admin/pagamentos",
  roles: ["admin"],
  states: [
    { id: "conferencia", label: "Mês em conferência, vários estados" },
    { id: "mes-conferido", label: "Mês todo conferido" },
    { id: "sem-pagamentos", label: "Mês sem pagamentos" },
    { id: "mes-invalido", label: "Mês inválido na URL" },
    { id: "erro", label: "Erro ao carregar" },
  ],
});

/** Trocar de mês, abrir comprovante e gerar link devolvem o formato das actions reais. */
const ACTIONS = fixtureActions({
  getDonorPaymentConference: async (month: string) => conferenceByMonth[month] ?? emptyConference,
  getDonorPaymentReceiptUrl: async () => receiptPreview,
  issueDonorReceiptRecoveryLink: async () => issuedReceiptLink,
});

const INITIAL: Record<string, { month: string; data: typeof novemberConference | null }> = {
  conferencia: { month: CURRENT_MONTH, data: novemberConference },
  "mes-conferido": { month: "2026-10", data: octoberConference },
  "sem-pagamentos": { month: "2026-03", data: emptyConference },
  "mes-invalido": { month: CURRENT_MONTH, data: novemberConference },
  erro: { month: CURRENT_MONTH, data: null },
};

export default function Prototype({ state }: PrototypeProps) {
  const initial = INITIAL[state] ?? INITIAL.conferencia;
  return (
    <ServerActionsProvider actions={ACTIONS}>
      <PagamentosClient
        initialMonth={initial.month}
        currentMonth={CURRENT_MONTH}
        initialData={initial.data}
        invalidMonth={state === "mes-invalido"}
        error={state === "erro" ? "O banco de dados não respondeu." : undefined}
      />
    </ServerActionsProvider>
  );
}
