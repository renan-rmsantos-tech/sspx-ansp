import type { ReactNode } from "react";
import Link from "next/link";
import { SealLogo } from "@/components/ui/seal-logo";

/** Cabeçalho e moldura da página pública Seja um benfeitor; o formulário entra como `children`. */
export function DonorPageLayout({ children }: { children: ReactNode }) {
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
        {children}
      </main>
    </div>
  );
}
