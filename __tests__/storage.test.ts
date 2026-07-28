import { beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync } from "fs";
import { readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  getStorage,
  guessMimeType,
  resolveStoragePath,
  storageRoot,
} from "@/lib/storage";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ansp-storage-"));
  vi.stubEnv("STORAGE_DIR", root);
});

describe("resolveStoragePath", () => {
  it("resolves a normal path inside the storage root", () => {
    expect(resolveStoragePath("applications/app-1/rg.pdf")).toBe(
      join(storageRoot(), "applications/app-1/rg.pdf")
    );
  });

  it("refuses paths that escape the storage root", () => {
    for (const path of [
      "../etc/passwd",
      "applications/../../etc/passwd",
      "/etc/passwd",
      "",
    ]) {
      expect(() => resolveStoragePath(path)).toThrow("inválido");
    }
  });

  it("refuses paths containing a null byte", () => {
    expect(() => resolveStoragePath("a\0b.pdf")).toThrow("inválido");
  });
});

describe("local storage driver", () => {
  it("writes and reads a file, creating directories as needed", async () => {
    const storage = getStorage();
    await storage.put("applications/app-1/rg.pdf", Buffer.from("conteúdo"));

    expect((await storage.get("applications/app-1/rg.pdf"))?.toString()).toBe(
      "conteúdo"
    );
    expect(
      (await readFile(join(root, "applications/app-1/rg.pdf"))).toString()
    ).toBe("conteúdo");
  });

  it("returns null for a file that does not exist", async () => {
    expect(await getStorage().get("nao/existe.pdf")).toBeNull();
    expect(await getStorage().size("nao/existe.pdf")).toBeNull();
  });

  it("reports the size in bytes", async () => {
    const storage = getStorage();
    await storage.put("a/b.pdf", Buffer.from("12345"));

    expect(await storage.size("a/b.pdf")).toBe(5);
  });

  it("moves a file to a new path", async () => {
    const storage = getStorage();
    await storage.put("pending/uuid/rg_pai/rg.pdf", Buffer.from("doc"));

    await storage.move(
      "pending/uuid/rg_pai/rg.pdf",
      "applications/app-1/rg_pai/rg.pdf"
    );

    expect(await storage.get("pending/uuid/rg_pai/rg.pdf")).toBeNull();
    expect(
      (await storage.get("applications/app-1/rg_pai/rg.pdf"))?.toString()
    ).toBe("doc");
  });

  it("removes a file and tolerates removing it twice", async () => {
    const storage = getStorage();
    await storage.put("a/b.pdf", Buffer.from("x"));

    await storage.remove("a/b.pdf");
    await expect(storage.remove("a/b.pdf")).resolves.toBeUndefined();
    expect(await storage.get("a/b.pdf")).toBeNull();
  });

  it("refuses to write outside the storage root", async () => {
    await expect(
      getStorage().put("../escaped.pdf", Buffer.from("x"))
    ).rejects.toThrow("inválido");
  });
});

describe("guessMimeType", () => {
  it("maps the accepted document extensions", () => {
    expect(guessMimeType("a/b.pdf")).toBe("application/pdf");
    expect(guessMimeType("a/b.jpg")).toBe("image/jpeg");
    expect(guessMimeType("a/b.JPEG")).toBe("image/jpeg");
    expect(guessMimeType("a/b.png")).toBe("image/png");
    expect(guessMimeType("a/b.webp")).toBe("image/webp");
  });

  it("falls back to a generic type", () => {
    expect(guessMimeType("a/b.exe")).toBe("application/octet-stream");
    expect(guessMimeType("sem-extensao")).toBe("application/octet-stream");
  });
});
