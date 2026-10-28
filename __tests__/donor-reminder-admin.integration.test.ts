// @vitest-environment node
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { saoPauloDate } from "@/lib/donor-recurrence";

const { getSessionUser, sendEmail, revalidatePath } = vi.hoisted(() => ({
  getSessionUser: vi.fn(), sendEmail: vi.fn(), revalidatePath: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getSessionUser }));
vi.mock("resend", () => ({ Resend: class { emails = { send: sendEmail }; } }));
vi.mock("next/cache", () => ({ revalidatePath }));

const databaseUrl = process.env.DATABASE_URL_TEST;
const integration = describe.skipIf(!databaseUrl);
const adminId = randomUUID();
const secretariatId = randomUUID();
const isolatedSchema = `task06_${randomUUID().replaceAll("-", "")}`;
const addDays = (date: string, days: number) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

integration("administrator reminder recovery with PostgreSQL", () => {
  const baseSql = databaseUrl ? postgres(databaseUrl, { max: 1 }) : null;
  let db: typeof import("@/lib/db").db;
  let schema: typeof import("@/lib/db/schema");
  let actions: typeof import("@/app/admin/_actions/donor-reminder-actions");
  let page: typeof import("@/app/admin/lembretes-benfeitores/page").default;

  beforeAll(async () => {
    await baseSql!.unsafe(`CREATE SCHEMA "${isolatedSchema}"`);
    for (const table of [
      "admin_users", "donor_pledges", "donor_payment_ledger",
      "donor_reminder_sends", "donor_reminder_templates", "document_header",
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
    const [{ current_schema }] = await db.$client`SELECT current_schema()`;
    if (current_schema !== isolatedSchema) throw new Error("Task 06 test schema was not selected");
    schema = await import("@/lib/db/schema");
    actions = await import("@/app/admin/_actions/donor-reminder-actions");
    ({ default: page } = await import("@/app/admin/lembretes-benfeitores/page"));
    await db.insert(schema.adminUsers).values([
      { id: adminId, email: `${adminId}@example.test`, password_hash: "test", role: "admin" },
      { id: secretariatId, email: `${secretariatId}@example.test`, password_hash: "test", role: "secretaria" },
    ]);
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

  async function createReminder(status: "failed" | "sending" | "uncertain", channel: "email" | null = "email", late = false) {
    const today = saoPauloDate(new Date());
    const tenDayDue = addDays(today, 10);
    const kind = late || Number(tenDayDue.slice(-2)) <= 28 ? "10d" : "5d";
    const dueDate = late ? `${today.slice(0, 7)}-01` : kind === "10d" ? tenDayDue : addDays(today, 5);
    const competence = dueDate.slice(0, 7);
    const [year, month] = competence.split("-").map(Number);
    const registeredAt = new Date(Date.UTC(year, month - 2, 1, 15)).toISOString();
    const pledgeId = randomUUID();
    await db.insert(schema.donorPledges).values({
      id: pledgeId,
      nome: "Pessoa de teste", cpf: "000.000.000-00", email: `${pledgeId}@example.test`,
      frequencia: "mensal", duracao: "indeterminado", dia_vencimento: Number(dueDate.slice(-2)),
      valor: 87.5, lembrete_canal: channel,
      created_at: registeredAt,
    });
    await db.insert(schema.donorPaymentLedger).values({
      pledge_id: pledgeId, competencia: competence, due_date: dueDate, expected_value: 87.5,
    });
    const id = randomUUID();
    await db.insert(schema.donorReminderSends).values({
      id, pledge_id: pledgeId, competencia: competence, kind, due_date: dueDate, status,
      provider_idempotency_key: `donor-reminder-v1:${pledgeId}:${competence}:${kind}`,
      reservation_token: status === "sending" ? randomUUID() : null,
      reservation_expires_at: status === "sending" ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : null,
    });
    return id;
  }

  it("denies direct Secretaria page, read, save, preview, test, retry, and review calls", async () => {
    const id = await createReminder("failed");
    getSessionUser.mockResolvedValue({ id: secretariatId, email: `${secretariatId}@example.test` });
    const content = { assunto: "Lembrete", corpo: "Seu link: {link_comprovante}" };
    await expect(page()).rejects.toThrow("permissão");
    await expect(actions.getDonorReminderDashboard()).rejects.toThrow("permissão");
    await expect(actions.previewDonorReminderTemplate(content)).rejects.toThrow("permissão");
    await expect(actions.saveDonorReminderTemplate(content)).rejects.toThrow("permissão");
    await expect(actions.sendDonorReminderTest({ ...content, email: "test@example.test" })).rejects.toThrow("permissão");
    await expect(actions.retryFailedDonorReminder(id)).rejects.toThrow("permissão");
    await expect(actions.resolveUncertainDonorReminder(id, "accepted")).rejects.toThrow("permissão");
    expect(sendEmail).not.toHaveBeenCalled();
    expect((await db.query.donorReminderSends.findFirst({ where: eq(schema.donorReminderSends.id, id) }))?.status).toBe("failed");
  });

  it("sends a sample with [TESTE] and no reminder row", async () => {
    const content = { assunto: "Contribuição de {mes_referencia}", corpo: "Olá {nome}. Vence em {data_vencimento}. Pix {chave_pix}. {link_comprovante}" };
    const before = await db.query.donorReminderSends.findMany();
    expect(await actions.sendDonorReminderTest({ ...content, email: "test@example.test" })).toEqual({ success: true });
    expect(sendEmail.mock.calls[0][0].subject).toMatch(/^\[TESTE\]/);
    expect(sendEmail.mock.calls[0][0].to).toEqual(["test@example.test"]);
    expect(sendEmail.mock.calls[0][0].text).toContain("exemplo.invalid");
    expect(await db.query.donorReminderSends.findMany()).toHaveLength(before.length);
  });

  it("retries one eligible failed row only once, rejects a late retry, and reports an active lease", async () => {
    const failedId = await createReminder("failed");
    const activeId = await createReminder("sending");
    const lateId = await createReminder("failed", "email", true);
    expect(await actions.retryFailedDonorReminder(activeId)).toMatchObject({ status: "in_progress" });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(await actions.retryFailedDonorReminder(failedId)).toMatchObject({ status: "sent" });
    expect(await actions.retryFailedDonorReminder(failedId)).toMatchObject({ status: "already_sent" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(await actions.retryFailedDonorReminder(lateId)).toEqual({ status: "expired" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect((await db.query.donorReminderSends.findFirst({ where: eq(schema.donorReminderSends.id, lateId) }))?.status).toBe("failed");
  });

  it("requires explicit uncertain resolution before retry and rechecks opt-in", async () => {
    const uncertainId = await createReminder("uncertain");
    const optedOutId = await createReminder("failed", null);
    expect(await actions.retryFailedDonorReminder(uncertainId)).toMatchObject({ status: "uncertain" });
    expect(await actions.retryFailedDonorReminder(optedOutId)).toEqual({ status: "expired" });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(await actions.resolveUncertainDonorReminder(uncertainId, "failed")).toMatchObject({ success: true, status: "failed" });
    expect(await actions.retryFailedDonorReminder(uncertainId)).toMatchObject({ status: "sent" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const acceptedId = await createReminder("uncertain");
    expect(await actions.resolveUncertainDonorReminder(acceptedId, "accepted")).toMatchObject({ success: true, status: "sent" });
    expect(await actions.retryFailedDonorReminder(acceptedId)).toMatchObject({ status: "already_sent" });
    expect((await actions.getDonorReminderDashboard()).sends.some((send) => send.id === acceptedId)).toBe(false);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("exposes expired leases as uncertain after a provider call and failed before one", async () => {
    const startedId = await createReminder("sending");
    const unstartedId = await createReminder("sending");
    const expiredAt = new Date(Date.now() - 60_000).toISOString();
    await db.update(schema.donorReminderSends).set({
      reservation_expires_at: expiredAt,
      provider_call_started_at: new Date(Date.now() - 120_000).toISOString(),
    }).where(eq(schema.donorReminderSends.id, startedId));
    await db.update(schema.donorReminderSends).set({ reservation_expires_at: expiredAt })
      .where(eq(schema.donorReminderSends.id, unstartedId));
    expect(await actions.retryFailedDonorReminder(startedId)).toMatchObject({ status: "uncertain" });
    expect(sendEmail).not.toHaveBeenCalled();
    const dashboard = await actions.getDonorReminderDashboard();
    expect(dashboard.sends.find((send) => send.id === startedId)?.status).toBe("uncertain");
    expect(dashboard.sends.find((send) => send.id === unstartedId)).toMatchObject({ status: "failed", can_retry: true });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
