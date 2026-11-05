"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ContractTemplate } from "../_actions/admin-actions";
import { ContractTemplateEditor } from "../_components/contract-template-editor";
import { TemplateEditor, type TemplateData } from "../_components/template-editor";
import { PAGE_TABS_LIST_CLASS, PAGE_TABS_TRIGGER_CLASS, useUrlTab } from "../_components/url-tabs";

export const MODEL_TABS = ["aprovacao", "rejeicao", "contrato"] as const;
export type ModelTab = (typeof MODEL_TABS)[number];

const TAB_LABELS: Record<ModelTab, string> = {
  aprovacao: "Carta de aprovação",
  rejeicao: "Carta de rejeição",
  contrato: "Contrato de concessão",
};

export function ModelosTabs({
  templates,
  contract,
  defaultTab = "aprovacao",
  initialMessages = {},
}: {
  templates: TemplateData[];
  contract: ContractTemplate | null;
  /** Aba aberta quando a URL não traz `?aba=`. */
  defaultTab?: ModelTab;
  /** Mensagem de salvamento já exibida em cada aba (usada pelos protótipos). */
  initialMessages?: Partial<Record<ModelTab, { type: "success" | "error"; text: string }>>;
}) {
  const [tab, setTab] = useUrlTab<ModelTab>("/admin/modelos", MODEL_TABS, defaultTab);

  return (
    <Tabs value={tab} onValueChange={(next) => setTab(next as ModelTab)} className="gap-5">
      <TabsList variant="line" aria-label="Modelo" className={PAGE_TABS_LIST_CLASS}>
        {MODEL_TABS.map((id) => (
          <TabsTrigger key={id} value={id} data-testid={`tab-${id}`} className={PAGE_TABS_TRIGGER_CLASS}>
            {TAB_LABELS[id]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="aprovacao">
        <TemplateEditor initialTemplates={templates} tipo="aprovacao" initialMessage={initialMessages.aprovacao} />
      </TabsContent>
      <TabsContent value="rejeicao">
        <TemplateEditor initialTemplates={templates} tipo="rejeicao" initialMessage={initialMessages.rejeicao} />
      </TabsContent>
      <TabsContent value="contrato">
        <ContractTemplateEditor initialTemplate={contract} initialMessage={initialMessages.contrato} />
      </TabsContent>
    </Tabs>
  );
}
