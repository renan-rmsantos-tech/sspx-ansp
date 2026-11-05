import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { ServerActionsProvider, type ServerActions } from "@/components/server-actions";
import { fixtureActions } from "@/proto/server-actions.fixtures";
import { SecretariatApplicationsClient, SolicitacoesClient, type SecretariatTab } from "./client";
import type { DetailTab } from "../_components/application-detail";
import type { DecisionMode } from "../_components/decision-actions";
import {
  applicationDetails,
  applications,
  applicationsWithoutRejected,
  currentIssuedDocuments,
  issuedDocumentHistory,
  observations,
  secretariatApplications,
  secretariatApplicationsWithoutRejected,
} from "./solicitacoes.fixtures";

export const meta = definePrototype({
  title: "Solicitações de bolsa",
  route: "/admin/solicitacoes",
  roles: ["admin", "secretaria"],
  states: [
    { id: "lista", label: "Situações variadas" },
    { id: "renda-e-despesas", label: "Registro aberto em Renda e despesas (Administração)" },
    { id: "aprovar", label: "Formulário de aprovação aberto (Administração)" },
    { id: "rejeitar", label: "Formulário de rejeição aberto (Administração)" },
    { id: "documentos-finais", label: "Aprovada, com documentos finais emitidos" },
    { id: "observacoes", label: "Observações internas da Secretaria" },
    { id: "erro-detalhe", label: "Detalhe indisponível (Administração)" },
    { id: "sem-resultados", label: "Filtro sem resultados" },
    { id: "vazia", label: "Nenhuma solicitação recebida" },
    { id: "erro", label: "Lista indisponível" },
  ],
});

const LOAD_ERROR = "O banco de dados não respondeu.";

const OVERRIDES: Partial<ServerActions> = {
  getApplicationDetail: async (id) => {
    const data = applicationDetails[id];
    return data ? { data, error: null } : { data: null, error: "Solicitação não encontrada." };
  },
  getApplicationObservations: async (id) => observations[id] ?? [],
  getCurrentIssuedDocuments: async (id) => currentIssuedDocuments[id] ?? [],
  getIssuedDocumentHistory: async (id) => issuedDocumentHistory[id] ?? [],
};

const ACTIONS = fixtureActions(OVERRIDES);

const ACTIONS_DETAIL_ERROR = fixtureActions({
  ...OVERRIDES,
  getApplicationDetail: async () => ({ data: null, error: "Solicitação não encontrada." }),
});

/** Registro aberto, aba e formulário de decisão de cada estado na visão da Administração. */
const ADMIN_OPEN: Record<string, { id?: string; tab?: DetailTab; decision?: DecisionMode }> = {
  "renda-e-despesas": { tab: "financeiro" },
  aprovar: { tab: "decisao", decision: "approve" },
  rejeitar: { tab: "decisao", decision: "reject" },
  "documentos-finais": { id: "app-almeida", tab: "decisao" },
  observacoes: { id: "app-almeida", tab: "resumo" },
};

/** A Secretaria não vê renda nem decide: os estados só da Administração abrem o Resumo. */
const SECRETARIAT_OPEN: Record<string, { id: string; tab: SecretariatTab }> = {
  "renda-e-despesas": { id: "app-oliveira", tab: "resumo" },
  aprovar: { id: "app-oliveira", tab: "resumo" },
  rejeitar: { id: "app-oliveira", tab: "resumo" },
  "erro-detalhe": { id: "app-oliveira", tab: "resumo" },
  "documentos-finais": { id: "app-almeida", tab: "documentos-finais" },
  observacoes: { id: "app-almeida", tab: "observacoes" },
};

export default function Prototype({ state, role }: PrototypeProps) {
  const error = state === "erro" ? LOAD_ERROR : undefined;
  // Registros decididos abrem com o filtro "Aprovadas", para o detalhe ficar à vista.
  const initialStatus =
    state === "sem-resultados"
      ? "rejeitada"
      : state === "documentos-finais" || state === "observacoes"
        ? "aprovada"
        : undefined;

  if (role === "secretaria") {
    const open = SECRETARIAT_OPEN[state];
    return (
      <ServerActionsProvider actions={ACTIONS}>
        <SecretariatApplicationsClient
          key={state}
          initialApplications={
            state === "vazia"
              ? []
              : state === "sem-resultados"
                ? secretariatApplicationsWithoutRejected
                : secretariatApplications
          }
          initialStatus={initialStatus}
          error={error}
          initialOpenId={open?.id}
          initialTab={open?.tab}
        />
      </ServerActionsProvider>
    );
  }

  const open = ADMIN_OPEN[state];
  return (
    <ServerActionsProvider actions={state === "erro-detalhe" ? ACTIONS_DETAIL_ERROR : ACTIONS}>
      <SolicitacoesClient
        key={state}
        initialApplications={
          state === "vazia" ? [] : state === "sem-resultados" ? applicationsWithoutRejected : applications
        }
        initialStatus={initialStatus}
        error={error}
        initialOpenId={open?.id}
        initialTab={open?.tab}
        initialDecision={open?.decision}
      />
    </ServerActionsProvider>
  );
}
