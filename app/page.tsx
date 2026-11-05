import type { Metadata } from "next";
import { LandingPage } from "./_landing/landing";

export const metadata: Metadata = {
  title: "Arca Nossa Senhora da Providência — Bolsa de estudos",
  description:
    "A Arca Nossa Senhora da Providência mantém o Colégio São José e oferece bolsas de estudo a famílias que desejam uma formação católica para seus filhos.",
};

export default function HomePage() {
  return <LandingPage />;
}
