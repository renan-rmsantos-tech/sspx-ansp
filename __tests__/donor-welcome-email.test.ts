import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, sendDonorWelcomeEmail, sendDonorWelcomeTestEmail, revalidatePath } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  sendDonorWelcomeEmail: vi.fn(),
  sendDonorWelcomeTestEmail: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fakeDb }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin }));
vi.mock("@/lib/email/send-donor-welcome", () => ({ sendDonorWelcomeEmail, sendDonorWelcomeTestEmail }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/storage", () => ({ getStorage: () => ({ move: vi.fn() }) }));

import { registerDonorPledge } from "@/app/benfeitor/_actions/donor-actions";
import {
  getDonorEmailSettings,
  retryDonorWelcomeEmail,
  saveDonorEmailTemplate,
  sendDonorTestEmail,
} from "@/app/admin/_actions/donor-email-actions";
import { donorPledges, donorWelcomeTemplates } from "@/lib/db/schema";
import { renderDonorWelcomeEmail } from "@/lib/email/donor-welcome-template";
import { failWrites, inserted, queryFor, resetFakeDb, updated } from "./helpers/fake-db";

const validDonor = {
  nome: "Ana Silva",
  cpf: "529.982.247-25",
  email: "ana@example.com",
  telefone: "11999999999",
  endereco: "Rua das Flores, 1",
  cep: "13250000",
  priorado_capela: "nenhuma" as const,
  frequencia: "mensal" as const,
  duracao: "um_ano" as const,
  valor: 80,
};

beforeEach(() => {
  resetFakeDb();
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ id: "admin", role: "admin" });
  sendDonorWelcomeEmail.mockResolvedValue(undefined);
  sendDonorWelcomeTestEmail.mockResolvedValue(undefined);
});

describe("e-mail de boas-vindas ao benfeitor", () => {
  it("saves registration before sending and does not send for failed registrations", async () => {
    const result = await registerDonorPledge(validDonor);
    expect(result.success).toBe(true);
    expect(inserted[0].table).toBe(donorPledges);
    expect(sendDonorWelcomeEmail).toHaveBeenCalledWith({
      id: expect.any(String), email: "ana@example.com",
    });

    sendDonorWelcomeEmail.mockClear();
    failWrites();
    const failed = await registerDonorPledge(validDonor);
    expect(failed.success).toBe(false);
    expect(sendDonorWelcomeEmail).not.toHaveBeenCalled();
  });

  it("keeps a saved registration when SMTP fails", async () => {
    sendDonorWelcomeEmail.mockRejectedValue(new Error("SMTP unavailable"));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await registerDonorPledge(validDonor)).success).toBe(true);
      expect(inserted).toHaveLength(1);
      expect(errorLog).toHaveBeenCalledWith(
        "[registerDonorPledge] e-mail de boas-vindas não enviado."
      );
    } finally {
      errorLog.mockRestore();
    }
  });

  it("escapes edited text in HTML and includes the institutional header and footer", () => {
    const message = renderDonorWelcomeEmail("Olá <Ana> & família\n\nUma linha", {
      linha1: "Arca <ANSP>", linha2: "Mantenedora", linha3: "", mostrar_selo: false,
    });
    expect(message.html).toContain("Olá &lt;Ana&gt; &amp; família");
    expect(message.html).not.toContain("Olá <Ana>");
    expect(message.html).toContain("Arca &lt;ANSP&gt;");
    expect(message.html).not.toContain("cid:ansp-document-seal");
    expect(message.html).toContain("Obra de Assistência Educacional Católica");
    expect(message.text).toContain("Arca <ANSP>\nMantenedora\n\nOlá <Ana>");
  });
});

describe("administração do modelo", () => {
  it("loads the same document header shown in the PDF settings", async () => {
    queryFor("documentHeader").findFirst.mockResolvedValue({
      linha1: "Arca", linha2: "Colégio São José", linha3: "Itatiba/SP", mostrar_selo: false,
    });
    const settings = await getDonorEmailSettings();
    expect(settings.header).toEqual({
      linha1: "Arca", linha2: "Colégio São José", linha3: "Itatiba/SP", mostrar_selo: false,
    });
  });

  it("validates subject and saves an edited template", async () => {
    expect((await saveDonorEmailTemplate({ assunto: "Assunto\nextra", corpo: "Texto" })).success).toBe(false);
    expect(inserted).toHaveLength(0);

    queryFor("donorWelcomeTemplates").findFirst.mockResolvedValue({ id: "template-1" });
    expect(await saveDonorEmailTemplate({ assunto: "  Boas-vindas  ", corpo: "  Obrigado!  " })).toEqual({ success: true });
    expect(updated[0]).toMatchObject({
      table: donorWelcomeTemplates,
      values: { assunto: "Boas-vindas", corpo: "Obrigado!" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/email-benfeitores");
  });

  it("allows retry only when no send has been confirmed", async () => {
    queryFor("donorPledges").findFirst.mockResolvedValue({
      id: "d1", email: "ana@example.com", welcome_email_sent_at: null,
    });
    expect(await retryDonorWelcomeEmail("d1")).toEqual({ success: true });
    expect(sendDonorWelcomeEmail).toHaveBeenCalledWith({
      id: "d1", email: "ana@example.com", welcome_email_sent_at: null,
    });

    sendDonorWelcomeEmail.mockClear();
    queryFor("donorPledges").findFirst.mockResolvedValue({
      id: "d1", email: "ana@example.com", welcome_email_sent_at: "2026-09-28",
    });
    expect((await retryDonorWelcomeEmail("d1")).success).toBe(false);
    expect(sendDonorWelcomeEmail).not.toHaveBeenCalled();
  });

  it("requires admin rights before editing", async () => {
    requireAdmin.mockRejectedValue(new Error("forbidden"));
    await expect(saveDonorEmailTemplate({ assunto: "Oi", corpo: "Texto" })).rejects.toThrow("forbidden");
    expect(inserted).toHaveLength(0);
  });

  it("validates the test recipient and sends the current draft without a database write", async () => {
    expect((await sendDonorTestEmail({ email: "ana@example.com, outra@example.com", assunto: "Oi", corpo: "Texto" })).success).toBe(false);
    expect((await sendDonorTestEmail({ email: "ana@example.com", assunto: "Oi\nBcc: x", corpo: "Texto" })).success).toBe(false);
    expect(sendDonorWelcomeTestEmail).not.toHaveBeenCalled();

    expect(await sendDonorTestEmail({ email: " ana@example.com ", assunto: " Assunto novo ", corpo: " Rascunho " })).toEqual({ success: true });
    expect(sendDonorWelcomeTestEmail).toHaveBeenCalledWith({
      email: "ana@example.com", assunto: "Assunto novo", corpo: "Rascunho",
    });
    expect(inserted).toHaveLength(0);
    expect(updated).toHaveLength(0);
  });

  it("requires admin rights to send a test email", async () => {
    requireAdmin.mockRejectedValue(new Error("forbidden"));
    await expect(sendDonorTestEmail({ email: "ana@example.com", assunto: "Oi", corpo: "Texto" })).rejects.toThrow("forbidden");
    expect(sendDonorWelcomeTestEmail).not.toHaveBeenCalled();
  });
});
