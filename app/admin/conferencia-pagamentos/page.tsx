import { requireAdmin } from "@/lib/auth/authorization";
import { getDonorPaymentConference } from "../_actions/donor-payment-conference-actions";
import { ConferenceClient } from "./conference-client";

export const dynamic = "force-dynamic";
export default async function ConferencePage() {
  await requireAdmin();
  const month = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(new Date());
  const data = await getDonorPaymentConference(month);
  return <main><h1 className="font-heading text-[22px] font-semibold">Conferência de pagamentos</h1><p className="mt-1 text-sm text-muted">Confira os créditos no extrato bancário. Um comprovante enviado não confirma o recebimento.</p><ConferenceClient initialMonth={month} initialData={data} /></main>;
}
