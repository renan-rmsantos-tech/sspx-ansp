import { beforeEach, describe, expect, it, vi } from "vitest";

const { move, sendDonorWelcomeEmail, sendDonorMonthlyInstructions } = vi.hoisted(() => ({
  move: vi.fn(),
  sendDonorWelcomeEmail: vi.fn(),
  sendDonorMonthlyInstructions: vi.fn(),
}));

vi.mock("@/lib/db", async () => ({ db: (await import("./helpers/fake-db")).fakeDb }));
vi.mock("@/lib/storage", () => ({ getStorage: () => ({ move }) }));
vi.mock("@/lib/email/send-donor-welcome", () => ({ sendDonorWelcomeEmail }));
vi.mock("@/lib/email/send-donor-monthly-instructions", () => ({ sendDonorMonthlyInstructions }));

import { registerDonorPledge } from "@/app/benfeitor/_actions/donor-actions";
import { donorMonthlyInstructionSends, donorPaymentLedger, donorPledges } from "@/lib/db/schema";
import { failWrites, inserted, resetFakeDb } from "./helpers/fake-db";

const base = {
  nome: "Ana Silva", cpf: "529.982.247-25", email: "ana@example.com",
  telefone: "11999999999", endereco: "Rua das Flores, 1", cep: "13250000",
  residence_city: "Campinas", residence_state: "SP" as const,
  residence_confirmed: true, priorado_capela: "nenhuma" as const,
  valor: 80,
};

beforeEach(() => {
  resetFakeDb();
  vi.clearAllMocks();
  move.mockResolvedValue(undefined);
  sendDonorWelcomeEmail.mockResolvedValue({ status: "sent" });
  sendDonorMonthlyInstructions.mockResolvedValue({ status: "sent" });
});

describe("conditional donor submission", () => {
  it("persists monthly day, duration and email opt-in while discarding a forged receipt", async () => {
    const result = await registerDonorPledge({
      ...base, frequencia: "mensal", duracao: "um_ano", dia_vencimento: 30,
      lembrete_canal: "email", recibo_path: "pending/forged.pdf", recibo_nome: "forged.pdf",
    });

    expect(result).toEqual({ success: true });
    expect(inserted[0].table).toBe(donorPledges);
    expect(inserted[0].values).toMatchObject({
      frequencia: "mensal", duracao: "um_ano", dia_vencimento: 30,
      lembrete_canal: "email", data_pagamento: null, recibo_path: null, recibo_nome: null,
    });
    expect(inserted[1].table).toBe(donorPaymentLedger);
    expect(inserted[1].values).toMatchObject({ pledge_id: (inserted[0].values as { id: string }).id, expected_value: 80 });
    expect(inserted[2].table).toBe(donorMonthlyInstructionSends);
    expect(inserted[2].values).toMatchObject({
      pledge_id: (inserted[0].values as { id: string }).id,
      generation: 1, receipt_competencia: (inserted[1].values as { competencia: string }).competencia,
      status: "pending",
    });
    expect(sendDonorMonthlyInstructions).toHaveBeenCalledWith((inserted[0].values as { id: string }).id);
    expect(move).not.toHaveBeenCalled();
  });

  it("sends monthly instructions for opt-out too and keeps success when delivery fails", async () => {
    sendDonorMonthlyInstructions.mockRejectedValueOnce(new Error("private provider detail"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await registerDonorPledge({
        ...base, frequencia: "mensal", duracao: "indeterminado", dia_vencimento: 10,
        lembrete_canal: null,
      });
      expect(result).toEqual({ success: true });
      expect((inserted[0].values as { lembrete_canal: string | null }).lembrete_canal).toBeNull();
      expect(sendDonorMonthlyInstructions).toHaveBeenCalledTimes(1);
      expect(sendDonorWelcomeEmail).toHaveBeenCalledTimes(1);
      expect(log.mock.calls.flat().join(" ")).not.toContain("private provider detail");
    } finally { log.mockRestore(); }
  });

  it("rejects a forged public day 31 before any database or storage work", async () => {
    const result = await registerDonorPledge({
      ...base, frequencia: "mensal", duracao: "um_ano", dia_vencimento: 31,
    });
    expect(result.success).toBe(false);
    expect(result.errors?.dia_vencimento).toBeDefined();
    expect(inserted).toHaveLength(0);
    expect(move).not.toHaveBeenCalled();
    expect(sendDonorWelcomeEmail).not.toHaveBeenCalled();
  });

  it("moves a valid one-time receipt before insertion", async () => {
    const result = await registerDonorPledge({
      ...base, frequencia: "unica", data_pagamento: "2026-10-26",
      recibo_path: "pending/receipt.pdf", recibo_nome: "receipt.pdf",
    });

    expect(result).toEqual({ success: true });
    const row = inserted[0].values as { id: string; recibo_path: string; dia_vencimento: null };
    expect(row).toMatchObject({ dia_vencimento: null, data_pagamento: "2026-10-26", recibo_nome: "receipt.pdf" });
    expect(row.recibo_path).toBe(`donors/${row.id}/recibo/receipt.pdf`);
    expect(move).toHaveBeenCalledWith("pending/receipt.pdf", row.recibo_path);
    expect(sendDonorMonthlyInstructions).not.toHaveBeenCalled();
  });

  it("restores the pending receipt if the one-time insert fails", async () => {
    failWrites();
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await registerDonorPledge({
        ...base, frequencia: "unica", data_pagamento: "2026-10-26",
        recibo_path: "pending/receipt.pdf", recibo_nome: "receipt.pdf",
      });
      expect(result.success).toBe(false);
      expect(inserted).toHaveLength(0);
      const finalPath = move.mock.calls[0][1] as string;
      expect(move.mock.calls).toEqual([
        ["pending/receipt.pdf", finalPath],
        [finalPath, "pending/receipt.pdf"],
      ]);
      expect(sendDonorWelcomeEmail).not.toHaveBeenCalled();
    } finally {
      errorLog.mockRestore();
    }
  });
});
