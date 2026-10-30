"use client";

import type { ComponentProps } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PAGE_TABS_LIST_CLASS, PAGE_TABS_TRIGGER_CLASS, useUrlTab } from "../_components/url-tabs";
import { FinancialReport } from "./financial-report";
import { DonorReportsClient } from "./reports-client";

export const REPORT_TABS = ["cadastros", "financeiro"] as const;
export type ReportTab = (typeof REPORT_TABS)[number];

const TAB_LABELS: Record<ReportTab, string> = {
  cadastros: "Cadastros de benfeitores",
  financeiro: "Financeiro",
};

export function RelatoriosTabs({
  reports,
  financial,
}: {
  reports: ComponentProps<typeof DonorReportsClient>["initialReports"];
  financial: ComponentProps<typeof FinancialReport>["initialReport"];
}) {
  const [tab, setTab] = useUrlTab<ReportTab>("/admin/relatorios", REPORT_TABS, "cadastros");

  return (
    <Tabs value={tab} onValueChange={(next) => setTab(next as ReportTab)} className="gap-5">
      <TabsList variant="line" aria-label="Tipo de relatório" className={PAGE_TABS_LIST_CLASS}>
        {REPORT_TABS.map((id) => (
          <TabsTrigger key={id} value={id} data-testid={`tab-${id}`} className={PAGE_TABS_TRIGGER_CLASS}>
            {TAB_LABELS[id]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="cadastros">
        <DonorReportsClient initialReports={reports} />
      </TabsContent>
      <TabsContent value="financeiro">
        <FinancialReport initialReport={financial} />
      </TabsContent>
    </Tabs>
  );
}
