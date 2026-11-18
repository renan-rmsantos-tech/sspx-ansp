import type { Metadata } from "next";
import { ServerActionsProvider } from "@/components/server-actions";
import { confirmApplicantEmail } from "../../_actions/applicant-actions";
import { ConfirmEmailForm } from "../../_components/account-forms";

export const metadata: Metadata = { title: "Confirmar e-mail — Solicitação de Bolsa" };

// O link só é consumido pelo botão: leitores de e-mail que abrem links
// automaticamente não gastam o token.
export default async function ConfirmarPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <ServerActionsProvider actions={{ confirmApplicantEmail }}>
      <ConfirmEmailForm token={token} />
    </ServerActionsProvider>
  );
}
