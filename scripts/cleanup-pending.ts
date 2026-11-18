import { readdir, rm, stat } from "fs/promises";
import { join } from "path";
import { cleanupDrafts, DRAFT_MAX_AGE_DAYS } from "../lib/applicant/draft-cleanup";
import { storageRoot } from "../lib/storage";

/**
 * Remove uploads abandonados em `pending/`.
 *
 * Quem começa o formulário e não envia deixa RG, comprovantes e extratos no
 * storage sem nenhuma referência no banco — dados sensíveis que não devem ser
 * retidos. Submissões concluídas movem os arquivos para `applications/` ou
 * `donors/`, então tudo que sobra em `pending/` além da idade limite é lixo.
 *
 * Também limpa `drafts/`: rascunhos de solicitação sem alteração há
 * DRAFT_MAX_AGE_DAYS dias e arquivos de rascunho que nenhum rascunho usa.
 *
 * Uso: npx tsx scripts/cleanup-pending.ts
 * Agende via cron no droplet (ex.: uma vez por dia).
 */

const MAX_AGE_HOURS = 48;

async function cleanupPending() {
  const pendingDir = join(storageRoot(), "pending");
  const cutoff = Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000;

  let entries: string[];
  try {
    entries = await readdir(pendingDir);
  } catch {
    console.log("[cleanup-pending] nada a limpar (pending/ não existe).");
    return;
  }

  let removed = 0;

  for (const entry of entries) {
    const dir = join(pendingDir, entry);

    try {
      const info = await stat(dir);
      if (info.mtimeMs > cutoff) continue;

      await rm(dir, { recursive: true, force: true });
      removed += 1;
    } catch (error) {
      console.error(
        `[cleanup-pending] falha ao remover ${entry}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.log(
    `[cleanup-pending] ${removed} diretório(s) com mais de ${MAX_AGE_HOURS}h removido(s).`
  );
}

async function main() {
  await cleanupPending();
  const drafts = await cleanupDrafts();
  console.log(
    `[cleanup-drafts] ${drafts.drafts} rascunho(s) com mais de ${DRAFT_MAX_AGE_DAYS} dias e ${drafts.uploads} upload(s) sem uso removido(s).`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[cleanup] falhou:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
