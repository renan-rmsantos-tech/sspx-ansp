import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { donorLedgerSettings, donorPaymentLedger, donorPledges } from "@/lib/db/schema";
import {
  occurrenceForMonth,
  saoPauloDate,
  type DonorOccurrence,
  type RecurrencePledge,
} from "@/lib/donor-recurrence";

export type MonthlyLedgerPledge = RecurrencePledge & { valor: number };

export type DueSnapshot = {
  competencia: string;
  due_date: string;
  receipt_path: string | null;
  receipt_name: string | null;
  receipt_uploaded_at: string | null;
};

export type MonthlyReceiptMetadata = Pick<DueSnapshot,
  "receipt_path" | "receipt_name" | "receipt_uploaded_at">;

/** Receipt evidence is separate from any bank-conference state. */
export function hasMonthlyReceipt(row: MonthlyReceiptMetadata): boolean {
  return row.receipt_path !== null || row.receipt_name !== null || row.receipt_uploaded_at !== null;
}

export function monthlyReceiptState(row: MonthlyReceiptMetadata):
  "Comprovante pendente" | "Comprovante enviado – aguardando conferência" {
  return hasMonthlyReceipt(row)
    ? "Comprovante enviado – aguardando conferência"
    : "Comprovante pendente";
}

export function nextMonth(month: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new RangeError("Invalid competence");
  }
  const [year, part] = month.split("-").map(Number);
  return part === 12 ? `${year + 1}-01` : `${year}-${String(part + 1).padStart(2, "0")}`;
}

/** A registration creates its first due month even when that is next month. */
export function firstMonthlyOccurrence(pledge: RecurrencePledge): DonorOccurrence | null {
  const registrationMonth = saoPauloDate(pledge.created_at).slice(0, 7);
  return occurrenceForMonth(pledge, registrationMonth)
    ?? occurrenceForMonth(pledge, nextMonth(registrationMonth));
}

/** Only a future, evidence-free snapshot may be moved or removed after a day edit. */
export function dueSnapshotDecision(
  pledge: RecurrencePledge,
  snapshot: DueSnapshot,
  today: string
): { kind: "keep" | "remove" } | { kind: "update"; dueDate: string } {
  if (
    snapshot.due_date < today ||
    snapshot.receipt_path !== null ||
    snapshot.receipt_name !== null ||
    snapshot.receipt_uploaded_at !== null
  ) {
    return { kind: "keep" };
  }
  const occurrence = occurrenceForMonth(pledge, snapshot.competencia);
  if (!occurrence || occurrence.dueDate < today) return { kind: "remove" };
  return occurrence.dueDate === snapshot.due_date
    ? { kind: "keep" }
    : { kind: "update", dueDate: occurrence.dueDate };
}

/** One bounded competence; conflict handling preserves the original value snapshot. */
export async function materializeMonthlyPaymentsForMonth(
  month: string,
  database: typeof db = db
): Promise<number> {
  nextMonth(month); // Validate even when no settings row is available.
  const settings = await database.query.donorLedgerSettings.findFirst({
    columns: { launch_competencia: true },
  });
  if (!settings) throw new Error("Donor ledger coverage marker is missing");
  if (month < settings.launch_competencia) return 0;

  return database.transaction(async (tx) => {
    // Serialize against admin day edits so an old day cannot be inserted after
    // that edit has already reconciled the ledger.
    await tx.execute(sql`SELECT id FROM donor_pledges WHERE frequencia = 'mensal' FOR SHARE`);
    const pledges = await tx.query.donorPledges.findMany({
      columns: {
        id: true, created_at: true, frequencia: true, duracao: true,
        dia_vencimento: true, valor: true,
      },
      where: eq(donorPledges.frequencia, "mensal"),
    });
    const values = pledges.flatMap((pledge) => {
      const occurrence = occurrenceForMonth(pledge, month);
      return occurrence && pledge.valor > 0
        ? [{
            pledge_id: pledge.id,
            competencia: occurrence.competence,
            due_date: occurrence.dueDate,
            expected_value: pledge.valor,
          }]
        : [];
    });

    let inserted = 0;
    for (let offset = 0; offset < values.length; offset += 500) {
      const rows = await tx.insert(donorPaymentLedger)
        .values(values.slice(offset, offset + 500))
        .onConflictDoNothing({
          target: [donorPaymentLedger.pledge_id, donorPaymentLedger.competencia],
        })
        .returning({ id: donorPaymentLedger.id });
      inserted += rows.length;
    }
    return inserted;
  });
}

export async function materializeCurrentAndNextMonthlyPayments(
  now: Date = new Date(),
  database: typeof db = db
): Promise<number> {
  const month = saoPauloDate(now).slice(0, 7);
  return (await materializeMonthlyPaymentsForMonth(month, database))
    + (await materializeMonthlyPaymentsForMonth(nextMonth(month), database));
}
