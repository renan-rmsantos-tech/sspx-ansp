"use server";

import { eq, lt } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { donorLedgerSettings, donorPaymentLedger, donorPledges } from "@/lib/db/schema";
import { materializeMonthlyPaymentsForMonth } from "@/lib/donor-payment-ledger";
import { createTicket } from "@/lib/storage/tickets";
import { getStorage, guessMimeType } from "@/lib/storage";
import { saoPauloDate } from "@/lib/donor-recurrence";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const money = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
const MAX_CONFERENCE_ROWS = 5000;

function validId(id: string) { if (!uuid.test(id)) throw new Error("Pagamento inválido."); }
function validNote(note: string | null) {
  if (note !== null && (typeof note !== "string" || note.length > 2000)) throw new Error("Observação inválida.");
  return note;
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error("Data de crédito inválida.");
  return value;
}
function cents(value: string | number) {
  const text = String(value);
  if (!money.test(text)) throw new Error("Valor inválido.");
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
function fromCents(value: number) { return (value / 100).toFixed(2); }

export async function confirmDonorPayment(id: string, amount: string | number, creditDate: string, note: string | null = null) {
  const admin = await requireAdmin();
  validId(id); validNote(note); validDate(creditDate);
  const received = cents(amount);
  if (received <= 0) throw new Error("Valor inválido.");
  const row = await db.query.donorPaymentLedger.findFirst({ where: eq(donorPaymentLedger.id, id) });
  if (!row) throw new Error("Pagamento não encontrado.");
  const status = received === cents(row.expected_value) ? "confirmado" : "divergente";
  await db.update(donorPaymentLedger).set({ received_value: Number(fromCents(received)), credit_date: creditDate, note, status, confirmed_by: admin.id, confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).where(eq(donorPaymentLedger.id, id));
  return { status };
}

export async function markDonorPaymentNotIdentified(id: string, note: string) {
  const admin = await requireAdmin();
  validId(id); validNote(note);
  if (!note.trim()) throw new Error("Observação obrigatória.");
  await db.update(donorPaymentLedger).set({ received_value: 0, credit_date: null, status: "nao_identificado", note, confirmed_by: admin.id, confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).where(eq(donorPaymentLedger.id, id));
  return { status: "nao_identificado" };
}

export async function resetDonorPayment(id: string) {
  await requireAdmin(); validId(id);
  await db.update(donorPaymentLedger).set({ received_value: 0, credit_date: null, status: "pendente", note: null, confirmed_by: null, confirmed_at: null, updated_at: new Date().toISOString() }).where(eq(donorPaymentLedger.id, id));
  return { status: "pendente" };
}

export async function getDonorPaymentConference(month: string, now = new Date()) {
  await requireAdmin();
  if (!monthPattern.test(month)) throw new Error("Mês inválido.");
  const today = saoPauloDate(now);
  if (month > today.slice(0, 7)) throw new Error("Mês futuro inválido.");
  await materializeMonthlyPaymentsForMonth(month);
  const selected = await db.query.donorPaymentLedger.findMany({ where: eq(donorPaymentLedger.competencia, month), limit: MAX_CONFERENCE_ROWS + 1 });
  if (selected.length > MAX_CONFERENCE_ROWS) throw new Error("Mês excede o limite de conferência.");
  const [year, part] = today.slice(0, 7).split("-").map(Number);
  const previousMonth = new Date(Date.UTC(year, part - 2, Math.min(Number(today.slice(8)), new Date(Date.UTC(year, part - 1, 0)).getUTCDate()))).toISOString().slice(0, 10);
  const aged = await db.query.donorPaymentLedger.findMany({ where: lt(donorPaymentLedger.due_date, previousMonth), limit: MAX_CONFERENCE_ROWS + 1 });
  if (aged.length > MAX_CONFERENCE_ROWS) throw new Error("Pendências excedem o limite de conferência.");
  const pledges = await db.query.donorPledges.findMany({ columns: { id: true, nome: true, frequencia: true, recibo_path: true, created_at: true }, limit: MAX_CONFERENCE_ROWS + 1 });
  const pledgeById = new Map(pledges.map(pledge => [pledge.id, pledge]));
  const monthly = new Set(pledges.filter(pledge => pledge.frequencia === "mensal").map(pledge => pledge.id));
  if (monthly.size > MAX_CONFERENCE_ROWS) throw new Error("Benfeitores excedem o limite de conferência.");
  const coverage = await db.query.donorLedgerSettings.findFirst();
  const first = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 12, 1));
  const months = Array.from({ length: 12 }, (_, index) => new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + index, 1)).toISOString().slice(0, 7)).filter(value => !coverage?.launch_competencia || value >= coverage.launch_competencia);
  const monthRows = await Promise.all(months.map(value => value === month ? selected : db.query.donorPaymentLedger.findMany({ where: eq(donorPaymentLedger.competencia, value), limit: MAX_CONFERENCE_ROWS + 1 })));
  const series = months.map((value, index) => {
    const entries = monthRows[index];
    if (entries.length > MAX_CONFERENCE_ROWS) throw new Error("Mês excede o limite de conferência.");
    return { month: value, expected: fromCents(entries.reduce((sum, row) => sum + cents(row.expected_value), 0)), received: fromCents(entries.reduce((sum, row) => sum + ((row.status === "confirmado" || row.status === "divergente") ? cents(row.received_value) : 0), 0)), receipt_pending: entries.filter(row => monthly.has(row.pledge_id) && !row.receipt_path).length, receipt_sent: entries.filter(row => monthly.has(row.pledge_id) && Boolean(row.receipt_path)).length, overdue_missing_receipt: entries.filter(row => monthly.has(row.pledge_id) && !row.receipt_path && row.due_date < previousMonth).length };
  });
  const project = (row: typeof selected[number]) => {
    const received = row.status === "confirmado" || row.status === "divergente" ? cents(row.received_value) : 0;
    const outstanding = Math.max(cents(row.expected_value) - received, 0);
    const { receipt_path: receiptPath, ...safeRow } = row;
    return { ...safeRow, donor_name: pledgeById.get(row.pledge_id)?.nome ?? "Benfeitor", frequency: pledgeById.get(row.pledge_id)?.frequencia ?? "unica", has_receipt: Boolean(receiptPath || pledgeById.get(row.pledge_id)?.recibo_path), legacy_one_time: Boolean(pledgeById.get(row.pledge_id)?.frequencia === "unica" && pledgeById.get(row.pledge_id)?.created_at && coverage?.launch_competencia && pledgeById.get(row.pledge_id)!.created_at.slice(0, 7) < coverage.launch_competencia), received_value: fromCents(received), expected_value: fromCents(cents(row.expected_value)), outstanding: fromCents(outstanding), receipt_state: receiptPath ? "enviado" : "pendente", missing_monthly_receipt: monthly.has(row.pledge_id) && !receiptPath && row.due_date < previousMonth };
  };
  const rows = selected.map(project);
  return { coverage_start: coverage?.launch_competencia ?? null, series, rows, overdue: aged.map(project).filter(row => Number(row.outstanding) > 0 || row.missing_monthly_receipt), totals: { expected: fromCents(rows.reduce((sum, row) => sum + cents(row.expected_value), 0)), received: fromCents(rows.reduce((sum, row) => sum + cents(row.received_value), 0)), outstanding: fromCents(rows.reduce((sum, row) => sum + cents(row.outstanding), 0)) } };
}

export async function getDonorPaymentReceiptUrl(id: string) {
  await requireAdmin(); validId(id);
  const row = await db.query.donorPaymentLedger.findFirst({ where: eq(donorPaymentLedger.id, id) });
  if (!row) return { error: "Comprovante não encontrado." };
  const pledge = await db.query.donorPledges.findFirst({ where: eq(donorPledges.id, row.pledge_id) });
  const path = pledge?.frequencia === "mensal" ? row.receipt_path : pledge?.recibo_path;
  if (!path || !path.startsWith(`donors/${row.pledge_id}/`) || await getStorage().size(path) === null) return { error: "Comprovante não encontrado." };
  const ticket = createTicket(path, "download", 300);
  return { url: `/api/documents?ticket=${encodeURIComponent(ticket)}`, type: guessMimeType(path) };
}
