import { requireAdmin } from "@/lib/auth/authorization";
import { saoPauloDate } from "@/lib/donor-recurrence";
import { getMonthlyPayments } from "../_actions/donor-payment-actions";
import { PagamentosClient } from "./client";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function PagamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string | string[] }>;
}) {
  await requireAdmin();
  const { mes } = await searchParams;
  const requested = (Array.isArray(mes) ? mes[0] : mes)?.trim() ?? "";
  const invalidMonth = requested !== "" && !MONTH_PATTERN.test(requested);
  const competencia = invalidMonth || requested === "" ? saoPauloDate(new Date()).slice(0, 7) : requested;
  const { data, error } = await getMonthlyPayments(competencia);

  return (
    <PagamentosClient
      competencia={competencia}
      rows={data?.rows ?? []}
      invalidMonth={invalidMonth}
      error={error}
    />
  );
}
