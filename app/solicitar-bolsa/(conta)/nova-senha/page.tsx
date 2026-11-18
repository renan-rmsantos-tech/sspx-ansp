import type { Metadata } from "next";
import { ServerActionsProvider } from "@/components/server-actions";
import { resetApplicantPassword } from "../../_actions/applicant-actions";
import { ResetPasswordForm } from "../../_components/account-forms";

export const metadata: Metadata = { title: "Nova senha — Solicitação de Bolsa" };

export default async function NovaSenhaPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <ServerActionsProvider actions={{ resetApplicantPassword }}>
      <ResetPasswordForm token={token} />
    </ServerActionsProvider>
  );
}
