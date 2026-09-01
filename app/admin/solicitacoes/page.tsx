import { getApplications } from "../_actions/admin-actions";
import { requireStaff } from "@/lib/auth/authorization";
import {
  SecretariatApplicationsClient,
  SolicitacoesClient,
  type SecretariatApplicationSummary,
} from "./client";

export default async function SolicitacoesPage() {
  const staff = await requireStaff();
  const { data: applications } = await getApplications();

  return (
    <div>
      <h1 className="font-heading text-[22px] font-semibold leading-tight tracking-tight">
        Solicitações de Bolsa
      </h1>
      <div className="mt-6">
        {staff.role === "secretaria" ? (
          <SecretariatApplicationsClient initialApplications={(applications as SecretariatApplicationSummary[]) ?? []} />
        ) : (
          <SolicitacoesClient initialApplications={(applications as unknown as import("../_components/application-card").ApplicationSummary[]) ?? []} />
        )}
      </div>
    </div>
  );
}
