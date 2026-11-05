import type { ComponentProps } from "react";
import type { DonorReports } from "../_actions/donor-report-actions";
import type { RelatoriosTabs } from "./relatorios-tabs";

type FinancialReportData = ComponentProps<typeof RelatoriosTabs>["financial"];

export const donorReports: DonorReports = {
  filters: { from: "2026-01-01", to: "2026-11-04" },
  total: 61,
  residenceByState: [
    { key: "MG", label: "Minas Gerais", count: 7 },
    { key: "PR", label: "Paraná", count: 4 },
    { key: "RJ", label: "Rio de Janeiro", count: 9 },
    { key: "SC", label: "Santa Catarina", count: 2 },
    { key: "SP", label: "São Paulo", count: 36 },
    { key: "__unknown__", label: "Local não identificado", count: 3 },
  ],
  prioryOrChapel: [
    { key: "nenhuma", label: "Nenhuma", count: 14 },
    { key: "sp-sao-paulo-padre-anchieta", label: "Priorado Padre Anchieta – Capela São Pio X (São Paulo)", count: 24 },
    { key: "sp-indaiatuba", label: "Capela Imaculada Conceição (Indaiatuba)", count: 8 },
    { key: "sp-sorocaba", label: "Oratório Menino Jesus de Praga (Sorocaba)", count: 3 },
    { key: "rj-rio-de-janeiro", label: "Capela São Miguel (Rio de Janeiro)", count: 6 },
    { key: "__unreported__", label: "Não informado", count: 6 },
  ],
};

export const donorReportsEmpty: DonorReports = {
  filters: { from: "2026-11-01", to: "2026-11-04", frequency: "unica" },
  total: 0,
  residenceByState: [{ key: "__unknown__", label: "Local não identificado", count: 0 }],
  prioryOrChapel: [
    { key: "nenhuma", label: "Nenhuma", count: 0 },
    { key: "__unreported__", label: "Não informado", count: 0 },
  ],
};

const zero = { previsto: 0, recebido: 0, emAberto: 0, naoIdentificadoDivergente: 0 };

/** Valores em centavos, como a action devolve. */
export const financialReport: FinancialReportData = {
  filters: { from: "2026-08", to: "2026-11" },
  summary: { previsto: 3_840_000, recebido: 3_215_000, emAberto: 565_000, naoIdentificadoDivergente: 60_000 },
  byFrequency: {
    mensal: { previsto: 3_740_000, recebido: 3_115_000, emAberto: 565_000, naoIdentificadoDivergente: 60_000 },
    unica: { previsto: 100_000, recebido: 100_000, emAberto: 0, naoIdentificadoDivergente: 0 },
  },
  months: [
    { month: "2026-08", previsto: 935_000, recebido: 915_000, emAberto: 20_000, naoIdentificadoDivergente: 0 },
    { month: "2026-09", previsto: 935_000, recebido: 900_000, emAberto: 15_000, naoIdentificadoDivergente: 20_000 },
    { month: "2026-10", previsto: 985_000, recebido: 940_000, emAberto: 5_000, naoIdentificadoDivergente: 40_000 },
    { month: "2026-11", previsto: 985_000, recebido: 460_000, emAberto: 525_000, naoIdentificadoDivergente: 0 },
  ],
  donors: [
    { donorId: "b1", donorName: "Ana Clara Lima", frequency: "mensal", pago: 360_000, devido: 120_000, parcelasEmAtraso: 0 },
    { donorId: "b2", donorName: "Carlos Eduardo Mendes", frequency: "mensal", pago: 45_000, devido: 15_000, parcelasEmAtraso: 1 },
    { donorId: "b3", donorName: "João Batista Pereira", frequency: "mensal", pago: 16_000, devido: 16_000, parcelasEmAtraso: 2 },
    { donorId: "b4", donorName: "Maria Aparecida Souza", frequency: "mensal", pago: 80_000, devido: 0, parcelasEmAtraso: 0 },
    { donorId: "b5", donorName: "Pedro Henrique Alves", frequency: "unica", pago: 50_000, devido: 0, parcelasEmAtraso: 0 },
    { donorId: "b6", donorName: "Teresa de Jesus Oliveira", frequency: "mensal", pago: 90_000, devido: 30_000, parcelasEmAtraso: 0 },
  ],
};

export const financialReportEmpty: FinancialReportData = {
  filters: { from: "2026-11", to: "2026-11", frequency: "unica" },
  summary: zero,
  byFrequency: { mensal: zero, unica: zero },
  months: [{ month: "2026-11", ...zero }],
  donors: [],
};
