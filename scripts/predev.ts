/** Prepare only a reachable local database before `next dev`. */
import { spawnSync } from "node:child_process";
import postgres from "postgres";
import { seedGuard } from "./seed-dev";

async function canReachDatabase(url: string): Promise<boolean> {
  const sql = postgres(url, { max: 1, connect_timeout: 3 });
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end();
  }
}

async function main() {
  const refusal = seedGuard(process.env);
  if (refusal) {
    console.warn(`[predev] ${refusal} Iniciando Next dev sem preparar o banco.`);
    return;
  }

  if (!await canReachDatabase(process.env.DATABASE_URL!)) {
    console.warn("[predev] Banco local indisponível; iniciando Next dev sem migração, bootstrap ou seed.");
    return;
  }

  for (const script of ["db:migrate", "db:bootstrap", "db:seed"]) {
    const result = spawnSync("npm", ["run", script], { stdio: "inherit", env: process.env });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      if (!await canReachDatabase(process.env.DATABASE_URL!)) {
        console.warn(`[predev] Banco local indisponível durante ${script}; iniciando Next dev.`);
        return;
      }
      throw new Error(`${script} falhou com código ${result.status}`);
    }
  }
}

main().catch((error) => {
  console.error("[predev] Falha ao preparar o banco:", error);
  process.exitCode = 1;
});
