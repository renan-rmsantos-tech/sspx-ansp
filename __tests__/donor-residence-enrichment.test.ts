import { describe, expect, it } from "vitest";
import { classifyHistoricalResidence } from "@/lib/donor-residence-enrichment";

const address = (localidade: string, uf: string) => ({
  cep: "01001-000",
  logradouro: "",
  bairro: "",
  localidade,
  uf,
});

describe("classifyHistoricalResidence", () => {
  it("skips missing or malformed CEPs before attempting a lookup", () => {
    expect(classifyHistoricalResidence(null)).toEqual({ kind: "invalid_cep" });
    expect(classifyHistoricalResidence("1234-567")).toEqual({ kind: "invalid_cep" });
    expect(classifyHistoricalResidence("abc01001000")).toEqual({ kind: "invalid_cep" });
  });

  it("accepts only complete city and Brazilian UF results", () => {
    expect(classifyHistoricalResidence("01001-000", {
      ok: true,
      address: address("  Campinas ", "sp"),
    })).toEqual({ kind: "eligible", city: "Campinas", state: "SP" });
    expect(classifyHistoricalResidence("01001-000", {
      ok: true,
      address: address("", "SP"),
    })).toEqual({ kind: "unknown" });
    expect(classifyHistoricalResidence("01001-000", {
      ok: true,
      address: address("Campinas", "XX"),
    })).toEqual({ kind: "unknown" });
  });

  it("keeps not-found results unknown and distinguishes service failures", () => {
    expect(classifyHistoricalResidence("01001-000", {
      ok: false,
      error: "CEP não encontrado.",
    })).toEqual({ kind: "unknown" });
    expect(classifyHistoricalResidence("01001-000", {
      ok: false,
      error: "Não foi possível consultar o CEP. Tente novamente.",
    })).toEqual({ kind: "lookup_failed" });
  });
});
