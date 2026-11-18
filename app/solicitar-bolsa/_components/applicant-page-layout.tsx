import type { ReactNode } from "react";
import Link from "next/link";
import { SealLogo } from "@/components/ui/seal-logo";

/** Moldura enxuta das telas de conta e de acompanhamento do solicitante. */
export function ApplicantPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[720px] px-4 py-8 pb-16 max-sm:px-3 max-sm:py-5">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent/80"
          >
            <span aria-hidden="true">←</span> Voltar à página principal
          </Link>
        </div>
        <header className="mb-8 text-center">
          <SealLogo size={56} className="mx-auto mb-3" />
          <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-muted">Arca N. S. da Providência</p>
          <h1 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-fg max-sm:text-[22px]">
            Solicitação de Bolsa
          </h1>
        </header>
        {children}
      </div>
    </div>
  );
}
