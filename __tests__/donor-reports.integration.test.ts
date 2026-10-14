// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const databaseUrl = process.env.DATABASE_URL_TEST;
const integration = describe.skipIf(!databaseUrl);
let db: typeof import("@/lib/db").db;
let donorPledges: typeof import("@/lib/db/schema").donorPledges;
let getDonorReports: typeof import("@/app/admin/_actions/donor-report-actions").getDonorReports;
const donorIds: string[] = [];

integration("getDonorReports with PostgreSQL", () => {
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    vi.doMock("@/lib/auth/authorization", () => ({ requireAdmin: vi.fn().mockResolvedValue({ id: "admin", role: "admin" }) }));
    ({ db } = await import("@/lib/db"));
    ({ donorPledges } = await import("@/lib/db/schema"));
    ({ getDonorReports } = await import("@/app/admin/_actions/donor-report-actions"));
  });

  afterAll(async () => {
    if (db && donorPledges && donorIds.length) {
      await db.delete(donorPledges).where((await import("drizzle-orm")).inArray(donorPledges.id, donorIds));
      await db.$client.end();
    }
    vi.doUnmock("@/lib/auth/authorization");
    vi.unstubAllEnvs();
  });

  async function createDonor(input: { createdAt: string; frequency: "mensal" | "unica"; state: "SP" | null; chapel: string | null }) {
    const id = randomUUID();
    donorIds.push(id);
    await db.insert(donorPledges).values({
      id, nome: "Cadastro sintético de teste", cpf: "000.000.000-00", email: `${id}@example.test`,
      frequencia: input.frequency, valor: 1, meio_pagamento: null,
      residence_state: input.state, priorado_capela: input.chapel, created_at: input.createdAt,
    });
  }

  it("reconciles both series to registrations, including unknown residence and none chapel", async () => {
    await createDonor({ createdAt: "2026-01-31T23:59:59.000Z", frequency: "mensal", state: "SP", chapel: "nenhuma" });
    await createDonor({ createdAt: "2026-02-01T00:00:00.000Z", frequency: "mensal", state: null, chapel: null });
    await createDonor({ createdAt: "2026-02-01T12:00:00.000Z", frequency: "unica", state: "SP", chapel: "sp-sao-paulo-padre-anchieta" });

    const all = await getDonorReports();
    expect(all.total).toBeGreaterThanOrEqual(3);
    expect(all.residenceByState.reduce((sum, row) => sum + row.count, 0)).toBe(all.total);
    expect(all.prioryOrChapel.reduce((sum, row) => sum + row.count, 0)).toBe(all.total);
    expect(all.residenceByState.find((row) => row.key === "__unknown__")?.count).toBeGreaterThanOrEqual(1);
    expect(all.prioryOrChapel.find((row) => row.key === "nenhuma")?.count).toBeGreaterThanOrEqual(1);
    expect(all.prioryOrChapel.find((row) => row.key === "__unreported__")?.count).toBeGreaterThanOrEqual(1);

    const filtered = await getDonorReports({ from: "2026-02-01", to: "2026-02-01", frequency: "mensal" });
    expect(filtered.total).toBe(1);
    expect(filtered.residenceByState.reduce((sum, row) => sum + row.count, 0)).toBe(1);
    expect(filtered.prioryOrChapel.reduce((sum, row) => sum + row.count, 0)).toBe(1);
    expect(filtered.residenceByState.find((row) => row.key === "__unknown__")?.count).toBe(1);
  });
});
