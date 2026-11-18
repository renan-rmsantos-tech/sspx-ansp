import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ServerActionsProvider } from "@/components/server-actions";
import { getApplicant } from "@/lib/auth/applicant-session";
import { findApplicantApplication } from "@/lib/applicant/scholarship-state";
import { createApplicantUploadUrl, submitRequestedDocument } from "@/app/form/_actions/form-actions";
import { documentLabel } from "@/lib/applicant/document-labels";
import { logoutApplicant } from "../../_actions/applicant-actions";
import { ApplicantBar } from "../../_components/account-forms";
import { MyApplication } from "../../_components/my-application";
import { RequestedDocuments, type RequestedDocument } from "../../_components/requested-documents";

export const metadata: Metadata = { title: "Minha solicitação — Solicitação de Bolsa" };
export const dynamic = "force-dynamic";

export default async function MinhaSolicitacaoPage() {
  const applicant = await getApplicant();
  if (!applicant) redirect("/solicitar-bolsa/entrar");

  const application = await findApplicantApplication(applicant.id);
  const requests: RequestedDocument[] = (application?.document_requests ?? []).map((request) => ({
    id: request.id,
    label: documentLabel(request.categoria, request.student?.nome),
    motivo: request.motivo,
    status: request.status === "cancelada" ? "resolvida" : request.status,
    resubmitted_at: request.resubmitted_at,
  }));
  // O que ainda falta enviar vem primeiro.
  requests.sort((a, b) => Number(b.status === "aberta") - Number(a.status === "aberta"));
  return (
    <ServerActionsProvider actions={{ logoutApplicant, createUploadUrl: createApplicantUploadUrl, submitRequestedDocument }}>
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
        pendingDocuments={requests.filter((request) => request.status === "aberta").length}
      />
      <RequestedDocuments initialRequests={requests} />
    </ServerActionsProvider>
  );
}
