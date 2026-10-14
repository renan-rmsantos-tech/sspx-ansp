"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DonorReportCategory } from "../_actions/donor-report-actions";

const COLORS = ["#243b61", "#927330", "#52735a", "#79618b", "#ad7049", "#537d87"];

export function DonorReportCharts({ categories, label }: { categories: DonorReportCategory[]; label: string }) {
  const data = [...categories].sort((a, b) => b.count - a.count).map(({ key, label: category, count }) => ({ key, category, count }));
  return (
    <div role="img" aria-label={`Gráfico de barras: ${label}. Os valores exatos estão na tabela abaixo.`} style={{ height: Math.max(240, data.length * 36 + 40) }} className="w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="category" width={145} interval={0} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => [`${value ?? 0} cadastros`, "Quantidade"]} />
          <Bar dataKey="count" name="Cadastros" radius={[0, 3, 3, 0]}>
            {data.map((item, index) => <Cell key={item.key} fill={COLORS[index % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
