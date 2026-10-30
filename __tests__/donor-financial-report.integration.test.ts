// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

const databaseUrl = process.env.DATABASE_URL_TEST;
const integration = describe.skipIf(!databaseUrl);
let db: typeof import("@/lib/db").db;
let schema: typeof import("@/lib/db/schema");
let report: typeof import("@/app/admin/_actions/donor-financial-report-actions").getDonorFinancialReport;
const ids: string[] = [];

integration("financial report PostgreSQL query", () => {
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    vi.doMock("@/lib/auth/authorization", () => ({ requireAdmin: vi.fn().mockResolvedValue({ id: "admin", role: "admin" }) }));
    ({ db } = await import("@/lib/db"));
    schema = await import("@/lib/db/schema");
    ({ getDonorFinancialReport: report } = await import("@/app/admin/_actions/donor-financial-report-actions"));
  });
  afterAll(async () => {
    if (db && schema) {
      for (const id of ids) await db.delete(schema.donorPledges).where(eq(schema.donorPledges.id, id));
      await db.$client.end();
    }
    vi.doUnmock("@/lib/auth/authorization"); vi.unstubAllEnvs();
  });
  it("reconciles confirmed, open, divergent and unidentified rows without double counting", async () => {
    const admin = await db.query.adminUsers.findFirst();
    expect(admin).toBeDefined();
    const states = ["confirmado", "pendente", "divergente", "nao_identificado"] as const;
    for (const [index, status] of states.entries()) {
      const id = randomUUID(); ids.push(id);
      await db.insert(schema.donorPledges).values({ id, nome: `Financial test ${index}`, cpf: "000.000.000-00", email: `${id}@example.test`, frequencia: index === 3 ? "unica" : "mensal", valor: 10.01, dia_vencimento: index === 3 ? null : 1 });
      await db.insert(schema.donorPaymentLedger).values({ pledge_id: id, competencia: "2026-01", due_date: "2026-01-01", expected_value: 10.01, received_value: status === "confirmado" ? 10.01 : status === "divergente" ? 5 : 0, status, credit_date: status === "confirmado" || status === "divergente" ? "2026-01-02" : null, confirmed_by: status === "pendente" ? null : admin!.id, confirmed_at: status === "pendente" ? null : "2026-01-02T00:00:00Z" });
    }
    const result = await report({ from: "2026-01", to: "2026-02" });
    expect(result.summary).toEqual({ previsto: 4004, recebido: 1501, emAberto: 2503, naoIdentificadoDivergente: 500 });
    expect(result.months[1].previsto).toBe(0);
    expect(result.donors).toHaveLength(4);
    expect(result.donors.reduce((sum, row) => sum + row.parcelasEmAtraso, 0)).toBe(3);
    const monthly = await report({ from: "2026-01", to: "2026-01", frequency: "mensal" });
    expect(monthly.summary.previsto).toBe(3003);
  });
});
