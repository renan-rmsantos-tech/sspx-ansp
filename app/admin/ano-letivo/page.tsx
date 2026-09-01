import { getSchoolYears } from "../_actions/admin-actions";
import { AnoLetivoClient } from "./client";
import { requireAdmin } from "@/lib/auth/authorization";

export default async function AnoLetivoPage() {
  await requireAdmin();
  const { data: years } = await getSchoolYears();

  return (
    <div>
      <h1 className="font-heading text-[22px] font-semibold leading-tight tracking-tight">
        Configuração de Ano Letivo
      </h1>
      <div className="mt-6">
        <AnoLetivoClient initialYears={years ?? []} />
      </div>
    </div>
  );
}
