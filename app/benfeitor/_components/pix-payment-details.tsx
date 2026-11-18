import Image from "next/image";
import { PIX_DETAILS } from "@/lib/data/pix-details";

/**
 * Dados do Pix da ACIPEC com o QR Code. `embedded` remove a moldura própria para uso dentro de outro cartão,
 * separando o bloco por uma linha, e usa um título `h2`.
 */
export function PixPaymentDetails({ embedded = false }: { embedded?: boolean }) {
  const Heading = embedded ? "h2" : "h3";
  return (
    <section
      className={embedded ? "mt-7 border-t border-border pt-6" : "rounded-xl border border-border bg-surface p-4 sm:p-6"}
      aria-labelledby="dados-bancarios-titulo"
    >
      <Heading id="dados-bancarios-titulo" className="font-display text-xl font-semibold text-fg">Faça sua contribuição por Pix</Heading>
      <p className="mt-1 text-sm text-muted">Aponte a câmera do aplicativo do seu banco para o QR Code ou informe a chave Pix.</p>
      <div className="mt-5 grid items-center gap-6 sm:grid-cols-[1fr_auto]">
        <dl className="grid gap-3 text-[15px] sm:grid-cols-2">
          <div className="rounded-md bg-bg px-4 py-3 sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-widest text-muted">Favorecido / Banco</dt><dd className="mt-1 font-medium text-fg">{PIX_DETAILS.beneficiary} · {PIX_DETAILS.bank}</dd></div>
          <div className="rounded-md bg-bg px-4 py-3"><dt className="text-xs font-semibold uppercase tracking-widest text-muted">Chave Pix</dt><dd className="mt-1 break-all font-medium text-fg">{PIX_DETAILS.key}</dd></div>
          <div className="rounded-md bg-bg px-4 py-3"><dt className="text-xs font-semibold uppercase tracking-widest text-muted">Agência / Conta</dt><dd className="mt-1 font-medium text-fg">{PIX_DETAILS.account}</dd></div>
          <div className="rounded-md bg-bg px-4 py-3 sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-widest text-muted">CNPJ</dt><dd className="mt-1 font-medium text-fg">{PIX_DETAILS.cnpj}</dd></div>
        </dl>
        <figure className="mx-auto w-fit border border-border bg-white p-3 sm:mx-0"><Image src={PIX_DETAILS.qrCode} alt="QR Code Pix para contribuição à ACIPEC" width={200} height={200} unoptimized /><figcaption className="mt-2 text-center text-xs text-muted">QR Code Pix · ACIPEC</figcaption></figure>
      </div>
    </section>
  );
}
