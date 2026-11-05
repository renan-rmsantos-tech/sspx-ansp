import type { Metadata } from "next";
import { ScholarshipPageLayout } from "@/app/form/_components/scholarship-page-layout";

export const metadata: Metadata = {
  title: "Solicitação de Bolsa — Arca N. S. da Providência",
  description:
    "Formulário de solicitação de bolsa para família necessitada — Ano Letivo 2026",
};

export default function FormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ScholarshipPageLayout>{children}</ScholarshipPageLayout>;
}
