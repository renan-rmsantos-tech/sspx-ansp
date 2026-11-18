import { readdir, rm, stat } from "fs/promises";
import { join } from "path";
import { lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { applicationDrafts } from "@/lib/db/schema";
import { storageRoot } from "@/lib/storage";

/** Rascunhos sem alteração há mais tempo que isso são apagados com os arquivos. */
export const DRAFT_MAX_AGE_DAYS = 90;
/** Uploads de rascunho que nenhum rascunho referencia são apagados após esse prazo. */
export const ORPHAN_UPLOAD_MAX_AGE_HOURS = 48;

/** Pastas de upload (`drafts/{conta}/{uuid}`) citadas no JSON dos rascunhos. */
export function referencedUploadDirs(drafts: Array<{ data: unknown }>): Set<string> {
  const dirs = new Set<string>();
  for (const draft of drafts) {
    for (const match of JSON.stringify(draft.data).matchAll(/drafts\/([0-9a-f-]{36})\/([0-9a-f-]{36})\//g)) {
      dirs.add(`${match[1]}/${match[2]}`);
    }
  }
  return dirs;
}

/**
 * Apaga rascunhos abandonados e os arquivos de rascunho que nenhum rascunho
 * usa mais (removidos pela família, ou de rascunhos apagados). Os arquivos de
 * solicitações enviadas já saíram de `drafts/` no envio.
 */
export async function cleanupDrafts(now = Date.now()): Promise<{ drafts: number; uploads: number }> {
  const staleBefore = new Date(now - DRAFT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const stale = await db
    .delete(applicationDrafts)
    .where(lt(applicationDrafts.updated_at, staleBefore))
    .returning({ id: applicationDrafts.id });

  const referenced = referencedUploadDirs(
    await db.query.applicationDrafts.findMany({ columns: { data: true } })
  );

  const root = join(storageRoot(), "drafts");
  const cutoff = now - ORPHAN_UPLOAD_MAX_AGE_HOURS * 60 * 60 * 1000;
  let uploads = 0;

  let accounts: string[];
  try {
    accounts = await readdir(root);
  } catch {
    return { drafts: stale.length, uploads };
  }

  for (const account of accounts) {
    const accountDir = join(root, account);
    let entries: string[];
    try {
      entries = await readdir(accountDir);
    } catch {
      continue;
    }
    for (const upload of entries) {
      if (referenced.has(`${account}/${upload}`)) continue;
      const dir = join(accountDir, upload);
      try {
        if ((await stat(dir)).mtimeMs > cutoff) continue;
        await rm(dir, { recursive: true, force: true });
        uploads += 1;
      } catch (error) {
        console.error(`[cleanup-drafts] falha ao remover ${account}/${upload}:`, error instanceof Error ? error.message : error);
      }
    }
    if ((await readdir(accountDir).catch(() => ["?"])).length === 0) {
      await rm(accountDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  return { drafts: stale.length, uploads };
}
