// @vitest-environment node
import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { createTicket } from "@/lib/storage/tickets";
import {
  createDonorReceiptLink, createDonorReceiptRecoveryLink, createDonorReceiptTicket,
  receiptExpiry, verifyDonorReceiptTicket,
} from "@/lib/donor-receipts/tickets";
import { validateReceiptFile } from "@/lib/donor-receipts/validation";
import {
  checkReceiptThrottle, checkReceiptTicketThrottle, enterReceiptUpload, invalidReceiptBlockedFor, leaveReceiptUpload,
  receiptSourceIp, resetReceiptThrottle,
} from "@/lib/donor-receipts/throttle";
import { MAX_UPLOAD_BYTES } from "@/lib/storage";

const pledge = "11111111-1111-4111-8111-111111111111";
const secret = "x".repeat(40);

beforeEach(() => { process.env.SESSION_SECRET = secret; resetReceiptThrottle(); });

describe("monthly receipt capability", () => {
  it("is scoped to one pledge and competence and ends 45 São Paulo days after due", () => {
    const ticket = createDonorReceiptTicket(pledge, "2026-11", "2026-11-05");
    const exp = receiptExpiry("2026-11-05");
    expect(exp).toBe(Math.floor(Date.parse("2026-12-20T23:59:59-03:00") / 1000));
    expect(verifyDonorReceiptTicket(ticket, exp * 1000)).toMatchObject({ pledge_id: pledge, competencia: "2026-11" });
    expect(verifyDonorReceiptTicket(ticket, (exp + 1) * 1000)).toBeNull();
    const url = createDonorReceiptLink("https://example.test", pledge, "2026-11", "2026-11-05");
    expect(url).toContain("/benfeitor/comprovante?ticket=");
    expect(url).not.toMatch(/cpf|email|amount|path|%40/);
    expect(() => createDonorReceiptLink("http://example.test", pledge, "2026-11", "2026-11-05")).toThrow();
  });

  it("renews one occurrence for exactly 14 days after the standard link expires", () => {
    const now = new Date("2027-02-01T12:00:00Z");
    const standard = createDonorReceiptTicket(pledge, "2026-11", "2026-11-05");
    expect(verifyDonorReceiptTicket(standard, now.getTime())).toBeNull();
    const link = createDonorReceiptRecoveryLink("https://example.test", pledge, "2026-11", now);
    const ticket = new URL(link).searchParams.get("ticket");
    expect(verifyDonorReceiptTicket(ticket, now.getTime()))
      .toMatchObject({ pledge_id: pledge, competencia: "2026-11", scope: "donor_receipt" });
    expect(verifyDonorReceiptTicket(ticket, now.getTime() + 14 * 86400_000 + 1000)).toBeNull();
    expect(verifyDonorReceiptTicket(ticket, now.getTime() + 13 * 86400_000)?.competencia).toBe("2026-11");
    expect(verifyDonorReceiptTicket(ticket, now.getTime())?.exp)
      .toBe(Math.floor(now.getTime() / 1000) + 14 * 86400);
  });

  it("rejects tampered identity, month, scope, signature, and generic storage tickets", () => {
    const ticket = createDonorReceiptTicket(pledge, "2026-11", "2026-11-05");
    const [body, signature] = ticket.split(".");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    for (const patch of [
      { pledge_id: "22222222-2222-4222-8222-222222222222" },
      { competencia: "2026-12" }, { scope: "upload" }, { exp: payload.exp + 1000 },
    ]) {
      const changed = Buffer.from(JSON.stringify({ ...payload, ...patch })).toString("base64url");
      expect(verifyDonorReceiptTicket(`${changed}.${signature}`)).toBeNull();
    }
    expect(verifyDonorReceiptTicket(`${body}.${signature.slice(0, -1)}A`)).toBeNull();
    expect(verifyDonorReceiptTicket(createTicket("pending/file", "upload", 300))).toBeNull();
    expect(verifyDonorReceiptTicket(createTicket("donors/file", "download", 300))).toBeNull();
    const wrongScopeBody = Buffer.from(JSON.stringify({ ...payload, scope: "upload" })).toString("base64url");
    const wrongKey = createHmac("sha256", createHmac("sha256", secret).update("ticket:upload").digest())
      .update(wrongScopeBody).digest("base64url");
    expect(verifyDonorReceiptTicket(`${wrongScopeBody}.${wrongKey}`)).toBeNull();
  });
});

describe("receipt content", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0xff, 0xd9]);
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(4), Buffer.from("IEND"), Buffer.alloc(4)]);
  const gif = Buffer.concat([Buffer.from("GIF89a"), Buffer.alloc(7), Buffer.from([0x3b])]);
  const pdf = Buffer.from("%PDF-1.7\nbody\n%%EOF");
  const webp = Buffer.alloc(16); webp.write("RIFF"); webp.writeUInt32LE(8, 4); webp.write("WEBP", 8);

  it("accepts supported signatures and image/PDF files exactly at 10 MB", () => {
    for (const [buffer, mime] of [[jpeg, "image/jpeg"], [png, "image/png"], [gif, "image/gif"],
      [pdf, "application/pdf"], [webp, "image/webp"]] as const) {
      expect(validateReceiptFile(buffer, mime, "../Comprovánte<script>.pdf")).toMatchObject({ ok: true });
    }
    const limit = Buffer.alloc(MAX_UPLOAD_BYTES);
    jpeg.subarray(0, 4).copy(limit); jpeg.subarray(-2).copy(limit, limit.length - 2);
    expect(validateReceiptFile(limit, "image/jpeg", "receipt.jpg")).toMatchObject({ ok: true });
    expect(validateReceiptFile(Buffer.concat([limit, Buffer.from([0])]), "image/jpeg", "receipt.jpg"))
      .toEqual({ ok: false, reason: "too_large" });
    const pdfLimit = Buffer.alloc(MAX_UPLOAD_BYTES, 0x20);
    Buffer.from("%PDF-1.7\n").copy(pdfLimit);
    Buffer.from("%%EOF").copy(pdfLimit, pdfLimit.length - 5);
    expect(validateReceiptFile(pdfLimit, "application/pdf", "receipt.pdf")).toMatchObject({ ok: true });
  });

  it("rejects empty and MIME-disguised content", () => {
    expect(validateReceiptFile(Buffer.alloc(0), "image/png", "x.png")).toEqual({ ok: false, reason: "empty" });
    expect(validateReceiptFile(pdf, "image/png", "x.png")).toEqual({ ok: false, reason: "type" });
    expect(validateReceiptFile(Buffer.from("hello"), "application/pdf", "x.pdf")).toEqual({ ok: false, reason: "type" });
  });
});

describe("bounded throttling", () => {
  it("limits IP and hashed-ticket windows and exposes retry seconds", () => {
    for (let i = 0; i < 20; i++) expect(checkReceiptThrottle("post", "192.0.2.1", undefined, 1000)).toBe(0);
    expect(checkReceiptThrottle("post", "192.0.2.1", undefined, 1000)).toBe(3600);
    for (let i = 0; i < 5; i++) expect(checkReceiptTicketThrottle("secret-ticket", 1000)).toBe(0);
    expect(checkReceiptTicketThrottle("secret-ticket", 1000)).toBe(3600);
    expect(checkReceiptTicketThrottle("secret-ticket", 3_601_000)).toBe(0);
    for (let i = 0; i < 30; i++) expect(checkReceiptThrottle("invalid", "192.0.2.2", undefined, 1000)).toBe(0);
    expect(invalidReceiptBlockedFor("192.0.2.2", 1000)).toBe(600);
    expect(checkReceiptThrottle("invalid", "192.0.2.2", undefined, 1000)).toBe(600);
    expect(invalidReceiptBlockedFor("192.0.2.2", 601_000)).toBe(0);
  });

  it("caps concurrent uploads and trusts forwarded IP only by explicit configuration", () => {
    const headers = new Headers({ "x-forwarded-for": "1.1.1.1, 192.0.2.10" });
    delete process.env.TRUST_TRAEFIK_FORWARDED_IP;
    expect(receiptSourceIp(headers)).toBe("unknown");
    process.env.TRUST_TRAEFIK_FORWARDED_IP = "true";
    expect(receiptSourceIp(headers)).toBe("192.0.2.10");
    delete process.env.TRUST_TRAEFIK_FORWARDED_IP;
    expect([0, 1, 2, 3].map(() => enterReceiptUpload())).toEqual([true, true, true, true]);
    expect(enterReceiptUpload()).toBe(false);
    leaveReceiptUpload();
    expect(enterReceiptUpload()).toBe(true);
  });
});
