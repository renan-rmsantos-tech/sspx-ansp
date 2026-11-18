/**
 * Limite em memória para e-mails de conta (confirmação, senha, aviso de conta
 * existente): no máximo um por minuto para cada e-mail e tipo. O app roda numa
 * única instância — ver `lib/auth/throttle.ts`.
 */
const INTERVAL_MS = 60 * 1000;
const lastSent = new Map<string, number>();

export function allowAccountEmail(email: string, kind: string): boolean {
  const key = `${kind}:${email}`;
  const now = Date.now();
  const previous = lastSent.get(key);
  if (previous !== undefined && now - previous < INTERVAL_MS) return false;
  lastSent.set(key, now);
  if (lastSent.size > 5000) {
    for (const [k, at] of lastSent) if (now - at >= INTERVAL_MS) lastSent.delete(k);
  }
  return true;
}

/** Só para os testes. */
export function resetAccountEmailLimit(): void {
  lastSent.clear();
}
