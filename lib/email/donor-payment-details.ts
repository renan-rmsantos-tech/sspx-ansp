import { PIX_DETAILS } from "@/lib/data/pix-details";
import { escapeEmailHtml } from "./donor-welcome-template";

// Version the CID if the approved QR asset ever changes: frozen sends must keep
// the image associated with the original HTML and provider idempotency key.
export const DONOR_PIX_QR_CID = "ansp-pix-acipec-v1";

export function renderDonorPaymentDetails() {
  const [agency, account] = PIX_DETAILS.account.split(" · ");
  const fields = [
    ["Beneficiário", PIX_DETAILS.beneficiary],
    ["CNPJ", PIX_DETAILS.cnpj],
    ["Banco", PIX_DETAILS.bank],
    ["Agência", agency],
    ["Conta", account],
    ["Chave Pix", PIX_DETAILS.key],
  ];
  return {
    text: `Dados para pagamento\n${fields.map(([label, value]) => `${label}: ${value}`).join("\n")}\nUse a chave Pix acima se não conseguir ler o QR Code.`,
    html: `<div data-email-payment-details style="margin:8px 0 28px;padding:24px 0;border-top:1px solid #e4e0d7;border-bottom:1px solid #e4e0d7"><h2 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.3;font-weight:bold;color:#1a2744">Dados para pagamento</h2>${fields.map(([label, value]) => `<p style="margin:0 0 12px;line-height:1.5"><span style="font-size:13px;color:#526174">${label}</span><br><span style="font-size:16px;color:#243247;overflow-wrap:anywhere;word-break:break-word">${escapeEmailHtml(value)}</span></p>`).join("")}<div style="margin-top:24px;text-align:center"><img src="cid:${DONOR_PIX_QR_CID}" width="200" height="200" alt="QR Code Pix da ACIPEC para pagamento da contribuição" style="display:block;width:200px;max-width:100%;height:auto;margin:0 auto"><p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#526174">Leia o QR Code com o aplicativo do seu banco<br>ou use a chave Pix acima.</p></div></div>`,
  };
}
