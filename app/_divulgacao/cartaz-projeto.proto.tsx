import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { CartazProjeto, type CartazOrientacao } from "./cartaz-projeto";

export const meta = definePrototype({
  title: "Cartaz 100 × 60 cm — projeto",
  spec: "divulgacao",
  standalone: true,
  states: [
    { id: "retrato", label: "Em pé (60 × 100 cm)" },
    { id: "paisagem", label: "Deitado (100 × 60 cm)" },
  ],
});

export default function Prototype({ state }: PrototypeProps) {
  return <CartazProjeto orientacao={state as CartazOrientacao} />;
}
