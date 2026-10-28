import { getTableConfig } from "drizzle-orm/pg-core";
import { donorPledges } from "@/lib/db/schema";
import { describe, expect, it } from "vitest";
import { donorPledgeSchema } from "@/lib/validations/donor-schema";

const base = {
  nome: "Ana Silva", cpf: "529.982.247-25", email: "ana@example.com",
  telefone: "11999999999", endereco: "Rua das Flores, 1", cep: "13250000",
  residence_city: "Campinas", residence_state: "SP", residence_confirmed: true,
  priorado_capela: "nenhuma", frequencia: "mensal", duracao: "um_ano",
  valor: 80, dia_vencimento: 1,
};

describe("donor pledge schema", () => {
  it("keeps residence and welcome reservation fields nullable for existing pledges", () => {
    const config = getTableConfig(donorPledges);
    const nullableColumns = [
      "residence_city",
      "residence_state",
      "residence_source",
      "welcome_email_reservation_token",
      "welcome_email_reservation_expires_at",
      "dia_vencimento",
    ];

    for (const name of nullableColumns) {
      const column = config.columns.find((candidate) => candidate.name === name);
      expect(column, `${name} is declared`).toBeDefined();
      expect(column?.notNull, `${name} remains nullable`).toBe(false);
    }

    expect(config.checks.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "donor_pledges_residence_state_check",
        "donor_pledges_residence_source_check",
        "donor_pledges_dia_vencimento_check",
      ])
    );
  });
});

describe("donor pledge conditional validation", () => {
  it.each([1, 10, 15, 20, 30])("accepts monthly day %i", (day) => {
    expect(donorPledgeSchema.safeParse({ ...base, dia_vencimento: day }).success).toBe(true);
  });

  it.each([undefined, 0, 28, 29, 31, 32, 10.5])("rejects monthly day %s", (day) => {
    const result = donorPledgeSchema.safeParse({ ...base, dia_vencimento: day });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.dia_vencimento).toBeDefined();
  });

  it("accepts forged monthly receipt fields without treating them as evidence", () => {
    const result = donorPledgeSchema.safeParse({ ...base, recibo_path: "pending/forged.pdf", recibo_nome: "forged.pdf" });
    expect(result.success).toBe(true);
  });

  it.each([undefined, "", "2026-02-30", "2026-13-01", "26/10/2026"])('rejects invalid one-time date %s', (date) => {
    const result = donorPledgeSchema.safeParse({ ...base, frequencia: "unica", duracao: undefined, dia_vencimento: undefined, data_pagamento: date, recibo_path: "pending/receipt.pdf", recibo_nome: "receipt.pdf" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.data_pagamento).toBeDefined();
  });

  it("requires both one-time receipt fields", () => {
    const oneTime = { ...base, frequencia: "unica", duracao: undefined, dia_vencimento: undefined, data_pagamento: "2026-10-26" };
    for (const receipt of [{}, { recibo_path: "pending/receipt.pdf" }, { recibo_nome: "receipt.pdf" }]) {
      const result = donorPledgeSchema.safeParse({ ...oneTime, ...receipt });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.flatten().fieldErrors.recibo_path).toBeDefined();
    }
    expect(donorPledgeSchema.safeParse({ ...oneTime, recibo_path: "pending/receipt.pdf", recibo_nome: "receipt.pdf" }).success).toBe(true);
  });
});
