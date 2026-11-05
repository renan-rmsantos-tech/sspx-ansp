"use client";

import { useMemo, useState } from "react";
import { Mail, Printer, Receipt, Trash2 } from "lucide-react";
import type { ScreenProps } from "../shell";
import { DONORS, currency, formatDate, type DonorFixture } from "../fixtures";
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
  TextInput,
} from "../ui";

type Filter = "todos" | "mensal" | "unica";

export function BenfeitoresScreen({ role }: ScreenProps) {
  const [donors, setDonors] = useState(DONORS);
  const [filter, setFilter] = useState<Filter>("todos");
  const [search, setSearch] = useState("");
  const [priorado, setPriorado] = useState("todos");
  const [onlyPendingWelcome, setOnlyPendingWelcome] = useState(false);

  const priorados = useMemo(() => [...new Set(DONORS.map((d) => d.priorado))].sort(), []);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return donors.filter(
      (d) =>
        (filter === "todos" || d.frequencia === filter) &&
        (priorado === "todos" || d.priorado === priorado) &&
        (!onlyPendingWelcome || d.boasVindas === "pendente") &&
        (!q || [d.nome, d.email, d.telefone].join(" ").toLowerCase().includes(q))
    );
  }, [donors, filter, search, priorado, onlyPendingWelcome]);

  const pendingWelcome = donors.filter((d) => d.boasVindas === "pendente").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Benfeitores"
        description="Cadastros recebidos pela página pública. Abra um registro para ver contato, contribuição, e-mails e comprovantes."
        odId="benfeitores-header"
      />

      <div className="flex flex-col gap-3" data-od-id="benfeitores-toolbar">
        <SegmentedFilter<Filter>
          label="Filtrar por frequência"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "todos", label: "Todos", count: donors.length },
            { value: "mensal", label: "Mensais", count: donors.filter((d) => d.frequencia === "mensal").length },
            { value: "unica", label: "Doação única", count: donors.filter((d) => d.frequencia === "unica").length },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} label="Buscar benfeitores" placeholder="Buscar nome, e-mail ou telefone" className="sm:w-80" />
          <div className="sm:w-64">
            <label htmlFor="priorado" className="sr-only">Priorado ou capela</label>
            <Select id="priorado" value={priorado} onChange={(e) => setPriorado(e.target.value)}>
              <option value="todos">Todos os priorados e capelas</option>
              {priorados.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {role === "admin" && pendingWelcome > 0 && (
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-fg">
          <input type="checkbox" checked={onlyPendingWelcome} onChange={(e) => setOnlyPendingWelcome(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          Mostrar só quem ainda não recebeu boas-vindas ({pendingWelcome})
        </label>
      )}

      <p className="text-sm text-muted" aria-live="polite">
        {list.length} {list.length === 1 ? "benfeitor" : "benfeitores"}
      </p>

      <div className="space-y-3" data-od-id="benfeitores-lista">
        {list.length === 0 ? (
          <EmptyState title="Nenhum benfeitor com esses filtros" description="Mude o filtro ou limpe a busca para ver outros cadastros." />
        ) : (
          list.map((donor, index) => (
            <DonorRow key={donor.id} donor={donor} role={role} defaultOpen={index === 1} onChange={(next) => setDonors((prev) => prev.map((d) => (d.id === next.id ? next : d)))} onDelete={(id) => setDonors((prev) => prev.filter((d) => d.id !== id))} />
          ))
        )}
      </div>
    </div>
  );
}

function DonorRow({ donor, role, defaultOpen, onChange, onDelete }: { donor: DonorFixture; role: ScreenProps["role"]; defaultOpen: boolean; onChange: (d: DonorFixture) => void; onDelete: (id: string) => void }) {
  const [editingDay, setEditingDay] = useState(false);
  const [day, setDay] = useState(String(donor.diaVencimento ?? ""));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const mensal = donor.frequencia === "mensal";

  return (
    <RecordRow
      odId={`benfeitor-${donor.id}`}
      defaultOpen={defaultOpen}
      title={donor.nome}
      meta={
        <>
          <span className="font-medium text-fg">{currency.format(donor.valor)}{mensal ? " por mês" : ""}</span>
          <span>{donor.priorado}</span>
          {mensal && donor.proximoVencimento && <span>Vence dia {donor.diaVencimento}</span>}
          <span>Cadastro em {formatDate(donor.cadastro)}</span>
        </>
      }
      status={
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          {donor.boasVindas === "pendente" && role === "admin" && <StatusPill tone="warn">Boas-vindas pendente</StatusPill>}
          {mensal && donor.comprovanteMes === "pendente" && role === "admin" && <StatusPill tone="neutral" dot={false}>Sem comprovante do mês</StatusPill>}
          <StatusPill tone={mensal ? "accent" : "neutral"} dot={false}>{mensal ? "Mensal" : "Doação única"}</StatusPill>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="space-y-3" data-od-id={`benfeitor-${donor.id}-contato`}>
          <h3 className="text-sm font-semibold text-fg">Contato</h3>
          <DataGrid cols={2}>
            <DataItem label="E-mail" value={<a href={`mailto:${donor.email}`} className="text-accent underline-offset-4 hover:underline">{donor.email}</a>} />
            <DataItem label="Telefone" value={donor.telefone} />
            <DataItem label="CPF" value={donor.cpf} />
            <DataItem label="Priorado ou capela" value={donor.priorado} />
          </DataGrid>
          {donor.observacoes && <DataGrid cols={2}><DataItem label="Observações" value={donor.observacoes} className="sm:col-span-2" /></DataGrid>}
        </section>

        <section className="space-y-3" data-od-id={`benfeitor-${donor.id}-contribuicao`}>
          <h3 className="text-sm font-semibold text-fg">Contribuição</h3>
          <DataGrid cols={2}>
            <DataItem label="Valor" value={`${currency.format(donor.valor)}${mensal ? " por mês" : ""}`} />
            <DataItem label="Frequência" value={mensal ? "Mensal, por tempo indeterminado" : "Doação única"} />
            {mensal && (
              <>
                <DataItem label="Dia de vencimento" value={donor.diaVencimento ? `Dia ${donor.diaVencimento} de cada mês` : "Não informado"} />
                <DataItem label="Próximo vencimento" value={donor.proximoVencimento ? formatDate(donor.proximoVencimento) : "—"} />
              </>
            )}
          </DataGrid>
          {mensal && role === "admin" && (
            editingDay ? (
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  onChange({ ...donor, diaVencimento: Number(day) });
                  setEditingDay(false);
                }}
              >
                <Field label="Novo dia de vencimento" hint="De 1 a 31. Em meses mais curtos vale o último dia." className="w-44">
                  {(a11y) => <TextInput {...a11y} type="number" min={1} max={31} value={day} onChange={(e) => setDay(e.target.value)} />}
                </Field>
                <Button type="submit" size="lg">Salvar</Button>
                <Button type="button" size="lg" variant="ghost" onClick={() => setEditingDay(false)}>Cancelar</Button>
              </form>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditingDay(true)}>Alterar dia de vencimento</Button>
            )
          )}
        </section>
      </div>

      {role === "admin" && (
        <section className="mt-6 space-y-3" data-od-id={`benfeitor-${donor.id}-emails`}>
          <h3 className="text-sm font-semibold text-fg">E-mails e comprovantes</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {donor.boasVindas === "enviado" ? (
              <Notice tone="success" title="Boas-vindas enviado">
                Registrado em {donor.boasVindasEm ? formatDate(donor.boasVindasEm) : "—"}.
              </Notice>
            ) : (
              <Notice
                tone="warn"
                title="Boas-vindas ainda não enviado"
                action={
                  <>
                    <Button size="sm" onClick={() => onChange({ ...donor, boasVindas: "enviado", boasVindasEm: "2026-10-29" })}><Mail aria-hidden /> Enviar agora</Button>
                    <Button size="sm" variant="ghost" onClick={() => onChange({ ...donor, boasVindas: "enviado", boasVindasEm: "2026-10-29" })}>Já enviei por fora</Button>
                  </>
                }
              >
                A mensagem usa o texto configurado em E-mails.
              </Notice>
            )}
            {mensal ? (
              donor.comprovanteMes === "recebido" ? (
                <Notice tone="success" title="Comprovante de outubro recebido">A conferência do crédito é feita em Pagamentos.</Notice>
              ) : (
                <Notice title="Comprovante de outubro pendente" action={<Button size="sm" variant="outline">Copiar link de envio</Button>}>
                  O benfeitor envia o comprovante pelo link pessoal.
                </Notice>
              )
            ) : (
              <Notice title="Doação única">Instruções de pagamento enviadas no cadastro. O crédito é conferido em Pagamentos.</Notice>
            )}
          </div>
        </section>
      )}

      {role === "admin" && (
        <ActionBar>
          <Button variant="outline" size="lg"><Printer aria-hidden /> Imprimir ficha</Button>
          <Button variant="outline" size="lg"><Receipt aria-hidden /> Ver recibo</Button>
          {confirmDelete ? (
            <span className="inline-flex items-center gap-2 rounded-md border border-danger/40 bg-danger/5 px-2 py-1">
              <span className="text-sm text-fg">Excluir este cadastro?</span>
              <Button size="sm" variant="destructive" onClick={() => onDelete(donor.id)}>Sim, excluir</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Não</Button>
            </span>
          ) : (
            <Button variant="ghost" size="lg" className="text-danger hover:text-danger" onClick={() => setConfirmDelete(true)}><Trash2 aria-hidden /> Excluir</Button>
          )}
        </ActionBar>
      )}
    </RecordRow>
  );
}
