import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send: sendEmail }; } }));
vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fakeDb }));

import { sendDonorMonthlyInstructionsTestEmail } from "@/lib/email/send-donor-monthly-instructions";
import {
  DONOR_MONTHLY_INSTRUCTIONS_BODY,
  DONOR_MONTHLY_INSTRUCTIONS_SAMPLE_LINK,
  DONOR_MONTHLY_INSTRUCTIONS_SUBJECT,
} from "@/lib/email/donor-monthly-instructions-template";
import { inserted, queryFor, resetFakeDb, updated } from "./helpers/fake-db";

const template = { assunto: DONOR_MONTHLY_INSTRUCTIONS_SUBJECT, corpo: DONOR_MONTHLY_INSTRUCTIONS_BODY };

beforeEach(() => {
  resetFakeDb();
  sendEmail.mockReset();
  sendEmail.mockResolvedValue({ data: { id: "test-message" }, error: null });
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("RESEND_FROM", "Arca <noreply@example.test>");
  queryFor("documentHeader").findFirst.mockResolvedValue({ linha1: "Arca Atual", linha2: "Colégio", linha3: "Itatiba", mostrar_selo: false });
});

describe("monthly instructions test sender", () => {
  it("sends only to the explicit address with [TESTE], institutional header and an invalid receipt link", async () => {
    expect(await sendDonorMonthlyInstructionsTestEmail("qa@example.test", template)).toMatchObject({ status: "sent" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [message, options] = sendEmail.mock.calls[0];
    expect(message.to).toEqual(["qa@example.test"]);
    expect(message.subject).toMatch(/^\[TESTE\]/);
    expect(message.text).toContain("Arca Atual");
    expect(message.text).toContain(DONOR_MONTHLY_INSTRUCTIONS_SAMPLE_LINK);
    expect(message.text).toContain("Link ilustrativo sem validade");
    expect(message.html).toContain("exemplo.invalid");
    expect(options.idempotencyKey).toBeUndefined();
    expect(inserted).toHaveLength(0);
    expect(updated).toHaveLength(0);
  });

  it("returns a safe uncertain category on timeout and never writes a donor attempt", async () => {
    sendEmail.mockRejectedValue(Object.assign(new Error("private@example.test"), { name: "TimeoutError" }));
    expect(await sendDonorMonthlyInstructionsTestEmail("qa@example.test", template))
      .toEqual({ status: "uncertain", code: "provider_timeout" });
    expect(inserted).toHaveLength(0);
  });

  it.each([true, false])("embeds the real QR independently of seal visibility (%s)", async (seal) => {
    queryFor("documentHeader").findFirst.mockResolvedValue({ linha1: "Arca", linha2: "", linha3: "", mostrar_selo: seal });
    await sendDonorMonthlyInstructionsTestEmail("qa@example.test", template);
    const message = sendEmail.mock.calls[0][0];
    const ids = message.attachments.map((attachment: { contentId: string }) => attachment.contentId);
    expect(ids).toEqual(seal ? ["ansp-document-seal", "ansp-pix-acipec-v1"] : ["ansp-pix-acipec-v1"]);
    for (const id of ids) expect(message.html).toContain(`src="cid:${id}"`);
    expect(message.text).toContain("Banco: Santander");
    expect(message.text).toContain("Agência: 0197");
    expect(message.text).toContain("Conta: 13.008.003-2");
    expect(message.text).toContain("42.736.079/0001-63");
  });

  it("does not call Resend without configuration", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await sendDonorMonthlyInstructionsTestEmail("qa@example.test", template))
      .toEqual({ status: "failed", code: "configuration" });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
