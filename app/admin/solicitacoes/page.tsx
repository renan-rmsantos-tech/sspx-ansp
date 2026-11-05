import { getApplications } from "../_actions/admin-actions";
import { requireStaff } from "@/lib/auth/authorization";
import { parseApplicationStatus } from "../_components/status-labels";
import type { ApplicationSummary } from "../_components/application-card";
import {
  SecretariatApplicationsClient,
  SolicitacoesClient,
  type SecretariatApplicationSummary,
} from "./client";

export default async function SolicitacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string | string[] }>;
}) {
  const staff = await requireStaff();
  const { situacao } = await searchParams;
  const initialStatus = parseApplicationStatus(situacao);
  const { data: applications, error } = await getApplications();

  if (staff.role === "secretaria") {
    return (
      <SecretariatApplicationsClient
        initialApplications={(applications as SecretariatApplicationSummary[]) ?? []}
        initialStatus={initialStatus}
        error={error ?? undefined}
      />
    );
  }

  return (
    <SolicitacoesClient
      initialApplications={(applications as unknown as ApplicationSummary[]) ?? []}
      initialStatus={initialStatus}
      error={error ?? undefined}
    />
  );
}
