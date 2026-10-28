// @vitest-environment node
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/lib/db/schema";
import {
  DONOR_REMINDER_BODY,
  DONOR_REMINDER_SUBJECT,
  LEGACY_DONOR_REMINDER_BODY,
  reminderProviderKey,
} from "@/lib/email/donor-reminder-template";

const databaseUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!databaseUrl)("donor reminder persistence with PostgreSQL", () => {
  const sql = databaseUrl ? postgres(databaseUrl, { max: 1 }) : null;
  const pledgeId = randomUUID();

  afterAll(async () => {
    if (!sql) return;
    await sql`DELETE FROM donor_reminder_sends WHERE pledge_id = ${pledgeId}`;
    await sql`DELETE FROM donor_pledges WHERE id = ${pledgeId}`;
    await sql`DELETE FROM donor_reminder_templates`;
    await sql.end();
  });

  function bootstrap() {
    execFileSync(process.execPath, ["--env-file-if-exists=.env", "--import", "tsx", "scripts/bootstrap.ts"], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: databaseUrl!, ADMIN_EMAIL: "", ADMIN_PASSWORD: "" },
      timeout: 30_000,
    });
  }

  it("bootstraps a default once and preserves an edited template on the next startup", async () => {
    await sql!`DELETE FROM donor_reminder_templates`;
    bootstrap();
    const [initial] = await sql!`SELECT id, assunto, corpo FROM donor_reminder_templates`;
    expect(initial).toMatchObject({ assunto: DONOR_REMINDER_SUBJECT, corpo: DONOR_REMINDER_BODY });
    expect(initial.corpo.match(/\{link_comprovante\}/g)).toHaveLength(1);

    const { saveDonorReminderTemplate } = await import("@/lib/email/donor-reminder-template-store");
    const database = drizzle(sql!, { schema });
    await expect(saveDonorReminderTemplate({ assunto: "Inválido\nBcc: x", corpo: "Sem link" }, database))
      .rejects.toMatchObject({ field: "assunto" });
    await expect(saveDonorReminderTemplate({ assunto: "Assunto", corpo: "Sem link" }, database))
      .rejects.toMatchObject({ field: "corpo" });
    expect((await sql!`SELECT assunto FROM donor_reminder_templates`)[0].assunto).toBe(DONOR_REMINDER_SUBJECT);
    await saveDonorReminderTemplate({ assunto: " Assunto editado ", corpo: " Link: {link_comprovante} " }, database);
    bootstrap();
    const rows = await sql!`SELECT id, assunto, corpo FROM donor_reminder_templates`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: initial.id, assunto: "Assunto editado", corpo: "Link: {link_comprovante}" });
  }, 20_000);

  it("migrates legacy optional copy while retaining other custom edits", async () => {
    const database = drizzle(sql!, { schema });
    const { getDonorReminderTemplate } = await import("@/lib/email/donor-reminder-template-store");
    await sql!`UPDATE donor_reminder_templates SET corpo = ${LEGACY_DONOR_REMINDER_BODY}`;
    expect((await getDonorReminderTemplate(database)).corpo).toBe(DONOR_REMINDER_BODY);
    expect((await sql!`SELECT corpo FROM donor_reminder_templates`)[0].corpo).toBe(DONOR_REMINDER_BODY);

    const custom = "Nota própria. O comprovante é opcional. Outra nota: {link_comprovante}";
    await sql!`UPDATE donor_reminder_templates SET corpo = ${custom}`;
    expect((await getDonorReminderTemplate(database)).corpo)
      .toBe("Nota própria. Outra nota: {link_comprovante}");
    expect((await sql!`SELECT corpo FROM donor_reminder_templates`)[0].corpo)
      .toBe("Nota própria. Outra nota: {link_comprovante}");
  });

  it("allows one 10d row per pledge and competence while 5d remains distinct", async () => {
    await sql!`INSERT INTO donor_pledges (id, nome, cpf, email, frequencia, dia_vencimento, valor)
      VALUES (${pledgeId}, 'Teste', '000.000.000-00', ${`${pledgeId}@example.test`}, 'mensal', 15, 100)`;
    const key10 = reminderProviderKey(pledgeId, "2026-11", "10d");
    const key5 = reminderProviderKey(pledgeId, "2026-11", "5d");
    await sql!`INSERT INTO donor_reminder_sends
      (pledge_id, competencia, kind, due_date, status, provider_idempotency_key)
      VALUES (${pledgeId}, '2026-11', '10d', '2026-11-15', 'failed', ${key10})`;
    await expect(sql!`INSERT INTO donor_reminder_sends
      (pledge_id, competencia, kind, due_date, status, provider_idempotency_key)
      VALUES (${pledgeId}, '2026-11', '10d', '2026-11-15', 'failed', 'different-key')`)
      .rejects.toMatchObject({ code: "23505" });
    await sql!`INSERT INTO donor_reminder_sends
      (pledge_id, competencia, kind, due_date, status, provider_idempotency_key)
      VALUES (${pledgeId}, '2026-11', '5d', '2026-11-15', 'failed', ${key5})`;
    const rows = await sql!`SELECT kind FROM donor_reminder_sends WHERE pledge_id = ${pledgeId} ORDER BY kind`;
    expect(rows.map((row) => row.kind)).toEqual(["10d", "5d"]);

    await expect(sql!`UPDATE donor_reminder_sends SET error_code = 'ana@example.test' WHERE pledge_id = ${pledgeId}`)
      .rejects.toMatchObject({ code: "23514" });
    await expect(sql!`UPDATE donor_reminder_sends SET frozen_subject = 'partial' WHERE pledge_id = ${pledgeId} AND kind = '10d'`)
      .rejects.toMatchObject({ code: "23514" });
    await sql!`UPDATE donor_reminder_sends SET
      frozen_recipient = 'recipient@example.test', frozen_sender = 'sender@example.test',
      frozen_subject = 'Assunto', frozen_text = 'Texto', frozen_html = '<p>Texto</p>',
      frozen_include_seal = false WHERE pledge_id = ${pledgeId} AND kind = '10d'`;
    await expect(sql!`UPDATE donor_reminder_sends SET frozen_text = 'changed' WHERE pledge_id = ${pledgeId} AND kind = '10d'`)
      .rejects.toMatchObject({ code: "23514" });
    await expect(sql!`UPDATE donor_reminder_sends SET provider_idempotency_key = 'changed' WHERE pledge_id = ${pledgeId} AND kind = '10d'`)
      .rejects.toMatchObject({ code: "23514" });
  });
});
