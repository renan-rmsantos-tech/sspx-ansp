import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { DonorReceiptPageView } from "./receipt-shell";
import {
  receiptAlreadySent,
  receiptPending,
  receiptRateLimited,
  receiptUnavailable,
} from "./comprovante.fixtures";

export const meta = definePrototype({
  title: "Comprovante mensal do benfeitor",
  route: "/benfeitor/comprovante",
  standalone: true,
  states: [
    { id: "envio-disponivel", label: "Envio disponível" },
    { id: "ja-enviado", label: "Comprovante já enviado" },
    { id: "link-indisponivel", label: "Link indisponível" },
    { id: "muitas-tentativas", label: "Muitas tentativas" },
  ],
});

const VIEWS = {
  "envio-disponivel": receiptPending,
  "ja-enviado": receiptAlreadySent,
  "link-indisponivel": receiptUnavailable,
  "muitas-tentativas": receiptRateLimited,
};

export default function Prototype({ state }: PrototypeProps) {
  return <DonorReceiptPageView view={VIEWS[state as keyof typeof VIEWS] ?? receiptPending} />;
}
