import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ServerActionsProvider } from "@/components/server-actions";
import { getApplicant } from "@/lib/auth/applicant-session";
import { findApplicantApplication } from "@/lib/applicant/scholarship-state";
import { logoutApplicant } from "../../_actions/applicant-actions";
import { ApplicantBar } from "../../_components/account-forms";
import { MyApplication } from "../../_components/my-application";

export const metadata: Metadata = { title: "Minha solicitação — Solicitação de Bolsa" };
export const dynamic = "force-dynamic";

export default async function MinhaSolicitacaoPage() {
  const applicant = await getApplicant();
  if (!applicant) redirect("/solicitar-bolsa/entrar");

  const application = await findApplicantApplication(applicant.id);
  return (
    <ServerActionsProvider actions={{ logoutApplicant }}>
      <ApplicantBar email={applicant.email} />
      <MyApplication
        application={
          application
            ? {
                status: application.status,
                data_envio: application.data_envio,
                ano_letivo: application.school_years?.nome ?? null,
                alunos: application.students,
              }
            : null
        }
      />
    </ServerActionsProvider>
  );
}
