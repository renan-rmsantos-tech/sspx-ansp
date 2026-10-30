type Conference = Awaited<ReturnType<typeof import("@/app/admin/_actions/donor-payment-conference-actions").getDonorPaymentConference>>;

const headers = ["Competência", "Benfeitor", "Frequência", "Vencimento", "Esperado", "Recebido", "Em aberto", "Comprovante", "Conferência bancária", "Data do crédito", "Conferido em", "ID do responsável"];

export function escapeCsvCell(value: unknown): string {
  let cell = String(value ?? "");
  if (/^[\s\uFEFF]*[=+@\-]|^[\t\r]/u.test(cell)) cell = `'${cell}`;
  return `"${cell.replaceAll('"', '""')}"`;
}

export function serializeConferenceCsv(data: Conference): string {
  const escape = escapeCsvCell;
  const lines = data.rows.map(row => [
    row.competencia, row.donor_name, row.frequency === "mensal" ? "Mensal" : "Uma vez", row.due_date,
    row.expected_value, row.received_value, row.outstanding,
    row.frequency === "mensal" ? row.receipt_state === "enviado" ? "Comprovante enviado" : "Comprovante pendente" : row.has_receipt ? "Comprovante anexado" : "Comprovante não disponível",
    ({ pendente: "Aguardando conferência", confirmado: "Confirmado no extrato", divergente: "Divergente", nao_identificado: "Não identificado" } as Record<string, string>)[row.status] ?? "Aguardando conferência",
    row.credit_date, row.confirmed_at, row.confirmed_by,
  ]);
  return "\uFEFF" + [headers, ...lines].map(line => line.map(escape).join(",")).join("\r\n") + "\r\n";
}
