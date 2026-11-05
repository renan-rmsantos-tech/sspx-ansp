import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { PostRedes, type PostFormato, type PostTema } from "./post-redes";

export const meta = definePrototype({
  title: "Posts para redes sociais",
  spec: "divulgacao",
  standalone: true,
  states: [
    { id: "benfeitores-quadrado", label: "Benfeitores — feed (1080×1080)" },
    { id: "benfeitores-story", label: "Benfeitores — story (1080×1920)" },
    { id: "familias-quadrado", label: "Famílias — feed (1080×1080)" },
    { id: "familias-story", label: "Famílias — story (1080×1920)" },
  ],
});

export default function Prototype({ state }: PrototypeProps) {
  const [tema, formato] = state.split("-") as [PostTema, PostFormato];
  return <PostRedes tema={tema} formato={formato} />;
}
