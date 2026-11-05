import type { AdminHomeSummary } from "../_actions/admin-home-actions";

export const adminHomeSummary: AdminHomeSummary = {
  schoolYear: { nome: "2026" },
  applications: { total: 38, pendente: 4, aprovada: 29, rejeitada: 5 },
  donors: { total: 61, mensal: 47, unica: 14, monthlyAmount: 9_350, pendingWelcome: 2 },
  payments: { competencia: "2026-11", expectedAmount: 9_350, count: 12, confirmedAmount: 7_100, withReceipt: 31 },
};

export const adminHomeSummaryIdle: AdminHomeSummary = {
  schoolYear: null,
  applications: { total: 0, pendente: 0, aprovada: 0, rejeitada: 0 },
  donors: { total: 61, mensal: 47, unica: 14, monthlyAmount: 9_350, pendingWelcome: 0 },
  payments: { competencia: "2026-11", expectedAmount: 9_350, count: 0, confirmedAmount: 9_350, withReceipt: 47 },
};
