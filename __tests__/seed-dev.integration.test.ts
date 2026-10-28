// @vitest-environment node
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.DATABASE_URL_TEST;
const integration = describe.skipIf(!databaseUrl);
const seedIds = Array.from({ length: 7 }, (_, index) =>
  `11111111-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
);

integration("dev seed with PostgreSQL", () => {
  const sql = postgres(databaseUrl!, { max: 2 });
  const storageDir = mkdtempSync(join(tmpdir(), "ansp-seed-test-"));
  let ownsFixture = false;
  const unrelatedId = randomUUID();

  function runSeed(reset = false) {
    const output = execFileSync(process.execPath, ["--import", "tsx", "scripts/seed-dev.ts", ...(reset ? ["--reset"] : [])], {
      cwd: process.cwd(), encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test", DATABASE_URL: databaseUrl!, STORAGE_DIR: storageDir },
    });
    const line = output.trim().split("\n").at(-1)!;
    expect(line).toMatch(/^\[db:seed\] \{/);
    return JSON.parse(line.slice("[db:seed] ".length)) as { inserted: number; files: number; ledger: number; removed: number };
  }

  afterAll(async () => {
    if (ownsFixture) await sql`DELETE FROM donor_pledges WHERE id = ANY(${seedIds})`;
    await sql`DELETE FROM donor_pledges WHERE id = ${unrelatedId}`;
    await sql.end();
    rmSync(storageDir, { recursive: true, force: true });
  });

  it("inserts once, preserves edits, repairs missing receipts, and resets only seed rows", async () => {
    const existing = await sql`SELECT id FROM donor_pledges WHERE id = ANY(${seedIds})`;
    expect(existing).toHaveLength(0);
    ownsFixture = true;

    expect(runSeed()).toMatchObject({ inserted: 7, files: 2, removed: 0 });
    const monthly = await sql`SELECT dia_vencimento FROM donor_pledges
      WHERE id = ANY(${seedIds}) AND frequencia = 'mensal'`;
    expect(monthly).toHaveLength(5);
    expect(monthly.every((row) => [1, 10, 15, 20, 30].includes(row.dia_vencimento))).toBe(true);
    expect(await sql`SELECT id FROM donor_monthly_instruction_sends WHERE pledge_id = ANY(${seedIds})`).toHaveLength(0);
    const [receiptStates] = await sql`SELECT count(*) FILTER (WHERE receipt_path IS NOT NULL OR receipt_name IS NOT NULL OR receipt_uploaded_at IS NOT NULL)::int AS sent,
      count(*) FILTER (WHERE receipt_path IS NULL AND receipt_name IS NULL AND receipt_uploaded_at IS NULL)::int AS pending
      FROM donor_payment_ledger WHERE pledge_id = ANY(${seedIds})`;
    expect(receiptStates.sent).toBe(0);
    expect(receiptStates.pending).toBeGreaterThan(0);
    const [seedLedgerBefore] = await sql`SELECT count(*)::int AS count FROM donor_payment_ledger WHERE pledge_id = ANY(${seedIds})`;
    expect(runSeed()).toMatchObject({ inserted: 0, files: 0, removed: 0 });
    const [seedLedgerAfter] = await sql`SELECT count(*)::int AS count FROM donor_payment_ledger WHERE pledge_id = ANY(${seedIds})`;
    expect(seedLedgerAfter.count).toBe(seedLedgerBefore.count);
    await sql`UPDATE donor_pledges SET nome = 'Editado localmente', valor = 321 WHERE id = ${seedIds[0]}`;
    const repairedPath = join(storageDir, "donors", seedIds[4], "recibo", "comprovante-pix.pdf");
    rmSync(repairedPath);
    expect(runSeed()).toMatchObject({ inserted: 0, files: 1 });
    const [edited] = await sql`SELECT nome, valor::text AS valor FROM donor_pledges WHERE id = ${seedIds[0]}`;
    expect(edited).toEqual({ nome: "Editado localmente", valor: "321.00" });

    await sql`INSERT INTO donor_pledges (id, nome, cpf, email, frequencia, valor)
      VALUES (${unrelatedId}, 'Fora do seed', '000.000.000-00', ${`${unrelatedId}@example.test`}, 'unica', 1)`;
    const [oldLedger] = await sql`SELECT id, competencia, due_date::text AS due_date
      FROM donor_payment_ledger WHERE pledge_id = ${seedIds[0]} LIMIT 1`;
    await sql`INSERT INTO donor_reminder_sends
      (pledge_id, competencia, kind, due_date, status, provider_idempotency_key)
      VALUES (${seedIds[0]}, ${oldLedger.competencia}, '10d', ${oldLedger.due_date}, 'failed', ${`seed-test-${randomUUID()}`})`;

    expect(runSeed(true)).toMatchObject({ inserted: 7, files: 2, removed: 7 });
    expect(await sql`SELECT id FROM donor_monthly_instruction_sends WHERE pledge_id = ANY(${seedIds})`).toHaveLength(0);
    const [recreated] = await sql`SELECT nome FROM donor_pledges WHERE id = ${seedIds[0]}`;
    expect(recreated.nome).toBe("Maria Aparecida Souza");
    expect(await sql`SELECT id FROM donor_payment_ledger WHERE id = ${oldLedger.id}`).toHaveLength(0);
    expect(await sql`SELECT id FROM donor_reminder_sends WHERE pledge_id = ANY(${seedIds})`).toHaveLength(0);
    expect(await sql`SELECT id FROM donor_pledges WHERE id = ${unrelatedId}`).toHaveLength(1);
  }, 20_000);
});
