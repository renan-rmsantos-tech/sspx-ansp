import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { PageHeader } from "../_components/page-header";
import { ModelosTabs, type ModelTab } from "./modelos-tabs";
import { contractTemplate, decisionTemplates } from "./modelos.fixtures";

export const meta = definePrototype({
  title: "Modelos de documentos",
  spec: "painel",
  route: "/admin/modelos",
  roles: ["admin"],
  states: [
    { id: "aprovacao", label: "Carta de aprovação" },
    { id: "rejeicao", label: "Carta de rejeição" },
    { id: "contrato", label: "Contrato de concessão" },
    { id: "erro-ao-salvar", label: "Carta de aprovação: erro ao salvar" },
    { id: "sem-modelos", label: "Carta sem modelo cadastrado" },
    { id: "contrato-sem-clausulas", label: "Contrato ainda não configurado" },
  ],
});

const TAB_BY_STATE: Record<string, ModelTab> = {
  rejeicao: "rejeicao",
  contrato: "contrato",
  "contrato-sem-clausulas": "contrato",
};

export default function Prototype({ state }: PrototypeProps) {
  const empty = state === "sem-modelos" || state === "contrato-sem-clausulas";

  return (
    <>
      <PageHeader
        title="Modelos de documentos"
        description="Textos das cartas de decisão e do contrato de concessão. Os campos entre chaves são preenchidos com os dados da solicitação ao gerar o PDF."
      />
      <ModelosTabs
        templates={empty ? [] : decisionTemplates}
        contract={empty ? null : contractTemplate}
        defaultTab={TAB_BY_STATE[state] ?? "aprovacao"}
        initialMessages={
          state === "erro-ao-salvar" ? { aprovacao: { type: "error", text: "Erro ao salvar modelo." } } : undefined
        }
      />
    </>
  );
}
