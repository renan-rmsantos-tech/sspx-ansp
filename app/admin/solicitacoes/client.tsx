"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { addApplicationObservation, getApplicationObservations } from "../_actions/observation-actions";
import { getCurrentIssuedDocuments, getIssuedDocumentUrl } from "../_actions/admin-actions";
import {
  StatsDashboard,
  computeStats,
  type StatusFilter,
} from "../_components/stats-dashboard";
import { ApplicationCard, type ApplicationSummary } from "../_components/application-card";

type SortKey = "data_desc" | "data_asc" | "nome" | "escola";

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendente", label: "Pendente" },
  { value: "aprovada", label: "Aprovada" },
  { value: "rejeitada", label: "Rejeitada" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "data_desc", label: "Mais recentes" },
  { value: "data_asc", label: "Mais antigas" },
  { value: "nome", label: "Nome da família" },
  { value: "escola", label: "Escola" },
];

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function matchesSearch(app: ApplicationSummary, query: string): boolean {
  if (!query) return true;
  const haystack = [
    app.pai_nome,
    app.mae_nome,
    app.escola,
    ...app.students.map((s) => s.nome),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function sortApplications(apps: ApplicationSummary[], sort: SortKey): ApplicationSummary[] {
  const sorted = [...apps];
  sorted.sort((a, b) => {
    switch (sort) {
      case "data_asc":
        return a.data_envio.localeCompare(b.data_envio);
      case "nome":
        return `${a.pai_nome} ${a.mae_nome}`.localeCompare(
          `${b.pai_nome} ${b.mae_nome}`,
          "pt-BR"
        );
      case "escola":
        return a.escola.localeCompare(b.escola, "pt-BR");
      case "data_desc":
      default:
        return b.data_envio.localeCompare(a.data_envio);
    }
  });
  return sorted;
}

interface SolicitacoesClientProps {
  initialApplications: ApplicationSummary[];
}

export interface SecretariatApplicationSummary {
  id: string;
  status: "pendente" | "aprovada" | "rejeitada";
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
}: {
  initialApplications: SecretariatApplicationSummary[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Dados operacionais para acompanhamento das famílias.</p>
      {initialApplications.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Nenhuma solicitação encontrada.</p>
      ) : initialApplications.map((application) => (
        <SecretariatApplicationCard key={application.id} application={application} />
      ))}
    </div>
  );
}

function SecretariatApplicationCard({ application }: { application: SecretariatApplicationSummary }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<Array<{ id: string; body: string; created_at: string; author_user?: { email: string } }>>([]);
  const [documents, setDocuments] = useState<Array<{ id: string; kind: "decision" | "contract"; version: number }>>([]);
  useEffect(() => {
    if (!open) return;
    void Promise.all([getApplicationObservations(application.id), getCurrentIssuedDocuments(application.id)]).then(([history, current]) => {
      setNotes(history as typeof notes);
      setDocuments(current as typeof documents);
    });
  }, [application.id, open]);
  async function saveNote() {
    const result = await addApplicationObservation(application.id, note);
    if (result.success) {
      setNote("");
      const history = await getApplicationObservations(application.id);
      setNotes(history as typeof notes);
    }
  }
  async function download(id: string) {
    const result = await getIssuedDocumentUrl(id);
    if ("url" in result) window.open(result.url, "_blank", "noopener,noreferrer");
  }
  return (
    <article className="rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-fg">{application.pai_nome} &amp; {application.mae_nome}</h2>
            <span className="rounded-full bg-bg px-2 py-0.5 text-xs font-medium text-muted">
              {application.status === "pendente" ? "Aguardando decisão" : application.status === "aprovada" ? "Aprovada" : "Rejeitada"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">{application.escola} · {application.telefone}{application.email ? ` · ${application.email}` : ""}</p>
          <p className="mt-2 text-sm text-muted">Alunos: {application.students.map((student) => student.nome).join(", ")}</p>
          {application.data_decisao && <p className="mt-1 text-sm text-muted">Decisão: {new Date(application.data_decisao).toLocaleDateString("pt-BR")}</p>}
      <button type="button" className="mt-3 text-sm font-medium text-accent hover:underline" onClick={() => setOpen((value) => !value)}>{open ? "Ocultar acompanhamento" : "Acompanhar"}</button>
      {open && <div className="mt-3 space-y-3 border-t border-border pt-3"><div><h3 className="text-sm font-semibold">Documentos finais</h3>{documents.length ? documents.map((document) => <button key={document.id} type="button" onClick={() => void download(document.id)} className="mr-3 mt-1 text-sm text-accent hover:underline">Baixar {document.kind === "decision" ? "decisão" : "contrato"}</button>) : <p className="text-sm text-muted">Nenhum documento final emitido.</p>}</div><div><h3 className="text-sm font-semibold">Observações internas</h3><p className="mt-1 text-xs text-muted">Registre apenas informações operacionais, de forma concisa; não inclua dados sensíveis desnecessários.</p>{notes.map((item) => <p key={item.id} className="mt-1 text-sm text-muted">{item.body} <span className="text-xs">— {item.author_user?.email ?? "Secretaria"}, {new Date(item.created_at).toLocaleDateString("pt-BR")}</span></p>)}<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} className="mt-2 w-full rounded border border-border p-2 text-sm" placeholder="Registrar observação interna" /><button type="button" disabled={!note.trim()} onClick={() => void saveNote()} className="mt-1 text-sm font-medium text-accent disabled:opacity-50">Registrar observação</button></div></div>}
    </article>
  );
}

export function SolicitacoesClient({ initialApplications }: SolicitacoesClientProps) {
  const [applications, setApplications] = useState<ApplicationSummary[]>(initialApplications);
  const [filter, setFilter] = useState<StatusFilter>("todos");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("data_desc");

  const stats = useMemo(() => computeStats(applications), [applications]);

  const filtered = useMemo(() => {
    const query = normalizeSearch(search);
    let list = applications.filter((a) => matchesSearch(a, query));
    if (filter !== "todos") {
      list = list.filter((a) => a.status === filter);
    }
    return sortApplications(list, sort);
  }, [applications, filter, search, sort]);

  const handleDecision = useCallback(
    (id: string, status: string, desconto_concedido?: number | null) => {
      setApplications((prev) =>
        prev.map((app) =>
          app.id === id
            ? {
                ...app,
                status,
                desconto_concedido: desconto_concedido ?? app.desconto_concedido,
                data_decisao: status !== "pendente" ? new Date().toISOString() : null,
              }
            : app
        )
      );
    },
    []
  );

  const filterLabel =
    FILTER_OPTIONS.find((o) => o.value === filter)?.label.toLowerCase() ?? "todos";

  return (
    <>
      <StatsDashboard
        stats={stats}
        activeFilter={filter}
        onFilterSelect={setFilter}
      />

      <div
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        data-testid="list-toolbar"
      >
        <div className="relative flex-1 sm:max-w-xs">
          <label htmlFor="search-applications" className="sr-only">
            Buscar solicitações
          </label>
          <input
            id="search-applications"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou escola..."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            data-testid="search-input"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort-applications" className="text-sm text-muted">
            Ordenar
          </label>
          <select
            id="sort-applications"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-fg"
            data-testid="sort-select"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" data-testid="status-filters">
        {FILTER_OPTIONS.map((opt) => {
          const count =
            opt.value === "todos"
              ? applications.length
              : applications.filter((a) => a.status === opt.value).length;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                filter === opt.value
                  ? "bg-accent text-white"
                  : "border border-border text-muted hover:bg-bg"
              }`}
              data-testid={`filter-${opt.value}`}
              aria-pressed={filter === opt.value}
            >
              {opt.label} ({count})
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-muted" data-testid="results-count">
        {filtered.length}{" "}
        {filtered.length === 1 ? "solicitação" : "solicitações"}
        {filter !== "todos" ? ` ${filterLabel}` : ""}
        {search.trim() ? ` para "${search.trim()}"` : ""}
      </p>

      <div className="mt-3 space-y-3" data-testid="application-list">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            {search.trim()
              ? "Nenhuma solicitação corresponde à busca. Tente outro nome ou escola."
              : filter !== "todos"
                ? `Nenhuma solicitação ${filterLabel} no momento.`
                : "Nenhuma solicitação encontrada."}
          </p>
        ) : (
          filtered.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onDecision={handleDecision}
            />
          ))
        )}
      </div>
    </>
  );
}
