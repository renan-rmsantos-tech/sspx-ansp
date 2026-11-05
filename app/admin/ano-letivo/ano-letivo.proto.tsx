import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { AnoLetivoClient } from "./client";
import { schoolYears, today } from "./ano-letivo.fixtures";

export const meta = definePrototype({
  title: "Ano letivo",
  route: "/admin/ano-letivo",
  roles: ["admin"],
  states: [
    { id: "cadastrados", label: "Anos cadastrados, um com inscrições abertas" },
    { id: "novo-ano", label: "Formulário de novo ano aberto" },
    { id: "confirmar-exclusao", label: "Confirmação de exclusão" },
    { id: "nenhum", label: "Nenhum ano letivo cadastrado" },
    { id: "erro", label: "Lista indisponível" },
  ],
});

export default function Prototype({ state }: PrototypeProps) {
  return (
    <AnoLetivoClient
      key={state}
      initialYears={state === "nenhum" ? [] : schoolYears}
      today={today}
      initialCreating={state === "novo-ano"}
      initialConfirmDeleteId={state === "confirmar-exclusao" ? "ano-2026" : undefined}
      error={state === "erro" ? "O banco de dados não respondeu." : undefined}
    />
  );
}
