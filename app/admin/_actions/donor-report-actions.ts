"use server";

import { sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { PRIORADO_NENHUMA, prioradoCapelaLabel } from "@/lib/data/priorados-capelas";

const DONOR_REPORT_FREQUENCIES = ["mensal", "unica"] as const;
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Data inválida.");

const donorReportFilterSchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  frequency: z.enum(DONOR_REPORT_FREQUENCIES).optional(),
});

export type DonorReportFilters = z.input<typeof donorReportFilterSchema>;
export type DonorReportCategory = { key: string; label: string; count: number };
export type DonorReports = {
  filters: z.output<typeof donorReportFilterSchema>;
  total: number;
  residenceByState: DonorReportCategory[];
  prioryOrChapel: DonorReportCategory[];
};

type AggregateRow = {
  report: "total" | "residence" | "chapel";
  category: string | null;
  count: number | string;
};

const UF_LABELS: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

function nextUtcDate(date: string): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString();
}

function categoriesFromRows(
  rows: AggregateRow[],
  report: "residence" | "chapel"
): DonorReportCategory[] {
  const byKey = new Map<string, DonorReportCategory>();
  for (const row of rows) {
    if (row.report !== report || !row.category) continue;
    const count = Number(row.count);
    if (report === "residence") {
      const unknown = row.category === "__unknown__";
      const key = unknown ? "__unknown__" : row.category;
      byKey.set(key, {
        key,
        label: unknown ? "Local não identificado" : UF_LABELS[row.category] ?? row.category,
        count,
      });
    } else {
      const unknown = row.category === "__unreported__";
      byKey.set(row.category, {
        key: row.category,
        label: unknown ? "Não informado" : prioradoCapelaLabel(row.category),
        count,
      });
    }
  }

  if (report === "residence" && !byKey.has("__unknown__")) {
    byKey.set("__unknown__", { key: "__unknown__", label: "Local não identificado", count: 0 });
  }
  if (report === "chapel") {
    if (!byKey.has(PRIORADO_NENHUMA)) {
      byKey.set(PRIORADO_NENHUMA, { key: PRIORADO_NENHUMA, label: "Nenhuma", count: 0 });
    }
    if (!byKey.has("__unreported__")) {
      byKey.set("__unreported__", { key: "__unreported__", label: "Não informado", count: 0 });
    }
  }

  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key, "pt-BR"));
}

export async function getDonorReports(input: DonorReportFilters = {}): Promise<DonorReports> {
  await requireAdmin();
  const parsed = donorReportFilterSchema.safeParse(input);
  if (!parsed.success) throw new Error("Filtros do relatório inválidos.");
  const filters = parsed.data;
  if (filters.from && filters.to && filters.from > filters.to) {
    throw new Error("A data inicial deve ser anterior ou igual à data final.");
  }

  const predicates = [];
  if (filters.from) predicates.push(sql`created_at >= ${`${filters.from}T00:00:00.000Z`}::timestamptz`);
  if (filters.to) predicates.push(sql`created_at < ${nextUtcDate(filters.to)}::timestamptz`);
  if (filters.frequency) predicates.push(sql`frequencia = ${filters.frequency}`);
  const where = predicates.length
    ? sql`WHERE ${sql.join(predicates, sql` AND `)}`
    : sql``;

  const rows = await db.execute<AggregateRow>(sql`
    WITH selected AS (
      SELECT residence_state, priorado_capela
      FROM donor_pledges
      ${where}
    )
    SELECT 'total'::text AS report, NULL::text AS category, count(*)::int AS count
    FROM selected
    UNION ALL
    SELECT 'residence'::text AS report,
      coalesce(residence_state, '__unknown__') AS category,
      count(*)::int AS count
    FROM selected
    GROUP BY coalesce(residence_state, '__unknown__')
    UNION ALL
    SELECT 'chapel'::text AS report,
      coalesce(priorado_capela, '__unreported__') AS category,
      count(*)::int AS count
    FROM selected
    GROUP BY coalesce(priorado_capela, '__unreported__')
  `);

  const total = Number(rows.find((row) => row.report === "total")?.count ?? 0);
  const residenceByState = categoriesFromRows(rows, "residence");
  const prioryOrChapel = categoriesFromRows(rows, "chapel");
  return { filters, total, residenceByState, prioryOrChapel };
}
