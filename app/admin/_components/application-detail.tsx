"use client";

import { useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataGrid, DataItem } from "./data-grid";
import { DocumentPreview } from "./document-preview";
import { EmptyState } from "./empty-state";
import { PAGE_TABS_LIST_CLASS, PAGE_TABS_TRIGGER_CLASS } from "./url-tabs";

type DetailTab = "resumo" | "documentos" | "financeiro" | "decisao";

interface ApplicationDetailProps {
  detail: Record<string, unknown>;
  status?: string;
  decisionPanel: ReactNode;
  /** Conteúdo extra no fim da aba Resumo (ex.: observações internas). */
  afterResumo?: ReactNode;
  defaultTab?: DetailTab;
}

const EXPENSES: Array<[string, string]> = [
  ["Aluguel", "despesa_aluguel"],
  ["Serviços", "despesa_servicos"],
  ["TV", "despesa_tv"],
  ["Celular (plano)", "despesa_celular_plano"],
  ["Celular (parcelas)", "despesa_celular_parcelas"],
  ["Internet", "despesa_internet"],
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatCurrency(value: unknown): string {
  return value == null ? "—" : currency.format(Number(value));
}

function Subsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function pickDefaultTab(documents: unknown[], status?: string): DetailTab {
  return status === "pendente" && documents.length > 0 ? "documentos" : "resumo";
}

export function ApplicationDetail({ detail, status, decisionPanel, afterResumo, defaultTab }: ApplicationDetailProps) {
  const d = detail;
  const students = (d.students as Array<Record<string, unknown>>) ?? [];
  const otherChildren = (d.other_children as Array<Record<string, unknown>>) ?? [];
  const vehicles = (d.vehicles as Array<Record<string, unknown>>) ?? [];
  const collaboration = d.collaboration as Record<string, unknown> | null;
  const benefactors = (d.benefactors as Array<Record<string, unknown>>) ?? [];
  const documents = (d.documents as Array<Record<string, unknown>>) ?? [];
  const tuitionTotal = students.reduce((total, s) => total + (Number(s.mensalidade) || 0), 0);
  const expensesTotal = EXPENSES.reduce((total, [, key]) => total + (Number(d[key]) || 0), 0);

  const [tab, setTab] = useState<DetailTab>(defaultTab ?? pickDefaultTab(documents, status));

  return (
    <Tabs
      value={tab}
      onValueChange={(next) => setTab(next as DetailTab)}
      className="gap-4"
      data-testid="application-detail"
    >
      <TabsList variant="line" aria-label="Seções da solicitação" className={PAGE_TABS_LIST_CLASS} data-testid="detail-tabs">
        <TabsTrigger value="resumo" className={PAGE_TABS_TRIGGER_CLASS} data-testid="detail-tab-resumo">
          Resumo
        </TabsTrigger>
        <TabsTrigger value="documentos" className={PAGE_TABS_TRIGGER_CLASS} data-testid="detail-tab-documentos">
          Documentos ({documents.length})
        </TabsTrigger>
        <TabsTrigger value="financeiro" className={PAGE_TABS_TRIGGER_CLASS} data-testid="detail-tab-financeiro">
          Renda e despesas
        </TabsTrigger>
        <TabsTrigger value="decisao" className={PAGE_TABS_TRIGGER_CLASS} data-testid="detail-tab-decisao">
          Decisão
          {status === "pendente" && (
            <>
              <span aria-hidden="true" className="size-1.5 rounded-full bg-warn" />
              <span className="sr-only">aguardando decisão</span>
            </>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="resumo" className="space-y-6" data-testid="detail-panel-resumo">
        <Subsection title="Responsáveis e contato">
          <DataGrid cols={3}>
            <DataItem label="Pai / responsável" value={d.pai_nome as string} />
            <DataItem label="RG do pai" value={d.pai_rg as string} />
            <DataItem label="CPF do pai" value={d.pai_cpf as string} />
            <DataItem label="Profissão do pai" value={d.pai_profissao as string} />
            <DataItem label="Mãe" value={d.mae_nome as string} />
            <DataItem label="CPF da mãe" value={d.mae_cpf as string} />
            <DataItem label="Profissão da mãe" value={d.mae_profissao as string} />
            <DataItem label="Escola" value={d.escola as string} />
            <DataItem label="Telefone" value={d.telefone as string} />
            <DataItem label="E-mail" value={d.email as string} />
            <DataItem label="Endereço" value={d.endereco as string} />
            <DataItem label="CEP" value={d.cep as string} />
          </DataGrid>
        </Subsection>

        <Subsection title="Alunos">
          {students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="students-table">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3 font-medium">Nome</th>
                    <th className="py-2 pr-3 font-medium">CPF</th>
                    <th className="py-2 pr-3 font-medium">Série</th>
                    <th className="py-2 text-right font-medium">Mensalidade</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id as string} className="border-b border-border/60">
                      <td className="py-2 pr-3">{s.nome as string}</td>
                      <td className="py-2 pr-3 text-muted">{(s.cpf as string) || "—"}</td>
                      <td className="py-2 pr-3 text-muted">{s.serie as string}</td>
                      <td className="py-2 text-right tabular-nums">{formatCurrency(s.mensalidade)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="pt-2" colSpan={3}>
                      Total das mensalidades
                    </td>
                    <td className="pt-2 text-right tabular-nums">{currency.format(tuitionTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted">Nenhum aluno registrado.</p>
          )}
        </Subsection>

        {otherChildren.length > 0 && (
          <Subsection title="Outros filhos">
            <ul className="space-y-1 text-sm">
              {otherChildren.map((c) => (
                <li key={c.id as string}>
                  {c.nome as string} — {c.nascimento as string}
                  {c.cpf ? ` (CPF: ${c.cpf})` : ""}
                </li>
              ))}
            </ul>
          </Subsection>
        )}

        {afterResumo}
      </TabsContent>

      <TabsContent value="documentos" data-testid="detail-panel-documentos">
        {documents.length > 0 ? (
          <DocumentPreview documents={documents} />
        ) : (
          <EmptyState
            title="Nenhum documento enviado"
            description="A família não anexou documentos a esta solicitação."
            className="py-8"
          />
        )}
      </TabsContent>

      <TabsContent value="financeiro" className="space-y-6" data-testid="detail-panel-financeiro">
        <DataGrid cols={4}>
          <DataItem label="Renda do pai" value={formatCurrency(d.renda_pai)} />
          <DataItem label="Renda da mãe" value={formatCurrency(d.renda_mae)} />
          <DataItem label="Outras rendas" value={formatCurrency(d.renda_outros)} />
          <DataItem label="Pessoas no domicílio" value={d.pessoas_domicilio as number} />
        </DataGrid>

        <Subsection title="Despesas mensais declaradas">
          <dl className="divide-y divide-border/60 text-sm" data-testid="expenses-section">
            {EXPENSES.map(([label, key]) => (
              <div key={key} className="flex justify-between py-1.5">
                <dt className="text-muted">{label}</dt>
                <dd className="tabular-nums">{formatCurrency(d[key])}</dd>
              </div>
            ))}
            <div className="flex justify-between py-1.5 font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{currency.format(expensesTotal)}</dd>
            </div>
          </dl>
        </Subsection>

        {vehicles.length > 0 && (
          <Subsection title="Veículos">
            <ul className="space-y-1 text-sm" data-testid="vehicles-section">
              {vehicles.map((v) => (
                <li key={v.id as string}>
                  {v.marca as string} {v.modelo as string} ({v.ano as string})
                </li>
              ))}
            </ul>
          </Subsection>
        )}

        {collaboration && (
          <Subsection title="Colaboração voluntária">
            <div className="space-y-1 text-sm" data-testid="volunteer-section">
              {Boolean(collaboration.limpeza) && (
                <p>Limpeza: {collaboration.limpeza_vezes_semana as number}x por semana</p>
              )}
              {Boolean(collaboration.mutirao) && <p>Mutirão: {collaboration.mutirao_sabados as number} sábados</p>}
              {Boolean(collaboration.arrecadacao) && <p>Arrecadação: Sim</p>}
              {Boolean(collaboration.buscar_benfeitores) && <p>Buscar benfeitores: Sim</p>}
              {Boolean(collaboration.outros) && <p>Outros: {collaboration.outros as string}</p>}
            </div>
          </Subsection>
        )}

        {benefactors.length > 0 && (
          <Subsection title="Indicação de benfeitores">
            <ul className="space-y-1 text-sm" data-testid="benefactors-section">
              {benefactors.map((b) => (
                <li key={b.id as string}>
                  {b.nome as string}
                  {b.email ? ` (${b.email})` : ""}
                </li>
              ))}
            </ul>
          </Subsection>
        )}
      </TabsContent>

      <TabsContent value="decisao" data-testid="detail-panel-decisao">
        {decisionPanel}
      </TabsContent>
    </Tabs>
  );
}
