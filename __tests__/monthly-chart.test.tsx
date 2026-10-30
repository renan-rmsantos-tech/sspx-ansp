import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("recharts", () => ({ ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null, Bar: () => null }));
import { MonthlyChart } from "@/app/admin/pagamentos/monthly-chart";
it("shows exact values and receipt counts in a semantic table", () => {
 render(<MonthlyChart coverageStart="2026-01" series={[{ month: "2026-01", expected: "100.01", received: "80.02", receipt_pending: 1, receipt_sent: 2, overdue_missing_receipt: 1 }]} />);
 expect(screen.getByRole("table")).toHaveTextContent("R$ 100,01");
 expect(screen.getByRole("table")).toHaveTextContent("R$ 80,02");
 expect(screen.getByRole("rowheader", { name: "2026-01" })).toBeInTheDocument();
 expect(screen.getByRole("img")).toHaveAccessibleName(/valores exatos na tabela/);
});
