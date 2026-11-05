import type { ServerActions } from "@/components/server-actions";

/**
 * Server actions de fixture para a galeria. As `overrides` definem o que um
 * estado precisa (ex.: a lista que um `get…` devolve); qualquer outra action
 * resolve `{ success: true }` sem tocar o servidor.
 */
export function fixtureActions(overrides: Partial<ServerActions> = {}): Partial<ServerActions> {
  return new Proxy(overrides, {
    get: (target, name) =>
      (target as Record<PropertyKey, unknown>)[name] ?? (async () => ({ success: true })),
  });
}
