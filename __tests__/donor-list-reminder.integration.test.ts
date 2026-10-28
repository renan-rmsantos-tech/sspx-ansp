// @vitest-environment node
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { DonorPledge } from "@/app/admin/_components/donor-card";

const { getSessionUser } = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSessionUser }));

const databaseUrl = process.env.DATABASE_URL_TEST;
const integration = describe.skipIf(!databaseUrl);
const isolatedSchema = `task07_${randomUUID().replaceAll("-", "")}`;
const adminId = randomUUID();
const secretariatId = randomUUID();
const pledgeId = randomUUID();

integration("donor-list reminder projection with PostgreSQL", () => {
  const baseSql = databaseUrl ? postgres(databaseUrl, { max: 1 }) : null;
  let db: typeof import("@/lib/db").db;
  let schema: typeof import("@/lib/db/schema");
  let getDonorPledges: typeof import("@/app/admin/_actions/admin-actions").getDonorPledges;

  beforeAll(async () => {
    await baseSql!.unsafe(`CREATE SCHEMA "${isolatedSchema}"`);
    for (const table of ["admin_users", "donor_pledges", "donor_reminder_sends", "donor_monthly_instruction_sends", "donor_payment_ledger"]) {
      await baseSql!.unsafe(`CREATE TABLE "${isolatedSchema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
    }
    const scopedUrl = new URL(databaseUrl!);
    scopedUrl.searchParams.set("options", `-csearch_path=${isolatedSchema}`);
    vi.stubEnv("DATABASE_URL", scopedUrl.toString());
    vi.stubEnv("AUTH_BYPASS", "false");
    ({ db } = await import("@/lib/db"));
    schema = await import("@/lib/db/schema");
    ({ getDonorPledges } = await import("@/app/admin/_actions/admin-actions"));
    const [{ current_schema }] = await db.$client`SELECT current_schema()`;
    if (current_schema !== isolatedSchema) throw new Error("Task 07 test schema was not selected");

    await db.insert(schema.adminUsers).values([
      { id: adminId, email: `${adminId}@example.test`, password_hash: "test", role: "admin" },
      { id: secretariatId, email: `${secretariatId}@example.test`, password_hash: "test", role: "secretaria" },
    ]);
    await db.insert(schema.donorPledges).values({
      id: pledgeId, nome: "Benfeitor de teste", cpf: "000.000.000-00",
      email: `${pledgeId}@example.test`, frequencia: "mensal",
      duracao: "indeterminado", dia_vencimento: 5, valor: 100,
      lembrete_canal: "email", created_at: "2025-01-01T12:00:00Z",
    });
    await db.insert(schema.donorReminderSends).values([
      {
        pledge_id: pledgeId, competencia: "2026-11", kind: "10d", due_date: "2026-11-05",
        status: "failed", error_code: "provider_rejected",
        provider_idempotency_key: `task07:${pledgeId}:10d`,
        updated_at: "2026-10-20T12:00:00Z",
      },
      {
        pledge_id: pledgeId, competencia: "2026-11", kind: "5d", due_date: "2026-11-05",
        status: "sent", sent_at: "2026-10-31T12:00:00Z",
        provider_idempotency_key: `task07:${pledgeId}:5d`,
        frozen_recipient: "private-recipient@example.test",
        frozen_sender: "private-sender@example.test",
        frozen_subject: "private subject", frozen_text: "private text",
        frozen_html: "<p>private html</p>", frozen_include_seal: false,
        updated_at: "2026-10-31T12:00:00Z",
      },
    ]);
  });

  afterAll(async () => {
    if (db) await db.$client.end();
    if (baseSql) {
      await baseSql.unsafe(`DROP SCHEMA IF EXISTS "${isolatedSchema}" CASCADE`);
      await baseSql.end();
    }
    vi.unstubAllEnvs();
  });

  it("returns the newest reminder metadata to Administrador without frozen payload", async () => {
    getSessionUser.mockResolvedValue({ id: adminId, email: `${adminId}@example.test` });
    const result = await getDonorPledges();
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    const donor = result.data?.[0] as DonorPledge | undefined;
    if (!donor || !donor.latest_reminder) throw new Error("Administrator projection missing");
    expect(donor.next_due_date).toMatch(/^\d{4}-\d{2}-05$/);
    expect(donor.latest_reminder).toMatchObject({
      kind: "5d", competencia: "2026-11", status: "sent", error_code: null,
    });
    expect(new Date(donor.latest_reminder.sent_at!).toISOString()).toBe("2026-10-31T12:00:00.000Z");
    const serialized = JSON.stringify(result.data);
    for (const secret of ["private-recipient", "private-sender", "private subject", "private text", "private html"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("keeps Secretaria on its limited projection without reminder or ledger fields", async () => {
    getSessionUser.mockResolvedValue({ id: secretariatId, email: `${secretariatId}@example.test` });
    const result = await getDonorPledges();
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    const donor = result.data![0];
    for (const field of ["latest_reminder", "latest_instructions", "current_receipt", "pending_occurrences", "next_due_date", "dia_vencimento", "receipt_path", "receipt_uploaded_at", "expected_value", "provider_message_id"]) {
      expect(donor).not.toHaveProperty(field);
    }
  });
});
