import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createTransport, sendMail, close } = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  close: vi.fn(),
}));

vi.mock("nodemailer", () => ({ default: { createTransport } }));
vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fakeDb }));

import { sendDonorWelcomeEmail } from "@/lib/email/send-donor-welcome";
import { donorPledges } from "@/lib/db/schema";
import { queryFor, resetFakeDb, updated } from "./helpers/fake-db";

beforeEach(() => {
  resetFakeDb();
  vi.clearAllMocks();
  vi.stubEnv("SMTP_HOST", "smtp.example.com");
  vi.stubEnv("SMTP_PORT", "587");
  vi.stubEnv("SMTP_FROM", "Arca <contato@example.com>");
  vi.stubEnv("SMTP_USER", "contato@example.com");
  vi.stubEnv("SMTP_PASSWORD", "secret");
  vi.stubEnv("SMTP_SECURE", "false");
  createTransport.mockReturnValue({ sendMail, close });
  sendMail.mockResolvedValue({ messageId: "msg-1" });
});

afterEach(() => vi.unstubAllEnvs());

describe("sendDonorWelcomeEmail", () => {
  it("sends edited content over TLS and marks the donor as sent after acceptance", async () => {
    queryFor("donorWelcomeTemplates").findFirst.mockResolvedValue({
      assunto: "Novo assunto", corpo: "Obrigado, <Ana>!",
    });
    await sendDonorWelcomeEmail({ id: "d1", email: "ana@example.com" });

    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.example.com", port: 587, secure: false, requireTLS: true,
    }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: "ana@example.com", subject: "Novo assunto",
      text: expect.stringContaining("Obrigado, <Ana>!"),
      html: expect.stringContaining("Obrigado, &lt;Ana&gt;!"),
    }));
    expect(updated[0]).toMatchObject({
      table: donorPledges,
      values: { welcome_email_sent_at: expect.any(String) },
    });
    expect(close).toHaveBeenCalled();
  });

  it("does not mark an email as sent when SMTP rejects it", async () => {
    sendMail.mockRejectedValue(new Error("rejected"));
    await expect(sendDonorWelcomeEmail({ id: "d1", email: "ana@example.com" })).rejects.toThrow("rejected");
    expect(updated).toHaveLength(0);
    expect(close).toHaveBeenCalled();
  });
});
