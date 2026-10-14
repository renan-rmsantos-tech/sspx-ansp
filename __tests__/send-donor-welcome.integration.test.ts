// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const { sendEmail } = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock("resend", () => ({ Resend: class { emails = { send: sendEmail }; } }));

const databaseUrl = process.env.DATABASE_URL_TEST;
const integration = describe.skipIf(!databaseUrl);
let db: typeof import("@/lib/db").db;
let donorPledges: typeof import("@/lib/db/schema").donorPledges;
let sendDonorWelcomeEmail: typeof import("@/lib/email/send-donor-welcome").sendDonorWelcomeEmail;
const donorIds: string[] = [];

integration("sendDonorWelcomeEmail with PostgreSQL", () => {
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("RESEND_FROM", "Arca <noreply@example.test>");
    ({ db } = await import("@/lib/db"));
    ({ donorPledges } = await import("@/lib/db/schema"));
    ({ sendDonorWelcomeEmail } = await import("@/lib/email/send-donor-welcome"));
  });

  afterAll(async () => {
    if (db && donorPledges && donorIds.length) {
      await db.delete(donorPledges).where((await import("drizzle-orm")).inArray(donorPledges.id, donorIds));
      await db.$client.end();
    }
    vi.unstubAllEnvs();
  });

  async function createDonor(reservation?: { token: string; expiresAt: string }) {
    const id = randomUUID();
    donorIds.push(id);
    await db.insert(donorPledges).values({
      id,
      nome: "Teste de integração",
      cpf: "000.000.000-00",
      email: `${id}@example.test`,
      frequencia: "mensal",
      valor: 1,
      meio_pagamento: null,
      welcome_email_reservation_token: reservation?.token ?? null,
      welcome_email_reservation_expires_at: reservation?.expiresAt ?? null,
    });
    return { id, email: `${id}@example.test` };
  }

  it("allows only one of two concurrent callers to send", async () => {
    sendEmail.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return { data: { id: "accepted" }, error: null };
    });
    const donor = await createDonor();
    const results = await Promise.all([
      sendDonorWelcomeEmail(donor),
      sendDonorWelcomeEmail(donor),
    ]);

    expect(results.map(({ status }) => status).sort()).toEqual(["in_progress", "sent"]);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("reclaims an expired reservation", async () => {
    sendEmail.mockResolvedValue({ data: { id: "accepted" }, error: null });
    const donor = await createDonor({
      token: randomUUID(),
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(await sendDonorWelcomeEmail(donor)).toMatchObject({ status: "sent" });
  });

  it("releases its reservation after Resend failure", async () => {
    sendEmail.mockResolvedValue({ data: null, error: { message: "Resend unavailable" } });
    const donor = await createDonor();
    expect(await sendDonorWelcomeEmail(donor)).toMatchObject({ status: "failed" });
    const row = await db.query.donorPledges.findFirst({ where: (table, { eq }) => eq(table.id, donor.id) });
    expect(row).toMatchObject({
      welcome_email_sent_at: null,
      welcome_email_reservation_token: null,
      welcome_email_reservation_expires_at: null,
    });
  });
});
