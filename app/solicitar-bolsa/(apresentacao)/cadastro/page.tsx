import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ServerActionsProvider } from "@/components/server-actions";
import { getApplicant } from "@/lib/auth/applicant-session";
import { signUpApplicant } from "../../_actions/applicant-actions";
import { ApplicantSignUpForm } from "../../_components/account-forms";

export const metadata: Metadata = { title: "Criar conta — Solicitação de Bolsa" };
export const dynamic = "force-dynamic";

export default async function CadastroPage() {
  if (await getApplicant()) redirect("/solicitar-bolsa");
  return (
    <ServerActionsProvider actions={{ signUpApplicant }}>
      <ApplicantSignUpForm />
    </ServerActionsProvider>
  );
}
