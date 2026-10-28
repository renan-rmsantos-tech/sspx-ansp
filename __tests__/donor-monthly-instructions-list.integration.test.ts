// @vitest-environment node
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyDonorReceiptTicket } from "@/lib/donor-receipts/tickets";
import { saoPauloDate } from "@/lib/donor-recurrence";

const { getSessionUser, sendEmail } = vi.hoisted(() => ({
  getSessionUser: vi.fn(), sendEmail: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getSessionUser }));
vi.mock("resend", () => ({ Resend: class { emails = { send: sendEmail }; } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const databaseUrl = process.env.DATABASE_URL_TEST;
const integration = describe.skipIf(!databaseUrl);
const isolatedSchema = `task23_${randomUUID().replaceAll("-", "")}`;
const adminId = randomUUID();
const secretariatId = randomUUID();
const currentMonth = saoPauloDate(new Date()).slice(0, 7);
const [year, month] = currentMonth.split("-").map(Number);
const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
const dueDate = (competence: string) => `${competence}-10`;

integration("monthly instructions donor-list actions with PostgreSQL", () => {
  const baseSql = databaseUrl ? postgres(databaseUrl, { max: 1 }) : null;
  let sql: ReturnType<typeof postgres>;
  let db: typeof import("@/lib/db").db;
  let getDonorPledges: typeof import("@/app/admin/_actions/admin-actions").getDonorPledges;
  let sendAction: typeof import("@/app/admin/_actions/donor-monthly-instructions-actions").sendManualDonorMonthlyInstructionsAction;
  let resolveAction: typeof import("@/app/admin/_actions/donor-monthly-instructions-actions").resolveUncertainDonorMonthlyInstructionsAction;

  beforeAll(async () => {
    await baseSql!.unsafe(`CREATE SCHEMA "${isolatedSchema}"`);
    for (const table of [
      "admin_users", "donor_pledges", "donor_reminder_sends", "donor_payment_ledger",
      "donor_monthly_instruction_sends", "donor_monthly_instruction_templates", "document_header",
    ]) {
      await baseSql!.unsafe(`CREATE TABLE "${isolatedSchema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
    }
    const scopedUrl = new URL(databaseUrl!);
    scopedUrl.searchParams.set("options", `-csearch_path=${isolatedSchema}`);
    vi.stubEnv("DATABASE_URL", scopedUrl.toString());
    vi.stubEnv("AUTH_BYPASS", "false");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("RESEND_FROM", "Arca <noreply@example.test>");
    vi.stubEnv("APP_HOST", "example.test");
    vi.stubEnv("SESSION_SECRET", "test-secret-at-least-thirty-two-characters-long");
    ({ db } = await import("@/lib/db"));
    ({ getDonorPledges } = await import("@/app/admin/_actions/admin-actions"));
    ({ sendManualDonorMonthlyInstructionsAction: sendAction,
      resolveUncertainDonorMonthlyInstructionsAction: resolveAction } =
      await import("@/app/admin/_actions/donor-monthly-instructions-actions"));
    sql = db.$client;
    const [{ current_schema }] = await sql`SELECT current_schema()`;
    if (current_schema !== isolatedSchema) throw new Error("Task 23 test schema was not selected");
    await sql`INSERT INTO admin_users (id, email, password_hash, role) VALUES
      (${adminId}, ${`${adminId}@example.test`}, 'test', 'admin'),
      (${secretariatId}, ${`${secretariatId}@example.test`}, 'test', 'secretaria')`;
  });

  beforeEach(() => {
    getSessionUser.mockResolvedValue({ id: adminId, email: `${adminId}@example.test` });
    sendEmail.mockReset();
    sendEmail.mockResolvedValue({ data: { id: `msg_${randomUUID()}` }, error: null });
  });

  afterAll(async () => {
    if (db) await db.$client.end();
    if (baseSql) {
      await baseSql.unsafe(`DROP SCHEMA IF EXISTS "${isolatedSchema}" CASCADE`);
      await baseSql.end();
    }
    vi.unstubAllEnvs();
  });

  async function pledge(options: { frequency?: "mensal" | "unica"; channel?: "email" | null } = {}) {
    const id = randomUUID();
    const frequency = options.frequency ?? "mensal";
    await sql`INSERT INTO donor_pledges
      (id, nome, cpf, email, frequencia, duracao, dia_vencimento, valor, lembrete_canal, created_at)
      VALUES (${id}, 'Pessoa Teste', '000.000.000-00', ${`${id}@example.test`},
        ${frequency}, ${frequency === "mensal" ? "indeterminado" : null},
        ${frequency === "mensal" ? 10 : null}, 87.50, ${options.channel ?? null}, '2025-01-01T15:00:00Z')`;
    return id;
  }

  async function occurrence(id: string, competence = currentMonth, receipt = false) {
    await sql`INSERT INTO donor_payment_ledger
      (pledge_id, competencia, due_date, expected_value, receipt_path, receipt_name, receipt_uploaded_at)
      VALUES (${id}, ${competence}, ${dueDate(competence)}, 87.50,
        ${receipt ? "private/receipt.pdf" : null}, ${receipt ? "receipt.pdf" : null},
        ${receipt ? "2026-10-20T15:00:00Z" : null})`;
  }

  it("shows historical no-send and independent receipt status without retroactive background send", async () => {
    const id = await pledge({ channel: null });
    await occurrence(id);
    await occurrence(id, nextMonth, true);
    const oneTime = await pledge({ frequency: "unica" });
    const result = await getDonorPledges();
    expect(result.error).toBeNull();
    const monthly = result.data?.find((row) => row.id === id);
    expect(monthly).toMatchObject({
      latest_instructions: null,
      current_receipt: { competencia: currentMonth, status: "Comprovante pendente" },
      pending_occurrences: [{ competencia: currentMonth }],
    });
    expect(result.data?.find((row) => row.id === oneTime)).toMatchObject({ latest_instructions: null });
    expect(await sql`SELECT id FROM donor_monthly_instruction_sends WHERE pledge_id = ${id}`).toHaveLength(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends an opted-out donor a link for the selected later pending occurrence without enrolling reminders", async () => {
    const id = await pledge({ channel: null });
    await occurrence(id);
    await occurrence(id, nextMonth);
    expect(await sendAction({ pledgeId: id, competence: nextMonth })).toMatchObject({
      status: "sent", latest: { generation: 1, receipt_competencia: nextMonth },
    });
    expect(await sql`SELECT generation, receipt_competencia FROM donor_monthly_instruction_sends WHERE pledge_id = ${id}`)
      .toEqual([{ generation: 1, receipt_competencia: nextMonth }]);
    expect(await sql`SELECT lembrete_canal FROM donor_pledges WHERE id = ${id}`)
      .toEqual([{ lembrete_canal: null }]);
    expect(await sql`SELECT id FROM donor_reminder_sends WHERE pledge_id = ${id}`).toHaveLength(0);
    const afterSend = (await getDonorPledges()).data?.find((row) => row.id === id);
    expect(afterSend).toMatchObject({
      latest_instructions: { status: "sent", receipt_competencia: nextMonth },
      latest_reminder: null, welcome_email_sent_at: null,
      current_receipt: { status: "Comprovante pendente" },
    });
    const link = (sendEmail.mock.calls.at(-1)?.[0].text as string).match(/https:\/\/[^\s]+/)?.[0];
    expect(verifyDonorReceiptTicket(new URL(link!).searchParams.get("ticket")))
      .toMatchObject({ pledge_id: id, competencia: nextMonth });
  });

  it("renews an overdue selected link and rejects invalid, foreign, uploaded, and one-time targets", async () => {
    const id = await pledge();
    const other = await pledge();
    const oneTime = await pledge({ frequency: "unica" });
    await occurrence(id, "2025-02");
    await occurrence(id, "2024-12");
    await occurrence(id, nextMonth, true);
    expect(await sendAction({ pledgeId: id, competence: "2025-13" })).toMatchObject({ status: "unavailable" });
    expect(await sendAction({ pledgeId: id, competence: "2024-12" })).toMatchObject({ status: "unavailable" });
    expect(await sendAction({ pledgeId: other, competence: "2025-02" })).toMatchObject({ status: "unavailable" });
    expect(await sendAction({ pledgeId: id, competence: nextMonth })).toMatchObject({ status: "unavailable" });
    expect(await sendAction({ pledgeId: oneTime, competence: "2025-02" })).toMatchObject({ status: "unavailable" });
    getSessionUser.mockResolvedValue({ id: secretariatId, email: `${secretariatId}@example.test` });
    await expect(sendAction({ pledgeId: id, competence: "2025-02" })).rejects.toThrow("permissão");
    getSessionUser.mockResolvedValue(null);
    await expect(sendAction({ pledgeId: id, competence: "2025-02" })).rejects.toThrow("login");
    getSessionUser.mockResolvedValue({ id: adminId, email: `${adminId}@example.test` });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(await sendAction({ pledgeId: id, competence: "2025-02" })).toMatchObject({ status: "sent" });
    const link = (sendEmail.mock.calls.at(-1)?.[0].text as string).match(/https:\/\/[^\s]+/)?.[0];
    const ticket = verifyDonorReceiptTicket(new URL(link!).searchParams.get("ticket"));
    expect(ticket).toMatchObject({ pledge_id: id, competencia: "2025-02" });
    expect(ticket!.exp - Math.floor(Date.now() / 1000)).toBeGreaterThan(13 * 24 * 60 * 60);
  });

  it("serializes concurrent calls, retries a definite failure, and preserves deliberate resend history", async () => {
    const id = await pledge();
    await occurrence(id);
    await occurrence(id, nextMonth);
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    sendEmail.mockImplementation(async () => {
      await barrier;
      return { data: { id: "accepted-once" }, error: null };
    });
    const first = sendAction({ pledgeId: id, competence: currentMonth });
    try {
      await vi.waitFor(() => expect(sendEmail).toHaveBeenCalledTimes(1), { timeout: 10_000 });
      expect(await sendAction({ pledgeId: id, competence: currentMonth })).toMatchObject({ status: "in_progress" });
    } finally { release(); }
    expect(await first).toMatchObject({ status: "sent" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(await sendAction({ pledgeId: id, competence: nextMonth })).toMatchObject({ status: "already_sent" });
    sendEmail.mockResolvedValue({ data: null, error: { statusCode: 422 } });
    expect(await sendAction({ pledgeId: id, competence: nextMonth, explicitResend: true }))
      .toMatchObject({ status: "failed", latest: { generation: 2 } });
    sendEmail.mockResolvedValue({ data: { id: "retry-accepted" }, error: null });
    expect(await sendAction({ pledgeId: id, competence: nextMonth })).toMatchObject({ status: "sent" });
    expect(await sql`SELECT generation, receipt_competencia, status, attempt_count
      FROM donor_monthly_instruction_sends WHERE pledge_id = ${id} ORDER BY generation`)
      .toEqual([
        { generation: 1, receipt_competencia: currentMonth, status: "sent", attempt_count: 1 },
        { generation: 2, receipt_competencia: nextMonth, status: "sent", attempt_count: 2 },
      ]);
  });

  it("abandons an expired pre-provider reservation before targeting another pending month", async () => {
    const id = await pledge();
    await occurrence(id);
    await occurrence(id, nextMonth);
    await sql`INSERT INTO donor_monthly_instruction_sends
      (pledge_id, generation, receipt_competencia, provider_idempotency_key,
        status, reservation_token, reservation_expires_at)
      VALUES (${id}, 1, ${currentMonth}, ${`task23:${id}:1`},
        'sending', ${randomUUID()}, '2020-01-01T00:00:00Z')`;
    expect(await sendAction({ pledgeId: id, competence: nextMonth, explicitResend: true }))
      .toMatchObject({ status: "sent", latest: { generation: 2, receipt_competencia: nextMonth } });
    expect(await sql`SELECT generation, status, receipt_competencia FROM donor_monthly_instruction_sends
      WHERE pledge_id = ${id} ORDER BY generation`).toEqual([
      { generation: 1, status: "failed", receipt_competencia: currentMonth },
      { generation: 2, status: "sent", receipt_competencia: nextMonth },
    ]);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("never retries uncertainty until an Administrator reviews it", async () => {
    const id = await pledge();
    await occurrence(id);
    await occurrence(id, nextMonth);
    sendEmail.mockRejectedValueOnce(new DOMException("Timed out", "TimeoutError"));
    expect(await sendAction({ pledgeId: id, competence: currentMonth })).toMatchObject({ status: "uncertain" });
    expect(await sendAction({ pledgeId: id, competence: nextMonth, explicitResend: true }))
      .toMatchObject({ status: "unavailable" });
    expect(await sendAction({ pledgeId: id, competence: currentMonth })).toMatchObject({ status: "uncertain" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    getSessionUser.mockResolvedValue({ id: secretariatId, email: `${secretariatId}@example.test` });
    await expect(sendAction({ pledgeId: id, competence: currentMonth, explicitResend: true })).rejects.toThrow("permissão");
    await expect(resolveAction({ pledgeId: id, resolution: "failed" })).rejects.toThrow("permissão");
    getSessionUser.mockResolvedValue(null);
    await expect(sendAction({ pledgeId: id, competence: currentMonth })).rejects.toThrow("login");
    await expect(resolveAction({ pledgeId: id, resolution: "accepted" })).rejects.toThrow("login");
    getSessionUser.mockResolvedValue({ id: adminId, email: `${adminId}@example.test` });
    expect(await resolveAction({ pledgeId: id, resolution: "failed" })).toMatchObject({ success: true });
    sendEmail.mockResolvedValue({ data: { id: "reviewed-retry" }, error: null });
    expect(await sendAction({ pledgeId: id, competence: currentMonth })).toMatchObject({ status: "sent" });
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });
});
