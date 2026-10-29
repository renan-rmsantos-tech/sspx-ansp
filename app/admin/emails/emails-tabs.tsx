"use client";

import type { ComponentProps } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PAGE_TABS_LIST_CLASS, PAGE_TABS_TRIGGER_CLASS, useUrlTab } from "../_components/url-tabs";
import { DonorEmailClient } from "./_clients/welcome";
import { DonorMonthlyInstructionsClient } from "./_clients/monthly-instructions";
import { DonorReminderClient } from "./_clients/reminders";

export const EMAIL_TABS = ["boas-vindas", "instrucoes", "lembretes"] as const;
export type EmailTab = (typeof EMAIL_TABS)[number];

const TAB_LABELS: Record<EmailTab, string> = {
  "boas-vindas": "Boas-vindas",
  instrucoes: "Instruções de pagamento",
  lembretes: "Lembretes de vencimento",
};

export function EmailsTabs({
  welcome,
  monthly,
  reminders,
}: {
  welcome: ComponentProps<typeof DonorEmailClient>;
  monthly: ComponentProps<typeof DonorMonthlyInstructionsClient>;
  reminders: ComponentProps<typeof DonorReminderClient>;
}) {
  const [tab, setTab] = useUrlTab<EmailTab>("/admin/emails", EMAIL_TABS, "boas-vindas");

  return (
    <Tabs value={tab} onValueChange={(next) => setTab(next as EmailTab)} className="gap-5">
      <TabsList variant="line" aria-label="Tipo de e-mail" className={PAGE_TABS_LIST_CLASS}>
        {EMAIL_TABS.map((id) => (
          <TabsTrigger key={id} value={id} data-testid={`tab-${id}`} className={PAGE_TABS_TRIGGER_CLASS}>
            {TAB_LABELS[id]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="boas-vindas">
        <DonorEmailClient {...welcome} />
      </TabsContent>
      <TabsContent value="instrucoes">
        <DonorMonthlyInstructionsClient {...monthly} />
      </TabsContent>
      <TabsContent value="lembretes">
        <DonorReminderClient {...reminders} />
      </TabsContent>
    </Tabs>
  );
}
