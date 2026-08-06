/**
 * Limitação de tentativas de login em memória.
 *
 * O app roda numa única instância no droplet, então um Map em memória basta —
 * o objetivo é frear brute force e o custo de CPU do scrypt, não ser um
 * controle distribuído. Reiniciar o container zera os contadores, o que é
 * aceitável para o volume deste painel.
 */

const MAX_FAILURES = 8;
const LOCK_MS = 10 * 60 * 1000;

interface AttemptState {
  failures: number;
  lockedUntil: number;
}

const attempts = new Map<string, AttemptState>();

/** Milissegundos restantes de bloqueio, ou 0 se a chave pode tentar. */
export function lockedFor(key: string): number {
  const state = attempts.get(key);
  if (!state) return 0;

  const remaining = state.lockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

export function recordFailure(key: string): void {
  const state = attempts.get(key) ?? { failures: 0, lockedUntil: 0 };
  state.failures += 1;

  if (state.failures >= MAX_FAILURES) {
    state.lockedUntil = Date.now() + LOCK_MS;
    state.failures = 0;
  }

  attempts.set(key, state);
}

export function clearFailures(key: string): void {
  attempts.delete(key);
}

/** Só para os testes reiniciarem o estado entre casos. */
export function resetThrottle(): void {
  attempts.clear();
}
