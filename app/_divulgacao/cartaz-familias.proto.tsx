import { definePrototype } from "@compozy/proto";
import { CartazFamilias } from "./cartaz-familias";

export const meta = definePrototype({
  title: "Cartaz A4 — famílias",
  spec: "divulgacao",
  standalone: true,
  states: [{ id: "a4", label: "A4 retrato" }],
});

export default function Prototype() {
  return <CartazFamilias />;
}
