import { BRAZILIAN_UFS } from "@/lib/validations/donor-schema";
import type { ViaCepAddress } from "@/lib/cep/viacep";

export type ResidenceLookupResult =
  | { ok: true; address: ViaCepAddress }
  | { ok: false; error: string };

export type ResidenceClassification =
  | { kind: "eligible"; city: string; state: (typeof BRAZILIAN_UFS)[number] }
  | { kind: "invalid_cep" }
  | { kind: "unknown" }
  | { kind: "lookup_failed" };

export function classifyHistoricalResidence(
  cep: string | null,
  result?: ResidenceLookupResult
): ResidenceClassification {
  if (!cep || !/^\d{5}-?\d{3}$/.test(cep.trim())) return { kind: "invalid_cep" };
  if (!result) return { kind: "unknown" };
  if (!result.ok) {
    return result.error === "CEP não encontrado."
      ? { kind: "unknown" }
      : { kind: "lookup_failed" };
  }

  const city = result.address.localidade.trim();
  const state = result.address.uf.trim().toUpperCase();
  if (!city || !BRAZILIAN_UFS.includes(state as (typeof BRAZILIAN_UFS)[number])) {
    return { kind: "unknown" };
  }
  return { kind: "eligible", city, state: state as (typeof BRAZILIAN_UFS)[number] };
}
