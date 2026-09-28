/** Formata datas do cadastro e do pagamento para as telas e o PDF. */
export function formatDonorDate(v?: string | null): string {
  if (!v) return "—";
  const value = v.trim();
  // DATE do banco não tem fuso; preservar o dia informado para pagamento.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;

  // postgres.js pode entregar timestamptz como "YYYY-MM-DD HH:mm:ss+00".
  const normalized = value
    .replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T")
    .replace(/([+-]\d{2})$/, "$1:00");
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
  }

  return value;
}
