import { requireAdmin } from "@/lib/auth/authorization";
import { saoPauloDate } from "@/lib/donor-recurrence";
import { getDonorPaymentConference } from "../_actions/donor-payment-conference-actions";
import { PagamentosClient } from "./client";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const dynamic = "force-dynamic";

/**
 * Conferência bancária dos pagamentos de benfeitores. O mês vem de `?mes=`
 * (`AAAA-MM`, nunca futuro); sem parâmetro ou com valor inválido usa o mês
 * corrente de São Paulo e avisa. A leitura do livro materializa o mês.
 */
export default async function PagamentosPage({
  searchParams,
}: {
  searchParams?: Promise<{ mes?: string | string[] }>;
}) {
  await requireAdmin();
  const { mes } = (await searchParams) ?? {};
  const requested = (Array.isArray(mes) ? mes[0] : mes)?.trim() ?? "";
  const currentMonth = saoPauloDate(new Date()).slice(0, 7);
  const invalidMonth = requested !== "" && (!MONTH_PATTERN.test(requested) || requested > currentMonth);
  const month = invalidMonth || requested === "" ? currentMonth : requested;

  let data: Awaited<ReturnType<typeof getDonorPaymentConference>> | null = null;
  let error: string | undefined;
  try {
    data = await getDonorPaymentConference(month);
  } catch (cause) {
    console.error("Erro ao carregar a conferência de pagamentos:", cause);
    error = cause instanceof Error ? cause.message : "Não foi possível carregar os pagamentos do mês.";
  }

  return (
    <PagamentosClient
      initialMonth={month}
      currentMonth={currentMonth}
      initialData={data}
      invalidMonth={invalidMonth}
      error={error}
    />
  );
}
