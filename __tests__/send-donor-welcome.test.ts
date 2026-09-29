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
    queryFor("documentHeader").findFirst.mockResolvedValue({
      linha1: "Instituição <ANSP>", linha2: "Mantenedora da escola", linha3: "Itatiba/SP", mostrar_selo: true,
    });
    await sendDonorWelcomeEmail({ id: "d1", email: "ana@example.com" });

    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.example.com", port: 587, secure: false, requireTLS: true,
    }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: "ana@example.com", subject: "Novo assunto",
      text: expect.stringContaining("Obrigado, <Ana>!"),
      html: expect.stringContaining("Instituição &lt;ANSP&gt;"),
      attachments: [expect.objectContaining({
        cid: "ansp-document-seal", contentType: "image/png", content: expect.any(Buffer),
      })],
    }));
    expect(sendMail.mock.calls[0][0].text).toContain("Mantenedora da escola\nItatiba/SP\n\nObrigado, <Ana>!");
    expect(sendMail.mock.calls[0][0].html).toContain("Obrigado, &lt;Ana&gt;!");
    expect(sendMail.mock.calls[0][0].attachments[0].content.subarray(0, 8))
      .toEqual(Buffer.from("89504e470d0a1a0a", "hex"));
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

  it("omits the seal when document settings disable it", async () => {
    queryFor("documentHeader").findFirst.mockResolvedValue({
      linha1: "Arca", linha2: "", linha3: "", mostrar_selo: false,
    });
    await sendDonorWelcomeEmail({ id: "d1", email: "ana@example.com" });
    expect(sendMail.mock.calls[0][0].attachments).toBeUndefined();
    expect(sendMail.mock.calls[0][0].html).not.toContain("cid:ansp-document-seal");
  });
});
