import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/authorization";
import { getContractTemplate, getTemplates } from "../_actions/admin-actions";
import { PageHeader } from "../_components/page-header";
import { ModelosTabs } from "./modelos-tabs";

export default async function ModelosPage() {
  await requireAdmin();
  const [{ data: templates }, { data: contract }] = await Promise.all([
    getTemplates(),
    getContractTemplate(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modelos de documentos"
        description="Textos das cartas de decisão e do contrato de concessão. Os campos entre chaves são preenchidos com os dados da solicitação ao gerar o PDF."
      />
      <Suspense fallback={null}>
        <ModelosTabs templates={templates ?? []} contract={contract ?? null} />
      </Suspense>
    </div>
  );
}
