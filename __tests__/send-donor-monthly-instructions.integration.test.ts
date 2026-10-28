// @vitest-environment node
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { verifyDonorReceiptTicket } from "@/lib/donor-receipts/tickets";
import { saoPauloDate } from "@/lib/donor-recurrence";
import { monthlyInstructionsProviderKey } from "@/lib/email/donor-monthly-instructions-template";

const { sendEmail, sendWelcome } = vi.hoisted(() => ({ sendEmail: vi.fn(), sendWelcome: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send: sendEmail }; } }));
vi.mock("@/lib/email/send-donor-welcome", () => ({ sendDonorWelcomeEmail: sendWelcome }));
vi.mock("@/lib/storage", () => ({ getStorage: () => ({ move: vi.fn() }) }));

const databaseUrl = process.env.DATABASE_URL_TEST;
const integration = describe.skipIf(!databaseUrl);

integration("monthly instructions transaction and delivery with PostgreSQL", () => {
  const sql = databaseUrl ? postgres(databaseUrl, { max: 5 }) : null;
  const database = sql ? drizzle(sql, { schema }) : null;
  const pledgeIds: string[] = [];
  let sender: typeof import("@/lib/email/send-donor-monthly-instructions");
  let register: typeof import("@/app/benfeitor/_actions/donor-actions")["registerDonorPledge"];
  let firstMonthlyOccurrence: typeof import("@/lib/donor-payment-ledger").firstMonthlyOccurrence;
  let nextMonth: typeof import("@/lib/donor-payment-ledger").nextMonth;

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("RESEND_FROM", "Arca <noreply@example.test>");
    vi.stubEnv("APP_HOST", "example.test");
    vi.stubEnv("SESSION_SECRET", "test-secret-at-least-thirty-two-characters-long");
    sender = await import("@/lib/email/send-donor-monthly-instructions");
    ({ firstMonthlyOccurrence, nextMonth } = await import("@/lib/donor-payment-ledger"));
    register = (await import("@/app/benfeitor/_actions/donor-actions")).registerDonorPledge;
  });

  beforeEach(() => {
    sendEmail.mockReset();
    sendWelcome.mockReset();
    sendEmail.mockResolvedValue({ data: { id: `msg_${randomUUID()}` }, error: null });
    sendWelcome.mockResolvedValue({ status: "sent" });
  });

  afterAll(async () => {
    if (sql) {
      if (pledgeIds.length) await sql`DELETE FROM donor_pledges WHERE id = ANY(${pledgeIds})`;
      await sql.end();
    }
    vi.unstubAllEnvs();
  });

  async function fixture(options: { createdAt?: string; day?: number; channel?: string | null; duration?: string } = {}) {
    const id = randomUUID();
    pledgeIds.push(id);
    const createdAt = options.createdAt ?? new Date().toISOString();
    await sql!`INSERT INTO donor_pledges
      (id, nome, cpf, email, frequencia, duracao, dia_vencimento, valor, lembrete_canal, created_at)
      VALUES (${id}, 'Pessoa Teste', '000.000.000-00', ${`${id}@example.test`},
        'mensal', ${options.duration ?? "indeterminado"}, ${options.day ?? 30}, 87.50,
        ${options.channel ?? null}, ${createdAt})`;
    return { id, createdAt, day: options.day ?? 30 };
  }

  async function ledger(id: string, competence: string, dueDate: string) {
    await sql!`INSERT INTO donor_payment_ledger (pledge_id, competencia, due_date, expected_value)
      VALUES (${id}, ${competence}, ${dueDate}, 87.50)
      ON CONFLICT (pledge_id, competencia) DO UPDATE
        SET due_date = EXCLUDED.due_date, expected_value = EXCLUDED.expected_value`;
  }

  async function attempt(id: string, competence: string, generation = 1) {
    await sql!`INSERT INTO donor_monthly_instruction_sends
      (pledge_id, generation, receipt_competencia, provider_idempotency_key)
      VALUES (${id}, ${generation}, ${competence}, ${monthlyInstructionsProviderKey(id, generation)})`;
  }

  async function registered(channel: "email" | null) {
    const email = `${randomUUID()}@example.test`;
    const result = await register({
      nome: "Ana Silva", cpf: "529.982.247-25", email,
      telefone: "11999999999", endereco: "Rua das Flores, 1", cep: "13250000",
      residence_city: "Campinas", residence_state: "SP", residence_confirmed: true,
      priorado_capela: "nenhuma", valor: 80, frequencia: "mensal",
      duracao: "um_ano", dia_vencimento: 30, lembrete_canal: channel,
    });
    const [pledge] = await sql!`SELECT id FROM donor_pledges WHERE email = ${email}`;
    if (pledge) pledgeIds.push(pledge.id as string);
    return { result, pledge };
  }

  it.each([true, false])("sends the actual QR with the persisted payload independently of seal (%s)", async (seal) => {
    const created = await fixture();
    const first = firstMonthlyOccurrence({
      id: created.id, created_at: created.createdAt, frequencia: "mensal", duracao: "indeterminado", dia_vencimento: created.day,
    })!;
    await ledger(created.id, first.competence, first.dueDate);
    await attempt(created.id, first.competence);
    const renderingDatabase = Object.assign(Object.create(database!), {
      query: { ...database!.query, documentHeader: { findFirst: async () => ({ linha1: "Fundação São Tomé & <Filhos>", linha2: 'Educação "Católica"', linha3: "Itatiba • São Paulo", mostrar_selo: seal }) } },
    }) as typeof database;
    expect(await sender.sendDonorMonthlyInstructions(created.id, { database: renderingDatabase! })).toMatchObject({ status: "sent" });
    const message = sendEmail.mock.calls[0][0];
    expect(message.attachments.map((entry: { contentId: string }) => entry.contentId))
      .toEqual(seal ? ["ansp-document-seal", "ansp-pix-acipec-v1"] : ["ansp-pix-acipec-v1"]);
    expect(message.html).toContain('src="cid:ansp-pix-acipec-v1"');
    for (const line of ["Fundação São Tomé & <Filhos>", 'Educação "Católica"', "Itatiba • São Paulo"]) expect(message.text).toContain(line);
    expect(message.html).toContain("Fundação São Tomé &amp; &lt;Filhos&gt;");
    expect(message.text).toContain("Agência: 0197");
    expect(message.text).toContain("Conta: 13.008.003-2");
    const [frozen] = await sql!`SELECT frozen_html, frozen_text FROM donor_monthly_instruction_sends WHERE pledge_id = ${created.id}`;
    expect(frozen).toMatchObject({ frozen_html: message.html, frozen_text: message.text });
  });

  it.each([true, false])("retries a legacy frozen payload without adding QR or new content (seal %s)", async (seal) => {
    const created = await fixture();
    const first = firstMonthlyOccurrence({
      id: created.id, created_at: created.createdAt, frequencia: "mensal", duracao: "indeterminado", dia_vencimento: created.day,
    })!;
    await ledger(created.id, first.competence, first.dueDate);
    await attempt(created.id, first.competence);
    const html = `<div>Original before QR${seal ? '<img src="cid:ansp-document-seal">' : ""}</div>`;
    await sql!`UPDATE donor_monthly_instruction_sends SET status = 'failed', error_code = 'provider_rejected',
      frozen_recipient = 'original@example.test', frozen_sender = 'Original <old@example.test>',
      frozen_subject = 'Original subject', frozen_text = 'Original text', frozen_html = ${html}, frozen_include_seal = ${seal}
      WHERE pledge_id = ${created.id}`;
    const historicalDatabase = Object.assign(Object.create(database!), {
      query: { ...database!.query, documentHeader: { findFirst: async () => { throw new Error("Header unavailable after reservation"); } } },
    }) as typeof database;
    expect(await sender.sendDonorMonthlyInstructions(created.id, { database: historicalDatabase!, retryFailed: true })).toMatchObject({ status: "sent" });
    const message = sendEmail.mock.calls[0][0];
    expect(message).toMatchObject({ from: "Original <old@example.test>", to: ["original@example.test"], subject: "Original subject", text: "Original text", html });
    expect(message.attachments?.map((entry: { contentId: string }) => entry.contentId))
      .toEqual(seal ? ["ansp-document-seal"] : undefined);
    expect(sendEmail.mock.calls[0][1].idempotencyKey).toBe(monthlyInstructionsProviderKey(created.id, 1));
  });

  it("records the first occurrence and send outcome for both opt-in and opt-out", async () => {
    for (const channel of ["email", null] as const) {
      const { result, pledge } = await registered(channel);
      expect(result).toEqual({ success: true });
      expect(pledge).toBeTruthy();
      const rows = await sql!`SELECT s.status, s.generation, s.receipt_competencia, l.competencia,
        l.due_date::text AS due_date, p.dia_vencimento, p.lembrete_canal
        FROM donor_monthly_instruction_sends s
        JOIN donor_payment_ledger l ON l.pledge_id = s.pledge_id AND l.competencia = s.receipt_competencia
        JOIN donor_pledges p ON p.id = s.pledge_id WHERE s.pledge_id = ${pledge.id}`;
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ status: "sent", generation: 1, dia_vencimento: 30, lembrete_canal: channel });
      expect(sendEmail.mock.calls.at(-1)?.[1].idempotencyKey)
        .toBe(monthlyInstructionsProviderKey(pledge.id as string, 1));
      const text = sendEmail.mock.calls.at(-1)?.[0].text as string;
      expect(text).toMatch(/R\$\s*80,00/);
      expect(text).toContain("comprovante obrigatório");
      const link = text.match(/https:\/\/[^\s]+/)?.[0];
      expect(link).toBeTruthy();
      expect(verifyDonorReceiptTicket(new URL(link!).searchParams.get("ticket")))
        .toMatchObject({ pledge_id: pledge.id, competencia: rows[0].competencia });
    }
    expect(sendWelcome).toHaveBeenCalledTimes(2);
  });

  it("preserves registration and records a definite provider rejection", async () => {
    sendEmail.mockResolvedValueOnce({ data: null, error: { statusCode: 422, message: "private rejection" } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { result, pledge } = await registered(null);
      expect(result).toEqual({ success: true });
      expect(await sql!`SELECT status, error_code FROM donor_monthly_instruction_sends WHERE pledge_id = ${pledge.id}`)
        .toEqual([{ status: "failed", error_code: "provider_rejected" }]);
      expect(await sql!`SELECT id FROM donor_payment_ledger WHERE pledge_id = ${pledge.id}`).toHaveLength(1);
      expect(sendWelcome).toHaveBeenCalledTimes(1);
      expect(log.mock.calls.flat().join(" ")).not.toContain("private rejection");
    } finally { log.mockRestore(); }
  });

  it("records safe pre-call failures without contacting the provider", async () => {
    const missingConfig = await fixture();
    const first = firstMonthlyOccurrence({
      id: missingConfig.id, created_at: missingConfig.createdAt, frequencia: "mensal",
      duracao: "indeterminado", dia_vencimento: missingConfig.day,
    })!;
    await ledger(missingConfig.id, first.competence, first.dueDate);
    await attempt(missingConfig.id, first.competence);
    vi.stubEnv("RESEND_API_KEY", "");
    try {
      expect(await sender.sendDonorMonthlyInstructions(missingConfig.id, { database: database! }))
        .toEqual({ status: "failed", error_code: "configuration" });
    } finally { vi.stubEnv("RESEND_API_KEY", "re_test_key"); }
    expect(await sql!`SELECT status, error_code, attempt_count FROM donor_monthly_instruction_sends
      WHERE pledge_id = ${missingConfig.id}`)
      .toEqual([{ status: "failed", error_code: "configuration", attempt_count: 0 }]);
    expect(await sender.sendDonorMonthlyInstructions(missingConfig.id, { database: database! }))
      .toMatchObject({ status: "failed", error_code: "configuration" });

    const noOccurrence = await fixture();
    await attempt(noOccurrence.id, first.competence);
    expect(await sender.sendDonorMonthlyInstructions(noOccurrence.id, { database: database! }))
      .toEqual({ status: "failed", error_code: "unknown" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("rolls back pledge, occurrence, and attempt together when attempt insertion fails", async () => {
    const marker = `${randomUUID()}@example.test`;
    const suffix = randomUUID().replaceAll("-", "");
    const functionName = `reject_instruction_${suffix}`;
    const triggerName = `reject_instruction_${suffix}`;
    await sql!.unsafe(`CREATE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF EXISTS (SELECT 1 FROM donor_pledges WHERE id = NEW.pledge_id AND email = '${marker}')
      THEN RAISE EXCEPTION 'fixture rejection'; END IF; RETURN NEW; END; $$`);
    await sql!.unsafe(`CREATE TRIGGER ${triggerName} BEFORE INSERT ON donor_monthly_instruction_sends
      FOR EACH ROW EXECUTE FUNCTION ${functionName}()`);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await register({
        nome: "Ana Silva", cpf: "529.982.247-25", email: marker,
        telefone: "11999999999", endereco: "Rua das Flores, 1", cep: "13250000",
        residence_city: "Campinas", residence_state: "SP", residence_confirmed: true,
        priorado_capela: "nenhuma", valor: 80, frequencia: "mensal",
        duracao: "um_ano", dia_vencimento: 30, lembrete_canal: null,
      });
      expect(result.success).toBe(false);
      expect(await sql!`SELECT id FROM donor_pledges WHERE email = ${marker}`).toHaveLength(0);
      expect(sendEmail).not.toHaveBeenCalled();
      expect(sendWelcome).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
      await sql!.unsafe(`DROP TRIGGER ${triggerName} ON donor_monthly_instruction_sends`);
      await sql!.unsafe(`DROP FUNCTION ${functionName}()`);
    }
  });

  it("allows one concurrent provider request and never replays accepted or uncertain sends", async () => {
    const pledge = await fixture();
    const first = firstMonthlyOccurrence({
      id: pledge.id, created_at: pledge.createdAt, frequencia: "mensal",
      duracao: "indeterminado", dia_vencimento: pledge.day,
    })!;
    await ledger(pledge.id, first.competence, first.dueDate);
    await attempt(pledge.id, first.competence);
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    sendEmail.mockImplementation(async () => {
      await barrier;
      return { data: { id: "accepted-once" }, error: null };
    });
    const pending = sender.sendDonorMonthlyInstructions(pledge.id, { database: database! });
    try {
      await vi.waitFor(() => expect(sendEmail).toHaveBeenCalledTimes(1), { timeout: 10_000 });
      expect(await sender.sendDonorMonthlyInstructions(pledge.id, { database: database! }))
        .toMatchObject({ status: "in_progress" });
    } finally { release(); }
    expect(await pending).toMatchObject({ status: "sent" });
    expect(await sender.sendDonorMonthlyInstructions(pledge.id, { database: database! }))
      .toMatchObject({ status: "already_sent" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(await sql!`SELECT status, attempt_count, provider_message_id FROM donor_monthly_instruction_sends WHERE pledge_id = ${pledge.id}`)
      .toEqual([{ status: "sent", attempt_count: 1, provider_message_id: "accepted-once" }]);

    const uncertain = await fixture();
    const occurrence = firstMonthlyOccurrence({
      id: uncertain.id, created_at: uncertain.createdAt, frequencia: "mensal",
      duracao: "indeterminado", dia_vencimento: uncertain.day,
    })!;
    await ledger(uncertain.id, occurrence.competence, occurrence.dueDate);
    await attempt(uncertain.id, occurrence.competence);
    sendEmail.mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
    expect(await sender.sendDonorMonthlyInstructions(uncertain.id, { database: database! }))
      .toMatchObject({ status: "uncertain", error_code: "provider_timeout" });
    expect(await sender.sendDonorMonthlyInstructions(uncertain.id, { database: database! }))
      .toMatchObject({ status: "uncertain" });
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("distinguishes an abandoned reservation from a provider call with unknown outcome", async () => {
    for (const started of [false, true]) {
      const pledge = await fixture();
      const first = firstMonthlyOccurrence({
        id: pledge.id, created_at: pledge.createdAt, frequencia: "mensal",
        duracao: "indeterminado", dia_vencimento: pledge.day,
      })!;
      await ledger(pledge.id, first.competence, first.dueDate);
      await attempt(pledge.id, first.competence);
      await sql!`UPDATE donor_monthly_instruction_sends SET
        status = 'sending', reservation_token = ${randomUUID()},
        reservation_expires_at = '2020-01-01T00:00:00Z',
        provider_call_started_at = ${started ? "2020-01-01T00:00:00Z" : null}
        WHERE pledge_id = ${pledge.id}`;
      const result = await sender.sendDonorMonthlyInstructions(pledge.id, { database: database! });
      expect(result.status).toBe(started ? "uncertain" : "sent");
    }
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("retries definite failures with frozen content and selects a historical pending month", async () => {
    const old = await fixture({ createdAt: "2025-01-01T15:00:00Z", day: 30 });
    const currentMonth = saoPauloDate(new Date()).slice(0, 7);
    const dueDate = `${currentMonth}-${String(Math.min(30, new Date(Number(currentMonth.slice(0, 4)), Number(currentMonth.slice(5, 7)), 0).getDate())).padStart(2, "0")}`;
    await ledger(old.id, currentMonth, dueDate);
    sendEmail.mockResolvedValueOnce({ data: null, error: { statusCode: 422 } })
      .mockResolvedValue({ data: { id: "manual-accepted" }, error: null });
    expect(await sender.sendManualDonorMonthlyInstructions(old.id, { database: database! }))
      .toMatchObject({ status: "failed", error_code: "provider_rejected" });
    expect(await sender.sendManualDonorMonthlyInstructions(old.id, {
      explicitResend: true, database: database!,
    })).toMatchObject({ status: "unavailable" });
    expect(await sender.sendManualDonorMonthlyInstructions(old.id, {
      competence: "2020-01", database: database!,
    })).toMatchObject({ status: "unavailable" });
    const first = sendEmail.mock.calls[0];
    await sql!`UPDATE donor_pledges SET email = 'changed@example.test', nome = 'Changed' WHERE id = ${old.id}`;
    expect(await sender.sendManualDonorMonthlyInstructions(old.id, { database: database! }))
      .toMatchObject({ status: "sent" });
    expect(sendEmail.mock.calls[1][0]).toEqual(first[0]);
    expect(sendEmail.mock.calls[1][1].idempotencyKey).toBe(first[1].idempotencyKey);
    expect(await sql!`SELECT receipt_competencia, generation, attempt_count FROM donor_monthly_instruction_sends WHERE pledge_id = ${old.id}`)
      .toEqual([{ receipt_competencia: currentMonth, generation: 1, attempt_count: 2 }]);

    const following = nextMonth(currentMonth);
    const nextDue = `${following}-${String(Math.min(30, new Date(Number(following.slice(0, 4)), Number(following.slice(5, 7)), 0).getDate())).padStart(2, "0")}`;
    await ledger(old.id, following, nextDue);
    expect(await sender.sendManualDonorMonthlyInstructions(old.id, {
      competence: following, explicitResend: true, database: database!,
    })).toMatchObject({ status: "sent" });
    expect(await sql!`SELECT generation, receipt_competencia FROM donor_monthly_instruction_sends
      WHERE pledge_id = ${old.id} ORDER BY generation`)
      .toEqual([{ generation: 1, receipt_competencia: currentMonth }, { generation: 2, receipt_competencia: following }]);
    const noLedger = await fixture({ createdAt: "2025-01-01T15:00:00Z", duration: "um_ano" });
    expect(await sender.sendManualDonorMonthlyInstructions(noLedger.id, { database: database! }))
      .toMatchObject({ status: "unavailable", message: "Sem ocorrência ativa com comprovante pendente." });
  });

  it("reuses an existing pending generation for a manual attempt", async () => {
    const old = await fixture();
    const first = firstMonthlyOccurrence({
      id: old.id, created_at: old.createdAt, frequencia: "mensal",
      duracao: "indeterminado", dia_vencimento: old.day,
    })!;
    await ledger(old.id, first.competence, first.dueDate);
    await attempt(old.id, first.competence);
    expect(await sender.sendManualDonorMonthlyInstructions(old.id, {
      explicitResend: true, database: database!,
    })).toMatchObject({ status: "unavailable" });
    expect(await sender.sendManualDonorMonthlyInstructions(old.id, {
      competence: "2020-01", database: database!,
    })).toMatchObject({ status: "unavailable" });
    expect(await sender.sendManualDonorMonthlyInstructions(old.id, { database: database! }))
      .toMatchObject({ status: "sent" });
    expect(await sql!`SELECT generation FROM donor_monthly_instruction_sends WHERE pledge_id = ${old.id}`)
      .toEqual([{ generation: 1 }]);
  });

  it("uses a 14-day renewed link for an overdue selected occurrence", async () => {
    const old = await fixture({ createdAt: "2025-01-01T15:00:00Z", day: 30 });
    await ledger(old.id, "2025-02", "2025-02-28");
    const now = new Date("2026-10-27T15:00:00Z");
    expect(await sender.sendManualDonorMonthlyInstructions(old.id, {
      competence: "2025-02", now, database: database!,
    })).toMatchObject({ status: "sent" });
    const text = sendEmail.mock.calls[0][0].text as string;
    expect(text).toContain("fevereiro de 2025");
    expect(text).toContain("28 ou 29");
    const link = text.match(/https:\/\/[^\s]+/)?.[0];
    const payload = verifyDonorReceiptTicket(new URL(link!).searchParams.get("ticket"), now.getTime());
    expect(payload).toMatchObject({ pledge_id: old.id, competencia: "2025-02" });
    expect(payload!.exp).toBe(Math.floor(now.getTime() / 1000) + 14 * 24 * 60 * 60);
  });
});
