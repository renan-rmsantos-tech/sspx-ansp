import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, revalidatePath, retryService, sendTestService } = vi.hoisted(() => ({
  requireAdmin: vi.fn(), revalidatePath: vi.fn(), retryService: vi.fn(), sendTestService: vi.fn(),
}));
vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fakeDb }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/email/send-donor-reminder", () => ({
  retryFailedDonorReminderSend: retryService,
  sendDonorReminderTestEmail: sendTestService,
}));

import {
  getDonorReminderDashboard, previewDonorReminderTemplate,
  resolveUncertainDonorReminder, retryFailedDonorReminder,
  saveDonorReminderTemplate, sendDonorReminderTest,
} from "@/app/admin/_actions/donor-reminder-actions";
import { donorReminderSends, donorReminderTemplates } from "@/lib/db/schema";
import { DONOR_REMINDER_BODY, DONOR_REMINDER_SUBJECT, DONOR_REMINDER_SAMPLE_LINK } from "@/lib/email/donor-reminder-template";
import { PIX_DETAILS } from "@/lib/data/pix-details";
import { inserted, queryFor, resetFakeDb, setReturning, updated } from "./helpers/fake-db";

const valid = { assunto: DONOR_REMINDER_SUBJECT, corpo: DONOR_REMINDER_BODY };
const id = "6bc02966-e9d4-4987-8af2-1d724bdc8aac";

beforeEach(() => {
  resetFakeDb();
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ id: "admin", role: "admin" });
  sendTestService.mockResolvedValue({ status: "sent", messageId: "test-1" });
  retryService.mockResolvedValue({ status: "sent", sent_at: "2026-10-10T12:00:00Z" });
});

describe("administrator reminder actions", () => {
  it("rejects direct non-admin calls before reads, writes, or sends", async () => {
    requireAdmin.mockRejectedValue(new Error("Você não tem permissão"));
    await expect(getDonorReminderDashboard()).rejects.toThrow("permissão");
    await expect(previewDonorReminderTemplate(valid)).rejects.toThrow("permissão");
    await expect(saveDonorReminderTemplate(valid)).rejects.toThrow("permissão");
    await expect(sendDonorReminderTest({ ...valid, email: "teste@example.test" })).rejects.toThrow("permissão");
    await expect(retryFailedDonorReminder(id)).rejects.toThrow("permissão");
    await expect(resolveUncertainDonorReminder(id, "accepted")).rejects.toThrow("permissão");
    expect(inserted).toHaveLength(0);
    expect(updated).toHaveLength(0);
    expect(retryService).not.toHaveBeenCalled();
    expect(sendTestService).not.toHaveBeenCalled();
  });

  it("previews all sample values and the current institutional header", async () => {
    queryFor("documentHeader").findFirst.mockResolvedValue({
      linha1: "Arca Atual", linha2: "Colégio", linha3: "Itatiba", mostrar_selo: false,
    });
    const result = await previewDonorReminderTemplate(valid);
    expect(result.success).toBe(true);
    expect(result.preview?.assunto).toContain("15/11/2026");
    expect(result.preview?.bodyHtml).toContain("R$ 100,00");
    expect(result.preview?.bodyHtml).toContain(PIX_DETAILS.key);
    expect(result.preview?.header.linha1).toBe("Arca Atual");
    expect(result.preview?.bodyHtml).toContain("exemplo.invalid");
    expect(result.preview?.bodyHtml).toContain("Enviar comprovante");
    expect(DONOR_REMINDER_SAMPLE_LINK).toContain("EXEMPLO-SEM-VALIDADE");
    expect(queryFor("documentHeader").findFirst).toHaveBeenCalled();
  });

  it("rejects missing link, unknown tokens, and overlong content before writing", async () => {
    expect(await saveDonorReminderTemplate({ ...valid, corpo: "Sem o link" })).toMatchObject({ success: false, error: expect.stringContaining("{link_comprovante}") });
    expect(await saveDonorReminderTemplate({ ...valid, corpo: "{desconhecido} {link_comprovante}" })).toMatchObject({ success: false, error: expect.stringContaining("Token não permitido") });
    expect(await saveDonorReminderTemplate({ ...valid, assunto: "a".repeat(161) })).toMatchObject({ success: false });
    expect(inserted).toHaveLength(0);
    expect(updated).toHaveLength(0);
  });

  it("saves a valid template and reads the latest sends without exposing frozen payloads", async () => {
    expect(await saveDonorReminderTemplate(valid)).toMatchObject({ success: true });
    expect(inserted[0].table).toBe(donorReminderTemplates);
    // The fake Drizzle writer records updates only when a `.where()` follows.
    // PostgreSQL integration covers the singleton update itself.
    expect(revalidatePath).toHaveBeenCalledWith("/admin/lembretes-benfeitores");

    queryFor("donorReminderSends").findMany.mockResolvedValue([{ id, pledge_id: id, competencia: "2026-11", kind: "10d", due_date: "2026-11-20", status: "sent", sent_at: "2026-11-10T12:00:00Z", error_code: null, attempt_count: 1, reservation_expires_at: null, provider_message_id: "msg", frozen_text: "private" }]);
    queryFor("donorPledges").findMany.mockResolvedValue([{ id, nome: "Ana", frequencia: "mensal", duracao: "indeterminado", dia_vencimento: 20, lembrete_canal: "email", created_at: "2026-10-01T12:00:00Z" }]);
    const dashboard = await getDonorReminderDashboard();
    expect(dashboard.sends[0]).toMatchObject({ nome: "Ana", status: "sent", can_retry: false });
    expect(JSON.stringify(dashboard)).not.toContain("private");
  });

  it("validates a distinct test recipient and current draft without creating a send row", async () => {
    expect(await sendDonorReminderTest({ ...valid, email: "a@example.test,b@example.test" })).toMatchObject({ success: false });
    expect(await sendDonorReminderTest({ ...valid, email: "test@example.test", corpo: "link ausente" })).toMatchObject({ success: false });
    expect(sendTestService).not.toHaveBeenCalled();
    expect(await sendDonorReminderTest({ ...valid, email: " test@example.test " })).toEqual({ success: true });
    expect(sendTestService).toHaveBeenCalledWith("test@example.test", valid);
    expect(inserted.filter((entry) => entry.table === donorReminderSends)).toHaveLength(0);
    expect(updated.filter((entry) => entry.table === donorReminderSends)).toHaveLength(0);
  });

  it("reports safe test failures without provider details", async () => {
    sendTestService.mockResolvedValue({ status: "uncertain", code: "provider_timeout", detail: "secret@example.test" });
    const result = await sendDonorReminderTest({ ...valid, email: "test@example.test" });
    expect(result).toMatchObject({ success: false, error: expect.stringContaining("incerto") });
    expect(JSON.stringify(result)).not.toContain("secret@example.test");
  });

  it("delegates valid retry IDs and guards resolution with a conditional state update", async () => {
    expect(await retryFailedDonorReminder("invalid")).toEqual({ status: "expired" });
    expect(retryService).not.toHaveBeenCalled();
    expect(await retryFailedDonorReminder(id)).toMatchObject({ status: "sent" });
    expect(retryService).toHaveBeenCalledWith(id);
    expect(await resolveUncertainDonorReminder(id, "accepted")).toMatchObject({ success: false });
    setReturning(donorReminderSends, [{ id }]);
    expect(await resolveUncertainDonorReminder(id, "failed")).toMatchObject({ success: true, status: "failed" });
    expect(updated.at(-1)).toMatchObject({ table: donorReminderSends, values: { status: "failed", sent_at: null, error_code: "unknown" } });
    expect(await resolveUncertainDonorReminder(id, "accepted")).toMatchObject({ success: true, status: "sent" });
    expect(updated.at(-1)).toMatchObject({ table: donorReminderSends, values: { status: "sent", sent_at: expect.any(String), error_code: null } });
  });
});
