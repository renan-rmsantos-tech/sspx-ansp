// @vitest-environment node
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUser, sendEmail, revalidatePath } = vi.hoisted(() => ({
  getSessionUser: vi.fn(), sendEmail: vi.fn(), revalidatePath: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getSessionUser }));
vi.mock("resend", () => ({ Resend: class { emails = { send: sendEmail }; } }));
vi.mock("next/cache", () => ({ revalidatePath }));
// A página /admin/emails tem abas sincronizadas com `?aba=`; fora do App
// Router, `useSearchParams`/`useRouter` precisam de um duplo.
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("aba=instrucoes"),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/admin/emails",
}));

const databaseUrl = process.env.DATABASE_URL_TEST;
const integration = describe.skipIf(!databaseUrl);
const isolatedSchema = `task22_${randomUUID().replaceAll("-", "")}`;
const adminId = randomUUID();
const secretariatId = randomUUID();

integration("monthly instructions admin editor with PostgreSQL", () => {
  const baseSql = databaseUrl ? postgres(databaseUrl, { max: 1 }) : null;
  let db: typeof import("@/lib/db").db;
  let actions: typeof import("@/app/admin/_actions/donor-monthly-instructions-actions");
  let page: typeof import("@/app/admin/emails/page").default;
  let schema: typeof import("@/lib/db/schema");

  function bootstrap() {
    execFileSync(process.execPath, ["--env-file-if-exists=.env", "--import", "tsx", "scripts/bootstrap.ts"], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL, ADMIN_EMAIL: "", ADMIN_PASSWORD: "" },
      timeout: 30_000,
    });
  }

  beforeAll(async () => {
    await baseSql!.unsafe(`CREATE SCHEMA "${isolatedSchema}"`);
    for (const table of [
      "admin_users", "school_years", "decision_templates", "contract_templates",
      "document_header", "donor_welcome_templates", "donor_reminder_templates",
      "donor_monthly_instruction_templates", "donor_monthly_instruction_sends",
      // A página /admin/emails também carrega boas-vindas e lembretes.
      "donor_pledges", "donor_payment_ledger", "donor_reminder_sends",
    ]) {
      await baseSql!.unsafe(`CREATE TABLE "${isolatedSchema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
    }
    const scopedUrl = new URL(databaseUrl!);
    scopedUrl.searchParams.set("options", `-csearch_path=${isolatedSchema}`);
    vi.stubEnv("DATABASE_URL", scopedUrl.toString());
    vi.stubEnv("AUTH_BYPASS", "false");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("RESEND_FROM", "Arca <noreply@example.test>");
    ({ db } = await import("@/lib/db"));
    const [{ current_schema }] = await db.$client`SELECT current_schema()`;
    if (current_schema !== isolatedSchema) throw new Error("Task 22 test schema was not selected");
    schema = await import("@/lib/db/schema");
    actions = await import("@/app/admin/_actions/donor-monthly-instructions-actions");
    ({ default: page } = await import("@/app/admin/emails/page"));
    await db.insert(schema.adminUsers).values([
      { id: adminId, email: `${adminId}@example.test`, password_hash: "test", role: "admin" },
      { id: secretariatId, email: `${secretariatId}@example.test`, password_hash: "test", role: "secretaria" },
    ]);
    bootstrap();
  });

  beforeEach(() => {
    getSessionUser.mockResolvedValue({ id: adminId, email: `${adminId}@example.test` });
    sendEmail.mockReset();
    sendEmail.mockResolvedValue({ data: { id: `msg_${randomUUID()}` }, error: null });
  });

  afterAll(async () => {
    if (db) await db.$client.end();
    if (baseSql) {
      await baseSql.unsafe(`DROP SCHEMA IF EXISTS "${isolatedSchema}" CASCADE`);
      await baseSql.end();
    }
    vi.unstubAllEnvs();
  });

  it("saves and reloads an administrator edit without bootstrap overwriting it", async () => {
    const { DONOR_MONTHLY_INSTRUCTIONS_BODY } = await import("@/lib/email/donor-monthly-instructions-template");
    const edited = { assunto: "Instruções atualizadas para {nome}", corpo: `${DONOR_MONTHLY_INSTRUCTIONS_BODY}\n\nAtenciosamente.` };
    expect(await actions.saveDonorMonthlyInstructionsTemplate(edited)).toMatchObject({ success: true, template: edited });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/instrucoes-benfeitores");
    expect((await actions.getDonorMonthlyInstructionsSettings()).template).toEqual(edited);
    expect(renderToStaticMarkup(await page())).toContain("Instruções atualizadas para {nome}");
    bootstrap();
    expect((await actions.getDonorMonthlyInstructionsSettings()).template).toEqual(edited);
    expect(await db.$client`SELECT id FROM donor_monthly_instruction_templates`).toHaveLength(1);
  }, 30_000);

  it("sends [TESTE] only to the explicit address with a nonfunctional link and no donor attempt", async () => {
    const template = (await actions.getDonorMonthlyInstructionsSettings()).template;
    const before = await db.$client`SELECT id FROM donor_monthly_instruction_sends`;
    expect(await actions.sendDonorMonthlyInstructionsTest({ ...template, email: "qa@example.test" })).toEqual({ success: true });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].to).toEqual(["qa@example.test"]);
    expect(sendEmail.mock.calls[0][0].subject).toMatch(/^\[TESTE\]/);
    expect(sendEmail.mock.calls[0][0].text).toContain("EXEMPLO-SEM-VALIDADE");
    expect(await db.$client`SELECT id FROM donor_monthly_instruction_sends`).toHaveLength(before.length);
  });

  it("denies Secretaria and unauthenticated direct page, read, save, preview, and test calls", async () => {
    const template = (await actions.getDonorMonthlyInstructionsSettings()).template;
    for (const identity of [{ id: secretariatId, email: `${secretariatId}@example.test` }, null]) {
      getSessionUser.mockResolvedValue(identity);
      await expect(page()).rejects.toThrow(identity ? "permissão" : "login");
      await expect(actions.getDonorMonthlyInstructionsSettings()).rejects.toThrow(identity ? "permissão" : "login");
      await expect(actions.saveDonorMonthlyInstructionsTemplate(template)).rejects.toThrow(identity ? "permissão" : "login");
      await expect(actions.previewDonorMonthlyInstructionsTemplate(template)).rejects.toThrow(identity ? "permissão" : "login");
      await expect(actions.sendDonorMonthlyInstructionsTest({ ...template, email: "qa@example.test" })).rejects.toThrow(identity ? "permissão" : "login");
    }
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
