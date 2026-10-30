"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  DonorCard,
  DonorContactSection,
  DonorContributionSection,
  DonorFrequencyPill,
  DonorRowMeta,
  type DonorPledge,
  type DonorSummary,
} from "../_components/donor-card";
import { EmptyState } from "../_components/empty-state";
import { PageHeader } from "../_components/page-header";
import { RecordRow } from "../_components/record-row";
import { SearchInput } from "../_components/search-input";
import { SegmentedFilter } from "../_components/segmented-filter";
import { prioradoCapelaLabel } from "@/lib/data/priorados-capelas";

type FrequenciaFilter = "todos" | "mensal" | "unica";
type SortKey = "data_desc" | "data_asc" | "nome" | "valor_desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "data_desc", label: "Mais recentes" },
  { value: "data_asc", label: "Mais antigos" },
  { value: "nome", label: "Nome" },
  { value: "valor_desc", label: "Maior valor" },
];

const ALL_PRIORADOS = "__todos__";
const NOT_INFORMED = "__nao_informado__";
const SELECT_CLASS = "w-full [&>select]:h-10 [&>select]:bg-surface";

function matchesPriorado(donor: { priorado_capela?: string | null }, selected: string): boolean {
  if (selected === ALL_PRIORADOS) return true;
  if (selected === NOT_INFORMED) return !donor.priorado_capela;
  return donor.priorado_capela === selected;
}

function PrioradoCapelaSelect({
  id,
  donors,
  value,
  onChange,
}: {
  id: string;
  donors: ReadonlyArray<{ priorado_capela?: string | null }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const options = useMemo(() => {
    const values = new Set<string>();
    for (const donor of donors) {
      if (donor.priorado_capela) values.add(donor.priorado_capela);
    }
    if (value !== ALL_PRIORADOS && value !== NOT_INFORMED) {
      values.add(value);
    }
    return [...values].sort((a, b) =>
      prioradoCapelaLabel(a).localeCompare(prioradoCapelaLabel(b), "pt-BR")
    );
  }, [donors, value]);
  const hasNotInformed = value === NOT_INFORMED || donors.some((donor) => !donor.priorado_capela);

  return (
    <div className="sm:w-72">
      <label htmlFor={id} className="sr-only">
        Priorado ou capela
      </label>
      <NativeSelect
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={SELECT_CLASS}
        data-testid="donor-priorado-filter"
      >
        <NativeSelectOption value={ALL_PRIORADOS}>Todos os priorados e capelas</NativeSelectOption>
        {options.map((priorado) => (
          <NativeSelectOption key={priorado} value={priorado}>
            {prioradoCapelaLabel(priorado)}
          </NativeSelectOption>
        ))}
        {hasNotInformed && <NativeSelectOption value={NOT_INFORMED}>Não informado</NativeSelectOption>}
      </NativeSelect>
    </div>
  );
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function matchesSearch(donor: DonorSummary, query: string): boolean {
  if (!query) return true;
  // Inclui o CPF só com dígitos para permitir busca sem pontuação.
  const cpfDigits = (donor.cpf ?? "").replace(/\D/g, "");
  return [donor.nome, donor.email, donor.telefone ?? "", donor.cpf ?? "", cpfDigits]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function sortDonors<T extends DonorSummary>(donors: T[], sort: SortKey): T[] {
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

/** Segmento de frequência + busca + priorado + controles + contagem + lista, compartilhado pelos dois papéis. */
function DonorsList<T extends DonorSummary>({
  donors,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  priorado,
  onPrioradoChange,
  prioradoId,
  controls,
  extra,
  visible,
  renderRow,
}: {
  donors: T[];
  filter: FrequenciaFilter;
  onFilterChange: (filter: FrequenciaFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  priorado: string;
  onPrioradoChange: (value: string) => void;
  prioradoId: string;
  controls?: ReactNode;
  extra?: ReactNode;
  visible: T[];
  renderRow: (donor: T, index: number) => ReactNode;
}) {
  const count = (frequencia: "mensal" | "unica") => donors.filter((d) => d.frequencia === frequencia).length;
  const query = search.trim();

  return (
    <>
      <div className="flex flex-col gap-3">
        <SegmentedFilter<FrequenciaFilter>
          label="Filtrar por frequência"
          value={filter}
          onChange={onFilterChange}
          testIdPrefix="donor-filter"
          options={[
            { value: "todos", label: "Todos", count: donors.length },
            { value: "mensal", label: "Mensais", count: count("mensal") },
            { value: "unica", label: "Doação única", count: count("unica") },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput
            value={search}
            onChange={onSearchChange}
            label="Buscar benfeitores"
            placeholder="Buscar nome, CPF, e-mail ou telefone"
            className="sm:w-80"
            data-testid="donor-search-input"
          />
          <PrioradoCapelaSelect id={prioradoId} donors={donors} value={priorado} onChange={onPrioradoChange} />
          {controls}
        </div>
        {extra}
      </div>

      <p className="text-sm text-muted" aria-live="polite" data-testid="donor-results-count">
        {visible.length} {visible.length === 1 ? "benfeitor" : "benfeitores"}
        {query ? ` · busca por “${query}”` : ""}
      </p>

      <div className="space-y-3" data-testid="donor-list">
        {visible.length > 0 ? (
          visible.map(renderRow)
        ) : donors.length === 0 ? (
          <EmptyState
            title="Nenhum benfeitor cadastrado"
            description="Quando alguém se cadastrar pela página pública, o registro aparece aqui."
          />
        ) : (
          <EmptyState
            title="Nenhum benfeitor com esses filtros"
            description="Mude o filtro ou limpe a busca para ver outros cadastros."
            action={
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  onFilterChange("todos");
                  onSearchChange("");
                  onPrioradoChange(ALL_PRIORADOS);
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
  const [filter, setFilter] = useState<FrequenciaFilter>("todos");
  const [search, setSearch] = useState("");
  const [priorado, setPriorado] = useState(ALL_PRIORADOS);
  const query = normalizeSearch(search);
  const visible = initialDonors.filter(
    (donor) =>
      (filter === "todos" || donor.frequencia === filter) &&
      matchesSearch(donor, query) &&
      matchesPriorado(donor, priorado)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Benfeitores"
        description="Cadastros recebidos pela página pública. Abra um registro para ver contato e contribuição."
      />
      <DonorsList
        donors={initialDonors}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        priorado={priorado}
        onPrioradoChange={setPriorado}
        prioradoId="secretariat-donor-priorado"
        visible={visible}
        renderRow={(donor) => (
          <RecordRow
            key={donor.id}
            data-testid={`donor-card-${donor.id}`}
            title={donor.nome}
            meta={<DonorRowMeta donor={donor} />}
            status={<DonorFrequencyPill frequencia={donor.frequencia} />}
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <DonorContactSection donor={donor} />
              <DonorContributionSection donor={donor} />
            </div>
          </RecordRow>
        )}
      />
    </div>
  );
}

interface BenfeitoresClientProps {
  initialDonors: DonorPledge[];
  /** Vem de `?boas-vindas=pendentes`. */
  initialWelcomePendingOnly?: boolean;
}

export function BenfeitoresClient({ initialDonors, initialWelcomePendingOnly = false }: BenfeitoresClientProps) {
  const [donors, setDonors] = useState<DonorPledge[]>(initialDonors);
  const [filter, setFilter] = useState<FrequenciaFilter>("todos");
  const [welcomePendingOnly, setWelcomePendingOnly] = useState(initialWelcomePendingOnly);
  const [priorado, setPriorado] = useState(ALL_PRIORADOS);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("data_desc");

  const pendingWelcome = donors.filter((donor) => !donor.welcome_email_sent_at).length;
  // O checkbox some quando ninguém está pendente; o filtro deixa de valer junto com ele.
  const pendingOnly = welcomePendingOnly && pendingWelcome > 0;

  const visible = useMemo(() => {
    const query = normalizeSearch(search);
    const list = donors.filter(
      (donor) =>
        matchesSearch(donor, query) &&
        (!pendingOnly || !donor.welcome_email_sent_at) &&
        (filter === "todos" || donor.frequencia === filter) &&
        matchesPriorado(donor, priorado)
    );
    return sortDonors(list, sort);
  }, [donors, filter, priorado, search, sort, pendingOnly]);

  const handleDelete = useCallback((id: string) => {
    setDonors((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Benfeitores"
        description="Cadastros recebidos pela página pública. Abra um registro para ver contato, contribuição, e-mails e comprovantes."
      />
      <DonorsList
        donors={donors}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        priorado={priorado}
        onPrioradoChange={setPriorado}
        prioradoId="admin-donor-priorado"
        visible={visible}
        controls={
          <div className="sm:w-48">
            <label htmlFor="sort-donors" className="sr-only">
              Ordenar
            </label>
            <NativeSelect
              id="sort-donors"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className={SELECT_CLASS}
              data-testid="donor-sort-select"
            >
              {SORT_OPTIONS.map((opt) => (
                <NativeSelectOption key={opt.value} value={opt.value}>
                  {opt.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        }
        extra={
          pendingWelcome > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="donor-welcome-pending-only"
                checked={welcomePendingOnly}
                onCheckedChange={(checked) => setWelcomePendingOnly(checked === true)}
                data-testid="donor-welcome-pending-only"
              />
              <label htmlFor="donor-welcome-pending-only" className="cursor-pointer text-sm text-fg">
                Mostrar só quem ainda não recebeu boas-vindas ({pendingWelcome})
              </label>
            </div>
          )
        }
        renderRow={(donor) => (
          <DonorCard
            key={donor.id}
            donor={donor}
            onDelete={handleDelete}
            onDueDayUpdated={(id, day, nextDueDate) =>
              setDonors((current) =>
                current.map((item) => (item.id === id ? { ...item, dia_vencimento: day, next_due_date: nextDueDate } : item))
              )
            }
            onInstructionsUpdated={(id, latest) =>
              setDonors((current) => current.map((item) => (item.id === id ? { ...item, latest_instructions: latest } : item)))
            }
            onWelcomeSent={(id, sentAt) =>
              setDonors((current) =>
                current.map((item) =>
                  item.id === id ? { ...item, welcome_email_sent_at: sentAt, welcome_email_in_progress: false } : item
                )
              )
            }
          />
        )}
      />
    </div>
  );
}
