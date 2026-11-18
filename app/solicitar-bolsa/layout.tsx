import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solicitação de Bolsa — Arca N. S. da Providência",
  description: "Formulário de solicitação de bolsa para família necessitada.",
};

export default function SolicitarBolsaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
