import { getTemplates } from "../_actions/admin-actions";
import { TemplateEditor } from "../_components/template-editor";
import { requireAdmin } from "@/lib/auth/authorization";

export default async function TextosPage() {
  await requireAdmin();
  const { data: templates } = await getTemplates();

  return (
    <div>
      <h1 className="font-heading text-[22px] font-semibold leading-tight tracking-tight">
        Textos de Decisão
      </h1>
      <div className="mt-6">
        <TemplateEditor initialTemplates={templates ?? []} />
      </div>
    </div>
  );
}
