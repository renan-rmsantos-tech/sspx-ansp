// @vitest-environment node
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { afterAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";

const { sendDonorWelcomeEmail, getSessionUser } = vi.hoisted(() => ({
  sendDonorWelcomeEmail: vi.fn(), getSessionUser: vi.fn(),
}));
vi.mock("@/lib/email/send-donor-welcome", () => ({ sendDonorWelcomeEmail }));
vi.mock("@/lib/auth/session", () => ({ getSessionUser }));

const databaseUrl = process.env.DATABASE_URL_TEST;
const integration = describe.skipIf(!databaseUrl);

integration("monthly payment ledger with PostgreSQL", () => {
  const sql = databaseUrl ? postgres(databaseUrl, { max: 5 }) : null;
  const database = sql ? drizzle(sql, { schema }) : null;
  const pledgeIds: string[] = [];
  const adminId = randomUUID();

  afterAll(async () => {
    if (!sql) return;
    if (pledgeIds.length) await sql`DELETE FROM donor_pledges WHERE id = ANY(${pledgeIds})`;
    await sql`DELETE FROM admin_users WHERE id = ${adminId}`;
    await sql.end();
  });

  it("backfills only eligible launch-month rows, never older inferred balances", async () => {
    const isolated = `task15_${randomUUID().replaceAll("-", "")}`;
    try {
      await sql!.unsafe(`CREATE SCHEMA "${isolated}"`);
      await sql!.unsafe(`CREATE TABLE "${isolated}"."donor_pledges" (
        id uuid PRIMARY KEY, created_at timestamptz NOT NULL, frequencia text NOT NULL,
        duracao text, dia_vencimento integer, valor numeric(12,2) NOT NULL
      )`);
      await sql!.unsafe(`INSERT INTO "${isolated}"."donor_pledges"
        (id, created_at, frequencia, duracao, dia_vencimento, valor) VALUES
        ('${randomUUID()}', now() - interval '18 months', 'mensal', 'indeterminado', 15, 80),
        ('${randomUUID()}', now() - interval '18 months', 'mensal', 'um_ano', 15, 80),
        ('${randomUUID()}', now(), 'unica', NULL, NULL, 80)`);

      const migration = readFileSync(new URL("../drizzle/0011_donor_payment_ledger.sql", import.meta.url), "utf8")
        .replaceAll('"public"."donor_pledges"', `"${isolated}"."donor_pledges"`);
      await sql!.begin(async (tx) => {
        await tx.unsafe(`SET LOCAL search_path TO "${isolated}"`);
        for (const statement of migration.split("--> statement-breakpoint")) {
          if (statement.trim()) await tx.unsafe(statement);
        }
      });

      const [settings] = await sql!.unsafe(`SELECT launch_competencia FROM "${isolated}".donor_ledger_settings`);
      const rows = await sql!.unsafe(`SELECT competencia, expected_value::text AS expected_value
        FROM "${isolated}".donor_payment_ledger`);
      expect(rows).toEqual([{ competencia: settings.launch_competencia, expected_value: "80.00" }]);
      expect(rows.every((row) => row.competencia >= settings.launch_competencia)).toBe(true);
      await expect(sql!.unsafe(`INSERT INTO "${isolated}".donor_payment_ledger
        (pledge_id, competencia, due_date, expected_value)
        SELECT id, '${settings.launch_competencia}', '${settings.launch_competencia}-15', 80
        FROM "${isolated}".donor_pledges WHERE duracao = 'indeterminado'`))
        .rejects.toMatchObject({ code: "23505" });
    } finally {
      await sql!.unsafe(`DROP SCHEMA IF EXISTS "${isolated}" CASCADE`);
    }
  });

  it("keeps one original value snapshot under concurrent materializers and ignores one-time pledges", async () => {
    const { materializeMonthlyPaymentsForMonth } = await import("@/lib/donor-payment-ledger");
    const [settings] = await sql!`SELECT launch_competencia FROM donor_ledger_settings`;
    const month = settings.launch_competencia as string;
    const monthlyId = randomUUID();
    const oneTimeId = randomUUID();
    pledgeIds.push(monthlyId, oneTimeId);
    await sql!`INSERT INTO donor_pledges
      (id, nome, cpf, email, frequencia, duracao, dia_vencimento, valor, created_at)
      VALUES (${monthlyId}, 'Teste mensal', '000.000.000-00', ${`${monthlyId}@example.test`},
        'mensal', 'indeterminado', 28, 80, now() - interval '45 days'),
        (${oneTimeId}, 'Teste único', '000.000.000-00', ${`${oneTimeId}@example.test`},
        'unica', NULL, NULL, 80, now() - interval '45 days')`;

    await Promise.all([
      materializeMonthlyPaymentsForMonth(month, database!),
      materializeMonthlyPaymentsForMonth(month, database!),
    ]);
    const beforeEdit = await sql!`SELECT pledge_id, competencia, expected_value::text AS expected_value
      FROM donor_payment_ledger WHERE pledge_id IN (${monthlyId}, ${oneTimeId})`;
    expect(beforeEdit).toEqual([{ pledge_id: monthlyId, competencia: month, expected_value: "80.00" }]);
    await sql!`UPDATE donor_pledges SET valor = 99 WHERE id = ${monthlyId}`;
    await materializeMonthlyPaymentsForMonth(month, database!);
    const rows = await sql!`SELECT pledge_id, competencia, expected_value::text AS expected_value
      FROM donor_payment_ledger WHERE pledge_id IN (${monthlyId}, ${oneTimeId})`;
    expect(rows).toEqual(beforeEdit);
  });

  it("rolls back a new monthly pledge when its initial occurrence cannot be inserted", async () => {
    const { registerDonorPledge } = await import("@/app/benfeitor/_actions/donor-actions");
    const email = `${randomUUID()}@example.test`;
    sendDonorWelcomeEmail.mockResolvedValue({ status: "sent" });
    await sql!`ALTER TABLE donor_payment_ledger
      ADD CONSTRAINT task15_reject_test_value CHECK (expected_value <> 123456.78)`;
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await registerDonorPledge({
        nome: "Teste transação", cpf: "529.982.247-25", email,
        telefone: "11999999999", endereco: "Rua A, 1", cep: "13250000",
        residence_city: "Campinas", residence_state: "SP", residence_confirmed: true,
        priorado_capela: "nenhuma", frequencia: "mensal", duracao: "um_ano",
        dia_vencimento: 30, valor: 123456.78,
      });
      expect(result.success).toBe(false);
      expect(await sql!`SELECT id FROM donor_pledges WHERE email = ${email}`).toHaveLength(0);
      expect(sendDonorWelcomeEmail).not.toHaveBeenCalled();
    } finally {
      errorLog.mockRestore();
      await sql!`ALTER TABLE donor_payment_ledger DROP CONSTRAINT task15_reject_test_value`;
    }
  });

  it("commits a new monthly pledge with its first eligible occurrence", async () => {
    const { registerDonorPledge } = await import("@/app/benfeitor/_actions/donor-actions");
    const { firstMonthlyOccurrence } = await import("@/lib/donor-payment-ledger");
    const email = `${randomUUID()}@example.test`;
    sendDonorWelcomeEmail.mockResolvedValue({ status: "sent" });
    expect(await registerDonorPledge({
      nome: "Teste primeira parcela", cpf: "529.982.247-25", email,
      telefone: "11999999999", endereco: "Rua A, 1", cep: "13250000",
      residence_city: "Campinas", residence_state: "SP", residence_confirmed: true,
      priorado_capela: "nenhuma", frequencia: "mensal", duracao: "um_ano",
      dia_vencimento: 20, valor: 87,
    })).toEqual({ success: true });
    const [pledge] = await sql!`SELECT id, created_at, frequencia, duracao, dia_vencimento
      FROM donor_pledges WHERE email = ${email}`;
    expect(pledge.dia_vencimento).toBe(20);
    pledgeIds.push(pledge.id);
    const [row] = await sql!`SELECT competencia, due_date::text AS due_date,
      expected_value::text AS expected_value FROM donor_payment_ledger WHERE pledge_id = ${pledge.id}`;
    const first = firstMonthlyOccurrence(pledge as Parameters<typeof firstMonthlyOccurrence>[0]);
    expect(row).toMatchObject({
      competencia: first?.competence,
      due_date: first?.dueDate,
      expected_value: "87.00",
    });
  });

  it("edits only future open due snapshots and retains past or receipted rows", async () => {
    const { updateDonorDueDay } = await import("@/app/admin/_actions/admin-actions");
    const id = randomUUID();
    pledgeIds.push(id);
    const year = new Date().getUTCFullYear();
    const past = `${year - 2}-01`;
    const evidence = `${year + 2}-02`;
    const open = `${year + 2}-04`;
    await sql!`INSERT INTO admin_users (id, email, password_hash, role)
      VALUES (${adminId}, ${`${adminId}@example.test`}, 'test', 'admin')`;
    getSessionUser.mockResolvedValue({ id: adminId, email: `${adminId}@example.test` });
    await sql!`INSERT INTO donor_pledges
      (id, nome, cpf, email, frequencia, duracao, dia_vencimento, valor, created_at)
      VALUES (${id}, 'Teste dia', '000.000.000-00', ${`${id}@example.test`},
        'mensal', 'indeterminado', 5, 80, now() - interval '4 years')`;
    await sql!`INSERT INTO donor_payment_ledger
      (pledge_id, competencia, due_date, expected_value, receipt_path, receipt_name, receipt_uploaded_at)
      VALUES
        (${id}, ${past}, ${`${past}-05`}, 80, NULL, NULL, NULL),
        (${id}, ${evidence}, ${`${evidence}-05`}, 80, 'donors/test/proof.pdf', 'proof.pdf', now()),
        (${id}, ${open}, ${`${open}-05`}, 80, NULL, NULL, NULL)`;

    expect(await updateDonorDueDay(id, 31)).toMatchObject({ success: true, dia_vencimento: 31 });
    const rows = await sql!`SELECT competencia, due_date::text AS due_date
      FROM donor_payment_ledger WHERE pledge_id = ${id} ORDER BY competencia`;
    expect(rows).toMatchObject([
      { competencia: past, due_date: `${past}-05` },
      { competencia: evidence, due_date: `${evidence}-05` },
      { competencia: open, due_date: `${open}-30` },
    ]);
  });

  it("does not leave a stale due snapshot when materialization races with a day edit", async () => {
    const { materializeMonthlyPaymentsForMonth, nextMonth } = await import("@/lib/donor-payment-ledger");
    const { updateDonorDueDay } = await import("@/app/admin/_actions/admin-actions");
    const [settings] = await sql!`SELECT launch_competencia FROM donor_ledger_settings`;
    const month = nextMonth(settings.launch_competencia as string);
    const id = randomUUID();
    pledgeIds.push(id);
    await sql!`INSERT INTO admin_users (id, email, password_hash, role)
      VALUES (${adminId}, ${`${adminId}@example.test`}, 'test', 'admin') ON CONFLICT DO NOTHING`;
    getSessionUser.mockResolvedValue({ id: adminId, email: `${adminId}@example.test` });
    await sql!`INSERT INTO donor_pledges
      (id, nome, cpf, email, frequencia, duracao, dia_vencimento, valor, created_at)
      VALUES (${id}, 'Teste concorrência', '000.000.000-00', ${`${id}@example.test`},
        'mensal', 'indeterminado', 5, 80, now() - interval '45 days')`;

    const [, edit] = await Promise.all([
      materializeMonthlyPaymentsForMonth(month, database!),
      updateDonorDueDay(id, 12),
    ]);
    expect(edit).toMatchObject({ success: true });
    const rows = await sql!`SELECT due_date::text AS due_date FROM donor_payment_ledger
      WHERE pledge_id = ${id} AND competencia = ${month}`;
    expect(rows).toEqual([{ due_date: `${month}-12` }]);
  });
});
