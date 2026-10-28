// @vitest-environment node
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { it, expect } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/lib/db/schema";

import { DEFAULT_INSTITUTIONAL_FOOTER } from "@/lib/documents/document-header";

it.skipIf(!process.env.DATABASE_URL_TEST)("migrates a legacy header and saves/reloads, resets and clears the same singleton", async () => {
  const { loadDocumentHeader, persistDocumentHeader } = await import("@/lib/documents/document-header-store");
  const sql = postgres(process.env.DATABASE_URL_TEST!, { max: 1 });
  const namespace = `footer_${randomUUID().replaceAll("-", "")}`;
  try {
    await sql.unsafe(`CREATE SCHEMA "${namespace}"`);
    await sql.unsafe(`SET search_path TO "${namespace}"`);
    await sql.unsafe(`CREATE TABLE document_header (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), linha1 text NOT NULL, linha2 text NOT NULL, linha3 text NOT NULL, mostrar_selo boolean NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`);
    await sql`INSERT INTO document_header (linha1, linha2, linha3, mostrar_selo) VALUES ('Legado', 'Preservado', 'Itatiba', false)`;
    await sql.unsafe(readFileSync("drizzle/0014_soft_magneto.sql", "utf8"));
    const database = drizzle(sql, { schema });
    const original = await loadDocumentHeader(database);
    expect(original).toEqual({ linha1: "Legado", linha2: "Preservado", linha3: "Itatiba", mostrar_selo: false, rodape_institucional: DEFAULT_INSTITUTIONAL_FOOTER });
    for (const footer of ["Educação & fé\nSão José", DEFAULT_INSTITUTIONAL_FOOTER, ""]) {
      await persistDocumentHeader({ ...original, rodape_institucional: footer }, database);
      expect(await loadDocumentHeader(database)).toEqual({ ...original, rodape_institucional: footer });
      expect(await sql`SELECT count(*)::int AS n FROM document_header`).toMatchObject([{ n: 1 }]);
    }
  } finally {
    await sql.unsafe(`SET search_path TO public`);
    await sql.unsafe(`DROP SCHEMA "${namespace}" CASCADE`);
    await sql.end();
  }
});
