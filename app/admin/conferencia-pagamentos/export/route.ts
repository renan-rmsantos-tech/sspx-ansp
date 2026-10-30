import { NextRequest } from "next/server";
import { getDonorPaymentConference } from "@/app/admin/_actions/donor-payment-conference-actions";
import { serializeConferenceCsv } from "@/lib/donor-conference-csv";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month") ?? "";
  const data = await getDonorPaymentConference(month);
  return new Response(serializeConferenceCsv(data), { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="conferencia-pagamentos-${month}.csv"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
