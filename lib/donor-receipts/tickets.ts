import { createHmac, timingSafeEqual } from "node:crypto";

type ReceiptPayload = {
  pledge_id: string;
  competencia: string;
  scope: "donor_receipt";
  exp: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function receiptKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET inválido.");
  return createHmac("sha256", secret).update("ticket:donor_receipt").digest();
}

function signature(body: string): Buffer {
  return createHmac("sha256", receiptKey()).update(body).digest();
}

/** The expiry is the end of the 45th São Paulo calendar day after the due date. */
export function receiptExpiry(dueDate: string): number {
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(dueDate)) {
    throw new RangeError("Invalid due date");
  }
  const [year, month, day] = dueDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 45));
  if (Number.isNaN(date.getTime()) || date.getUTCDate() < 1) throw new RangeError("Invalid due date");
  const localEnd = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59);
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", timeZoneName: "shortOffset",
  }).formatToParts(new Date(localEnd)).find((part) => part.type === "timeZoneName")?.value;
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(offset ?? "");
  if (!match) throw new Error("São Paulo time zone unavailable");
  const minutes = (Number(match[2]) * 60 + Number(match[3] ?? 0)) * (match[1] === "+" ? 1 : -1);
  return Math.floor((localEnd - minutes * 60_000) / 1000);
}

function signReceiptTicket(pledgeId: string, competencia: string, exp: number): string {
  if (!UUID.test(pledgeId) || !MONTH.test(competencia) || !Number.isSafeInteger(exp)) {
    throw new RangeError("Invalid receipt occurrence");
  }
  const payload: ReceiptPayload = {
    pledge_id: pledgeId.toLowerCase(), competencia, scope: "donor_receipt", exp,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signature(body).toString("base64url")}`;
}

export function createDonorReceiptTicket(pledgeId: string, competencia: string, dueDate: string): string {
  if (!dueDate.startsWith(`${competencia}-`)) throw new RangeError("Invalid receipt occurrence");
  return signReceiptTicket(pledgeId, competencia, receiptExpiry(dueDate));
}

/** Only an authenticated administrator action may request this renewed capability. */
export function createDonorReceiptRecoveryLink(
  origin: string, pledgeId: string, competencia: string, now = new Date()
): string {
  const url = new URL("/benfeitor/comprovante", origin);
  if (url.protocol !== "https:" || url.username || url.password) throw new RangeError("Receipt links require HTTPS");
  const exp = Math.floor(now.getTime() / 1000) + 14 * 24 * 60 * 60;
  url.searchParams.set("ticket", signReceiptTicket(pledgeId, competencia, exp));
  return url.toString();
}

export function verifyDonorReceiptTicket(ticket: string | null, now = Date.now()): ReceiptPayload | null {
  if (!ticket || ticket.length > 512) return null;
  const parts = ticket.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return null;
  const received = Buffer.from(parts[1], "base64url");
  const expected = signature(parts[0]);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as ReceiptPayload;
    if (payload.scope !== "donor_receipt" || !UUID.test(payload.pledge_id) ||
        !MONTH.test(payload.competencia) || !Number.isSafeInteger(payload.exp) ||
        payload.exp < Math.floor(now / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createDonorReceiptLink(origin: string, pledgeId: string, competencia: string, dueDate: string): string {
  const url = new URL("/benfeitor/comprovante", origin);
  if (url.protocol !== "https:" || url.username || url.password) throw new RangeError("Receipt links require HTTPS");
  url.searchParams.set("ticket", createDonorReceiptTicket(pledgeId, competencia, dueDate));
  return url.toString();
}
