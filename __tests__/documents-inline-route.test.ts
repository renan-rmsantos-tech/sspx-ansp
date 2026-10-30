// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createTicket } from "@/lib/storage/tickets";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/storage", async importOriginal => ({ ...(await importOriginal<typeof import("@/lib/storage")>()), getStorage: () => ({ get }) }));
import { GET } from "@/app/api/documents/route";
process.env.SESSION_SECRET = "s".repeat(40);
const request = (ticket: string) => new NextRequest(`http://localhost/api/documents?ticket=${encodeURIComponent(ticket)}`);
describe("private inline document delivery", () => {
 it.each(["applications/a/rg.pdf", "donors/d/receipt.png"])("serves %s with private inline headers", async path => {
  get.mockResolvedValue(Buffer.from("content")); const response = await GET(request(createTicket(path, "download", 300)));
  expect(response.status).toBe(200); expect(await response.text()).toBe("content");
  expect(response.headers.get("content-disposition")).toMatch(/^inline;/);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("content-type")).toBe(path.endsWith("pdf") ? "application/pdf" : "image/png");
 });
 it("returns a safe 404 for a missing document", async () => {
  get.mockResolvedValue(null); const response = await GET(request(createTicket("applications/a/missing.pdf", "download", 300)));
  expect(response.status).toBe(404); expect(await response.text()).not.toContain("applications/a/missing.pdf");
 });
 it("rejects invalid and expired tickets before storage access", async () => {
  get.mockClear(); expect((await GET(request("bad"))).status).toBe(403);
  expect((await GET(request(createTicket("applications/a/private.pdf", "download", -1)))).status).toBe(403);
  expect((await GET(request(createTicket("applications/a/private.pdf", "upload", 300)))).status).toBe(403);
  expect(get).not.toHaveBeenCalled();
 });
});
