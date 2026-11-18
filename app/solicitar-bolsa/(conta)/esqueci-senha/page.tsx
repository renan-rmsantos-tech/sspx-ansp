import type { Metadata } from "next";
import { ServerActionsProvider } from "@/components/server-actions";
import { requestPasswordReset } from "../../_actions/applicant-actions";
import { ForgotPasswordForm } from "../../_components/account-forms";

export const metadata: Metadata = { title: "Esqueci minha senha — Solicitação de Bolsa" };

export default function EsqueciSenhaPage() {
  return (
    <ServerActionsProvider actions={{ requestPasswordReset }}>
      <ForgotPasswordForm />
    </ServerActionsProvider>
  );
}
