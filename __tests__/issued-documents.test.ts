import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fakeDb }));

const { put, remove } = vi.hoisted(() => ({ put: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/storage", () => ({ getStorage: () => ({ put, remove }) }));

import { issuedDocuments } from "@/lib/db/schema";
import { listCurrentIssuedDocuments, persistIssuedDocument } from "@/lib/documents/issued-documents";
import { failWrites, inserted, queryFor, resetFakeDb, setReturning, transactionExecute } from "./helpers/fake-db";

describe("issued documents", () => {
  beforeEach(() => { resetFakeDb(); put.mockReset().mockResolvedValue(undefined); remove.mockReset().mockResolvedValue(undefined); });

  it("stores a new immutable version after serializing the per-kind allocation", async () => {
    queryFor("issuedDocuments").findFirst.mockResolvedValue({ version: 2 });
    setReturning(issuedDocuments, [{ id: "issued-3", version: 3 }]);
    const document = await persistIssuedDocument({ applicationId: "app-1", kind: "decision", issuedBy: "admin-1", filename: "decision.pdf", pdf: Buffer.from("PDF") });
    expect(document).toMatchObject({ id: "issued-3", version: 3 });
    expect(put).toHaveBeenCalledOnce();
    expect(inserted[0].values).toMatchObject({ application_id: "app-1", kind: "decision", version: 3, issued_by: "admin-1", size_bytes: 3 });
    expect(transactionExecute).toHaveBeenCalledOnce();
    expect(transactionExecute.mock.invocationCallOrder[0]).toBeLessThan(queryFor("issuedDocuments").findFirst.mock.invocationCallOrder[0]);
  });

  it("removes the just-written file if metadata persistence fails", async () => {
    failWrites();
    await expect(persistIssuedDocument({ applicationId: "app-1", kind: "contract", issuedBy: "admin-1", filename: "contract.pdf", pdf: Buffer.from("PDF") })).rejects.toThrow("db failure");
    expect(remove).toHaveBeenCalledWith(expect.stringMatching(/^applications\/app-1\/issued\/contract\//));
  });

  it("returns only the highest version of each document kind", async () => {
    queryFor("issuedDocuments").findMany.mockResolvedValue([
      { id: "d2", kind: "decision", version: 2 }, { id: "d1", kind: "decision", version: 1 }, { id: "c1", kind: "contract", version: 1 },
    ]);
    await expect(listCurrentIssuedDocuments("app-1")).resolves.toEqual([{ id: "d2", kind: "decision", version: 2 }, { id: "c1", kind: "contract", version: 1 }]);
  });
});
