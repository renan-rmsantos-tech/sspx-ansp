import { definePrototype } from "@compozy/proto";
import { CartazBenfeitores } from "./cartaz-benfeitores";

export const meta = definePrototype({
  title: "Cartaz A4 — benfeitores",
  spec: "divulgacao",
  standalone: true,
  states: [{ id: "a4", label: "A4 retrato" }],
});

export default function Prototype() {
  return <CartazBenfeitores />;
}
