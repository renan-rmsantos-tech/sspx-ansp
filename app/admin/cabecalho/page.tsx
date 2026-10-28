import { getDocumentHeader } from "../_actions/admin-actions";
import { CabecalhoClient } from "./client";
import { requireAdmin } from "@/lib/auth/authorization";

export default async function CabecalhoPage() {
  await requireAdmin();
  const { data: header, error } = await getDocumentHeader();

  if (!header) throw new Error(error);

  return (
    <div>
      <h1 className="font-heading text-[22px] font-semibold leading-tight tracking-tight">
        Cabeçalho e rodapé
      </h1>
      <p className="mt-1 text-sm text-muted">
        Selo da ANSP, cabeçalho e rodapé institucional compartilhados por todos os e-mails e PDFs.
      </p>
      <div className="mt-6">
        <CabecalhoClient initialHeader={header} />
      </div>
    </div>
  );
}
