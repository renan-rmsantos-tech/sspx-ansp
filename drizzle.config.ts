import { defineConfig } from "drizzle-kit";

// DATABASE_URL_MIGRATE é um override opcional usado apenas por generate/migrate
// quando o DATABASE_URL do runtime não serve para DDL.
const url = process.env.DATABASE_URL_MIGRATE || process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL or DATABASE_URL_MIGRATE must be set");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
