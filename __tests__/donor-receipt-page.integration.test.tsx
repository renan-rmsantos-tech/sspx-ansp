// @vitest-environment node
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createDonorReceiptLink, createDonorReceiptTicket } from "@/lib/donor-receipts/tickets";
import { DONOR_MONTHLY_INSTRUCTIONS_BODY, DONOR_MONTHLY_INSTRUCTIONS_SUBJECT, renderDonorMonthlyInstructions } from "@/lib/email/donor-monthly-instructions-template";
import { DONOR_REMINDER_BODY, DONOR_REMINDER_SUBJECT, renderDonorReminder } from "@/lib/email/donor-reminder-template";
import { getStorage } from "@/lib/storage";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const databaseUrl = process.env.DATABASE_URL_TEST;
const integration = describe.skipIf(!databaseUrl);
const id = randomUUID();
const otherId = randomUUID();
const isolated = `receipt_page_${randomUUID().replaceAll("-", "")}`;
const nextMonth = new Date();
nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
const competence = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, "0")}`;
const dueDate = `${competence}-05`;

integration("public receipt page and upload with PostgreSQL", () => {
  const client = databaseUrl ? postgres(databaseUrl, { max: 1 }) : null;
  let storageDir = "";
  let ticket = "";
  let activePath: string | null = null;
  let ReceiptPage: typeof import("@/app/benfeitor/comprovante/page").default;
  let POST: typeof import("@/app/api/donor-receipts/route").POST;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeAll(async () => {
    process.env.SESSION_SECRET = "t".repeat(40);
    storageDir = await mkdtemp(join(tmpdir(), "ansp-task17-receipt-"));
    process.env.STORAGE_DIR = storageDir;
    await client!.unsafe(`CREATE SCHEMA "${isolated}"`);
    await client!.unsafe(`SET search_path TO "${isolated}"`);
    await client!.unsafe(`CREATE TABLE donor_pledges (
      id uuid PRIMARY KEY, nome text NOT NULL, frequencia text NOT NULL
    )`);
    await client!.unsafe(`CREATE TABLE donor_payment_ledger (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pledge_id uuid REFERENCES donor_pledges(id) ON DELETE CASCADE,
      competencia text NOT NULL, due_date date NOT NULL, expected_value numeric(12,2) NOT NULL,
      receipt_path text, receipt_name text, receipt_uploaded_at timestamptz,
      updated_at timestamptz DEFAULT now(), status text NOT NULL DEFAULT 'pendente',
      received_value numeric(12,2) DEFAULT 0, credit_date date,
      confirmed_by uuid, confirmed_at timestamptz, note text,
      UNIQUE (pledge_id, competencia)
    )`);
    const scopedUrl = new URL(databaseUrl!);
    scopedUrl.searchParams.set("options", `-csearch_path=${isolated}`);
    process.env.DATABASE_URL = scopedUrl.toString();
    ReceiptPage = (await import("@/app/benfeitor/comprovante/page")).default;
    POST = (await import("@/app/api/donor-receipts/route")).POST;
    await client!`INSERT INTO donor_pledges
      (id, nome, frequencia)
      VALUES (${id}, 'Ana Sobrenome', 'mensal'), (${otherId}, 'Beatriz Outro', 'mensal')`;
    await client!`INSERT INTO donor_payment_ledger (pledge_id, competencia, due_date, expected_value)
      VALUES (${id}, ${competence}, ${dueDate}, 80), (${otherId}, ${competence}, ${dueDate}, 95)`;
    ticket = createDonorReceiptTicket(id, competence, dueDate);
  });

  afterAll(async () => {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (client) {
      await client.unsafe("SET search_path TO public");
      await client.unsafe(`DROP SCHEMA IF EXISTS "${isolated}" CASCADE`);
      await client.end();
    }
    if (activePath) await getStorage().remove(activePath);
    if (storageDir) await rm(storageDir, { recursive: true, force: true });
  });

  it("opens without changing a row or writing a file, and renders no other personal data", async () => {
    const before = await client!`SELECT pledge_id, receipt_path, updated_at FROM donor_payment_ledger
      WHERE pledge_id IN (${id}, ${otherId}) ORDER BY pledge_id`;
    const html = renderToStaticMarkup(await ReceiptPage({ searchParams: Promise.resolve({ ticket }) }));
    expect(html).toContain("Olá, Ana.");
    expect(html).toContain("R$");
    expect(html).toContain("80,00");
    expect(html).toContain("Comprovante pendente");
    expect(html).toContain("Cada pagamento mensal exige seu próprio comprovante");
    expect(html).not.toMatch(/Sobrenome|Beatriz|@example|000\.000|donors\/|receipt_path/);
    expect(html).not.toMatch(/(?:src|href)="https?:\/\//);
    expect(await client!`SELECT pledge_id, receipt_path, updated_at FROM donor_payment_ledger
      WHERE pledge_id IN (${id}, ${otherId}) ORDER BY pledge_id`).toEqual(before);
    expect(await readdir(storageDir)).toEqual([]);
  });

  it("gives an expired ticket the same no-detail state", async () => {
    const expired = createDonorReceiptTicket(id, "2024-01", "2024-01-05");
    const html = renderToStaticMarkup(await ReceiptPage({ searchParams: Promise.resolve({ ticket: expired }) }));
    expect(html).toContain("Este link não está disponível");
    expect(html).not.toMatch(/Ana|80,00|Sobrenome|@example/);
  });

  it("accepts one file from the page's same-origin upload and changes only its occurrence", async () => {
    const instructionsLink = createDonorReceiptLink("https://example.test", id, competence, dueDate);
    const reminderLink = createDonorReceiptLink("https://example.test", id, competence, dueDate);
    const instructions = renderDonorMonthlyInstructions({
      template: { assunto: DONOR_MONTHLY_INSTRUCTIONS_SUBJECT, corpo: DONOR_MONTHLY_INSTRUCTIONS_BODY },
      nome: "Ana", valor: 80, dia_vencimento: 5, data_primeiro_vencimento: dueDate,
      duracao: "um_ano", receipt_competencia: competence, link_comprovante: instructionsLink,
    });
    const reminder = renderDonorReminder({
      template: { assunto: DONOR_REMINDER_SUBJECT, corpo: DONOR_REMINDER_BODY },
      nome: "Ana", valor: 80, data_vencimento: dueDate,
      mes_referencia: competence, link_comprovante: reminderLink,
    });
    expect(instructions.text).toContain(instructionsLink);
    expect(reminder.text).toContain(reminderLink);
    const instructionTicket = new URL(instructionsLink).searchParams.get("ticket")!;
    const reminderTicket = new URL(reminderLink).searchParams.get("ticket")!;
    for (const signedTicket of [instructionTicket, reminderTicket]) {
      const pending = renderToStaticMarkup(await ReceiptPage({ searchParams: Promise.resolve({ ticket: signedTicket }) }));
      expect(pending).toContain("Comprovante pendente");
      expect(pending).toContain("Olá, Ana.");
    }
    const form = new FormData();
    form.set("ticket", instructionTicket);
    form.set("file", new File(["%PDF-1.7\nproof\n%%EOF"], "proof.pdf", { type: "application/pdf" }));
    const request = new NextRequest("http://localhost:3000/api/donor-receipts", {
      method: "POST", headers: { origin: "http://localhost:3000" }, body: form,
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ message: expect.stringContaining("conferência bancária") });
    const [row] = await client!`SELECT receipt_path, receipt_uploaded_at FROM donor_payment_ledger WHERE pledge_id = ${id}`;
    activePath = row.receipt_path;
    expect(row.receipt_uploaded_at).toBeTruthy();
    expect(activePath).toMatch(new RegExp(`^donors/${id}/payments/${competence}/`));
    expect(await getStorage().size(activePath!)).toBeGreaterThan(0);
    expect(await client!`SELECT receipt_path FROM donor_payment_ledger WHERE pledge_id = ${otherId}`)
      .toMatchObject([{ receipt_path: null }]);
    const updatedHtml = renderToStaticMarkup(await ReceiptPage({ searchParams: Promise.resolve({ ticket: reminderTicket }) }));
    expect(updatedHtml).toContain("Comprovante enviado – aguardando conferência");
    expect(updatedHtml).not.toMatch(/donors\/|receipt_path|confirmed_by/);
  });

  it("accepts a missing receipt after bank confirmation without revealing or changing the bank state", async () => {
    await client!`UPDATE donor_payment_ledger SET status = 'confirmado', received_value = 95
      WHERE pledge_id = ${otherId} AND competencia = ${competence}`;
    const confirmedTicket = createDonorReceiptTicket(otherId, competence, dueDate);
    const before = renderToStaticMarkup(await ReceiptPage({ searchParams: Promise.resolve({ ticket: confirmedTicket }) }));
    expect(before).toContain("Comprovante pendente");
    expect(before).not.toContain("confirmado");
    const form = new FormData();
    form.set("ticket", confirmedTicket);
    form.set("file", new File(["%PDF-1.7\nproof\n%%EOF"], "late.pdf", { type: "application/pdf" }));
    const response = await POST(new NextRequest("http://localhost:3000/api/donor-receipts", {
      method: "POST", headers: { origin: "http://localhost:3000" }, body: form,
    }));
    expect(response.status).toBe(200);
    const [row] = await client!`SELECT status, received_value::text AS received_value, receipt_path
      FROM donor_payment_ledger WHERE pledge_id = ${otherId} AND competencia = ${competence}`;
    expect(row).toMatchObject({ status: "confirmado", received_value: "95.00", receipt_path: expect.any(String) });
    activePath = row.receipt_path;
    const after = renderToStaticMarkup(await ReceiptPage({ searchParams: Promise.resolve({ ticket: confirmedTicket }) }));
    expect(after).toContain("Comprovante enviado – aguardando conferência");
    expect(after).not.toMatch(/confirmado|donors\/|receipt_path/);
  });
});
