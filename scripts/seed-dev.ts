/** Local-only fictional donor data. Existing rows and files are never overwritten. */
import { pathToFileURL } from "node:url";
import { inArray } from "drizzle-orm";
import type { donorPledges } from "../lib/db/schema";
import { saoPauloDate } from "../lib/donor-recurrence";
import { PUBLIC_MONTHLY_DUE_DAYS } from "../lib/validations/donor-schema";

const SEED_IDS = Array.from({ length: 7 }, (_, index) =>
  `11111111-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
);
const RECEIPTS = [
  `donors/${SEED_IDS[4]}/recibo/comprovante-pix.pdf`,
  `donors/${SEED_IDS[5]}/recibo/comprovante.pdf`,
] as const;

type SeedPledge = typeof donorPledges.$inferInsert;

export function seedGuard(env: { NODE_ENV?: string; DATABASE_URL?: string }): string | null {
  if (env.NODE_ENV === "production") return "NODE_ENV=production; nenhum dado criado.";
  if (!env.DATABASE_URL) return "DATABASE_URL ausente; nenhum dado criado.";
  try {
    const url = new URL(env.DATABASE_URL);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname.toLowerCase()) ||
      [...url.searchParams.keys()].some((key) =>
        ["host", "hostaddr", "service", "socket"].includes(key.toLowerCase()))
    ) {
      return "DATABASE_URL não aponta para localhost; nenhum dado criado.";
    }
  } catch {
    return "DATABASE_URL inválida; nenhum dado criado.";
  }
  return null;
}

function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function shiftMonth(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(day, 28)).padStart(2, "0")}`;
}

function localTimestamp(date: string, hour = 10): string {
  // São Paulo has observed UTC−03 since 2019; these current dev dates use that offset.
  return `${date}T${String(hour).padStart(2, "0")}:00:00-03:00`;
}

/** Prefer a real reminder candidate; some dates have none among the five public choices. */
export function reminderDueDay(today: string): { day: number; kind: "10d" | "5d" | null } {
  for (const [offset, kind] of [[10, "10d"], [5, "5d"]] as const) {
    const date = shiftDate(today, offset);
    const [year, month, day] = date.split("-").map(Number);
    if (PUBLIC_MONTHLY_DUE_DAYS.some((choice) => choice === day)) return { day, kind };
    const monthEnd = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day === monthEnd && monthEnd < 30) return { day: 30, kind };
  }
  return { day: PUBLIC_MONTHLY_DUE_DAYS[0], kind: null };
}

export function createSeedRows(now: Date): SeedPledge[] {
  const today = saoPauloDate(now);
  const yesterday = shiftDate(today, -1);
  const reminder = reminderDueDay(today);
  const common = { meio_pagamento: "pix" as const, residence_source: "confirmed" as const };
  return [
    { ...common, id: SEED_IDS[0], nome: "Maria Aparecida Souza", cpf: "529.982.247-25", email: "maria.teste@example.com", frequencia: "mensal", duracao: "indeterminado", valor: 200, lembrete_canal: "email", dia_vencimento: reminder.day, telefone: "(11) 98888-0001", endereco: "Rua das Flores, 100", cep: "13250-000", priorado_capela: "sp-sao-paulo-padre-anchieta", residence_city: "Itatiba", residence_state: "SP", welcome_email_sent_at: localTimestamp(yesterday, 11), created_at: localTimestamp(yesterday) },
    { ...common, id: SEED_IDS[1], nome: "João Batista Pereira", cpf: "111.444.777-35", email: "joao.teste@example.com", frequencia: "mensal", duracao: "um_ano", valor: 80, lembrete_canal: "email", dia_vencimento: 10, telefone: "(11) 98888-0002", endereco: "Av. Brasil, 200", cep: "01430-000", priorado_capela: "sp-sao-paulo-padre-anchieta", residence_city: "São Paulo", residence_state: "SP", created_at: localTimestamp(shiftDate(today, -12)) },
    { ...common, id: SEED_IDS[2], nome: "Ana Clara Lima", cpf: "123.456.789-09", email: "ana.teste@example.com", frequencia: "mensal", duracao: "indeterminado", valor: 1200, dia_vencimento: 20, telefone: "(19) 98888-0003", endereco: "Rua XV de Novembro, 50", cep: "13010-000", priorado_capela: "sp-sao-paulo-padre-anchieta", residence_city: "Campinas", residence_state: "SP", welcome_email_sent_at: localTimestamp(shiftDate(today, -25), 11), created_at: localTimestamp(shiftDate(today, -25)) },
    { ...common, id: SEED_IDS[3], nome: "Carlos Eduardo Mendes", cpf: "935.411.347-80", email: "carlos.teste@example.com", frequencia: "mensal", duracao: "um_ano", valor: 150, lembrete_canal: "email", dia_vencimento: 15, telefone: "(21) 98888-0004", endereco: "Rua do Catete, 10", cep: "22220-000", priorado_capela: "nenhuma", residence_city: "Rio de Janeiro", residence_state: "RJ", welcome_email_sent_at: localTimestamp(shiftMonth(today, -14), 11), created_at: localTimestamp(shiftMonth(today, -14)) },
    { ...common, id: SEED_IDS[4], nome: "Pedro Henrique Alves", cpf: "390.533.447-05", email: "pedro.teste@example.com", frequencia: "unica", valor: 500, data_pagamento: shiftDate(today, -6), telefone: "(31) 98888-0005", endereco: "Rua da Bahia, 300", cep: "30160-000", priorado_capela: "nenhuma", residence_city: "Belo Horizonte", residence_state: "MG", recibo_path: RECEIPTS[0], recibo_nome: "comprovante-pix.pdf", welcome_email_sent_at: localTimestamp(shiftDate(today, -6), 11), created_at: localTimestamp(shiftDate(today, -6)) },
    { ...common, id: SEED_IDS[5], nome: "Luísa Fernanda Rocha", cpf: "168.995.350-09", email: "luisa.teste@example.com", frequencia: "unica", valor: 14400, data_pagamento: yesterday, telefone: "(41) 98888-0006", endereco: "Rua XV, 1000", cep: "80020-000", priorado_capela: "nenhuma", residence_city: "Curitiba", residence_state: "PR", recibo_path: RECEIPTS[1], recibo_nome: "comprovante.pdf", created_at: localTimestamp(yesterday) },
    { ...common, id: SEED_IDS[6], nome: "Teresa de Jesus Oliveira", cpf: "248.438.034-80", email: "teresa.teste@example.com", frequencia: "mensal", duracao: "indeterminado", valor: 300, lembrete_canal: "email", dia_vencimento: 30, telefone: "(11) 98888-0007", endereco: "Rua Sete, 7", cep: "13250-100", priorado_capela: "sp-sao-paulo-padre-anchieta", residence_city: "Itatiba", residence_state: "SP", welcome_email_sent_at: localTimestamp(yesterday, 11), created_at: localTimestamp(yesterday) },
  ];
}

function fakeReceiptPdf(): Buffer {
  const stream = "BT /F1 16 Tf 50 750 Td (COMPROVANTE FICTICIO - AMBIENTE LOCAL) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

export async function seedDev(reset = false, now = new Date()) {
  const refusal = seedGuard(process.env);
  if (refusal) {
    console.log(`[db:seed] ${refusal}`);
    return;
  }

  const [{ db }, { donorPledges }, { getStorage }, { materializeCurrentAndNextMonthlyPayments }] = await Promise.all([
    import("../lib/db"), import("../lib/db/schema"), import("../lib/storage"), import("../lib/donor-payment-ledger"),
  ]);
  const storage = getStorage();
  let removed = 0;
  if (reset) {
    removed = (await db.delete(donorPledges).where(inArray(donorPledges.id, SEED_IDS))
      .returning({ id: donorPledges.id })).length;
    // Cascading FKs remove only these donors' ledger and reminder rows.
    for (const path of RECEIPTS) await storage.remove(path);
  }

  const inserted = (await db.insert(donorPledges).values(createSeedRows(now))
    .onConflictDoNothing({ target: donorPledges.id })
    .returning({ id: donorPledges.id })).length;
  const receipts = await db.query.donorPledges.findMany({
    columns: { id: true, recibo_path: true },
    where: inArray(donorPledges.id, [SEED_IDS[4], SEED_IDS[5]]),
  });
  let files = 0;
  for (const [index, path] of RECEIPTS.entries()) {
    if (receipts.some((row) => row.id === SEED_IDS[index + 4] && row.recibo_path === path)
      && await storage.size(path) === null) {
      await storage.put(path, fakeReceiptPdf());
      files++;
    }
  }
  const ledger = await materializeCurrentAndNextMonthlyPayments(now, db);
  console.log(`[db:seed] ${JSON.stringify({ inserted, files, ledger, removed })}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.slice(2).some((arg) => arg !== "--reset")) {
    console.error("[db:seed] argumento inválido; use --reset.");
    process.exitCode = 1;
  } else {
    seedDev(process.argv.includes("--reset"))
      .then(() => process.exit(0))
      .catch(() => {
        console.error("[db:seed] falhou; verifique banco, migrações e STORAGE_DIR.");
        process.exit(1);
      });
  }
}
