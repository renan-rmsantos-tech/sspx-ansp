import { definePrototype } from "@compozy/proto";
import { LandingPage } from "./landing";

export const meta = definePrototype({
  title: "Landing institucional",
  spec: "publico",
  route: "/",
  standalone: true,
  states: [{ id: "padrao", label: "Página inicial" }],
});

export default function Prototype() {
  return <LandingPage />;
}
