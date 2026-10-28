// @vitest-environment node
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { createDonorReceiptLink, verifyDonorReceiptTicket } from "@/lib/donor-receipts/tickets";
import { reminderProviderKey } from "@/lib/email/donor-reminder-template";
import { getStorage } from "@/lib/storage";

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send: sendEmail }; } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const databaseUrl = process.env.DATABASE_URL_TEST;
const integration = describe.skipIf(!databaseUrl);
const localDate = (date: string) => new Date(`${date}T15:00:00Z`);

integration("reserved donor reminder delivery with PostgreSQL", () => {
  const sql = databaseUrl ? postgres(databaseUrl, { max: 5 }) : null;
  const database = sql ? drizzle(sql, { schema }) : null;
  const pledgeIds: string[] = [];
  let sender: typeof import("@/lib/email/send-donor-reminder");
  let attachDonorReceipt: typeof import("@/lib/donor-receipts/service").attachDonorReceipt;
  let nextMonth: typeof import("@/lib/donor-payment-ledger").nextMonth;
  let month: string;
  let storageDir: string;
  const previousStorageDir = process.env.STORAGE_DIR;

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("RESEND_FROM", "Arca <noreply@example.test>");
    vi.stubEnv("APP_HOST", "example.test");
    vi.stubEnv("SESSION_SECRET", "test-secret-at-least-thirty-two-characters-long");
    sender = await import("@/lib/email/send-donor-reminder");
    ({ attachDonorReceipt } = await import("@/lib/donor-receipts/service"));
    ({ nextMonth } = await import("@/lib/donor-payment-ledger"));
    storageDir = await mkdtemp(join(tmpdir(), "ansp-task24-receipts-"));
    process.env.STORAGE_DIR = storageDir;
    const [settings] = await sql!`SELECT launch_competencia FROM donor_ledger_settings`;
    month = settings.launch_competencia as string;
  });

  beforeEach(() => {
    sendEmail.mockReset();
    sendEmail.mockResolvedValue({ data: { id: `msg_${randomUUID()}` }, error: null });
  });

  afterAll(async () => {
    if (sql) {
      if (pledgeIds.length) await sql`DELETE FROM donor_pledges WHERE id = ANY(${pledgeIds})`;
      await sql.end();
    }
    if (storageDir) await rm(storageDir, { recursive: true, force: true });
    if (previousStorageDir === undefined) delete process.env.STORAGE_DIR;
    else process.env.STORAGE_DIR = previousStorageDir;
    vi.unstubAllEnvs();
  });

  async function pledge(options: { day?: number; channel?: string | null; createdAt?: string } = {}) {
    const id = randomUUID();
    pledgeIds.push(id);
    await sql!`INSERT INTO donor_pledges
      (id, nome, cpf, email, frequencia, duracao, dia_vencimento, valor, lembrete_canal, created_at)
      VALUES (${id}, 'Pessoa Teste', '000.000.000-00', ${`${id}@example.test`},
        'mensal', 'indeterminado', ${options.day ?? 20}, 87.50,
        ${options.channel === undefined ? "email" : options.channel},
        ${options.createdAt ?? `${month}-01T15:00:00Z`})`;
    return id;
  }

  async function occurrence(id: string, day = 20) {
    await sql!`INSERT INTO donor_payment_ledger
      (pledge_id, competencia, due_date, expected_value)
      VALUES (${id}, ${month}, ${`${month}-${String(day).padStart(2, "0")}`}, 87.50)
      ON CONFLICT (pledge_id, competencia) DO UPDATE
        SET due_date = EXCLUDED.due_date, expected_value = EXCLUDED.expected_value`;
  }

  async function upload(id: string, competence = month) {
    const link = createDonorReceiptLink("https://example.test", id, competence, `${competence}-20`);
    return attachDonorReceipt(
      new URL(link).searchParams.get("ticket"),
      { body: Buffer.from("%PDF-1.7\nreceipt\n%%EOF"), mime: "application/pdf", name: "receipt.pdf" },
      database!
    );
  }

  it("skips both offsets after first-link upload while the next competence remains eligible", async () => {
    const id = await pledge();
    await occurrence(id);
    const following = nextMonth(month);
    await sql!`INSERT INTO donor_payment_ledger (pledge_id, competencia, due_date, expected_value)
      VALUES (${id}, ${following}, ${`${following}-20`}, 87.50)`;
    expect(await upload(id)).toEqual({ status: "saved" });
    const firstRun = await sender.runDailyDonorReminders(localDate(`${month}-10`), database!);
    const secondRun = await sender.runDailyDonorReminders(localDate(`${month}-15`), database!);
    expect(firstRun.skipped_receipt).toBeGreaterThanOrEqual(1);
    expect(secondRun.skipped_receipt).toBeGreaterThanOrEqual(1);
    expect(await sql!`SELECT kind FROM donor_reminder_sends WHERE pledge_id = ${id} AND competencia = ${month}`)
      .toHaveLength(0);
    expect(await sender.sendDonorReminder(id, following, "10d", {
      now: localDate(`${following}-10`), database: database!,
    })).toMatchObject({ status: "sent" });
  });

  it("keeps an accepted 10-day record and skips its 5-day send and failed manual retry", async () => {
    const accepted = await pledge();
    await occurrence(accepted);
    expect(await sender.sendDonorReminder(accepted, month, "10d", {
      now: localDate(`${month}-10`), database: database!,
    })).toMatchObject({ status: "sent" });
    const [before] = await sql!`SELECT id, status, sent_at, provider_message_id
      FROM donor_reminder_sends WHERE pledge_id = ${accepted} AND kind = '10d'`;
    expect(await upload(accepted)).toEqual({ status: "saved" });
    expect(await sender.sendDonorReminder(accepted, month, "5d", {
      now: localDate(`${month}-15`), database: database!,
    })).toEqual({ status: "skipped_receipt" });
    expect(await sql!`SELECT id, status, sent_at, provider_message_id
      FROM donor_reminder_sends WHERE pledge_id = ${accepted} AND kind = '10d'`)
      .toEqual([before]);
    expect(await sql!`SELECT id FROM donor_reminder_sends WHERE pledge_id = ${accepted} AND kind = '5d'`)
      .toHaveLength(0);

    const failed = await pledge();
    await occurrence(failed);
    sendEmail.mockResolvedValueOnce({ data: null, error: { statusCode: 422 } });
    expect(await sender.sendDonorReminder(failed, month, "10d", {
      now: localDate(`${month}-10`), database: database!,
    })).toMatchObject({ status: "failed" });
    const [row] = await sql!`SELECT id FROM donor_reminder_sends WHERE pledge_id = ${failed}`;
    const providerCalls = sendEmail.mock.calls.length;
    expect(await upload(failed)).toEqual({ status: "saved" });
    expect(await sender.retryFailedDonorReminderSend(row.id, database!))
      .toEqual({ status: "skipped_receipt" });
    expect(sendEmail).toHaveBeenCalledTimes(providerCalls);
    expect(await sql!`SELECT status, error_code FROM donor_reminder_sends WHERE id = ${row.id}`)
      .toEqual([{ status: "failed", error_code: "provider_rejected" }]);
  });

  it("detects a receipt arriving after reservation but before the provider call", async () => {
    const id = await pledge();
    await occurrence(id);
    const ledgerQuery = database!.query.donorPaymentLedger;
    const original = ledgerQuery.findFirst.bind(ledgerQuery) as (config: unknown) => Promise<unknown>;
    let reads = 0;
    const guardedDatabase = Object.assign(Object.create(database!), {
      query: {
        ...database!.query,
        donorPaymentLedger: {
          findFirst: async (config: unknown) => {
            reads++;
            if (reads === 2) expect(await upload(id)).toEqual({ status: "saved" });
            return original(config);
          },
        },
      },
    }) as typeof database;
    expect(await sender.sendDonorReminder(id, month, "10d", {
      now: localDate(`${month}-10`), database: guardedDatabase!,
    })).toEqual({ status: "skipped_receipt" });
    expect(reads).toBeGreaterThanOrEqual(2);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(await sql!`SELECT id FROM donor_reminder_sends WHERE pledge_id = ${id}`).toHaveLength(0);
    const next = nextMonth(month);
    await sql!`INSERT INTO donor_payment_ledger (pledge_id, competencia, due_date, expected_value)
      VALUES (${id}, ${next}, ${`${next}-20`}, 87.50)`;
    expect(await sender.sendDonorReminder(id, next, "10d", {
      now: localDate(`${next}-10`), database: database!,
    })).toMatchObject({ status: "sent" });
  });

  it("materializes before sending, then two workers make at most one provider request", async () => {
    const id = await pledge();
    const today = localDate(`${month}-10`);
    expect(await sender.sendDonorReminder(id, month, "10d", { now: today, database: database! }))
      .toEqual({ status: "expired" });
    expect(await sql!`SELECT id FROM donor_reminder_sends WHERE pledge_id = ${id}`).toHaveLength(0);
    await occurrence(id);
    let releaseProvider!: () => void;
    const providerPending = new Promise<void>((resolve) => { releaseProvider = resolve; });
    sendEmail.mockImplementation(async () => {
      await providerPending;
      return { data: { id: "accepted-one" }, error: null };
    });

    const first = sender.sendDonorReminder(id, month, "10d", { now: today, database: database! });
    try {
      await vi.waitFor(() => expect(sendEmail).toHaveBeenCalledTimes(1), { timeout: 10_000 });
      expect(await sender.sendDonorReminder(id, month, "10d", { now: today, database: database! }))
        .toMatchObject({ status: "in_progress" });
    } finally {
      releaseProvider();
    }
    expect(await first).toMatchObject({ status: "sent" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][1].idempotencyKey).toBe(reminderProviderKey(id, month, "10d"));
    const [row] = await sql!`SELECT status, sent_at, provider_message_id, attempt_count
      FROM donor_reminder_sends WHERE pledge_id = ${id}`;
    expect(row).toMatchObject({ status: "sent", provider_message_id: "accepted-one", attempt_count: 1 });
    expect(row.sent_at).not.toBeNull();
    expect(await sender.sendDonorReminder(id, month, "10d", { now: today, database: database! }))
      .toMatchObject({ status: "already_sent" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("includes a signed link to the same occurrence in both kinds and freezes failed retries", async () => {
    const id = await pledge();
    await occurrence(id);
    sendEmail.mockResolvedValueOnce({ data: null, error: { statusCode: 422, message: "recipient@example.test" } })
      .mockResolvedValue({ data: { id: "accepted" }, error: null });
    expect(await sender.sendDonorReminder(id, month, "10d", {
      now: localDate(`${month}-10`), database: database!,
    })).toMatchObject({ status: "failed", error_code: "provider_rejected" });
    const first = sendEmail.mock.calls[0][0];
    const link = first.text.match(/https:\/\/[^\s]+/)?.[0];
    expect(link).toBeTruthy();
    expect(verifyDonorReceiptTicket(new URL(link!).searchParams.get("ticket"),
      localDate(`${month}-10`).getTime())).toMatchObject({ pledge_id: id, competencia: month });
    await sql!`UPDATE donor_pledges SET nome = 'Nome alterado', email = 'novo@example.test' WHERE id = ${id}`;
    expect(await sender.sendDonorReminder(id, month, "10d", {
      now: localDate(`${month}-10`), database: database!,
    })).toMatchObject({ status: "sent" });
    expect(sendEmail.mock.calls[1][0]).toEqual(first);

    expect(await sender.sendDonorReminder(id, month, "5d", {
      now: localDate(`${month}-15`), database: database!,
    })).toMatchObject({ status: "sent" });
    const second = sendEmail.mock.calls[2][0];
    const secondLink = second.text.match(/https:\/\/[^\s]+/)?.[0];
    expect(verifyDonorReceiptTicket(new URL(secondLink!).searchParams.get("ticket"),
      localDate(`${month}-15`).getTime())).toMatchObject({ pledge_id: id, competencia: month });
    expect(await sql!`SELECT kind FROM donor_reminder_sends WHERE pledge_id = ${id}`).toHaveLength(2);
  });

  it("opens an accepted reminder link and attaches evidence only to its occurrence", async () => {
    const id = await pledge();
    const otherId = await pledge({ channel: null });
    await occurrence(id);
    await occurrence(otherId);
    const previousStorageDir = process.env.STORAGE_DIR;
    const storageDir = await mkdtemp(join(tmpdir(), "ansp-task08-link-"));
    process.env.STORAGE_DIR = storageDir;
    try {
      expect(await sender.sendDonorReminder(id, month, "10d", {
        now: localDate(`${month}-10`), database: database!,
      })).toMatchObject({ status: "sent" });
      const link = sendEmail.mock.calls[0][0].text.match(/https:\/\/[^\s]+/)?.[0];
      expect(link).toBeTruthy();
      const ticket = new URL(link!).searchParams.get("ticket");
      const ReceiptPage = (await import("@/app/benfeitor/comprovante/page")).default;
      const html = renderToStaticMarkup(await ReceiptPage({ searchParams: Promise.resolve({ ticket: ticket! }) }));
      expect(html).toContain("Olá, Pessoa.");
      expect(html).toContain("Comprovante pendente");
      expect(html).toContain("Cada pagamento mensal exige seu próprio comprovante");
      expect(html).toContain("O envio não confirma o crédito");

      const form = new FormData();
      form.set("ticket", ticket!);
      form.set("file", new File(["%PDF-1.7\nproof\n%%EOF"], "proof.pdf", { type: "application/pdf" }));
      const { POST } = await import("@/app/api/donor-receipts/route");
      const response = await POST(new NextRequest("http://localhost:3000/api/donor-receipts", {
        method: "POST", headers: { origin: "http://localhost:3000" }, body: form,
      }));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ message: expect.stringContaining("conferência bancária") });
      const [target] = await sql!`SELECT receipt_path FROM donor_payment_ledger
        WHERE pledge_id = ${id} AND competencia = ${month}`;
      expect(target.receipt_path).toMatch(new RegExp(`^donors/${id}/payments/${month}/`));
      expect(await getStorage().size(target.receipt_path)).toBeGreaterThan(0);
      expect(await sql!`SELECT receipt_path FROM donor_payment_ledger
        WHERE pledge_id = ${otherId} AND competencia = ${month}`)
        .toMatchObject([{ receipt_path: null }]);
    } finally {
      if (previousStorageDir === undefined) delete process.env.STORAGE_DIR;
      else process.env.STORAGE_DIR = previousStorageDir;
      await rm(storageDir, { recursive: true, force: true });
    }
  });

  it("recovers an expired unstarted lease and quarantines a crashed provider call", async () => {
    const recoverId = await pledge();
    const uncertainId = await pledge();
    await occurrence(recoverId);
    await occurrence(uncertainId);
    for (const id of [recoverId, uncertainId]) {
      await sql!`INSERT INTO donor_reminder_sends
        (pledge_id, competencia, kind, due_date, status, reservation_token,
         reservation_expires_at, provider_idempotency_key, provider_call_started_at)
        VALUES (${id}, ${month}, '10d', ${`${month}-20`}, 'sending', ${randomUUID()},
          now() - interval '1 minute', ${reminderProviderKey(id, month, "10d")},
          ${id === uncertainId ? new Date().toISOString() : null})`;
    }
    expect(await sender.sendDonorReminder(recoverId, month, "10d", {
      now: localDate(`${month}-10`), database: database!,
    })).toMatchObject({ status: "sent" });
    expect(await sender.sendDonorReminder(uncertainId, month, "10d", {
      now: localDate(`${month}-10`), database: database!,
    })).toMatchObject({ status: "uncertain" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [row] = await sql!`SELECT status, error_code FROM donor_reminder_sends WHERE pledge_id = ${uncertainId}`;
    expect(row).toEqual({ status: "uncertain", error_code: "unknown" });
  });

  it("records timeout without provider details, and a daily rerun never resends accepted rows", async () => {
    const id = await pledge();
    await occurrence(id);
    sendEmail.mockRejectedValueOnce(Object.assign(new Error("recipient@example.test and body"), { name: "TimeoutError" }));
    const today = localDate(`${month}-10`);
    expect(await sender.sendDonorReminder(id, month, "10d", { now: today, database: database! }))
      .toEqual({ status: "uncertain", error_code: "provider_timeout" });
    const [row] = await sql!`SELECT status, error_code FROM donor_reminder_sends WHERE pledge_id = ${id}`;
    expect(row).toEqual({ status: "uncertain", error_code: "provider_timeout" });
    expect(JSON.stringify(row)).not.toContain("@example.test");

    const acceptedId = await pledge();
    await occurrence(acceptedId);
    const first = await sender.runDailyDonorReminders(today, database!);
    const second = await sender.runDailyDonorReminders(today, database!);
    expect(first.sent).toBeGreaterThanOrEqual(1);
    expect(second.sent).toBe(0);
    expect(second.already_sent).toBeGreaterThanOrEqual(1);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("does not claim opted-out or mismatched occurrence rows", async () => {
    const optedOut = await pledge({ channel: null });
    await occurrence(optedOut);
    const mismatch = await pledge();
    await occurrence(mismatch, 21);
    for (const id of [optedOut, mismatch]) {
      expect(await sender.sendDonorReminder(id, month, "10d", {
        now: localDate(`${month}-10`), database: database!,
      })).toEqual({ status: "expired" });
    }
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("records a safe configuration failure without starting a provider call", async () => {
    const id = await pledge();
    await occurrence(id);
    vi.stubEnv("RESEND_API_KEY", "");
    try {
      expect(await sender.sendDonorReminder(id, month, "10d", {
        now: localDate(`${month}-10`), database: database!,
      })).toEqual({ status: "failed", error_code: "configuration" });
      expect(sendEmail).not.toHaveBeenCalled();
      const [row] = await sql!`SELECT status, error_code, frozen_text, provider_call_started_at
        FROM donor_reminder_sends WHERE pledge_id = ${id}`;
      expect(row).toEqual({
        status: "failed", error_code: "configuration", frozen_text: null,
        provider_call_started_at: null,
      });
    } finally {
      vi.stubEnv("RESEND_API_KEY", "re_test_key");
    }
  });
});
