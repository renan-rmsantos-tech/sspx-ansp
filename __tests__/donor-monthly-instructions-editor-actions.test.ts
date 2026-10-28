import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, persist, getTemplate, sendTest, revalidatePath } = vi.hoisted(() => ({
  requireAdmin: vi.fn(), persist: vi.fn(), getTemplate: vi.fn(), sendTest: vi.fn(), revalidatePath: vi.fn(),
}));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fakeDb }));
vi.mock("@/lib/email/donor-monthly-instructions-template-store", () => ({
  getDonorMonthlyInstructionsTemplate: getTemplate,
  saveDonorMonthlyInstructionsTemplate: persist,
}));
vi.mock("@/lib/email/send-donor-monthly-instructions", () => ({
  sendDonorMonthlyInstructionsTestEmail: sendTest,
  sendManualDonorMonthlyInstructions: vi.fn(),
}));

import {
  getDonorMonthlyInstructionsSettings,
  previewDonorMonthlyInstructionsTemplate,
  saveDonorMonthlyInstructionsTemplate,
  sendDonorMonthlyInstructionsTest,
} from "@/app/admin/_actions/donor-monthly-instructions-actions";
import {
  DONOR_MONTHLY_INSTRUCTIONS_BODY,
  DONOR_MONTHLY_INSTRUCTIONS_SUBJECT,
} from "@/lib/email/donor-monthly-instructions-template";
import { queryFor, resetFakeDb } from "./helpers/fake-db";

const template = { assunto: DONOR_MONTHLY_INSTRUCTIONS_SUBJECT, corpo: DONOR_MONTHLY_INSTRUCTIONS_BODY };

beforeEach(() => {
  vi.clearAllMocks();
  resetFakeDb();
  requireAdmin.mockResolvedValue({ id: "admin" });
  getTemplate.mockResolvedValue(template);
  persist.mockImplementation(async (value) => value);
  sendTest.mockResolvedValue({ status: "sent", messageId: "test" });
  queryFor("documentHeader").findFirst.mockResolvedValue({ linha1: "Arca Atual", linha2: "Colégio", linha3: "Itatiba", mostrar_selo: false });
});

describe("monthly instructions editor actions", () => {
  it("requires an administrator before reads and every mutation", async () => {
    requireAdmin.mockRejectedValue(new Error("permissão"));
    await expect(getDonorMonthlyInstructionsSettings()).rejects.toThrow("permissão");
    await expect(previewDonorMonthlyInstructionsTemplate(template)).rejects.toThrow("permissão");
    await expect(saveDonorMonthlyInstructionsTemplate(template)).rejects.toThrow("permissão");
    await expect(sendDonorMonthlyInstructionsTest({ ...template, email: "qa@example.test" })).rejects.toThrow("permissão");
    expect(getTemplate).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
    expect(sendTest).not.toHaveBeenCalled();
  });

  it("returns the saved template and institutional header, then previews draft edits", async () => {
    expect(await getDonorMonthlyInstructionsSettings()).toMatchObject({ template, header: { linha1: "Arca Atual" } });
    const result = await previewDonorMonthlyInstructionsTemplate({ ...template, assunto: "Pagamento de {valor}" });
    expect(result).toMatchObject({ success: true, preview: { assunto: expect.stringMatching(/Pagamento de R\$\s100,00/), header: { linha1: "Arca Atual" } } });
    if (result.success) {
      expect(result.preview.bodyHtml).toContain("exemplo.invalid");
      expect(result.preview.bodyHtml).toContain("último dia daquele mês");
    }
    expect(persist).not.toHaveBeenCalled();
  });

  it("rejects invalid templates and addresses before persistence or mail", async () => {
    const invalid = { ...template, corpo: "Sem dados" };
    expect(await saveDonorMonthlyInstructionsTemplate(invalid)).toMatchObject({ success: false, error: expect.stringContaining("{valor}") });
    expect(await previewDonorMonthlyInstructionsTemplate(invalid)).toMatchObject({ success: false, error: expect.stringContaining("{valor}") });
    for (const email of ["", "not-an-email", "first@example.test,second@example.test", "first@example.test\nBcc:other@example.test"]) {
      expect(await sendDonorMonthlyInstructionsTest({ ...template, email })).toMatchObject({ success: false, error: expect.stringContaining("e-mail válido") });
    }
    expect(await sendDonorMonthlyInstructionsTest({ ...invalid, email: "qa@example.test" })).toMatchObject({ success: false, error: expect.stringContaining("{valor}") });
    expect(persist).not.toHaveBeenCalled();
    expect(sendTest).not.toHaveBeenCalled();
  });

  it("saves trimmed content and sends only the validated explicit recipient", async () => {
    expect(await saveDonorMonthlyInstructionsTemplate({ assunto: ` ${template.assunto} `, corpo: ` ${template.corpo} ` })).toMatchObject({ success: true, template });
    expect(persist).toHaveBeenCalledWith(template);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/instrucoes-benfeitores");
    expect(await sendDonorMonthlyInstructionsTest({ ...template, email: " qa@example.test " })).toEqual({ success: true });
    expect(sendTest).toHaveBeenCalledWith("qa@example.test", template);
  });

  it("returns a safe message for provider uncertainty or private failures", async () => {
    sendTest.mockResolvedValueOnce({ status: "uncertain", code: "provider_timeout" });
    expect(await sendDonorMonthlyInstructionsTest({ ...template, email: "qa@example.test" })).toMatchObject({ success: false, error: expect.stringContaining("incerto") });
    sendTest.mockRejectedValueOnce(new Error("private provider body"));
    expect(await sendDonorMonthlyInstructionsTest({ ...template, email: "qa@example.test" })).toMatchObject({ success: false, error: expect.not.stringContaining("private") });
    persist.mockRejectedValueOnce(new Error("private database detail"));
    expect(await saveDonorMonthlyInstructionsTemplate(template)).toMatchObject({ success: false, error: expect.not.stringContaining("private") });
  });
});
