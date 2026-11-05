import type { Metadata } from "next";
import { headers } from "next/headers";
import { getPublicDonorReceiptContext } from "@/lib/donor-receipts/service";
import { receiptSourceIp } from "@/lib/donor-receipts/throttle";
import { DonorReceiptPageView } from "./receipt-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Comprovante mensal — Arca Nossa Senhora da Providência",
  robots: { index: false, follow: false },
};

export default async function ReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string | string[] }>;
}) {
  const requestHeaders = await headers();
  const query = await searchParams;
  const ticket = typeof query.ticket === "string" ? query.ticket : null;
  const context = await getPublicDonorReceiptContext(ticket, receiptSourceIp(requestHeaders));

  if (context.state === "valid") {
    return (
      <DonorReceiptPageView
        view={{
          state: "valid",
          ticket: ticket!,
          firstName: context.firstName,
          competencia: context.competencia,
          expectedValue: context.expectedValue,
          hasReceipt: context.hasReceipt,
        }}
      />
    );
  }
  return <DonorReceiptPageView view={{ state: context.state }} />;
}
