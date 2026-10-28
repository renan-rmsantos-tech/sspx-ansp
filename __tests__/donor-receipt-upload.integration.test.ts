// @vitest-environment node
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/lib/db/schema";
import { selectScheduledDonorReminders } from "@/lib/email/donor-reminder-policy";
import {
  createDonorReceiptRecoveryLink, createDonorReceiptTicket,
} from "@/lib/donor-receipts/tickets";
import { getStorage, resolveStoragePath } from "@/lib/storage";

const databaseUrl = process.env.DATABASE_URL_TEST;
const integration = describe.skipIf(!databaseUrl);
const pdf = Buffer.from("%PDF-1.7\nreceipt\n%%EOF");
const pledgeA = randomUUID();
const pledgeB = randomUUID();
const month = "2026-11";
const laterMonth = "2026-12";

async function filesUnder(path: string): Promise<string[]> {
  const result: string[] = [];
  try {
    for (const name of await readdir(path)) {
      const item = join(path, name);
      if ((await stat(item)).isDirectory()) result.push(...await filesUnder(item));
      else result.push(item);
    }
  } catch { /* absent directory */ }
  return result;
}

integration("monthly receipt upload with PostgreSQL and private storage", () => {
  const client = databaseUrl ? postgres(databaseUrl, { max: 1 }) : null;
  const database = client ? drizzle(client, { schema }) : null;
  const isolated = `receipt_${randomUUID().replaceAll("-", "")}`;
  let storageDir: string;
  let ticket: string;
  let attachDonorReceipt: typeof import("@/lib/donor-receipts/service").attachDonorReceipt;
  let getPublicDonorReceiptContext: typeof import("@/lib/donor-receipts/service").getPublicDonorReceiptContext;
  let hasMonthlyReceipt: typeof import("@/lib/donor-payment-ledger").hasMonthlyReceipt;

  beforeAll(async () => {
    ({ attachDonorReceipt, getPublicDonorReceiptContext } = await import("@/lib/donor-receipts/service"));
    ({ hasMonthlyReceipt } = await import("@/lib/donor-payment-ledger"));
    process.env.SESSION_SECRET = "r".repeat(40);
    storageDir = await mkdtemp(join(tmpdir(), "ansp-receipt-"));
    process.env.STORAGE_DIR = storageDir;
    await client!.unsafe(`CREATE SCHEMA "${isolated}"`);
    await client!.unsafe(`SET search_path TO "${isolated}"`);
    await client!.unsafe(`CREATE TABLE donor_pledges (
      id uuid PRIMARY KEY, nome text NOT NULL, frequencia text NOT NULL
    )`);
    await client!.unsafe(`CREATE TABLE donor_payment_ledger (
      id uuid PRIMARY KEY, pledge_id uuid REFERENCES donor_pledges(id) ON DELETE CASCADE,
      competencia text NOT NULL, due_date date NOT NULL, expected_value numeric(12,2) NOT NULL,
      receipt_path text, receipt_name text, receipt_uploaded_at timestamptz,
      updated_at timestamptz DEFAULT now(), status text NOT NULL DEFAULT 'pendente',
      received_value numeric(12,2) DEFAULT 0, credit_date date,
      confirmed_by uuid, confirmed_at timestamptz, note text,
      UNIQUE (pledge_id, competencia)
    )`);
    await client!`INSERT INTO donor_pledges (id, nome, frequencia) VALUES
      (${pledgeA}, 'Ana Teste', 'mensal'), (${pledgeB}, 'Beto Teste', 'mensal')`;
    await client!`INSERT INTO donor_payment_ledger (id, pledge_id, competencia, due_date, expected_value)
      VALUES (${randomUUID()}, ${pledgeA}, ${month}, ${`${month}-05`}, 80),
             (${randomUUID()}, ${pledgeA}, ${laterMonth}, ${`${laterMonth}-05`}, 80),
             (${randomUUID()}, ${pledgeB}, ${month}, ${`${month}-05`}, 90)`;
    ticket = createDonorReceiptTicket(pledgeA, month, `${month}-05`);
  });

  afterAll(async () => {
    if (client) {
      await client.unsafe("SET search_path TO public");
      await client.unsafe(`DROP SCHEMA IF EXISTS "${isolated}" CASCADE`);
      await client.end();
    }
    if (storageDir) await rm(storageDir, { recursive: true, force: true });
  });

  it("reads without mutation and rejects invalid, expired, and unmatched links", async () => {
    const before = await client!`SELECT receipt_path, updated_at FROM donor_payment_ledger
      WHERE pledge_id = ${pledgeA} AND competencia = ${month}`;
    expect(await getPublicDonorReceiptContext(ticket, "192.0.2.99", database!)).toEqual({
      state: "valid", firstName: "Ana", competencia: month, expectedValue: "80.00", hasReceipt: false,
    });
    expect(await getPublicDonorReceiptContext(ticket, "192.0.2.100", database!)).toMatchObject({ state: "valid" });
    expect(await client!`SELECT receipt_path, updated_at FROM donor_payment_ledger
      WHERE pledge_id = ${pledgeA} AND competencia = ${month}`).toEqual(before);
    const missing = createDonorReceiptTicket(randomUUID(), month, `${month}-05`);
    const wrongCompetence = createDonorReceiptTicket(pledgeA, "2027-01", "2027-01-05");
    const expired = createDonorReceiptTicket(pledgeA, "2024-01", "2024-01-05");
    for (const bad of [null, ticket.slice(0, -2), missing, wrongCompetence, expired]) {
      expect(await attachDonorReceipt(bad, { body: pdf, mime: "application/pdf", name: "proof.pdf" }, database!))
        .toEqual({ status: "invalid" });
    }
    for (let i = 0; i < 30; i++) {
      expect(await getPublicDonorReceiptContext("bad", "192.0.2.101", database!)).toEqual({ state: "invalid" });
    }
    expect(await getPublicDonorReceiptContext("bad", "192.0.2.101", database!))
      .toMatchObject({ state: "rate_limited", retryAfter: expect.any(Number) });
    await client!`UPDATE donor_payment_ledger SET status = 'confirmado', received_value = 80
      WHERE pledge_id = ${pledgeB} AND competencia = ${month}`;
    const confirmed = createDonorReceiptTicket(pledgeB, month, `${month}-05`);
    expect(await getPublicDonorReceiptContext(confirmed, "192.0.2.102", database!))
      .toMatchObject({ state: "valid", competencia: month });
    expect(await client!`SELECT receipt_path FROM donor_payment_ledger WHERE pledge_id = ${pledgeB} AND competencia = ${month}`)
      .toMatchObject([{ receipt_path: null }]);
    expect(await filesUnder(storageDir)).toEqual([]);
  });

  it("accepts late evidence on confirmed and divergent rows without changing bank review", async () => {
    const confirmer = randomUUID();
    await client!`UPDATE donor_payment_ledger SET
      credit_date = '2026-11-06', confirmed_by = ${confirmer},
      confirmed_at = '2026-11-07T12:00:00Z', note = 'Conferido'
      WHERE pledge_id = ${pledgeB} AND competencia = ${month}`;
    const beforeConfirmed = await client!`SELECT status, received_value::text AS received_value,
      credit_date::text AS credit_date, confirmed_by, confirmed_at, note
      FROM donor_payment_ledger WHERE pledge_id = ${pledgeB} AND competencia = ${month}`;
    const confirmedTicket = createDonorReceiptTicket(pledgeB, month, `${month}-05`);
    expect(await attachDonorReceipt(confirmedTicket,
      { body: pdf, mime: "application/pdf", name: "late.pdf" }, database!))
      .toEqual({ status: "saved" });
    expect(await client!`SELECT status, received_value::text AS received_value,
      credit_date::text AS credit_date, confirmed_by, confirmed_at, note
      FROM donor_payment_ledger WHERE pledge_id = ${pledgeB} AND competencia = ${month}`)
      .toEqual(beforeConfirmed);
    const [confirmedRow] = await client!`SELECT receipt_path, receipt_name, receipt_uploaded_at
      FROM donor_payment_ledger
      WHERE pledge_id = ${pledgeB} AND competencia = ${month}`;
    expect(confirmedRow.receipt_path).toContain(`/payments/${month}/`);
    expect(selectScheduledDonorReminders({
      id: pledgeB,
      created_at: "2026-10-01T15:00:00Z", frequencia: "mensal", duracao: "indeterminado",
      dia_vencimento: 5, lembrete_canal: "email",
    }, new Date("2026-10-26T15:00:00Z"), () => hasMonthlyReceipt({
      receipt_path: confirmedRow.receipt_path as string | null,
      receipt_name: confirmedRow.receipt_name as string | null,
      receipt_uploaded_at: confirmedRow.receipt_uploaded_at as string | null,
    }))).toEqual([]);

    await client!`INSERT INTO donor_payment_ledger
      (id, pledge_id, competencia, due_date, expected_value, status, received_value,
       credit_date, confirmed_by, confirmed_at, note)
      VALUES (${randomUUID()}, ${pledgeB}, ${laterMonth}, ${`${laterMonth}-05`}, 90,
        'divergente', 70, '2026-12-06', ${confirmer}, '2026-12-07T12:00:00Z', 'Diferença')`;
    const beforeDivergent = await client!`SELECT status, received_value::text AS received_value,
      credit_date::text AS credit_date, confirmed_by, confirmed_at, note
      FROM donor_payment_ledger WHERE pledge_id = ${pledgeB} AND competencia = ${laterMonth}`;
    const divergentTicket = createDonorReceiptTicket(pledgeB, laterMonth, `${laterMonth}-05`);
    expect(await attachDonorReceipt(divergentTicket,
      { body: pdf, mime: "application/pdf", name: "late-difference.pdf" }, database!))
      .toEqual({ status: "saved" });
    expect(await client!`SELECT status, received_value::text AS received_value,
      credit_date::text AS credit_date, confirmed_by, confirmed_at, note
      FROM donor_payment_ledger WHERE pledge_id = ${pledgeB} AND competencia = ${laterMonth}`)
      .toEqual(beforeDivergent);
    expect(await attachDonorReceipt(divergentTicket,
      { body: pdf, mime: "application/pdf", name: "replacement.pdf" }, database!))
      .toEqual({ status: "saved" });
    const [divergentRow] = await client!`SELECT receipt_path, receipt_name, receipt_uploaded_at
      FROM donor_payment_ledger WHERE pledge_id = ${pledgeB} AND competencia = ${laterMonth}`;
    expect(selectScheduledDonorReminders({
      id: pledgeB,
      created_at: "2026-10-01T15:00:00Z", frequencia: "mensal", duracao: "indeterminado",
      dia_vencimento: 5, lembrete_canal: "email",
    }, new Date("2026-11-25T15:00:00Z"), () => hasMonthlyReceipt({
      receipt_path: divergentRow.receipt_path as string | null,
      receipt_name: divergentRow.receipt_name as string | null,
      receipt_uploaded_at: divergentRow.receipt_uploaded_at as string | null,
    }))).toEqual([]);
  });

  it("accepts a renewed overdue capability only for its own pledge and competence", async () => {
    const overdue = "2026-01";
    const otherBefore = await client!`SELECT receipt_path FROM donor_payment_ledger
      WHERE pledge_id = ${pledgeB} AND competencia = ${month}`;
    const nextBefore = await client!`SELECT receipt_path FROM donor_payment_ledger
      WHERE pledge_id = ${pledgeA} AND competencia = ${laterMonth}`;
    await client!`INSERT INTO donor_payment_ledger
      (id, pledge_id, competencia, due_date, expected_value)
      VALUES (${randomUUID()}, ${pledgeA}, ${overdue}, '2026-01-05', 80)`;
    const standard = createDonorReceiptTicket(pledgeA, overdue, "2026-01-05");
    expect(await attachDonorReceipt(standard,
      { body: pdf, mime: "application/pdf", name: "expired.pdf" }, database!))
      .toEqual({ status: "invalid" });
    const recovery = new URL(createDonorReceiptRecoveryLink(
      "https://example.test", pledgeA, overdue
    )).searchParams.get("ticket");
    expect(await getPublicDonorReceiptContext(recovery, "192.0.2.103", database!))
      .toMatchObject({ state: "valid", competencia: overdue });
    expect(await attachDonorReceipt(recovery,
      { body: pdf, mime: "application/pdf", name: "recovered.pdf" }, database!))
      .toEqual({ status: "saved" });
    expect(await client!`SELECT receipt_path FROM donor_payment_ledger
      WHERE pledge_id = ${pledgeA} AND competencia = ${overdue}`)
      .toMatchObject([{ receipt_path: expect.stringContaining(`/payments/${overdue}/`) }]);
    expect(await client!`SELECT receipt_path FROM donor_payment_ledger
      WHERE pledge_id = ${pledgeB} AND competencia = ${month}`)
      .toEqual(otherBefore);
    expect(await client!`SELECT receipt_path FROM donor_payment_ledger
      WHERE pledge_id = ${pledgeA} AND competencia = ${laterMonth}`)
      .toEqual(nextBefore);
  });

  it("keeps one active file on the correct row across replacement and concurrent uploads", async () => {
    const otherBefore = await client!`SELECT receipt_path FROM donor_payment_ledger
      WHERE pledge_id = ${pledgeB} AND competencia = ${month}`;
    const first = await attachDonorReceipt(ticket, { body: pdf, mime: "application/pdf", name: "first.pdf" }, database!);
    expect(first).toEqual({ status: "saved" });
    const [oldRow] = await client!`SELECT receipt_path FROM donor_payment_ledger WHERE pledge_id = ${pledgeA} AND competencia = ${month}`;
    const results = await Promise.all(["second.pdf", "third.pdf"].map((name) =>
      attachDonorReceipt(ticket, { body: pdf, mime: "application/pdf", name }, database!)));
    expect(results.some((result) => result.status === "saved")).toBe(true);
    const [row] = await client!`SELECT receipt_path, receipt_name, received_value::text AS received_value
      FROM donor_payment_ledger WHERE pledge_id = ${pledgeA} AND competencia = ${month}`;
    expect(row.receipt_path).toMatch(new RegExp(`^donors/${pledgeA}/payments/${month}/`));
    expect(row.received_value).toBe("0.00");
    expect(await getStorage().size(oldRow.receipt_path)).toBeNull();
    expect(await getStorage().size(row.receipt_path)).toBeGreaterThan(0);
    expect(await filesUnder(resolveStoragePath(`donors/${pledgeA}/payments/${month}`))).toHaveLength(1);
    expect(await client!`SELECT receipt_path FROM donor_payment_ledger WHERE pledge_id = ${pledgeA} AND competencia = ${laterMonth}`)
      .toMatchObject([{ receipt_path: null }]);
    expect(await client!`SELECT receipt_path FROM donor_payment_ledger WHERE pledge_id = ${pledgeB} AND competencia = ${month}`)
      .toEqual(otherBefore);
  });

  it("reopens not-identified evidence without erasing the bank-check note", async () => {
    await client!`UPDATE donor_payment_ledger SET status = 'nao_identificado', note = 'Conferido sem crédito'
      WHERE pledge_id = ${pledgeA} AND competencia = ${month}`;
    expect(await attachDonorReceipt(ticket, { body: pdf, mime: "application/pdf", name: "new.pdf" }, database!))
      .toEqual({ status: "saved" });
    expect(await client!`SELECT status, note, received_value::text AS received_value FROM donor_payment_ledger
      WHERE pledge_id = ${pledgeA} AND competencia = ${month}`)
      .toMatchObject([{ status: "pendente", note: "Conferido sem crédito", received_value: "0.00" }]);
  });

  it("preserves active evidence and cleans staged/new files after move or DB failure", async () => {
    const [before] = await client!`SELECT receipt_path FROM donor_payment_ledger
      WHERE pledge_id = ${pledgeA} AND competencia = ${month}`;
    const storage = getStorage();
    const failedMove = { ...storage, move: async () => { throw new Error("move failed"); } };
    expect(await attachDonorReceipt(ticket, { body: pdf, mime: "application/pdf", name: "move.pdf" }, database!, failedMove))
      .toEqual({ status: "error" });
    const partialMove = {
      ...storage,
      move: async (from: string, to: string) => {
        await storage.move(from, to);
        throw new Error("move acknowledgement failed");
      },
    };
    expect(await attachDonorReceipt(ticket, { body: pdf, mime: "application/pdf", name: "partial.pdf" }, database!, partialMove))
      .toEqual({ status: "error" });
    await client!.unsafe(`ALTER TABLE donor_payment_ledger ADD CONSTRAINT reject_failure_name CHECK (receipt_name <> 'failure.pdf')`);
    try {
      expect(await attachDonorReceipt(ticket, { body: pdf, mime: "application/pdf", name: "failure.pdf" }, database!))
        .toEqual({ status: "error" });
    } finally {
      await client!.unsafe(`ALTER TABLE donor_payment_ledger DROP CONSTRAINT reject_failure_name`);
    }
    const [after] = await client!`SELECT receipt_path FROM donor_payment_ledger
      WHERE pledge_id = ${pledgeA} AND competencia = ${month}`;
    expect(after.receipt_path).toBe(before.receipt_path);
    expect(await getStorage().size(before.receipt_path)).toBeGreaterThan(0);
    expect(await filesUnder(join(storageDir, "pending"))).toHaveLength(0);
    expect(await filesUnder(resolveStoragePath(`donors/${pledgeA}/payments/${month}`))).toHaveLength(1);
  });

  it("writes the current phase-2 ledger without bank columns", async () => {
    const publicClient = postgres(databaseUrl!, { max: 1 });
    const publicDatabase = drizzle(publicClient, { schema });
    const id = randomUUID();
    let path: string | null = null;
    try {
      await publicClient`INSERT INTO public.donor_pledges
        (id, nome, cpf, email, frequencia, duracao, dia_vencimento, valor, created_at)
        VALUES (${id}, 'Teste fase dois', '000.000.000-00', ${`${id}@example.test`},
          'mensal', 'indeterminado', 5, 80, now() - interval '45 days')`;
      await publicClient`INSERT INTO public.donor_payment_ledger
        (pledge_id, competencia, due_date, expected_value)
        VALUES (${id}, ${month}, ${`${month}-05`}, 80)`;
      const result = await attachDonorReceipt(createDonorReceiptTicket(id, month, `${month}-05`),
        { body: pdf, mime: "application/pdf", name: "phase2.pdf" }, publicDatabase);
      expect(result).toEqual({ status: "saved" });
      const [row] = await publicClient`SELECT receipt_path FROM public.donor_payment_ledger
        WHERE pledge_id = ${id} AND competencia = ${month}`;
      path = row.receipt_path;
      expect(await getStorage().size(path!)).toBeGreaterThan(0);
    } finally {
      await publicClient`DELETE FROM public.donor_pledges WHERE id = ${id}`;
      if (path) await getStorage().remove(path);
      await publicClient.end();
    }
  });
});
