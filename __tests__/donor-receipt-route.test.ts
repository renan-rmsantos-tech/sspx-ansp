// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDonorReceiptTicket } from "@/lib/donor-receipts/tickets";
import { resetReceiptThrottle } from "@/lib/donor-receipts/throttle";

const { attach } = vi.hoisted(() => ({ attach: vi.fn() }));
vi.mock("@/lib/donor-receipts/service", () => ({ attachDonorReceipt: attach }));
import { POST } from "@/app/api/donor-receipts/route";

const pledge = "11111111-1111-4111-8111-111111111111";
const url = "http://localhost:3000/api/donor-receipts";
const pdf = new Uint8Array(Buffer.from("%PDF-1.7\nbody\n%%EOF"));

function request(ticket: string, origin = "http://localhost:3000", file = new File([pdf], "proof.pdf", { type: "application/pdf" })) {
  const form = new FormData();
  form.set("ticket", ticket);
  form.set("file", file);
  return new NextRequest(url, { method: "POST", headers: { origin }, body: form });
}

beforeEach(() => {
  process.env.SESSION_SECRET = "s".repeat(40);
  resetReceiptThrottle();
  attach.mockReset().mockResolvedValue({ status: "saved" });
});

describe("POST /api/donor-receipts", () => {
  it("requires same-origin and a valid scoped bearer before writing", async () => {
    const ticket = createDonorReceiptTicket(pledge, "2026-11", "2026-11-05");
    expect((await POST(request(ticket, "https://evil.test"))).status).toBe(403);
    expect((await POST(request("bad-ticket"))).status).toBe(403);
    expect(attach).not.toHaveBeenCalled();
    const response = await POST(request(ticket));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Comprovante enviado. A confirmação do pagamento depende da conferência bancária." });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(attach).toHaveBeenCalledTimes(1);
  });

  it("does not let public form fields or query parameters extend an expired ticket", async () => {
    const expired = createDonorReceiptTicket(pledge, "2024-01", "2024-01-05");
    const form = new FormData();
    form.set("ticket", expired);
    form.set("file", new File([pdf], "proof.pdf", { type: "application/pdf" }));
    form.set("expiry", "2099-01-01");
    const response = await POST(new NextRequest(`${url}?expiry=2099-01-01`, {
      method: "POST", headers: { origin: "http://localhost:3000" }, body: form,
    }));
    expect(response.status).toBe(403);
    expect(attach).not.toHaveBeenCalled();
  });

  it("returns 429 and Retry-After after the ticket budget and rejects oversized declarations", async () => {
    const ticket = createDonorReceiptTicket(pledge, "2026-11", "2026-11-05");
    for (let i = 0; i < 5; i++) expect((await POST(request(ticket))).status).toBe(200);
    const limited = await POST(request(ticket));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(attach).toHaveBeenCalledTimes(5);
    const oversized = request(ticket);
    oversized.headers.set("content-length", String(11 * 1024 * 1024));
    expect((await POST(oversized)).status).toBe(413);
  });

  it("returns 429 and Retry-After before parsing after the IP budget", async () => {
    for (let i = 0; i < 20; i++) expect((await POST(request(`invalid-${i}`))).status).toBe(403);
    const limited = await POST(request("invalid-20"));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(attach).not.toHaveBeenCalled();
  });
});
