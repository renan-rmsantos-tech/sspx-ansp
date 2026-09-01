import type { Metadata } from "next";
import Link from "next/link";
import { DonorForm } from "@/app/benfeitor/_components/donor-form";
import { SealLogo } from "@/components/ui/seal-logo";

export const metadata: Metadata = {
  title: "Seja um benfeitor — Arca N. S. da Providência",
  description: "Inscreva-se como benfeitor da Arca Nossa Senhora da Providência.",
};

export default function SejaUmBenfeitorPage() {
  return (
    <div className="min-h-screen bg-bg">
      <main className="mx-auto max-w-[720px] px-4 py-8 pb-16">
        <Link href="/" className="text-sm font-medium text-accent hover:underline">
          ← Voltar à página principal
        </Link>
        <header className="my-8 text-center">
          <SealLogo size={64} className="mx-auto mb-3" />
          <p className="text-xs font-medium uppercase tracking-widest text-muted">Arca N. S. da Providência</p>
          <h1 className="mt-2 font-display text-[28px] font-semibold text-fg">Seja um benfeitor</h1>
          <p className="mx-auto mt-3 max-w-[56ch] text-muted">Sua colaboração sustenta a formação católica e ajuda famílias que precisam de apoio para a educação de seus filhos.</p>
        </header>
        <section className="mb-8 rounded-xl border border-border bg-surface p-6" aria-labelledby="dados-bancarios-titulo">
          <h2 id="dados-bancarios-titulo" className="font-display text-xl font-semibold text-fg">Faça sua contribuição por Pix</h2>
          <p className="mt-1 text-sm text-muted">Aponte a câmera do aplicativo do seu banco para o QR Code ou informe a chave Pix. A contribuição não tem valor pré-definido.</p>
          <div className="mt-5 grid items-center gap-6 sm:grid-cols-[1fr_auto]">
            <dl className="grid gap-3 text-[15px] sm:grid-cols-2">
              <div className="rounded-md bg-bg px-4 py-3 sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-widest text-muted">Favorecido / Banco</dt><dd className="mt-1 font-medium text-fg">ACIPEC — Associação Civil Para a Educação Católica · Santander</dd></div>
              <div className="rounded-md bg-bg px-4 py-3"><dt className="text-xs font-semibold uppercase tracking-widest text-muted">Chave Pix</dt><dd className="mt-1 break-all font-medium text-fg">02862d22-6b43-45f8-9b58-265f3deeb5dd</dd></div>
              <div className="rounded-md bg-bg px-4 py-3"><dt className="text-xs font-semibold uppercase tracking-widest text-muted">Agência / Conta</dt><dd className="mt-1 font-medium text-fg">0197 · 13.008.003-2</dd></div>
              <div className="rounded-md bg-bg px-4 py-3 sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-widest text-muted">CNPJ</dt><dd className="mt-1 font-medium text-fg">62.611.908/0001-99</dd></div>
            </dl>
            <figure className="mx-auto w-fit border border-border bg-white p-3 sm:mx-0"><img src="/pix-acipec.png" alt="QR Code Pix para contribuição à ACIPEC" width={200} height={200} /><figcaption className="mt-2 text-center text-xs text-muted">QR Code Pix · ACIPEC</figcaption></figure>
          </div>
        </section>
        <DonorForm />
      </main>
    </div>
  );
}
