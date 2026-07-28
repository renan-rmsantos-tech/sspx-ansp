import { getActiveSchoolYear } from "./_actions/form-actions";
import { FormUnavailableMessage } from "./_components/form-unavailable-message";
import { ScholarshipForm } from "./_components/scholarship-form";

// A página decide, a cada acesso, se o período de inscrição está aberto —
// consultando o banco. Não pode ser pré-renderizada no build.
export const dynamic = "force-dynamic";

export default async function FormPage() {
  const result = await getActiveSchoolYear();

  if (!result.open) {
    return <FormUnavailableMessage />;
  }

  return <ScholarshipForm />;
}
