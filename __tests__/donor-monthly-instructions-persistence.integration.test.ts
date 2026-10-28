// @vitest-environment node
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/lib/db/schema";
import {
  DONOR_MONTHLY_INSTRUCTIONS_BODY,
  DONOR_MONTHLY_INSTRUCTIONS_SUBJECT,
  monthlyInstructionsProviderKey,
} from "@/lib/email/donor-monthly-instructions-template";

const databaseUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!databaseUrl)("monthly instructions persistence with PostgreSQL", () => {
  const sql = databaseUrl ? postgres(databaseUrl, { max: 1 }) : null;
  const pledgeId = randomUUID();
  const anotherPledgeId = randomUUID();

  afterAll(async () => {
    if (!sql) return;
    await sql`DELETE FROM donor_pledges WHERE id IN (${pledgeId}, ${anotherPledgeId})`;
    await sql`DELETE FROM donor_monthly_instruction_templates`;
    await sql.end();
  });

  function bootstrap() {
    execFileSync(process.execPath, ["--env-file-if-exists=.env", "--import", "tsx", "scripts/bootstrap.ts"], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: databaseUrl!, ADMIN_EMAIL: "", ADMIN_PASSWORD: "" },
      timeout: 30_000,
    });
  }

  it("bootstraps once and preserves an administrator-edited singleton", async () => {
    await sql!`DELETE FROM donor_monthly_instruction_templates`;
    bootstrap();
    const [initial] = await sql!`SELECT id, assunto, corpo FROM donor_monthly_instruction_templates`;
    expect(initial).toMatchObject({
      assunto: DONOR_MONTHLY_INSTRUCTIONS_SUBJECT,
      corpo: DONOR_MONTHLY_INSTRUCTIONS_BODY,
    });
    await expect(sql!`INSERT INTO donor_monthly_instruction_templates (assunto, corpo) VALUES ('Second', 'Second')`)
      .rejects.toMatchObject({ code: "23505" });

    const { saveDonorMonthlyInstructionsTemplate } = await import("@/lib/email/donor-monthly-instructions-template-store");
    const database = drizzle(sql!, { schema });
    await expect(saveDonorMonthlyInstructionsTemplate({ assunto: "Invalid", corpo: "Sem fatos" }, database))
      .rejects.toMatchObject({ field: "corpo" });
    expect((await sql!`SELECT assunto FROM donor_monthly_instruction_templates`)[0].assunto)
      .toBe(DONOR_MONTHLY_INSTRUCTIONS_SUBJECT);
    await saveDonorMonthlyInstructionsTemplate({
      assunto: " Assunto editado ",
      corpo: ` ${DONOR_MONTHLY_INSTRUCTIONS_BODY} `,
    }, database);
    bootstrap();
    const rows = await sql!`SELECT id, assunto, corpo FROM donor_monthly_instruction_templates`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: initial.id, assunto: "Assunto editado", corpo: DONOR_MONTHLY_INSTRUCTIONS_BODY });
  }, 20_000);

  it("does not backfill historical pledges and enforces send history keys and state", async () => {
    await sql!`INSERT INTO donor_pledges (id, nome, cpf, email, frequencia, dia_vencimento, valor)
      VALUES (${pledgeId}, 'Histórico', '000.000.000-00', ${`${pledgeId}@example.test`}, 'mensal', 30, 100)`;
    bootstrap();
    expect(await sql!`SELECT id FROM donor_monthly_instruction_sends WHERE pledge_id = ${pledgeId}`)
      .toHaveLength(0);

    const key = monthlyInstructionsProviderKey(pledgeId, 1);
    await sql!`INSERT INTO donor_monthly_instruction_sends
      (pledge_id, generation, receipt_competencia, provider_idempotency_key)
      VALUES (${pledgeId}, 1, '2027-02', ${key})`;
    const [pending] = await sql!`SELECT status, attempt_count, sent_at FROM donor_monthly_instruction_sends WHERE pledge_id = ${pledgeId}`;
    expect(pending).toMatchObject({ status: "pending", attempt_count: 0, sent_at: null });

    await expect(sql!`INSERT INTO donor_monthly_instruction_sends
      (pledge_id, generation, receipt_competencia, provider_idempotency_key)
      VALUES (${pledgeId}, 1, '2027-03', 'other-key')`).rejects.toMatchObject({ code: "23505" });
    await sql!`INSERT INTO donor_pledges (id, nome, cpf, email, frequencia, dia_vencimento, valor)
      VALUES (${anotherPledgeId}, 'Outro', '111.111.111-11', ${`${anotherPledgeId}@example.test`}, 'mensal', 15, 100)`;
    await expect(sql!`INSERT INTO donor_monthly_instruction_sends
      (pledge_id, generation, provider_idempotency_key)
      VALUES (${anotherPledgeId}, 1, ${key})`).rejects.toMatchObject({ code: "23505" });

    for (const generation of [0, -1]) {
      await expect(sql!`INSERT INTO donor_monthly_instruction_sends
        (pledge_id, generation, provider_idempotency_key)
        VALUES (${pledgeId}, ${generation}, ${`bad-${generation}`})`).rejects.toMatchObject({ code: "23514" });
    }
    await expect(sql!`UPDATE donor_monthly_instruction_sends SET status = 'sent' WHERE pledge_id = ${pledgeId}`)
      .rejects.toMatchObject({ code: "23514" });
    await expect(sql!`UPDATE donor_monthly_instruction_sends SET error_code = 'ana@example.test' WHERE pledge_id = ${pledgeId}`)
      .rejects.toMatchObject({ code: "23514" });
    await expect(sql!`UPDATE donor_monthly_instruction_sends SET frozen_subject = 'partial' WHERE pledge_id = ${pledgeId}`)
      .rejects.toMatchObject({ code: "23514" });
    await expect(sql!`UPDATE donor_monthly_instruction_sends SET provider_idempotency_key = 'changed' WHERE pledge_id = ${pledgeId}`)
      .rejects.toMatchObject({ code: "23514" });
    await expect(sql!`UPDATE donor_monthly_instruction_sends SET generation = 3 WHERE pledge_id = ${pledgeId}`)
      .rejects.toMatchObject({ code: "23514" });
    await expect(sql!`UPDATE donor_monthly_instruction_sends SET pledge_id = ${anotherPledgeId} WHERE pledge_id = ${pledgeId}`)
      .rejects.toMatchObject({ code: "23514" });
    await expect(sql!`UPDATE donor_monthly_instruction_sends SET receipt_competencia = '2027-03' WHERE pledge_id = ${pledgeId}`)
      .rejects.toMatchObject({ code: "23514" });
    await sql!`UPDATE donor_monthly_instruction_sends SET
      frozen_recipient = 'recipient@example.test', frozen_sender = 'sender@example.test',
      frozen_subject = 'Assunto', frozen_text = 'Texto', frozen_html = '<p>Texto</p>',
      frozen_include_seal = false WHERE pledge_id = ${pledgeId}`;
    await expect(sql!`UPDATE donor_monthly_instruction_sends SET frozen_text = 'changed' WHERE pledge_id = ${pledgeId}`)
      .rejects.toMatchObject({ code: "23514" });

    await sql!`INSERT INTO donor_monthly_instruction_sends
      (pledge_id, generation, receipt_competencia, provider_idempotency_key)
      VALUES (${pledgeId}, 2, '2027-03', ${monthlyInstructionsProviderKey(pledgeId, 2)})`;
    expect(await sql!`SELECT generation FROM donor_monthly_instruction_sends WHERE pledge_id = ${pledgeId} ORDER BY generation`)
      .toMatchObject([{ generation: 1 }, { generation: 2 }]);
  }, 20_000);
});
