import { createHash } from "node:crypto";
import { isIP } from "node:net";

const WINDOW = 10 * 60_000;
const POST_WINDOW = 60 * 60_000;
const MAX_KEYS = 2048;
const attempts = new Map<string, { count: number; until: number }>();
let activeUploads = 0;

function consume(key: string, limit: number, windowMs: number, now = Date.now()): number {
  for (const [entry, state] of attempts) if (state.until <= now) attempts.delete(entry);
  const state = attempts.get(key);
  if (state && state.count >= limit) return Math.max(1, Math.ceil((state.until - now) / 1000));
  if (attempts.size >= MAX_KEYS && !state) attempts.delete(attempts.keys().next().value!);
  attempts.set(key, state ? { count: state.count + 1, until: state.until } : { count: 1, until: now + windowMs });
  return 0;
}

/** Only use Traefik's appended rightmost address when the operator explicitly enables that trust. */
export function receiptSourceIp(headers: Headers): string {
  if (process.env.TRUST_TRAEFIK_FORWARDED_IP === "true") {
    const candidate = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
    if (candidate && isIP(candidate)) return candidate;
  }
  return "unknown";
}

export function checkReceiptThrottle(kind: "invalid" | "post", ip: string, ticket?: string, now = Date.now()): number {
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const ipWait = consume(`${kind}:ip:${ipHash}`, kind === "invalid" ? 30 : 20,
    kind === "invalid" ? WINDOW : POST_WINDOW, now);
  if (ipWait || kind === "invalid" || !ticket) return ipWait;
  return checkReceiptTicketThrottle(ticket, now);
}

export function invalidReceiptBlockedFor(ip: string, now = Date.now()): number {
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const state = attempts.get(`invalid:ip:${ipHash}`);
  return state && state.count >= 30 && state.until > now
    ? Math.max(1, Math.ceil((state.until - now) / 1000)) : 0;
}

export function checkReceiptTicketThrottle(ticket: string, now = Date.now()): number {
  const ticketHash = createHash("sha256").update(ticket).digest("hex");
  return consume(`post:ticket:${ticketHash}`, 5, POST_WINDOW, now);
}

export function enterReceiptUpload(): boolean {
  if (activeUploads >= 4) return false;
  activeUploads += 1;
  return true;
}

export function leaveReceiptUpload(): void { activeUploads = Math.max(0, activeUploads - 1); }
export function resetReceiptThrottle(): void { attempts.clear(); activeUploads = 0; }
