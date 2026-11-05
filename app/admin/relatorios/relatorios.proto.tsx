import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { ServerActionsProvider } from "@/components/server-actions";
import { fixtureActions } from "@/proto/server-actions.fixtures";
import { PageHeader } from "../_components/page-header";
import { RelatoriosTabs } from "./relatorios-tabs";
import { donorReports, donorReportsEmpty, financialReport, financialReportEmpty } from "./relatorios.fixtures";

export const meta = definePrototype({
  title: "Relatórios",
  spec: "painel",
  route: "/admin/relatorios",
  roles: ["admin"],
  states: [
    { id: "cadastros", label: "Cadastros de benfeitores" },
    { id: "cadastros-vazio", label: "Cadastros sem resultados no filtro" },
    { id: "financeiro", label: "Financeiro de quatro meses" },
    { id: "financeiro-vazio", label: "Financeiro sem movimento" },
  ],
});

const READY = fixtureActions({
  getDonorReports: async () => donorReports,
  getDonorFinancialReport: async () => financialReport,
});

const EMPTY = fixtureActions({
  getDonorReports: async () => donorReportsEmpty,
  getDonorFinancialReport: async () => financialReportEmpty,
});

export default function Prototype({ state }: PrototypeProps) {
  const empty = state.endsWith("-vazio");

  return (
    <ServerActionsProvider actions={empty ? EMPTY : READY}>
      <PageHeader
        title="Relatórios"
        description="Consultas sobre os cadastros de benfeitores e sobre o movimento financeiro conferido no extrato."
      />
      <RelatoriosTabs
        reports={empty ? donorReportsEmpty : donorReports}
        financial={empty ? financialReportEmpty : financialReport}
        defaultTab={state.startsWith("financeiro") ? "financeiro" : "cadastros"}
      />
    </ServerActionsProvider>
  );
}
