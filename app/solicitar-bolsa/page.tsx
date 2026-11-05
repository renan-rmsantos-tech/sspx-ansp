import { createUploadUrl, getActiveSchoolYear, submitApplication } from "@/app/form/_actions/form-actions";
import { FormUnavailableMessage } from "@/app/form/_components/form-unavailable-message";
import { ScholarshipForm } from "@/app/form/_components/scholarship-form";
import { ServerActionsProvider } from "@/components/server-actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solicitação de Bolsa — Arca N. S. da Providência",
  description: "Formulário de solicitação de bolsa para família necessitada.",
};

export const dynamic = "force-dynamic";

export default async function SolicitarBolsaPage() {
  const result = await getActiveSchoolYear();
  if (!result.open) return <FormUnavailableMessage year={result.upcomingYear} />;
  return (
    <ServerActionsProvider actions={{ createUploadUrl, submitApplication }}>
      <ScholarshipForm />
    </ServerActionsProvider>
  );
}
