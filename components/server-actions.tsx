"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type * as AdminActions from "@/app/admin/_actions/admin-actions";
import type * as DonorEmailActions from "@/app/admin/_actions/donor-email-actions";
import type * as DonorFinancialReportActions from "@/app/admin/_actions/donor-financial-report-actions";
import type * as DonorMonthlyInstructionsActions from "@/app/admin/_actions/donor-monthly-instructions-actions";
import type * as DonorPaymentConferenceActions from "@/app/admin/_actions/donor-payment-conference-actions";
import type * as DonorReceiptActions from "@/app/admin/_actions/donor-receipt-actions";
import type * as DonorReminderActions from "@/app/admin/_actions/donor-reminder-actions";
import type * as DonorReportActions from "@/app/admin/_actions/donor-report-actions";
import type * as ObservationActions from "@/app/admin/_actions/observation-actions";
import type * as StaffActions from "@/app/admin/_actions/staff-actions";
import type * as DonorActions from "@/app/benfeitor/_actions/donor-actions";
import type * as FormActions from "@/app/form/_actions/form-actions";
import type * as AuthActions from "@/app/login/_actions/auth-actions";

/** Todas as server actions que as views de cliente chamam. */
export type ServerActions = typeof AdminActions &
  typeof DonorEmailActions &
  typeof DonorFinancialReportActions &
  typeof DonorMonthlyInstructionsActions &
  typeof DonorPaymentConferenceActions &
  typeof DonorReceiptActions &
  typeof DonorReminderActions &
  typeof DonorReportActions &
  typeof ObservationActions &
  typeof StaffActions &
  typeof DonorActions &
  typeof FormActions &
  typeof AuthActions;

export type ServerActionName = keyof ServerActions;

type Lookup = (name: ServerActionName) => unknown;

const ServerActionsContext = createContext<Lookup>(() => undefined);

/**
 * Entrega server actions às views de cliente. O layout ou a página (servidor)
 * passa as actions reais; protótipos e testes passam fixtures. Assim as views
 * não importam `_actions/` e renderizam na galeria de protótipos.
 * Providers aninhados consultam o mais interno primeiro.
 */
export function ServerActionsProvider({
  actions,
  children,
}: {
  actions: Partial<ServerActions>;
  children: ReactNode;
}) {
  const parent = useContext(ServerActionsContext);
  const lookup = useMemo<Lookup>(
    () => (name) => (actions as Record<string, unknown>)[name] ?? parent(name),
    [actions, parent]
  );
  return <ServerActionsContext.Provider value={lookup}>{children}</ServerActionsContext.Provider>;
}

/**
 * A server action `name` do provider mais próximo. Sem provider, a função
 * devolvida falha ao ser chamada (não ao renderizar), com uma mensagem clara.
 */
export function useServerAction<K extends ServerActionName>(name: K): ServerActions[K] {
  const action = useContext(ServerActionsContext)(name);
  if (typeof action === "function") return action as ServerActions[K];
  return (async () => {
    throw new Error(`Server action "${name}" não foi fornecida por um ServerActionsProvider.`);
  }) as unknown as ServerActions[K];
}
