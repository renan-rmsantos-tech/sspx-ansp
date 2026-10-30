// @vitest-environment node
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, describe, expect, it, vi } from "vitest";

const { getSessionUser, remove } = vi.hoisted(() => ({ getSessionUser: vi.fn(), remove: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/auth/session", () => ({ getSessionUser }));
vi.mock("@/lib/storage", () => ({ getStorage: () => ({ remove }) }));

const databaseUrl = process.env.DATABASE_URL_TEST;
describe.skipIf(!databaseUrl)("bank conference with PostgreSQL", () => {
  const sql = databaseUrl ? postgres(databaseUrl) : null;
  const adminId = randomUUID();
  const secretariaId = randomUUID();
  const pledgeId = randomUUID();
  const monthlyId = randomUUID();
  const email = (id: string) => `${id}@example.test`;

  afterAll(async () => {
    if (!sql) return;
    await sql`DELETE FROM donor_pledges WHERE id = ${pledgeId}`;
    await sql`DELETE FROM donor_pledges WHERE id = ${monthlyId}`;
    await sql`DELETE FROM admin_users WHERE id IN (${adminId}, ${secretariaId})`;
    await sql.end();
  });

  it("protects confirmed donors and removes unconfirmed monthly receipts", async () => {
    const { deleteDonorPledge } = await import("@/app/admin/_actions/admin-actions");
    const { confirmDonorPayment, getDonorPaymentConference } = await import("@/app/admin/_actions/donor-payment-conference-actions");
    getSessionUser.mockResolvedValue({ id: adminId, email: email(adminId) });
    await sql!`INSERT INTO admin_users (id,email,password_hash,role) VALUES
      (${adminId},${email(adminId)},'test','admin') ON CONFLICT DO NOTHING`;
    await sql!`INSERT INTO donor_pledges (id,nome,cpf,email,frequencia,duracao,dia_vencimento,valor,created_at)
      VALUES (${monthlyId},'Mensal','000.000.000-00',${email(monthlyId)},'mensal','indeterminado',1,100,'2026-07-01')`;
    const [missing] = await sql!`INSERT INTO donor_payment_ledger (pledge_id,competencia,due_date,expected_value)
      VALUES (${monthlyId},'2026-08','2026-08-01',100) RETURNING id`;
    await sql!`INSERT INTO donor_payment_ledger (pledge_id,competencia,due_date,expected_value,receipt_path,receipt_name,receipt_uploaded_at)
      VALUES (${monthlyId},'2026-09','2026-09-01',100,'donors/test/monthly.pdf','monthly.pdf',now())`;
    await sql!`INSERT INTO donor_payment_ledger (pledge_id,competencia,due_date,expected_value)
      VALUES (${monthlyId},'2026-10','2026-10-01',100)`;
    const conference = await getDonorPaymentConference("2026-08", new Date("2026-10-29T12:00:00Z"));
    expect(conference.overdue.find(row => row.id === missing.id)?.missing_monthly_receipt).toBe(true);
    expect(conference.overdue.find(row => row.competencia === "2026-09")?.missing_monthly_receipt).toBe(false);
    expect(conference.overdue.some(row => row.competencia === "2026-10" && row.pledge_id === monthlyId)).toBe(false);
    await confirmDonorPayment(missing.id, "100", "2026-08-02");
    expect((await deleteDonorPledge(monthlyId)).success).toBe(false);
    expect((await sql!`SELECT id FROM donor_pledges WHERE id=${monthlyId}`)).toHaveLength(1);
    await sql!`UPDATE donor_payment_ledger SET status='pendente',received_value=0,credit_date=NULL,confirmed_by=NULL,confirmed_at=NULL WHERE id=${missing.id}`;
    expect((await deleteDonorPledge(monthlyId)).success).toBe(true);
    expect((await sql!`SELECT id FROM donor_payment_ledger WHERE pledge_id=${monthlyId}`)).toHaveLength(0);
    expect(remove).toHaveBeenCalledWith("donors/test/monthly.pdf");
  });

  it("denies Secretaria reads and writes, then reconciles exact balances as admin", async () => {
    const { GET } = await import("@/app/admin/pagamentos/export/route");
    const { NextRequest } = await import("next/server");
    const exportRequest = (month: string) => new NextRequest(`http://localhost/admin/pagamentos/export?month=${month}`);
    const { confirmDonorPayment, getDonorPaymentConference, resetDonorPayment } = await import("@/app/admin/_actions/donor-payment-conference-actions");
    await sql!`INSERT INTO admin_users (id,email,password_hash,role) VALUES
      (${adminId},${email(adminId)},'test','admin'),
      (${secretariaId},${email(secretariaId)},'test','secretaria') ON CONFLICT DO NOTHING`;
    await sql!`INSERT INTO donor_pledges (id,nome,cpf,email,frequencia,valor,data_pagamento,recibo_path,recibo_nome)
      VALUES (${pledgeId},'Teste','000.000.000-00',${email(pledgeId)},'unica',100,'2026-08-01','donors/test/once.pdf','once.pdf')`;
    const [payment] = await sql!`INSERT INTO donor_payment_ledger (pledge_id,competencia,due_date,expected_value)
      VALUES (${pledgeId},'2026-08','2026-08-01',100) RETURNING id`;
    getSessionUser.mockResolvedValue({ id: secretariaId, email: email(secretariaId) });
    await expect(getDonorPaymentConference("2026-08")).rejects.toThrow();
    await expect(GET(exportRequest("2026-08"))).rejects.toThrow();
    await expect(confirmDonorPayment(payment.id, "80", "2026-08-02")).rejects.toThrow();
    await expect(resetDonorPayment(payment.id)).rejects.toThrow();
    expect((await sql!`SELECT status FROM donor_payment_ledger WHERE id=${payment.id}`)[0].status).toBe("pendente");

    getSessionUser.mockResolvedValue({ id: adminId, email: email(adminId) });
    expect(await confirmDonorPayment(payment.id, "80", "2026-08-02")).toEqual({ status: "divergente" });
    const result = await getDonorPaymentConference("2026-08", new Date("2026-10-29T12:00:00Z"));
    const exportResponse = await GET(exportRequest("2026-08"));
    const exportText = await exportResponse.text();
    expect(exportText).toContain('"100.00","80.00","20.00"');
    expect(exportText).not.toContain("2026-09");
    expect(exportResponse.headers.get("Cache-Control")).toBe("private, no-store");
    expect(result.totals).toEqual({ expected: "100.00", received: "80.00", outstanding: "20.00" });
    expect(result.series.every(point => point.month >= (result.coverage_start ?? "0000-00"))).toBe(true);
    expect(result.overdue.some(row => row.id === payment.id)).toBe(true);
    const [saved] = await sql!`SELECT confirmed_by, confirmed_at FROM donor_payment_ledger WHERE id=${payment.id}`;
    expect(saved.confirmed_by).toBe(adminId);
    expect(saved.confirmed_at).not.toBeNull();
    await resetDonorPayment(payment.id);
    const [reset] = await sql!`SELECT status, credit_date, confirmed_by FROM donor_payment_ledger WHERE id=${payment.id}`;
    expect(reset).toMatchObject({ status: "pendente", credit_date: null, confirmed_by: null });
  });
});
