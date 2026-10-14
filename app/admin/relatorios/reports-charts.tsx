"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DonorReportCategory } from "../_actions/donor-report-actions";

const COLORS = ["#243b61", "#927330", "#52735a", "#79618b", "#ad7049", "#537d87"];

export function DonorReportCharts({ categories, label }: { categories: DonorReportCategory[]; label: string }) {
  const data = categories.map(({ key, label: category, count }) => ({ key, category, count }));
  return (
    <div role="img" aria-label={`Gráfico de barras: ${label}. Os valores exatos estão na tabela abaixo.`} className="h-[280px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 36, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="category" angle={-28} textAnchor="end" interval={0} height={76} tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} width={36} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => [`${value ?? 0} cadastros`, "Quantidade"]} />
          <Bar dataKey="count" name="Cadastros" radius={[3, 3, 0, 0]}>
            {data.map((item, index) => <Cell key={item.key} fill={COLORS[index % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
