import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { DonorForm } from "./donor-form";
import { DonorPageLayout } from "./donor-page-layout";
import { emptyMonthlyErrors } from "./seja-um-benfeitor.fixtures";

export const meta = definePrototype({
  title: "Seja um benfeitor",
  route: "/seja-um-benfeitor",
  standalone: true,
  states: [
    { id: "mensal", label: "Contribuição mensal" },
    { id: "unica", label: "Contribuição única" },
    { id: "erros-validacao", label: "Erros de validação" },
    { id: "sucesso-mensal", label: "Cadastro enviado (mensal)" },
    { id: "sucesso-unica", label: "Cadastro enviado (única)" },
  ],
});

export default function Prototype({ state }: PrototypeProps) {
  return (
    <DonorPageLayout>
      <DonorForm
        key={state}
        initialFrequencia={state === "unica" || state === "sucesso-unica" ? "unica" : "mensal"}
        initialErrors={state === "erros-validacao" ? emptyMonthlyErrors : undefined}
        initialDone={state === "sucesso-mensal" || state === "sucesso-unica"}
      />
    </DonorPageLayout>
  );
}
