import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createApplicantUploadUrl,
  getActiveSchoolYear,
  saveApplicationDraft,
  submitApplication,
} from "@/app/form/_actions/form-actions";
import { FormUnavailableMessage } from "@/app/form/_components/form-unavailable-message";
import { restoreDraft } from "@/app/form/_components/form-types";
import { ScholarshipForm } from "@/app/form/_components/scholarship-form";
import { ServerActionsProvider } from "@/components/server-actions";
import { getApplicant } from "@/lib/auth/applicant-session";
import { findApplicantApplication, findApplicationDraft } from "@/lib/applicant/scholarship-state";
import { logoutApplicant } from "../_actions/applicant-actions";
import { ApplicantBar } from "../_components/account-forms";

export const dynamic = "force-dynamic";

const MY_APPLICATION = "/solicitar-bolsa/minha-solicitacao";

export default async function SolicitarBolsaPage() {
  const [applicant, result] = await Promise.all([getApplicant(), getActiveSchoolYear()]);

  if (!applicant) {
    if (result.open) redirect("/solicitar-bolsa/entrar");
    return (
      <>
        <FormUnavailableMessage year={result.upcomingYear} />
        <p className="mt-6 text-center text-sm text-muted">
          Já enviou sua solicitação?{" "}
          <Link href="/solicitar-bolsa/entrar" className="font-medium text-accent underline-offset-4 hover:underline">
            Entre para acompanhar
          </Link>
        </p>
      </>
    );
  }

  const application = await findApplicantApplication(applicant.id, result.open ? result.year?.id : undefined);
  if (application) redirect(MY_APPLICATION);

  if (!result.open || !result.year) {
    return (
      <ServerActionsProvider actions={{ logoutApplicant }}>
        <ApplicantBar email={applicant.email} />
        <FormUnavailableMessage year={result.upcomingYear} />
      </ServerActionsProvider>
    );
  }

  const draft = await findApplicationDraft(applicant.id, result.year.id);
  return (
    <ServerActionsProvider
      actions={{ createUploadUrl: createApplicantUploadUrl, submitApplication, saveApplicationDraft, logoutApplicant }}
    >
      <ApplicantBar email={applicant.email} />
      <ScholarshipForm
        autosave
        initialData={restoreDraft(draft?.data, applicant.email)}
        initialStep={draft?.current_step ?? 1}
        initialSavedAt={draft?.updated_at ?? null}
      />
    </ServerActionsProvider>
  );
}
