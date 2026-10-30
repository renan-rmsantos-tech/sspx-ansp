import Link from "next/link";
import { requireAdmin } from "@/lib/auth/authorization";
export const dynamic = "force-dynamic";
export default async function ReportsPage() {
  await requireAdmin();
  return <div className="space-y-5">
    <h1 className="font-heading text-[22px] font-semibold">Relatórios</h1>
    <p className="text-sm text-muted">Escolha o relatório que deseja consultar.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <Link href="/admin/relatorios/cadastros" className="rounded-lg border border-border bg-surface p-5 hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"><h2 className="font-heading text-lg font-semibold">Cadastros de benfeitores</h2><p className="mt-1 text-sm text-muted">Distribuição por residência e priorado ou capela.</p></Link>
      <Link href="/admin/relatorios/financeiro" className="rounded-lg border border-border bg-surface p-5 hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"><h2 className="font-heading text-lg font-semibold">Relatório financeiro</h2><p className="mt-1 text-sm text-muted">Valores previstos, recebidos e em aberto.</p></Link>
    </div>
  </div>;
}
