"use client";

import Link from "next/link";

export function SuccessScreen() {
  return (
    <div className="px-5 py-16 text-center" data-testid="success-screen">
      <div className="mx-auto mb-5 inline-grid h-16 w-16 place-items-center rounded-full bg-success/20 text-success">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        Solicitação Enviada
      </h2>
      <p className="mx-auto mt-2.5 max-w-[42ch] text-[15px] text-muted">
        Sua solicitação de bolsa foi recebida com sucesso. A direção da escola
        analisará o pedido e entrará em contato.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md border border-accent px-5 py-2.5 text-sm font-medium text-accent hover:bg-bg"
      >
        Voltar à página principal
      </Link>
    </div>
  );
}
