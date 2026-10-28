// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

const { getSessionUser } = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSessionUser }));

const databaseUrl = process.env.DATABASE_URL_TEST;
const integration = describe.skipIf(!databaseUrl);
let db: typeof import("@/lib/db").db;
let adminUsers: typeof import("@/lib/db/schema").adminUsers;
let donorPledges: typeof import("@/lib/db/schema").donorPledges;
let updateDonorDueDay: typeof import("@/app/admin/_actions/admin-actions").updateDonorDueDay;
const adminId = randomUUID();
const secretariatId = randomUUID();
const donorIds: string[] = [];

integration("updateDonorDueDay with PostgreSQL and real authorization", () => {
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    vi.stubEnv("AUTH_BYPASS", "false");
    ({ db } = await import("@/lib/db"));
    ({ adminUsers, donorPledges } = await import("@/lib/db/schema"));
    ({ updateDonorDueDay } = await import("@/app/admin/_actions/admin-actions"));
    await db.insert(adminUsers).values([
      { id: adminId, email: `${adminId}@example.test`, password_hash: "test", role: "admin" },
      { id: secretariatId, email: `${secretariatId}@example.test`, password_hash: "test", role: "secretaria" },
    ]);
  });

  afterAll(async () => {
    if (db) {
      if (donorIds.length) await db.delete(donorPledges).where(inArray(donorPledges.id, donorIds));
      await db.delete(adminUsers).where(inArray(adminUsers.id, [adminId, secretariatId]));
      await db.$client.end();
    }
    vi.unstubAllEnvs();
  });

  async function createDonor(frequencia: "mensal" | "unica") {
    const id = randomUUID();
    donorIds.push(id);
    await db.insert(donorPledges).values({
      id,
      nome: "Cadastro sintético de teste",
      cpf: "000.000.000-00",
      email: `${id}@example.test`,
      frequencia,
      duracao: frequencia === "mensal" ? "indeterminado" : null,
      dia_vencimento: frequencia === "mensal" ? 5 : null,
      data_pagamento: frequencia === "unica" ? "2026-10-25" : null,
      valor: 1,
      created_at: "2026-10-26T12:00:00Z",
    });
    return id;
  }

  it("denies Secretaria directly, then persists an administrator's monthly edit", async () => {
    const id = await createDonor("mensal");
    getSessionUser.mockResolvedValue({ id: secretariatId, email: `${secretariatId}@example.test` });
    await expect(updateDonorDueDay(id, 12)).rejects.toThrow("permissão");
    expect((await db.query.donorPledges.findFirst({ where: eq(donorPledges.id, id) }))?.dia_vencimento).toBe(5);

    getSessionUser.mockResolvedValue({ id: adminId, email: `${adminId}@example.test` });
    expect(await updateDonorDueDay(id, 31)).toMatchObject({ success: true, dia_vencimento: 31 });
    expect((await db.query.donorPledges.findFirst({ where: eq(donorPledges.id, id) }))?.dia_vencimento).toBe(31);
    for (const day of [0, 32, 1.5]) {
      expect(await updateDonorDueDay(id, day)).toMatchObject({ success: false });
    }
    expect((await db.query.donorPledges.findFirst({ where: eq(donorPledges.id, id) }))?.dia_vencimento).toBe(31);
  });

  it("rejects a one-time edit and preserves its payment date", async () => {
    const id = await createDonor("unica");
    getSessionUser.mockResolvedValue({ id: adminId, email: `${adminId}@example.test` });
    expect(await updateDonorDueDay(id, 12)).toMatchObject({ success: false });
    expect(await db.query.donorPledges.findFirst({ where: eq(donorPledges.id, id) })).toMatchObject({
      dia_vencimento: null,
      data_pagamento: "2026-10-25",
    });
  });
});
