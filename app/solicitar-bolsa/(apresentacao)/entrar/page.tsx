import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ServerActionsProvider } from "@/components/server-actions";
import { getApplicant } from "@/lib/auth/applicant-session";
import { loginApplicant, resendVerificationEmail } from "../../_actions/applicant-actions";
import { ApplicantLoginForm } from "../../_components/account-forms";

export const metadata: Metadata = { title: "Entrar — Solicitação de Bolsa" };
export const dynamic = "force-dynamic";

export default async function EntrarPage() {
  if (await getApplicant()) redirect("/solicitar-bolsa");
  return (
    <ServerActionsProvider actions={{ loginApplicant, resendVerificationEmail }}>
      <ApplicantLoginForm />
    </ServerActionsProvider>
  );
}
