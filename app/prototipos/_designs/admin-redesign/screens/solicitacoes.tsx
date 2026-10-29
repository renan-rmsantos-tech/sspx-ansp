"use client";

import { useMemo, useState } from "react";
import { FileDown, FileSignature, Printer } from "lucide-react";
import type { ScreenProps } from "../shell";
import { APPLICATIONS, currency, formatDate, type AppFixture, type AppStatus } from "../fixtures";
import {
  ActionBar,
  Button,
  DataGrid,
  DataItem,
  EmptyState,
  Field,
  Notice,
  PageHeader,
  RecordRow,
  SearchInput,
  SegmentedFilter,
  Select,
  StatusPill,
  Tabs,
  TextInput,
  Textarea,
} from "../ui";

type Filter = "todas" | AppStatus;
type Sort = "recentes" | "antigas" | "familia";

const STATUS: Record<AppStatus, { label: string; tone: "warn" | "success" | "danger" }> = {
  pendente: { label: "Aguardando decisão", tone: "warn" },
  aprovada: { label: "Aprovada", tone: "success" },
  rejeitada: { label: "Rejeitada", tone: "danger" },
};

export function SolicitacoesScreen({ role }: ScreenProps) {
  const [apps, setApps] = useState(APPLICATIONS);
  const [filter, setFilter] = useState<Filter>("todas");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("recentes");

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    let items = apps.filter((a) => (filter === "todas" ? true : a.status === filter));
    if (q) items = items.filter((a) => [a.familia, a.pai, a.mae, a.escola, ...a.alunos.map((s) => s.nome)].join(" ").toLowerCase().includes(q));
    return [...items].sort((a, b) =>
      sort === "familia" ? a.familia.localeCompare(b.familia, "pt-BR") : sort === "antigas" ? a.dataEnvio.localeCompare(b.dataEnvio) : b.dataEnvio.localeCompare(a.dataEnvio)
    );
  }, [apps, filter, search, sort]);

  const count = (s: AppStatus) => apps.filter((a) => a.status === s).length;

  const decide = (id: string, status: AppStatus, desconto?: number, motivo?: string) =>
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status, descontoConcedido: desconto, motivo, dataDecisao: "2026-10-29" } : a)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitações de bolsa"
        description={
          role === "admin"
            ? "Analise cada solicitação, confira os documentos e registre a decisão. Os PDFs ficam disponíveis dentro de cada registro."
            : "Acompanhamento das famílias: contato, alunos, documentos finais e observações internas."
        }
        odId="solicitacoes-header"
      />

      <div className="flex flex-col gap-3" data-od-id="solicitacoes-toolbar">
        <SegmentedFilter<Filter>
          label="Filtrar por situação"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "todas", label: "Todas", count: apps.length },
            { value: "pendente", label: "Aguardando decisão", count: count("pendente"), tone: "warn" },
            { value: "aprovada", label: "Aprovadas", count: count("aprovada"), tone: "success" },
            { value: "rejeitada", label: "Rejeitadas", count: count("rejeitada"), tone: "danger" },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} label="Buscar solicitações" placeholder="Buscar família, aluno ou escola" className="sm:w-80" />
          <div className="sm:w-48">
            <label htmlFor="sort-apps" className="sr-only">Ordenar</label>
            <Select id="sort-apps" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="recentes">Mais recentes</option>
              <option value="antigas">Mais antigas</option>
              <option value="familia">Nome da família</option>
            </Select>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        {list.length} {list.length === 1 ? "solicitação" : "solicitações"}
        {filter !== "todas" ? ` · ${STATUS[filter].label.toLowerCase()}` : ""}
        {search.trim() ? ` · busca por “${search.trim()}”` : ""}
      </p>

      <div className="space-y-3" data-od-id="solicitacoes-lista">
        {list.length === 0 ? (
          <EmptyState title="Nenhuma solicitação aqui" description="Mude o filtro ou limpe a busca para ver outras solicitações." action={<Button variant="outline" onClick={() => { setFilter("todas"); setSearch(""); }}>Limpar filtros</Button>} />
        ) : (
          list.map((app, index) => (
            <ApplicationRow key={app.id} app={app} role={role} onDecide={decide} defaultOpen={index === 0 && app.status === "pendente"} />
          ))
        )}
      </div>
    </div>
  );
}

function ApplicationRow({ app, role, onDecide, defaultOpen }: { app: AppFixture; role: ScreenProps["role"]; onDecide: (id: string, s: AppStatus, d?: number, m?: string) => void; defaultOpen: boolean }) {
  const status = STATUS[app.status];
  const [tab, setTab] = useState<"resumo" | "documentos" | "financeiro" | "decisao">(app.status === "pendente" ? "documentos" : "resumo");
  const total = app.alunos.reduce((s, a) => s + a.mensalidade, 0);

  return (
    <RecordRow
      odId={`solicitacao-${app.id}`}
      defaultOpen={defaultOpen}
      title={app.familia}
      meta={
        <>
          <span>{app.pai} e {app.mae}</span>
          <span>{app.escola}</span>
          <span>{app.alunos.length} {app.alunos.length === 1 ? "aluno" : "alunos"}</span>
          <span>Enviada em {formatDate(app.dataEnvio)}</span>
        </>
      }
      status={<StatusPill tone={status.tone}>{status.label}</StatusPill>}
    >
      <Tabs
        label="Seções da solicitação"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "resumo", label: "Resumo" },
          { id: "documentos", label: "Documentos", badge: <span className="text-xs text-muted">{app.documentos}</span> },
          { id: "financeiro", label: "Renda e despesas" },
          { id: "decisao", label: "Decisão", badge: app.status === "pendente" ? <span aria-hidden className="size-1.5 rounded-full bg-warn" /> : undefined },
        ]}
      >
        {tab === "resumo" && (
          <div className="space-y-6">
            <DataGrid cols={3}>
              <DataItem label="Pai / responsável" value={app.pai} />
              <DataItem label="Mãe" value={app.mae} />
              <DataItem label="Escola" value={app.escola} />
              <DataItem label="Telefone" value={app.telefone} />
              <DataItem label="E-mail" value={app.email} />
              <DataItem label="Endereço" value={app.endereco} />
            </DataGrid>
            <div>
              <h3 className="text-sm font-semibold text-fg">Alunos</h3>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3 font-medium">Nome</th>
                    <th className="py-2 pr-3 font-medium">Série</th>
                    <th className="py-2 text-right font-medium">Mensalidade</th>
                  </tr>
                </thead>
                <tbody>
                  {app.alunos.map((s) => (
                    <tr key={s.nome} className="border-b border-border/60">
                      <td className="py-2 pr-3">{s.nome}</td>
                      <td className="py-2 pr-3 text-muted">{s.serie}</td>
                      <td className="py-2 text-right tabular-nums">{currency.format(s.mensalidade)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="pt-2" colSpan={2}>Total das mensalidades</td>
                    <td className="pt-2 text-right tabular-nums">{currency.format(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {tab === "documentos" && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {["RG e CPF dos responsáveis", "Comprovante de residência", "Comprovante de renda — pai", "Comprovante de renda — mãe", "Declaração de imposto de renda", "Carteira de trabalho", "Contrato de aluguel"].slice(0, app.documentos).map((doc) => (
              <li key={doc} className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg/50 px-3 py-2 text-sm">
                <span className="truncate">{doc}</span>
                <Button variant="ghost" size="sm">Abrir</Button>
              </li>
            ))}
          </ul>
        )}

        {tab === "financeiro" && (
          <div className="space-y-6">
            <DataGrid cols={4}>
              <DataItem label="Renda do pai" value={currency.format(app.renda.pai)} />
              <DataItem label="Renda da mãe" value={currency.format(app.renda.mae)} />
              <DataItem label="Outras rendas" value={currency.format(app.renda.outros)} />
              <DataItem label="Pessoas no domicílio" value={app.renda.pessoas} />
            </DataGrid>
            <div>
              <h3 className="text-sm font-semibold text-fg">Despesas mensais declaradas</h3>
              <dl className="mt-2 divide-y divide-border/60 text-sm">
                {app.despesas.map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1.5">
                    <dt className="text-muted">{label}</dt>
                    <dd className="tabular-nums">{currency.format(value)}</dd>
                  </div>
                ))}
                <div className="flex justify-between py-1.5 font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{currency.format(app.despesas.reduce((s, [, v]) => s + v, 0))}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {tab === "decisao" && <DecisionPanel app={app} role={role} onDecide={onDecide} />}
      </Tabs>

      <ActionBar note="Os PDFs são gerados com o cabeçalho e os modelos configurados.">
        <Button variant="outline" size="lg"><Printer aria-hidden /> Imprimir dados da solicitação</Button>
        {app.status !== "pendente" && <Button variant="outline" size="lg"><FileDown aria-hidden /> Carta de decisão</Button>}
        {app.status === "aprovada" && <Button variant="outline" size="lg"><FileSignature aria-hidden /> Contrato</Button>}
      </ActionBar>
    </RecordRow>
  );
}

function DecisionPanel({ app, role, onDecide }: { app: AppFixture; role: ScreenProps["role"]; onDecide: (id: string, s: AppStatus, d?: number, m?: string) => void }) {
  const [mode, setMode] = useState<"idle" | "aprovar" | "rejeitar">("idle");
  const [desconto, setDesconto] = useState(String(app.descontoSolicitado));
  const [motivo, setMotivo] = useState("");

  if (app.status !== "pendente") {
    return (
      <div className="space-y-4">
        <Notice tone={app.status === "aprovada" ? "success" : "danger"} title={app.status === "aprovada" ? `Aprovada com ${app.descontoConcedido}% de desconto` : "Rejeitada"}>
          Registrada em {app.dataDecisao ? formatDate(app.dataDecisao) : "—"}. {app.motivo ?? "Sem motivo registrado."}
        </Notice>
        <DataGrid cols={3}>
          <DataItem label="Desconto solicitado" value={`${app.descontoSolicitado}%`} />
          <DataItem label="Desconto concedido" value={app.descontoConcedido != null ? `${app.descontoConcedido}%` : "—"} />
          <DataItem label="Data da decisão" value={app.dataDecisao ? formatDate(app.dataDecisao) : "—"} />
        </DataGrid>
      </div>
    );
  }

  if (role !== "admin") {
    return <Notice>A decisão é registrada pela Administração. A Secretaria acompanha o resultado e os documentos finais.</Notice>;
  }

  if (mode === "idle") {
    return (
      <div className="space-y-4" data-od-id={`decisao-${app.id}`}>
        <DataGrid cols={3}>
          <DataItem label="Desconto solicitado" value={`${app.descontoSolicitado}%`} />
          <DataItem label="Renda familiar" value={currency.format(app.renda.pai + app.renda.mae + app.renda.outros)} />
          <DataItem label="Mensalidades" value={currency.format(app.alunos.reduce((s, a) => s + a.mensalidade, 0))} />
        </DataGrid>
        <Notice>Confira os documentos e a renda antes de decidir. A família recebe a carta com o texto configurado em Modelos de documentos.</Notice>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={() => setMode("aprovar")}>Aprovar solicitação</Button>
          <Button size="lg" variant="destructive" onClick={() => setMode("rejeitar")}>Rejeitar</Button>
        </div>
      </div>
    );
  }

  const approving = mode === "aprovar";
  return (
    <form
      className="max-w-xl space-y-4 rounded-lg border border-border bg-cream/50 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onDecide(app.id, approving ? "aprovada" : "rejeitada", approving ? Number(desconto) : undefined, motivo || undefined);
      }}
    >
      <div>
        <h3 className="font-heading text-lg font-semibold text-fg">{approving ? "Aprovar solicitação" : "Rejeitar solicitação"}</h3>
        <p className="mt-1 text-sm text-muted">
          {approving ? "Informe o percentual concedido. Ele aparece na carta e no contrato." : "Esta ação é definitiva e a família será informada."}
        </p>
      </div>
      {approving && (
        <Field label="Desconto concedido (%)" hint={`Solicitado: ${app.descontoSolicitado}%`} className="max-w-52">
          {(a11y) => <TextInput {...a11y} type="number" min={0} max={100} value={desconto} onChange={(e) => setDesconto(e.target.value)} />}
        </Field>
      )}
      <Field label="Motivo (opcional)" hint="Aparece na carta de decisão quando preenchido.">
        {(a11y) => <Textarea {...a11y} value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />}
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" variant={approving ? "default" : "destructive"}>
          {approving ? "Confirmar aprovação" : "Confirmar rejeição"}
        </Button>
        <Button type="button" size="lg" variant="ghost" onClick={() => setMode("idle")}>Voltar</Button>
      </div>
    </form>
  );
}
