import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendEmail } = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock("resend", () => ({ Resend: class { emails = { send: sendEmail }; } }));
vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fakeDb }));

import { sendDonorWelcomeEmail, sendDonorWelcomeTestEmail } from "@/lib/email/send-donor-welcome";
import { donorPledges } from "@/lib/db/schema";
import { queryFor, resetFakeDb, setReturning, updated } from "./helpers/fake-db";

beforeEach(() => {
  resetFakeDb();
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("RESEND_FROM", "Arca <contato@example.com>");
  sendEmail.mockResolvedValue({ data: { id: "msg-1" }, error: null });
});

afterEach(() => vi.unstubAllEnvs());

describe("sendDonorWelcomeEmail", () => {
  it("sends edited content through Resend and marks the donor after provider acceptance", async () => {
    setReturning(donorPledges, [{ id: "d1" }], [{ id: "d1" }]);
    queryFor("donorWelcomeTemplates").findFirst.mockResolvedValue({
      assunto: "Novo assunto", corpo: "Obrigado, <Ana>!",
    });
    queryFor("documentHeader").findFirst.mockResolvedValue({
      linha1: "Instituição <ANSP>", linha2: "Mantenedora da escola", linha3: "Itatiba/SP", mostrar_selo: true,
    });
    expect(await sendDonorWelcomeEmail({ id: "d1", email: "ana@example.com" })).toMatchObject({ status: "sent" });

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      from: "Arca <contato@example.com>", to: ["ana@example.com"], subject: "Novo assunto",
      text: expect.stringContaining("Obrigado, <Ana>!"),
      html: expect.stringContaining("Instituição &lt;ANSP&gt;"),
      attachments: [expect.objectContaining({
        contentId: "ansp-document-seal", contentType: "image/png", filename: "selo-ansp.png",
      })],
    }), expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(sendEmail.mock.calls[0][0].text).toContain("Mantenedora da escola\nItatiba/SP\n\nObrigado, <Ana>!");
    expect(sendEmail.mock.calls[0][0].html).toContain("Obrigado, &lt;Ana&gt;!");
    expect(Buffer.from(sendEmail.mock.calls[0][0].attachments[0].content).subarray(0, 8))
      .toEqual(Buffer.from("89504e470d0a1a0a", "hex"));
    expect(sendEmail.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(updated[0]).toMatchObject({
      table: donorPledges,
      values: {
        welcome_email_reservation_token: expect.any(String),
        welcome_email_reservation_expires_at: expect.any(String),
      },
    });
    expect(updated[1]).toMatchObject({
      table: donorPledges,
      values: {
        welcome_email_sent_at: expect.any(String),
        welcome_email_reservation_token: null,
        welcome_email_reservation_expires_at: null,
      },
    });
  });

  it("does not mark an email as sent when Resend rejects it", async () => {
    setReturning(donorPledges, [{ id: "d1" }]);
    sendEmail.mockResolvedValue({ data: null, error: { message: "rejected" } });
    expect(await sendDonorWelcomeEmail({ id: "d1", email: "ana@example.com" })).toMatchObject({ status: "failed" });
    expect(updated).toHaveLength(2);
    expect(updated[1].values).toMatchObject({
      welcome_email_reservation_token: null,
      welcome_email_reservation_expires_at: null,
    });
    expect(updated[1].values).not.toHaveProperty("welcome_email_sent_at");
  });

  it("does not invoke Resend when another sender holds the active reservation", async () => {
    const expiry = new Date(Date.now() + 30_000).toISOString();
    queryFor("donorPledges").findFirst.mockResolvedValue({
      welcome_email_sent_at: null,
      welcome_email_reservation_token: "held-token",
      welcome_email_reservation_expires_at: expiry,
    });
    expect(await sendDonorWelcomeEmail({ id: "d1", email: "ana@example.com" })).toMatchObject({ status: "in_progress" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("acquires the reservation before sending", async () => {
    setReturning(donorPledges, [{ id: "d1" }], [{ id: "d1" }]);
    await sendDonorWelcomeEmail({ id: "d1", email: "ana@example.com" });
    expect(updated[0].values).toMatchObject({
      welcome_email_reservation_token: expect.any(String),
      welcome_email_reservation_expires_at: expect.any(String),
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("returns already_sent without invoking Resend when acceptance is already recorded", async () => {
    queryFor("donorPledges").findFirst.mockResolvedValue({
      welcome_email_sent_at: "2026-09-28T00:00:00.000Z",
      welcome_email_reservation_token: null,
      welcome_email_reservation_expires_at: null,
    });
    expect(await sendDonorWelcomeEmail({ id: "d1", email: "ana@example.com" })).toMatchObject({ status: "already_sent" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("allows at most one concurrent caller to reach Resend for one donor", async () => {
    setReturning(donorPledges, [{ id: "d1" }], [], [{ id: "d1" }]);
    queryFor("donorPledges").findFirst.mockResolvedValue({
      welcome_email_sent_at: null,
      welcome_email_reservation_token: "active-token",
      welcome_email_reservation_expires_at: new Date(Date.now() + 30_000).toISOString(),
    });

    const results = await Promise.all([
      sendDonorWelcomeEmail({ id: "d1", email: "ana@example.com" }),
      sendDonorWelcomeEmail({ id: "d1", email: "ana@example.com" }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(["in_progress", "sent"]);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("omits the seal when document settings disable it", async () => {
    setReturning(donorPledges, [{ id: "d1" }], [{ id: "d1" }]);
    queryFor("documentHeader").findFirst.mockResolvedValue({
      linha1: "Arca", linha2: "", linha3: "", mostrar_selo: false,
    });
    expect(await sendDonorWelcomeEmail({ id: "d1", email: "ana@example.com" })).toMatchObject({ status: "sent" });
    expect(sendEmail.mock.calls[0][0].attachments).toBeUndefined();
    expect(sendEmail.mock.calls[0][0].html).not.toContain("cid:ansp-document-seal");
  });

  it("sends a marked test using the draft without changing a donor", async () => {
    await sendDonorWelcomeTestEmail({
      email: "teste@example.com", assunto: "Texto novo", corpo: "Rascunho para teste",
    });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: ["teste@example.com"],
      subject: "[TESTE] Texto novo",
      text: expect.stringContaining("Rascunho para teste"),
    }), expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(queryFor("donorWelcomeTemplates").findFirst).not.toHaveBeenCalled();
    expect(updated).toHaveLength(0);
  });
});
