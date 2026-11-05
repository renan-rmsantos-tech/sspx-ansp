import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { FormUnavailableMessage } from "./form-unavailable-message";
import { ScholarshipForm } from "./scholarship-form";
import { ScholarshipPageLayout } from "./scholarship-page-layout";
import { SuccessScreen } from "./success-screen";
import { emptyStep1Errors, filledFormData, upcomingSchoolYear } from "./solicitar-bolsa.fixtures";

export const meta = definePrototype({
  title: "Solicitar bolsa",
  spec: "publico",
  route: "/solicitar-bolsa",
  standalone: true,
  states: [
    { id: "etapa-1-pais", label: "Etapa 1: dados dos pais" },
    { id: "etapa-1-erros", label: "Etapa 1: erros de validação" },
    { id: "etapa-2-alunos", label: "Etapa 2: dados dos alunos" },
    { id: "etapa-3-renda", label: "Etapa 3: renda familiar" },
    { id: "etapa-4-despesas", label: "Etapa 4: despesas mensais" },
    { id: "etapa-5-veiculos", label: "Etapa 5: veículos e benfeitores" },
    { id: "etapa-6-revisao", label: "Etapa 6: revisão e envio" },
    { id: "envio-concluido", label: "Solicitação enviada" },
    { id: "inscricoes-agendadas", label: "Inscrições fechadas, com abertura cadastrada" },
    { id: "inscricoes-fechadas", label: "Inscrições fechadas, sem próximo período" },
  ],
});

const STEPS: Record<string, number> = {
  "etapa-2-alunos": 2,
  "etapa-3-renda": 3,
  "etapa-4-despesas": 4,
  "etapa-5-veiculos": 5,
  "etapa-6-revisao": 6,
};

function Screen({ state }: { state: string }) {
  if (state === "envio-concluido") return <SuccessScreen />;
  if (state === "inscricoes-agendadas") return <FormUnavailableMessage year={upcomingSchoolYear} />;
  if (state === "inscricoes-fechadas") return <FormUnavailableMessage />;
  if (state === "etapa-1-erros") return <ScholarshipForm initialErrors={emptyStep1Errors} />;
  const step = STEPS[state];
  if (step) return <ScholarshipForm initialStep={step} initialData={filledFormData} />;
  return <ScholarshipForm />;
}

export default function Prototype({ state }: PrototypeProps) {
  return (
    <ScholarshipPageLayout>
      <Screen key={state} state={state} />
    </ScholarshipPageLayout>
  );
}
