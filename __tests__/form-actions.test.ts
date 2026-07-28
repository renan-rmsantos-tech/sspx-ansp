import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("SESSION_SECRET", "y".repeat(48));

vi.mock("@/lib/db", async () => ({
  db: (await import("./helpers/fake-db")).fakeDb,
}));

import { verifyTicket } from "@/lib/storage/tickets";
import {
  createUploadUrl,
  getActiveSchoolYear,
} from "@/app/form/_actions/form-actions";
import { queryFor, resetFakeDb } from "./helpers/fake-db";

beforeEach(() => {
  vi.clearAllMocks();
  resetFakeDb();
});

describe("getActiveSchoolYear", () => {
  it("returns { open: false } when no school year is active", async () => {
    queryFor("schoolYears").findFirst.mockResolvedValue(undefined);

    expect(await getActiveSchoolYear()).toEqual({ open: false });
  });

  it("returns { open: false } when today falls outside the active window", async () => {
    queryFor("schoolYears").findFirst.mockResolvedValue({
      id: "year-1",
      nome: "2025",
      data_inicio: "2025-01-01",
      data_fim: "2025-12-31",
      ativo: true,
    });

    expect(await getActiveSchoolYear()).toEqual({ open: false });
  });

  it("returns { open: true, year } while the window is open", async () => {
    const now = new Date();
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);

    const year = {
      id: "year-1",
      nome: "2026",
      data_inicio: start.toISOString().split("T")[0],
      data_fim: end.toISOString().split("T")[0],
      ativo: true,
    };
    queryFor("schoolYears").findFirst.mockResolvedValue(year);

    const result = await getActiveSchoolYear();

    expect(result.open).toBe(true);
    expect(result.year).toEqual(year);
  });
});

describe("createUploadUrl", () => {
  it("generates a path under pending/{uuid}/{categoria}/", async () => {
    const result = await createUploadUrl("doc.pdf", "rg_pai");

    expect("url" in result).toBe(true);
    if (!("url" in result)) return;

    expect(result.path).toMatch(/^pending\/[0-9a-f-]+\/rg_pai\/doc\.pdf$/);
    expect(result.url).toMatch(/^\/api\/uploads\?ticket=/);
  });

  it("signs the destination path into the ticket", async () => {
    const result = await createUploadUrl("doc.pdf", "rg_pai");
    if (!("url" in result)) throw new Error("expected a url");

    const ticket = new URL(result.url, "http://x").searchParams.get("ticket");

    expect(verifyTicket(ticket, "upload")).toBe(result.path);
    // Um ticket de upload não serve para baixar documentos.
    expect(verifyTicket(ticket, "download")).toBeNull();
  });

  it("sanitizes filenames", async () => {
    const result = await createUploadUrl("my file (1).pdf", "rg_pai");

    expect("path" in result).toBe(true);
    if (!("path" in result)) return;

    expect(result.path).toMatch(
      /^pending\/[0-9a-f-]+\/rg_pai\/my_file__1_\.pdf$/
    );
  });

  it("gives each upload its own directory", async () => {
    const first = await createUploadUrl("doc.pdf", "rg_pai");
    const second = await createUploadUrl("doc.pdf", "rg_pai");

    if (!("path" in first) || !("path" in second)) {
      throw new Error("expected paths");
    }

    expect(first.path).not.toBe(second.path);
  });

  it("returns an error when the signing secret is missing", async () => {
    vi.stubEnv("SESSION_SECRET", "");

    const result = await createUploadUrl("doc.pdf", "rg_pai");
    expect("error" in result).toBe(true);

    vi.stubEnv("SESSION_SECRET", "y".repeat(48));
  });
});
