import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTicket, verifyTicket } from "@/lib/storage/tickets";

const SECRET = "a".repeat(48);

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", SECRET);
});

describe("createTicket", () => {
  it("requires a signing secret of at least 32 characters", () => {
    vi.stubEnv("SESSION_SECRET", "curto");

    expect(() => createTicket("a/b.pdf", "upload", 60)).toThrow(
      "SESSION_SECRET"
    );
  });
});

describe("verifyTicket", () => {
  it("returns the signed path for a valid ticket", () => {
    const ticket = createTicket("pending/x/rg_pai/rg.pdf", "upload", 60);

    expect(verifyTicket(ticket, "upload")).toBe("pending/x/rg_pai/rg.pdf");
  });

  it("rejects a ticket issued for a different scope", () => {
    const ticket = createTicket("applications/app-1/rg.pdf", "download", 60);

    expect(verifyTicket(ticket, "upload")).toBeNull();
  });

  it("rejects an expired ticket", () => {
    const ticket = createTicket("a/b.pdf", "download", -1);

    expect(verifyTicket(ticket, "download")).toBeNull();
  });

  it("rejects a ticket whose payload was tampered with", () => {
    const ticket = createTicket("applications/app-1/rg.pdf", "download", 60);
    const [, signature] = ticket.split(".");

    const forgedBody = Buffer.from(
      JSON.stringify({
        path: "../../etc/passwd",
        scope: "download",
        exp: Math.floor(Date.now() / 1000) + 60,
      })
    ).toString("base64url");

    expect(verifyTicket(`${forgedBody}.${signature}`, "download")).toBeNull();
  });

  it("rejects a ticket signed with a different secret", () => {
    const ticket = createTicket("a/b.pdf", "download", 60);
    vi.stubEnv("SESSION_SECRET", "b".repeat(48));

    expect(verifyTicket(ticket, "download")).toBeNull();
  });

  it("rejects malformed input instead of throwing", () => {
    for (const ticket of [null, "", "sem-ponto", "a.b", "..", "x."]) {
      expect(verifyTicket(ticket, "download")).toBeNull();
    }
  });
});
