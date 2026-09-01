import { getDocumentHeader } from "../_actions/admin-actions";
import { CabecalhoClient } from "./client";
import { requireAdmin } from "@/lib/auth/authorization";

export default async function CabecalhoPage() {
  await requireAdmin();
  const { data: header } = await getDocumentHeader();

  return (
    <div>
      <h1 className="font-heading text-[22px] font-semibold leading-tight tracking-tight">
        Cabeçalho dos Documentos
      </h1>
      <p className="mt-1 text-sm text-muted">
        Selo da ANSP e linhas de texto exibidos no topo dos PDFs de Decisão e de
        Contrato.
      </p>
      <div className="mt-6">
        <CabecalhoClient
          initialHeader={{
            linha1: header?.linha1 ?? "Arca Nossa Senhora da Providência",
            linha2: header?.linha2 ?? "",
            linha3: header?.linha3 ?? "",
            mostrar_selo: header?.mostrar_selo ?? true,
          }}
        />
      </div>
    </div>
  );
}
