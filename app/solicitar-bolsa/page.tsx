import { getActiveSchoolYear } from "@/app/form/_actions/form-actions";
import { FormUnavailableMessage } from "@/app/form/_components/form-unavailable-message";
import { ScholarshipForm } from "@/app/form/_components/scholarship-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solicitação de Bolsa — Arca N. S. da Providência",
  description: "Formulário de solicitação de bolsa para família necessitada.",
};

export const dynamic = "force-dynamic";

export default async function SolicitarBolsaPage() {
  const result = await getActiveSchoolYear();
  return result.open ? <ScholarshipForm /> : <FormUnavailableMessage />;
}
