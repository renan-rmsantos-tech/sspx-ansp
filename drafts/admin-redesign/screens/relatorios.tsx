"use client";

import type { ScreenProps } from "../shell";
import { DONORS } from "../fixtures";
import { Button, Card, Field, PageHeader, Section, Select, TextInput } from "../ui";

export function RelatoriosScreen(_: ScreenProps) {
  const byPriorado = Object.entries(
    DONORS.reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.priorado]: (acc[d.priorado] ?? 0) + 1 }), {})
  ).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...byPriorado.map(([, n]) => n));

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" description="Consultas sobre os cadastros de benfeitores e sobre o movimento financeiro." odId="relatorios-header" />

      <Card className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end" odId="relatorios-filtros">
        <Field label="Relatório">
          {(a11y) => (
            <Select {...a11y} defaultValue="cadastros">
              <option value="cadastros">Cadastros de benfeitores</option>
              <option value="financeiro">Financeiro (previsto, recebido, em aberto)</option>
            </Select>
          )}
        </Field>
        <Field label="De">{(a11y) => <TextInput {...a11y} type="date" defaultValue="2026-01-01" />}</Field>
        <Field label="Até">{(a11y) => <TextInput {...a11y} type="date" defaultValue="2026-10-31" />}</Field>
        <Button size="lg">Atualizar</Button>
      </Card>

      <Section title="Cadastros por priorado ou capela" description="Vínculo informado pelo benfeitor no cadastro." aside={<Button variant="outline" size="sm">Baixar PDF</Button>}>
        <Card>
          <ol className="space-y-3">
            {byPriorado.map(([label, n]) => (
              <li key={label} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[14rem_1fr_3rem]">
                <span className="truncate text-sm text-fg">{label}</span>
                <span className="col-span-2 h-2.5 overflow-hidden rounded-full bg-bg sm:col-span-1" aria-hidden>
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${(n / max) * 100}%` }} />
                </span>
                <span className="hidden text-right text-sm tabular-nums text-fg sm:block">{n}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-border pt-3 text-sm font-semibold text-fg">Total: {DONORS.length} cadastros</p>
        </Card>
      </Section>
    </div>
  );
}
