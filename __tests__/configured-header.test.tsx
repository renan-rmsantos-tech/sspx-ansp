import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ send: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fakeDb }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mocks.send }; } }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: vi.fn(async () => ({ id: "admin" })), requireCapability: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

import { sendDonorWelcomeEmail, sendDonorWelcomeTestEmail } from "@/lib/email/send-donor-welcome";
import { sendDonorMonthlyInstructionsTestEmail } from "@/lib/email/send-donor-monthly-instructions";
import { sendDonorReminderTestEmail } from "@/lib/email/send-donor-reminder";
import { getDonorEmailSettings } from "@/app/admin/_actions/donor-email-actions";
import { getDonorMonthlyInstructionsSettings } from "@/app/admin/_actions/donor-monthly-instructions-actions";
import { getDonorReminderDashboard } from "@/app/admin/_actions/donor-reminder-actions";
import { saveDocumentHeader } from "@/app/admin/_actions/admin-actions";
import { DONOR_MONTHLY_INSTRUCTIONS_BODY, DONOR_MONTHLY_INSTRUCTIONS_SUBJECT } from "@/lib/email/donor-monthly-instructions-template";
import { DONOR_REMINDER_BODY, DONOR_REMINDER_SUBJECT } from "@/lib/email/donor-reminder-template";
import { DocumentHeaderPreview } from "@/app/admin/_components/document-header-preview";
import { InstitutionalEmailPreview } from "@/app/admin/_components/institutional-email-preview";
import { donorPledges } from "@/lib/db/schema";
import { queryFor, resetFakeDb, setReturning, updated } from "./helpers/fake-db";
import { DEFAULT_DOCUMENT_HEADER, resolveDocumentHeader } from "@/lib/documents/document-header";

const initial = { linha1: 'Fundação São Tomé & <Filhos>', linha2: 'Educação "Católica"', linha3: "Itatiba • São Paulo", mostrar_selo: false, rodape_institucional: "Obra & <São José>\nEducação Católica\nItatiba" };
const monthly = { assunto: DONOR_MONTHLY_INSTRUCTIONS_SUBJECT, corpo: DONOR_MONTHLY_INSTRUCTIONS_BODY };
const reminder = { assunto: DONOR_REMINDER_SUBJECT, corpo: DONOR_REMINDER_BODY };
const settings = [getDonorEmailSettings, getDonorMonthlyInstructionsSettings, getDonorReminderDashboard];
const sends = [
  () => sendDonorWelcomeTestEmail({ email: "qa@example.test", assunto: "Teste", corpo: "Mensagem." }),
  () => sendDonorMonthlyInstructionsTestEmail("qa@example.test", monthly),
  () => sendDonorReminderTestEmail("qa@example.test", reminder),
  () => sendDonorWelcomeEmail({ id: "donor", email: "qa@example.test" }),
];

beforeEach(() => {
  resetFakeDb();
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("RESEND_FROM", "qa@example.test");
  mocks.send.mockResolvedValue({ data: { id: "mock-message" } });
  setReturning(donorPledges, [{ id: "donor" }]);
});

it("uses saved configuration at every email/settings boundary, observes saves, and omits cleared fields", async () => {
  queryFor("documentHeader").findFirst.mockResolvedValue({ id: "header", ...initial });
  for (const next of [initial, { ...initial, rodape_institucional: "" }, { ...initial, rodape_institucional: DEFAULT_DOCUMENT_HEADER.rodape_institucional }, { ...initial, linha1: "Instituição Renovada", linha2: "", linha3: "", mostrar_selo: true }]) {
    await saveDocumentHeader(next);
    // The fake DB records writes rather than implementing persistence.
    const saved = updated.at(-1)!.values;
    queryFor("documentHeader").findFirst.mockResolvedValue(saved);
    for (const action of settings) expect((await action()).header).toEqual(resolveDocumentHeader(next));
    const preview = renderToStaticMarkup(<DocumentHeaderPreview header={next} />);
    expect(preview).toContain(next.linha1 === initial.linha1 ? "Fundação São Tomé &amp; &lt;Filhos&gt;" : next.linha1);
    expect(preview.includes("<img")).toBe(next.mostrar_selo);
    for (const send of sends) {
      await send();
      const message = mocks.send.mock.calls.at(-1)![0];
      if (next.rodape_institucional?.trim()) {
        expect(message.text).toContain(next.rodape_institucional);
        expect(message.html).not.toContain("<São José>");
      } else expect(message.html).not.toContain("data-email-footer");
      const markup = document.createElement("div");
      markup.innerHTML = message.html;
      expect(Array.from(markup.querySelector("[data-email-header]")!.children).map((node) => node.textContent).join("")).toBe(
        [next.linha1, next.linha2, next.linha3].join("")
      );
      for (const line of [next.linha1, next.linha2, next.linha3].filter(Boolean)) expect(message.text).toContain(line);
      expect(message.attachments?.some((entry: { contentId: string }) => entry.contentId === "ansp-document-seal") ?? false).toBe(next.mostrar_selo);
      expect(Boolean(markup.querySelector("[data-email-header] img"))).toBe(next.mostrar_selo);
      const browserPreview = renderToStaticMarkup(<InstitutionalEmailPreview bodyHtml="Mensagem." header={next} />);
      const browser = document.createElement("div");
      browser.innerHTML = browserPreview;
      expect(browser.querySelector("[data-email-footer]")?.textContent).toBe(markup.querySelector("[data-email-footer]")?.textContent);
      expect(browser.querySelector("[data-email-header]")!.textContent).toBe(markup.querySelector("[data-email-header]")!.textContent);
      if (!next.linha2) expect(message.html).not.toContain("Educação &quot;Católica&quot;");
    }
  }
});

it("uses defaults only for a missing row; DB errors block settings and all sends without leaking details", async () => {
  for (const action of settings) expect((await action()).header).toEqual(DEFAULT_DOCUMENT_HEADER);
  queryFor("documentHeader").findFirst.mockRejectedValue(new Error("private@example.test"));
  for (const action of settings) await expect(action()).rejects.toThrow("Não foi possível carregar o cabeçalho institucional");
  for (const send of sends.slice(0, 3)) await expect(send()).rejects.toThrow("Não foi possível carregar o cabeçalho institucional");
  expect(await sends[3]()).toMatchObject({ status: "failed" });
  expect(mocks.send).not.toHaveBeenCalled();
});

it.each(["x".repeat(81), "a\nb\nc\nd\ne", "x".repeat(324), "a\tb"])("rejects invalid footer without writing (%s)", async (footer) => {
  expect(await saveDocumentHeader({ ...initial, rodape_institucional: footer })).toMatchObject({ success: false });
  expect(updated).toHaveLength(0);
});

it("requires an administrator before any settings write", async () => {
  const { requireAdmin } = await import("@/lib/auth/authorization");
  vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Sem permissão"));
  await expect(saveDocumentHeader(initial)).rejects.toThrow("Sem permissão");
  expect(updated).toHaveLength(0);
});
