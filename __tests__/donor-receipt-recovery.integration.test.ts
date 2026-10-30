// @vitest-environment node
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, describe, expect, it, vi } from "vitest";
const { getSessionUser } = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSessionUser }));
const databaseUrl = process.env.DATABASE_URL_TEST;
describe.skipIf(!databaseUrl)("receipt recovery audit in PostgreSQL", () => {
  const sql = databaseUrl ? postgres(databaseUrl) : null;
  const adminId = randomUUID();
  const pledgeId = randomUUID();
  afterAll(async () => { if (sql) { await sql`DELETE FROM donor_pledges WHERE id=${pledgeId}`; await sql`DELETE FROM admin_users WHERE id=${adminId}`; await sql.end(); } });
  it("records the administrator and timestamp and signs the selected occurrence for 14 days", async () => {
    process.env.APP_HOST = "example.test";
    process.env.SESSION_SECRET = "test-secret-at-least-thirty-two-characters-long";
    await sql!`INSERT INTO admin_users (id,email,password_hash,role) VALUES (${adminId},${`${adminId}@example.test`},'test','admin')`;
    await sql!`INSERT INTO donor_pledges (id,nome,cpf,email,frequencia,duracao,dia_vencimento,valor,created_at) VALUES (${pledgeId},'Teste','000.000.000-00',${`${pledgeId}@example.test`},'mensal','indeterminado',1,100,'2026-10-01')`;
    await sql!`INSERT INTO donor_payment_ledger (pledge_id,competencia,due_date,expected_value) VALUES (${pledgeId},'2026-10','2026-10-01',100)`;
    getSessionUser.mockResolvedValue({ id: adminId, email: `${adminId}@example.test` });
    const { issueDonorReceiptRecoveryLink } = await import("@/app/admin/_actions/donor-receipt-actions");
    const { verifyDonorReceiptTicket } = await import("@/lib/donor-receipts/tickets");
    const result = await issueDonorReceiptRecoveryLink(pledgeId, "2026-10");
    expect(result.status).toBe("issued");
    if (result.status !== "issued") return;
    const [saved] = await sql!`SELECT receipt_link_generated_by,receipt_link_generated_at FROM donor_payment_ledger WHERE pledge_id=${pledgeId} AND competencia='2026-10'`;
    expect(saved.receipt_link_generated_by).toBe(adminId);
    expect(saved.receipt_link_generated_at).toBeInstanceOf(Date);
    const payload = verifyDonorReceiptTicket(new URL(result.link).searchParams.get("ticket"));
    expect(payload).toMatchObject({ pledge_id: pledgeId, competencia: "2026-10" });
    expect(payload!.exp).toBe(Math.floor(new Date(result.expiresAt).getTime() / 1000));
  });
});
