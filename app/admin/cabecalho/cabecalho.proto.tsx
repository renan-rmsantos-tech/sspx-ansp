import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { CabecalhoClient } from "./client";
import { documentHeader, footerError, minimalHeader, overlongFooterHeader } from "./cabecalho.fixtures";

export const meta = definePrototype({
  title: "Cabeçalho e rodapé",
  spec: "painel",
  route: "/admin/cabecalho",
  roles: ["admin"],
  states: [
    { id: "completo", label: "Selo, três linhas e rodapé" },
    { id: "minimo", label: "Sem selo e sem rodapé" },
    { id: "erro-rodape", label: "Rodapé longo demais ao salvar" },
  ],
});

export default function Prototype({ state }: PrototypeProps) {
  if (state === "minimo") return <CabecalhoClient initialHeader={minimalHeader} />;
  if (state === "erro-rodape") return <CabecalhoClient initialHeader={overlongFooterHeader} initialError={footerError} />;
  return <CabecalhoClient initialHeader={documentHeader} />;
}
