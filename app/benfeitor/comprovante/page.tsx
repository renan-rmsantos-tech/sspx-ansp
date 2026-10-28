import type { Metadata } from "next";
import { headers } from "next/headers";
import { getPublicDonorReceiptContext } from "@/lib/donor-receipts/service";
import { receiptSourceIp } from "@/lib/donor-receipts/throttle";
import { ReceiptUpload } from "./receipt-upload";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Comprovante mensal — Arca Nossa Senhora da Providência",
  robots: { index: false, follow: false },
};

function ReceiptShell({ children }: { children: React.ReactNode }) {
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

export default async function ReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string | string[] }>;
}) {
  const requestHeaders = await headers();
  const query = await searchParams;
  const ticket = typeof query.ticket === "string" ? query.ticket : null;
  const context = await getPublicDonorReceiptContext(ticket, receiptSourceIp(requestHeaders));

  if (context.state === "valid") return (
    <ReceiptShell>
      <p className="text-lg text-fg">Olá, {context.firstName}.</p>
      <dl className="mt-5 grid gap-4 rounded-md bg-bg p-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">Competência</dt>
          <dd className="mt-1 font-medium capitalize text-fg">{formatCompetencia(context.competencia)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Valor previsto</dt>
          <dd className="mt-1 font-medium text-fg">{formatAmount(context.expectedValue)}</dd>
        </div>
      </dl>
      <p className="mt-5 text-sm leading-6 text-muted">
        Cada pagamento mensal exige seu próprio comprovante. Envie o comprovante deste mês pelo link recebido por e-mail. O envio não confirma o crédito; a Arca fará a conferência no extrato bancário.
      </p>
      <ReceiptUpload key={ticket!} ticket={ticket!} hasReceipt={context.hasReceipt} />
    </ReceiptShell>
  );

  if (context.state === "rate_limited") {
    return <ReceiptShell><p>Muitas tentativas de acesso. Aguarde um pouco e tente novamente.</p></ReceiptShell>;
  }
  return <ReceiptShell><p>Este link não está disponível. Se precisar enviar um comprovante, solicite um novo link à Arca.</p></ReceiptShell>;
}
