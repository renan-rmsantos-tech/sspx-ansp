import type { Metadata } from "next";
import Link from "next/link";
import { DonorForm } from "@/app/benfeitor/_components/donor-form";
import { SealLogo } from "@/components/ui/seal-logo";

export const metadata: Metadata = {
  title: "Seja um benfeitor — Arca N. S. da Providência",
  description: "Inscreva-se como benfeitor da Arca Nossa Senhora da Providência.",
};

export default function SejaUmBenfeitorPage() {
  return <div className="min-h-screen bg-bg"><main className="mx-auto max-w-[720px] px-4 py-8 pb-16"><Link href="/" className="text-sm font-medium text-accent hover:underline">← Voltar à página principal</Link><header className="my-8 text-center"><SealLogo size={64} className="mx-auto mb-3" /><p className="text-xs font-medium uppercase tracking-widest text-muted">Arca N. S. da Providência</p><h1 className="mt-2 font-display text-[28px] font-semibold text-fg">Seja um benfeitor</h1><p className="mx-auto mt-3 max-w-[56ch] text-muted">Sua colaboração sustenta a formação católica e ajuda famílias que precisam de apoio para a educação de seus filhos.</p></header><section className="mb-8 rounded-xl border border-border bg-surface p-6" aria-labelledby="dados-bancarios-titulo"><h2 id="dados-bancarios-titulo" className="font-display text-xl font-semibold text-fg">Dados para transferência</h2><p className="mt-1 text-sm text-muted">Utilize a conta abaixo para Pix ou transferência bancária. Depois, anexe o comprovante no formulário.</p><dl className="mt-5 grid gap-3 text-[15px] sm:grid-cols-2"><div className="rounded-md bg-bg px-4 py-3 sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-widest text-muted">Titular / Banco</dt><dd className="mt-1 font-medium text-fg">ACIPEC · Santander</dd></div><div className="rounded-md bg-bg px-4 py-3"><dt className="text-xs font-semibold uppercase tracking-widest text-muted">Agência</dt><dd className="mt-1 font-medium text-fg">0197</dd></div><div className="rounded-md bg-bg px-4 py-3"><dt className="text-xs font-semibold uppercase tracking-widest text-muted">Conta</dt><dd className="mt-1 font-medium text-fg">13.008003-2</dd></div><div className="rounded-md bg-bg px-4 py-3 sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-widest text-muted">CNPJ</dt><dd className="mt-1 font-medium text-fg">42.736.079/0001-63</dd></div></dl></section><DonorForm /></main></div>;
}
