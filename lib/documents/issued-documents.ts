import { randomUUID } from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { applications, issuedDocuments } from "@/lib/db/schema";
import { getStorage } from "@/lib/storage";

export type IssuedDocumentKind = "decision" | "contract";

export async function persistIssuedDocument(input: {
  applicationId: string;
  kind: IssuedDocumentKind;
  issuedBy: string;
  filename: string;
  pdf: Buffer;
}) {
  const path = `applications/${input.applicationId}/issued/${input.kind}/${randomUUID()}.pdf`;
  await getStorage().put(path, input.pdf);
  try {
    const [document] = await db.transaction(async (tx) => {
      const queryable = tx as unknown as typeof db;
      // A linha da solicitação é o serializador canônico de emissões finais.
      // O lock mantém tanto os tipos quanto suas versões consistentes em reemissões concorrentes.
      await tx.execute(sql`select 1 from ${applications} where ${applications.id} = ${input.applicationId} for update`);
      const latest = await queryable.query.issuedDocuments.findFirst({
        columns: { version: true },
        where: and(eq(issuedDocuments.application_id, input.applicationId), eq(issuedDocuments.kind, input.kind)),
        orderBy: desc(issuedDocuments.version),
      });
      return queryable.insert(issuedDocuments).values({
        application_id: input.applicationId,
        kind: input.kind,
        version: (latest?.version ?? 0) + 1,
        storage_path: path,
        filename: input.filename,
        mime_type: "application/pdf",
        size_bytes: input.pdf.length,
        issued_by: input.issuedBy,
      }).returning();
    });
    return document;
  } catch (error) {
    await getStorage().remove(path);
    throw error;
  }
}

export async function findIssuedDocument(id: string) {
  return db.query.issuedDocuments.findFirst({ where: eq(issuedDocuments.id, id) });
}

export async function listCurrentIssuedDocuments(applicationId: string) {
  const all = await db.query.issuedDocuments.findMany({
    columns: { id: true, application_id: true, kind: true, version: true, filename: true, issued_at: true, issued_by: true },
    where: eq(issuedDocuments.application_id, applicationId),
    orderBy: desc(issuedDocuments.version),
  });
  const seen = new Set<string>();
  return all.filter((item) => !seen.has(item.kind) && (seen.add(item.kind), true));
}

export async function listIssuedDocumentHistory(applicationId: string) {
  return db.query.issuedDocuments.findMany({
    columns: { id: true, application_id: true, kind: true, version: true, filename: true, issued_at: true, issued_by: true },
    where: eq(issuedDocuments.application_id, applicationId),
    orderBy: desc(issuedDocuments.issued_at),
  });
}
