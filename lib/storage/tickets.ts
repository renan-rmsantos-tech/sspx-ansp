import { createHmac, timingSafeEqual } from "crypto";

/**
 * Tickets assinados que substituem as signed URLs do Supabase Storage.
 *
 * Um ticket carrega o caminho do arquivo, a operação permitida e a validade,
 * assinados com HMAC derivado do SESSION_SECRET. Só as server actions emitem
 * tickets; as rotas de upload/download apenas verificam a assinatura, então
 * um cliente não consegue forjar acesso a um caminho arbitrário.
 */

export type TicketScope = "upload" | "download";

interface TicketPayload {
  path: string;
  scope: TicketScope;
  exp: number;
}

function key(scope: TicketScope): Buffer {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET não configurado ou muito curto (mínimo 32 caracteres)."
    );
  }

  // Chave distinta por escopo: um ticket de upload nunca vale como download.
  return createHmac("sha256", secret).update(`ticket:${scope}`).digest();
}

function sign(data: string, scope: TicketScope): string {
  return createHmac("sha256", key(scope)).update(data).digest("base64url");
}

export function createTicket(
  path: string,
  scope: TicketScope,
  ttlSeconds: number
): string {
  const payload: TicketPayload = {
    path,
    scope,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${body}.${sign(body, scope)}`;
}

/** Devolve o caminho autorizado, ou null se o ticket for inválido/expirado. */
export function verifyTicket(
  ticket: string | null,
  scope: TicketScope
): string | null {
  if (!ticket) return null;

  const [body, signature] = ticket.split(".");
  if (!body || !signature) return null;

  let expected: Buffer;
  let received: Buffer;

  try {
    expected = Buffer.from(sign(body, scope), "base64url");
    received = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return null;
  }

  let payload: TicketPayload;

  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
  } catch {
    return null;
  }

  if (payload.scope !== scope) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload.path;
}
