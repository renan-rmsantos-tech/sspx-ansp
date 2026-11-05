import type { SchoolYear } from "../_components/school-year-list";

/** Data de referência dos estados: fixa, para a situação de cada ano não mudar com o calendário. */
export const today = "2026-11-04";

/** Inscrições futura, em andamento e encerrada (a situação vem das datas, não de `ativo`). */
export const schoolYears: SchoolYear[] = [
  { id: "ano-2027-2", nome: "2027 — 2ª chamada", data_inicio: "2027-01-11", data_fim: "2027-02-05", ativo: false },
  { id: "ano-2027", nome: "2027", data_inicio: "2026-10-01", data_fim: "2026-12-18", ativo: true },
  { id: "ano-2026", nome: "2026", data_inicio: "2025-10-01", data_fim: "2025-12-19", ativo: false },
];
