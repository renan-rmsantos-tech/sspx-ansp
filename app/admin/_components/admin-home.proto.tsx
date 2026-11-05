import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { AdminHome } from "./admin-home";
import { adminHomeSummary, adminHomeSummaryIdle } from "./admin-home.fixtures";

export const meta = definePrototype({
  title: "Início do painel",
  route: "/admin",
  roles: ["admin", "secretaria"],
  states: [
    { id: "pendencias", label: "Com pendências" },
    { id: "em-dia", label: "Tudo em dia, sem ano letivo" },
    { id: "erro", label: "Resumo indisponível" },
  ],
});

export default function Prototype({ state, role }: PrototypeProps) {
  return (
    <AdminHome
      summary={state === "erro" ? null : state === "em-dia" ? adminHomeSummaryIdle : adminHomeSummary}
      role={role === "secretaria" ? "secretaria" : "admin"}
      error={state === "erro" ? "O banco de dados não respondeu." : undefined}
    />
  );
}
