import type { ReactNode } from "react";
import { ReceiptUpload } from "./receipt-upload";

/** O que a página pública do comprovante sabe sobre o link, já lido no servidor. */
export type DonorReceiptView =
  | {
      state: "valid";
      ticket: string;
      firstName: string;
      competencia: string;
      expectedValue: string;
      hasReceipt: boolean;
    }
  | { state: "rate_limited" }
  | { state: "invalid" };

export function ReceiptShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg px-4 py-10 sm:py-16">
      <main className="mx-auto max-w-xl">
        <header className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-muted">Arca Nossa Senhora da Providência</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-fg">Comprovante mensal</h1>
        </header>
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-8">{children}</div>
      </main>
    </div>
  );
}

function formatCompetencia(competencia: string) {
  const [year, month] = competencia.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatAmount(amount: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(amount));
}

/** A página do comprovante mensal em cada estado do link: válido, bloqueado por tentativas ou indisponível. */
export function DonorReceiptPageView({ view }: { view: DonorReceiptView }) {
  if (view.state === "valid") return (
    <ReceiptShell>
      <p className="text-lg text-fg">Olá, {view.firstName}.</p>
      <dl className="mt-5 grid gap-4 rounded-md bg-bg p-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">Competência</dt>
          <dd className="mt-1 font-medium capitalize text-fg">{formatCompetencia(view.competencia)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Valor previsto</dt>
          <dd className="mt-1 font-medium text-fg">{formatAmount(view.expectedValue)}</dd>
        </div>
      </dl>
      <p className="mt-5 text-sm leading-6 text-muted">
        Cada pagamento mensal exige seu próprio comprovante. Envie o comprovante deste mês pelo link recebido por e-mail. O envio não confirma o crédito; a Arca fará a conferência no extrato bancário.
      </p>
      <ReceiptUpload key={view.ticket} ticket={view.ticket} hasReceipt={view.hasReceipt} />
    </ReceiptShell>
  );

  if (view.state === "rate_limited") {
    return <ReceiptShell><p>Muitas tentativas de acesso. Aguarde um pouco e tente novamente.</p></ReceiptShell>;
  }
  return <ReceiptShell><p>Este link não está disponível. Se precisar enviar um comprovante, solicite um novo link à Arca.</p></ReceiptShell>;
}
