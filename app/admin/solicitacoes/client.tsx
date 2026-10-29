"use client";

import { useState, useMemo, useCallback, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { addApplicationObservation, getApplicationObservations } from "../_actions/observation-actions";
import { getCurrentIssuedDocuments, getIssuedDocumentUrl } from "../_actions/admin-actions";
import { ApplicationCard, type ApplicationSummary } from "../_components/application-card";
import { DataGrid, DataItem } from "../_components/data-grid";
import { EmptyState } from "../_components/empty-state";
import { Field } from "../_components/field";
import { PageHeader } from "../_components/page-header";
import { RecordRow } from "../_components/record-row";
import { SearchInput } from "../_components/search-input";
import { SegmentedFilter } from "../_components/segmented-filter";
import { STATUS_LABELS, STATUS_TONES, type ApplicationStatus } from "../_components/status-labels";
import { StatusPill } from "../_components/status-pill";
import { PAGE_TABS_LIST_CLASS, PAGE_TABS_TRIGGER_CLASS } from "../_components/url-tabs";

type StatusFilter = "todas" | ApplicationStatus;
type SortKey = "recentes" | "antigas" | "familia";

interface Filterable {
  status: ApplicationStatus;
  escola: string;
  pai_nome: string;
  mae_nome: string;
  students: Array<{ nome: string }>;
}

function matchesSearch(app: Filterable, query: string): boolean {
  if (!query) return true;
  return [app.pai_nome, app.mae_nome, app.escola, ...app.students.map((s) => s.nome)]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function filterApplications<T extends Filterable>(apps: T[], filter: StatusFilter, search: string): T[] {
  const query = search.trim().toLowerCase();
  return apps.filter((app) => (filter === "todas" || app.status === filter) && matchesSearch(app, query));
}

function sortApplications(apps: ApplicationSummary[], sort: SortKey): ApplicationSummary[] {
  return [...apps].sort((a, b) => {
    if (sort === "familia") return a.pai_nome.localeCompare(b.pai_nome, "pt-BR");
    if (sort === "antigas") return a.data_envio.localeCompare(b.data_envio);
    return b.data_envio.localeCompare(a.data_envio);
  });
}

function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "—";
}

/** Segmento de situação + busca + contagem + lista, compartilhado pelos dois papéis. */
function ApplicationsList<T extends Filterable>({
  applications,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  controls,
  visible,
  renderRow,
}: {
  applications: T[];
  filter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  controls?: ReactNode;
  visible: T[];
  renderRow: (app: T, index: number) => ReactNode;
}) {
  const count = (status: ApplicationStatus) => applications.filter((a) => a.status === status).length;
  const query = search.trim();

  return (
    <>
      <div className="flex flex-col gap-3">
        <SegmentedFilter<StatusFilter>
          label="Filtrar por situação"
          value={filter}
          onChange={onFilterChange}
          testIdPrefix="filter"
          options={[
            { value: "todas", label: "Todas", count: applications.length },
            { value: "pendente", label: STATUS_LABELS.pendente, count: count("pendente"), tone: STATUS_TONES.pendente },
            { value: "aprovada", label: "Aprovadas", count: count("aprovada"), tone: STATUS_TONES.aprovada },
            { value: "rejeitada", label: "Rejeitadas", count: count("rejeitada"), tone: STATUS_TONES.rejeitada },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput
            value={search}
            onChange={onSearchChange}
            label="Buscar solicitações"
            placeholder="Buscar família, aluno ou escola"
            className="sm:w-80"
            data-testid="search-input"
          />
          {controls}
        </div>
      </div>

      <p className="text-sm text-muted" aria-live="polite" data-testid="results-count">
        {visible.length} {visible.length === 1 ? "solicitação" : "solicitações"}
        {filter !== "todas" ? ` · ${STATUS_LABELS[filter].toLowerCase()}` : ""}
        {query ? ` · busca por “${query}”` : ""}
      </p>

      <div className="space-y-3" data-testid="application-list">
        {visible.length > 0 ? (
          visible.map(renderRow)
        ) : applications.length === 0 ? (
          <EmptyState
            title="Nenhuma solicitação recebida"
            description="Quando uma família enviar o formulário, a solicitação aparece aqui."
          />
        ) : (
          <EmptyState
            title="Nenhuma solicitação aqui"
            description="Mude o filtro ou limpe a busca para ver outras solicitações."
            action={
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  onFilterChange("todas");
                  onSearchChange("");
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        )}
      </div>
    </>
  );
}

export function SolicitacoesClient({
  initialApplications,
  initialStatus,
}: {
  initialApplications: ApplicationSummary[];
  initialStatus?: ApplicationStatus;
}) {
  const [applications, setApplications] = useState<ApplicationSummary[]>(initialApplications);
  const [filter, setFilter] = useState<StatusFilter>(initialStatus ?? "todas");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recentes");

  const visible = useMemo(
    () => sortApplications(filterApplications(applications, filter, search), sort),
    [applications, filter, search, sort]
  );
  const firstPendingId = visible.find((app) => app.status === "pendente")?.id;

  const handleDecision = useCallback(
    (id: string, status: ApplicationStatus, desconto_concedido?: number | null, motivo?: string | null) => {
      setApplications((prev) =>
        prev.map((app) =>
          app.id === id
            ? {
                ...app,
                status,
                desconto_concedido: desconto_concedido ?? app.desconto_concedido,
                motivo: motivo ?? app.motivo,
                data_decisao: status !== "pendente" ? new Date().toISOString() : null,
              }
            : app
        )
      );
    },
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitações de bolsa"
        description="Analise cada solicitação, confira os documentos e registre a decisão. Os PDFs ficam disponíveis dentro de cada registro."
      />
      <ApplicationsList
        applications={applications}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        visible={visible}
        controls={
          <div className="sm:w-48">
            <label htmlFor="sort-applications" className="sr-only">
              Ordenar
            </label>
            <NativeSelect
              id="sort-applications"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              data-testid="sort-select"
              className="w-full [&>select]:h-10 [&>select]:bg-surface"
            >
              <NativeSelectOption value="recentes">Mais recentes</NativeSelectOption>
              <NativeSelectOption value="antigas">Mais antigas</NativeSelectOption>
              <NativeSelectOption value="familia">Nome da família</NativeSelectOption>
            </NativeSelect>
          </div>
        }
        renderRow={(app) => (
          <ApplicationCard
            key={app.id}
            application={app}
            onDecision={handleDecision}
            defaultOpen={app.id === firstPendingId}
          />
        )}
      />
    </div>
  );
}

export interface SecretariatApplicationSummary {
  id: string;
  status: ApplicationStatus;
  escola: string;
  pai_nome: string;
  mae_nome: string;
  telefone: string;
  email: string | null;
  data_decisao: string | null;
  students: Array<{ id: string; nome: string }>;
}

export function SecretariatApplicationsClient({
  initialApplications,
  initialStatus,
}: {
  initialApplications: SecretariatApplicationSummary[];
  initialStatus?: ApplicationStatus;
}) {
  const [filter, setFilter] = useState<StatusFilter>(initialStatus ?? "todas");
  const [search, setSearch] = useState("");
  const visible = useMemo(
    () => filterApplications(initialApplications, filter, search),
    [initialApplications, filter, search]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitações de bolsa"
        description="Acompanhamento das famílias: contato, alunos, documentos finais e observações internas."
      />
      <ApplicationsList
        applications={initialApplications}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        visible={visible}
        renderRow={(app) => <SecretariatApplicationCard key={app.id} application={app} />}
      />
    </div>
  );
}

type SecretariatTab = "resumo" | "documentos-finais" | "observacoes";
type Observation = { id: string; body: string; created_at: string; author_user?: { email: string } | null };
type IssuedDocument = { id: string; kind: "decision" | "contract"; version: number };

function SecretariatApplicationCard({ application }: { application: SecretariatApplicationSummary }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<SecretariatTab>("resumo");
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<Observation[]>([]);
  const [documents, setDocuments] = useState<IssuedDocument[]>([]);

  useEffect(() => {
    if (!open) return;
    void Promise.all([getApplicationObservations(application.id), getCurrentIssuedDocuments(application.id)]).then(
      ([history, current]) => {
        setNotes(history as Observation[]);
        setDocuments(current as IssuedDocument[]);
      }
    );
  }, [application.id, open]);

  async function saveNote() {
    const result = await addApplicationObservation(application.id, note);
    if (result.success) {
      setNote("");
      setNotes((await getApplicationObservations(application.id)) as Observation[]);
    }
  }

  async function download(id: string) {
    const result = await getIssuedDocumentUrl(id);
    if ("url" in result) window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <RecordRow
      data-testid={`application-card-${application.id}`}
      toggleTestId="card-toggle"
      detailTestId="card-detail"
      open={open}
      onOpenChange={setOpen}
      title={`${application.pai_nome} e ${application.mae_nome}`}
      meta={
        <>
          <span>{application.escola}</span>
          <span data-testid="student-count">
            {application.students.length} {application.students.length === 1 ? "aluno" : "alunos"}
          </span>
          <span>{application.telefone}</span>
        </>
      }
      status={
        <StatusPill tone={STATUS_TONES[application.status]} data-testid="status-badge">
          {STATUS_LABELS[application.status]}
        </StatusPill>
      }
    >
      <Tabs value={tab} onValueChange={(next) => setTab(next as SecretariatTab)} className="gap-4">
        <TabsList variant="line" aria-label="Seções da solicitação" className={PAGE_TABS_LIST_CLASS} data-testid="detail-tabs">
          <TabsTrigger value="resumo" className={PAGE_TABS_TRIGGER_CLASS} data-testid="detail-tab-resumo">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="documentos-finais" className={PAGE_TABS_TRIGGER_CLASS} data-testid="detail-tab-documentos-finais">
            Documentos finais
          </TabsTrigger>
          <TabsTrigger value="observacoes" className={PAGE_TABS_TRIGGER_CLASS} data-testid="detail-tab-observacoes">
            Observações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo">
          <DataGrid cols={3}>
            <DataItem label="Pai / responsável" value={application.pai_nome} />
            <DataItem label="Mãe" value={application.mae_nome} />
            <DataItem label="Escola" value={application.escola} />
            <DataItem label="Telefone" value={application.telefone} />
            <DataItem label="E-mail" value={application.email} />
            <DataItem label="Alunos" value={application.students.map((student) => student.nome).join(", ")} />
            <DataItem label="Situação" value={STATUS_LABELS[application.status]} />
            <DataItem label="Data da decisão" value={formatDate(application.data_decisao)} />
          </DataGrid>
        </TabsContent>

        <TabsContent value="documentos-finais">
          {documents.length === 0 ? (
            <p className="text-sm text-muted">Nenhum documento final emitido.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {documents.map((document) => (
                <li
                  key={document.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg/50 px-3 py-2 text-sm"
                >
                  <span className="truncate">
                    {document.kind === "decision" ? "Carta de decisão" : "Contrato"} · versão {document.version}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => void download(document.id)}>
                    Baixar {document.kind === "decision" ? "decisão" : "contrato"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="observacoes" className="space-y-4">
          {notes.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma observação registrada.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {notes.map((item) => (
                <li key={item.id} className="py-2 text-sm">
                  <p className="text-fg">{item.body}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {item.author_user?.email ?? "Secretaria"} · {formatDate(item.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Field
            label="Nova observação"
            hint="Registre apenas informações operacionais, de forma concisa; não inclua dados sensíveis desnecessários."
            className="max-w-xl"
          >
            {(a11y) => (
              <Textarea
                {...a11y}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={2000}
                rows={3}
                className="bg-surface"
                placeholder="Registrar observação interna"
              />
            )}
          </Field>
          <Button size="lg" disabled={!note.trim()} onClick={() => void saveNote()}>
            Registrar observação
          </Button>
        </TabsContent>
      </Tabs>
    </RecordRow>
  );
}
