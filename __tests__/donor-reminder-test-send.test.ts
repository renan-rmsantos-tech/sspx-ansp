import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send: sendEmail }; } }));
vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fakeDb }));

import { sendDonorReminderTestEmail } from "@/lib/email/send-donor-reminder";
import { DONOR_REMINDER_BODY, DONOR_REMINDER_SUBJECT, DONOR_REMINDER_SAMPLE_LINK } from "@/lib/email/donor-reminder-template";
import { inserted, queryFor, resetFakeDb, updated } from "./helpers/fake-db";

const template = { assunto: DONOR_REMINDER_SUBJECT, corpo: DONOR_REMINDER_BODY };

beforeEach(() => {
  resetFakeDb();
  sendEmail.mockReset();
  sendEmail.mockResolvedValue({ data: { id: "test-message" }, error: null });
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("RESEND_FROM", "Arca <noreply@example.test>");
  queryFor("documentHeader").findFirst.mockResolvedValue({ linha1: "Arca Atual", linha2: "Colégio", linha3: "Itatiba", mostrar_selo: false });
});

describe("reminder test sender", () => {
  it("sends a sample to the supplied address with [TESTE], header, and invalid receipt link but no reservation", async () => {
    expect(await sendDonorReminderTestEmail("test@example.test", template)).toMatchObject({ status: "sent" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [message, options] = sendEmail.mock.calls[0];
    expect(message.to).toEqual(["test@example.test"]);
    expect(message.subject).toMatch(/^\[TESTE\]/);
    expect(message.text).toContain("Arca Atual");
    expect(message.text).toContain(DONOR_REMINDER_SAMPLE_LINK);
    expect(message.html).toContain("exemplo.invalid");
    expect(options.idempotencyKey).toBeUndefined();
    expect(inserted).toHaveLength(0);
    expect(updated).toHaveLength(0);
  });

  it("returns a safe uncertain result on timeout", async () => {
    sendEmail.mockRejectedValue(Object.assign(new Error("private@example.test"), { name: "TimeoutError" }));
    expect(await sendDonorReminderTestEmail("test@example.test", template))
      .toEqual({ status: "uncertain", code: "provider_timeout" });
  });

  it("does not contact Resend without configuration", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await sendDonorReminderTestEmail("test@example.test", template))
      .toEqual({ status: "failed", error_code: "configuration" });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
