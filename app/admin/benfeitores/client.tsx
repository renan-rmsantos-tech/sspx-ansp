"use client";

import { useState, useMemo, useCallback } from "react";
import { DonorCard, type DonorPledge } from "../_components/donor-card";

type FrequenciaFilter = "todos" | "mensal" | "unica";
type SortKey = "data_desc" | "data_asc" | "nome" | "valor_desc";

const FILTER_OPTIONS: { value: FrequenciaFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "mensal", label: "Mensal" },
  { value: "unica", label: "Única" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "data_desc", label: "Mais recentes" },
  { value: "data_asc", label: "Mais antigos" },
  { value: "nome", label: "Nome" },
  { value: "valor_desc", label: "Maior valor" },
];

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function matchesSearch(donor: DonorPledge, query: string): boolean {
  if (!query) return true;
  // Inclui o CPF só com dígitos para permitir busca sem pontuação.
  const cpfDigits = donor.cpf.replace(/\D/g, "");
  return [donor.nome, donor.email, donor.telefone ?? "", donor.cpf, cpfDigits]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function sortDonors(donors: DonorPledge[], sort: SortKey): DonorPledge[] {
  const sorted = [...donors];
  sorted.sort((a, b) => {
    switch (sort) {
      case "data_asc":
        return a.created_at.localeCompare(b.created_at);
      case "nome":
        return a.nome.localeCompare(b.nome, "pt-BR");
      case "valor_desc":
        return b.valor - a.valor;
      case "data_desc":
      default:
        return b.created_at.localeCompare(a.created_at);
    }
  });
  return sorted;
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-fg">{value}</div>
    </div>
  );
}

interface BenfeitoresClientProps {
  initialDonors: DonorPledge[];
}

export interface SecretariatDonorPledge {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  frequencia: "unica" | "mensal";
  duracao: "um_ano" | "indeterminado" | null;
  valor: number;
  meio_pagamento: "cartao" | "boleto" | "transferencia" | "pix" | null;
  data_pagamento: string | null;
  lembrete_canal: "whatsapp" | "email" | null;
  priorado_capela: string | null;
  observacoes: string | null;
  created_at: string;
}

export function SecretariatDonorsClient({ initialDonors }: { initialDonors: SecretariatDonorPledge[] }) {
  const [search, setSearch] = useState("");
  const query = normalizeSearch(search);
  const donors = initialDonors.filter((donor) => [donor.nome, donor.email, donor.telefone ?? ""].join(" ").toLowerCase().includes(query));
  return <>
    <div className="relative max-w-xs"><label htmlFor="secretariat-donor-search" className="sr-only">Buscar benfeitores</label><input id="secretariat-donor-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, e-mail ou telefone..." className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" /></div>
    <div className="mt-4 space-y-3">{donors.length === 0 ? <p className="py-8 text-center text-sm text-muted">Nenhum benfeitor encontrado.</p> : donors.map((donor) => <article key={donor.id} className="rounded-lg border border-border bg-surface p-4"><h2 className="font-semibold text-fg">{donor.nome}</h2><p className="mt-1 text-sm text-muted">{donor.email}{donor.telefone ? ` · ${donor.telefone}` : ""}</p><p className="mt-2 text-sm text-muted">{donor.frequencia === "mensal" ? "Mensal" : "Única"} · {currency.format(donor.valor)}{donor.duracao ? ` · ${donor.duracao === "um_ano" ? "por um ano" : "indeterminado"}` : ""}</p><p className="mt-1 text-sm text-muted">Pagamento: {donor.meio_pagamento ?? "não informado"}{donor.data_pagamento ? ` · dia ${donor.data_pagamento}` : ""}{donor.lembrete_canal ? ` · lembrete por ${donor.lembrete_canal}` : ""}</p>{donor.priorado_capela && <p className="mt-1 text-sm text-muted">Capela/Priorado: {donor.priorado_capela}</p>}{donor.observacoes && <p className="mt-2 text-sm text-muted">Observações: {donor.observacoes}</p>}</article>)}</div>
  </>;
}

export function BenfeitoresClient({ initialDonors }: BenfeitoresClientProps) {
  const [donors, setDonors] = useState<DonorPledge[]>(initialDonors);
  const [filter, setFilter] = useState<FrequenciaFilter>("todos");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("data_desc");

  const stats = useMemo(() => {
    const mensais = donors.filter((d) => d.frequencia === "mensal");
    const unicas = donors.filter((d) => d.frequencia === "unica");
    return {
      total: donors.length,
      mensalTotal: mensais.reduce((sum, d) => sum + d.valor, 0),
      mensalCount: mensais.length,
      unicaCount: unicas.length,
    };
  }, [donors]);

  const filtered = useMemo(() => {
    const query = normalizeSearch(search);
    let list = donors.filter((d) => matchesSearch(d, query));
    if (filter !== "todos") {
      list = list.filter((d) => d.frequencia === filter);
    }
    return sortDonors(list, sort);
  }, [donors, filter, search, sort]);

  const handleDelete = useCallback((id: string) => {
    setDonors((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Benfeitores" value={String(stats.total)} />
        <StatCard label="Doações mensais" value={String(stats.mensalCount)} />
        <StatCard label="Doações únicas" value={String(stats.unicaCount)} />
        <StatCard
          label="Total mensal"
          value={currency.format(stats.mensalTotal)}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <label htmlFor="search-donors" className="sr-only">
            Buscar benfeitores
          </label>
          <input
            id="search-donors"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF, e-mail ou telefone..."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            data-testid="donor-search-input"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort-donors" className="text-sm text-muted">
            Ordenar
          </label>
          <select
            id="sort-donors"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-fg"
            data-testid="donor-sort-select"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" data-testid="donor-filters">
        {FILTER_OPTIONS.map((opt) => {
          const count =
            opt.value === "todos"
              ? donors.length
              : donors.filter((d) => d.frequencia === opt.value).length;
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
              data-testid={`donor-filter-${opt.value}`}
              aria-pressed={filter === opt.value}
            >
              {opt.label} ({count})
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-muted" data-testid="donor-results-count">
        {filtered.length}{" "}
        {filtered.length === 1 ? "benfeitor" : "benfeitores"}
        {search.trim() ? ` para "${search.trim()}"` : ""}
      </p>

      <div className="mt-3 space-y-3" data-testid="donor-list">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            {search.trim()
              ? "Nenhum benfeitor corresponde à busca."
              : "Nenhum benfeitor cadastrado ainda."}
          </p>
        ) : (
          filtered.map((donor) => (
            <DonorCard key={donor.id} donor={donor} onDelete={handleDelete} />
          ))
        )}
      </div>
    </>
  );
}
