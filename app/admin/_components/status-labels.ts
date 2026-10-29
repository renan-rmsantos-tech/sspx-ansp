import type { Tone } from "./status-pill";

export type ApplicationStatus = "pendente" | "aprovada" | "rejeitada";

/** Vocabulário fechado de situação da solicitação: lista, filtro e detalhe usam o mesmo texto. */
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pendente: "Aguardando decisão",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};

export const STATUS_TONES: Record<ApplicationStatus, Tone> = {
  pendente: "warn",
  aprovada: "success",
  rejeitada: "danger",
};

export const APPLICATION_STATUSES: readonly ApplicationStatus[] = ["pendente", "aprovada", "rejeitada"];

/** Valida o valor de `?situacao=`; qualquer outra coisa cai em "sem filtro". */
export function parseApplicationStatus(raw: unknown): ApplicationStatus | undefined {
  return APPLICATION_STATUSES.find((status) => status === raw);
}
