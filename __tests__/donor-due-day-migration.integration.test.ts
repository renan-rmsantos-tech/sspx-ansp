// @vitest-environment node
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!databaseUrl)("due-day migration with PostgreSQL", () => {
  it("backfills local monthly days, preserves one-time payment dates, and enforces the check", async () => {
    const sql = postgres(databaseUrl!, { max: 1 });
    const schema = `task01_${randomUUID().replaceAll("-", "")}`;
    try {
      await sql.unsafe(`CREATE SCHEMA "${schema}"`);
      await sql.unsafe(`
        CREATE TABLE "${schema}"."donor_pledges" (
          id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          frequencia text NOT NULL,
          created_at timestamp with time zone NOT NULL,
          data_pagamento date
        )
      `);
      await sql.unsafe(`
        INSERT INTO "${schema}"."donor_pledges" (frequencia, created_at, data_pagamento)
        VALUES
          ('mensal', '2026-02-01T02:30:00Z', NULL),
          ('mensal', '2026-02-01T03:30:00Z', NULL),
          ('unica', '2026-02-01T12:00:00Z', '2026-02-12')
      `);

      const migration = readFileSync(
        new URL("../drizzle/0009_illegal_leo.sql", import.meta.url),
        "utf8"
      );
      await sql.begin(async (tx) => {
        await tx.unsafe(`SET LOCAL search_path TO "${schema}"`);
        for (const statement of migration.split("--> statement-breakpoint")) {
          if (statement.trim()) await tx.unsafe(statement);
        }
      });

      const rows = await sql.unsafe(`
        SELECT frequencia, dia_vencimento, data_pagamento::text AS data_pagamento
        FROM "${schema}"."donor_pledges" ORDER BY id
      `);
      expect(rows).toMatchObject([
        { frequencia: "mensal", dia_vencimento: 28, data_pagamento: null },
        { frequencia: "mensal", dia_vencimento: 1, data_pagamento: null },
        { frequencia: "unica", dia_vencimento: null, data_pagamento: "2026-02-12" },
      ]);

      for (const day of [1, 28]) {
        await sql.unsafe(
          `INSERT INTO "${schema}"."donor_pledges" (frequencia, created_at, dia_vencimento) VALUES ('mensal', now(), $1)`,
          [day]
        );
      }
      await sql.unsafe(
        `INSERT INTO "${schema}"."donor_pledges" (frequencia, created_at, dia_vencimento) VALUES ('unica', now(), NULL)`
      );

      for (const day of [0, 29, null]) {
        await expect(
          sql.unsafe(
            `INSERT INTO "${schema}"."donor_pledges" (frequencia, created_at, dia_vencimento) VALUES ('mensal', now(), $1)`,
            [day]
          )
        ).rejects.toMatchObject({ code: "23514" });
      }
      await expect(
        sql.unsafe(
          `INSERT INTO "${schema}"."donor_pledges" (frequencia, created_at, dia_vencimento) VALUES ('unica', now(), 5)`
        )
      ).rejects.toMatchObject({ code: "23514" });
    } finally {
      await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await sql.end();
    }
  });

  it("widens monthly and ledger checks without changing a legacy backfilled day", async () => {
    const sql = postgres(databaseUrl!, { max: 1 });
    const schema = `task18_${randomUUID().replaceAll("-", "")}`;
    try {
      await sql.unsafe(`CREATE SCHEMA "${schema}"`);
      await sql.unsafe(`CREATE TABLE "${schema}"."donor_pledges" (
        id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        frequencia text NOT NULL,
        created_at timestamptz NOT NULL,
        data_pagamento date
      )`);
      await sql.unsafe(`INSERT INTO "${schema}"."donor_pledges" (frequencia, created_at)
        VALUES ('mensal', '2026-02-01T02:30:00Z')`);
      const legacyMigration = readFileSync(new URL("../drizzle/0009_illegal_leo.sql", import.meta.url), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(`SET LOCAL search_path TO "${schema}"`);
        for (const statement of legacyMigration.split("--> statement-breakpoint")) {
          if (statement.trim()) await tx.unsafe(statement);
        }
      });
      await sql.unsafe(`CREATE TABLE "${schema}"."donor_payment_ledger" (
        id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        due_date date NOT NULL,
        CONSTRAINT "donor_payment_ledger_due_day_check" CHECK (extract(day from due_date) between 1 and 28)
      )`);

      const migration = readFileSync(new URL("../drizzle/0012_aromatic_baron_zemo.sql", import.meta.url), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(`SET LOCAL search_path TO "${schema}"`);
        for (const statement of migration.split("--> statement-breakpoint")) {
          if (statement.trim()) await tx.unsafe(statement);
        }
      });

      const [legacy] = await sql.unsafe(`SELECT dia_vencimento FROM "${schema}"."donor_pledges" WHERE id = 1`);
      expect(legacy.dia_vencimento).toBe(28);
      for (const day of [29, 30, 31]) {
        await sql.unsafe(`INSERT INTO "${schema}"."donor_pledges" (frequencia, created_at, dia_vencimento)
          VALUES ('mensal', now(), $1)`, [day]);
      }
      for (const day of [0, 32, null]) {
        await expect(sql.unsafe(`INSERT INTO "${schema}"."donor_pledges" (frequencia, created_at, dia_vencimento)
          VALUES ('mensal', now(), $1)`, [day])).rejects.toMatchObject({ code: "23514" });
      }
      await expect(sql.unsafe(`INSERT INTO "${schema}"."donor_pledges" (frequencia, created_at, dia_vencimento)
        VALUES ('unica', now(), 31)`)).rejects.toMatchObject({ code: "23514" });
      await sql.unsafe(`INSERT INTO "${schema}"."donor_pledges" (frequencia, created_at, dia_vencimento)
        VALUES ('unica', now(), NULL)`);
      for (const dueDate of ["2027-02-28", "2028-02-29", "2028-03-31", "2028-04-30"]) {
        await sql.unsafe(`INSERT INTO "${schema}"."donor_payment_ledger" (due_date) VALUES ($1)`, [dueDate]);
      }
      const ledger = await sql.unsafe(`SELECT due_date::text AS due_date FROM "${schema}"."donor_payment_ledger" ORDER BY id`);
      expect(ledger.map((row) => row.due_date)).toEqual(["2027-02-28", "2028-02-29", "2028-03-31", "2028-04-30"]);
    } finally {
      await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await sql.end();
    }
  });
});
