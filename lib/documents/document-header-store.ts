import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documentHeader } from "@/lib/db/schema";
import { resolveDocumentHeader, type DocumentHeaderData } from "./document-header";

export const HEADER_LOAD_ERROR = "Não foi possível carregar o cabeçalho institucional. Tente novamente.";

// Server-only persistence boundary. Never cache: new communications use current settings.
// A missing row uses canonical defaults; a failed query must never invent an identity.
export async function loadDocumentHeader(database: typeof db = db): Promise<DocumentHeaderData> {
  try {
    return resolveDocumentHeader(await database.query.documentHeader.findFirst({
      orderBy: desc(documentHeader.updated_at),
    }));
  } catch {
    throw new Error(HEADER_LOAD_ERROR);
  }
}

// Internal store: callers must authorize administrators before saving.
export async function persistDocumentHeader(input: DocumentHeaderData, database: typeof db = db) {
  const existing = await database.query.documentHeader.findFirst({
    columns: { id: true },
    orderBy: desc(documentHeader.updated_at),
  });
  const payload = {
    linha1: input.linha1, linha2: input.linha2, linha3: input.linha3,
    ...(input.rodape_institucional != null ? { rodape_institucional: input.rodape_institucional } : {}),
    mostrar_selo: input.mostrar_selo, updated_at: new Date().toISOString(),
  };
  if (existing) {
    await database.update(documentHeader).set(payload).where(eq(documentHeader.id, existing.id));
  } else {
    await database.insert(documentHeader).values(payload);
  }
}
