"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { ScreenProps } from "../shell";
import { DECISION_TOKENS, SCHOOL_YEARS, STAFF_USERS, formatDate } from "../fixtures";
import { Button, Card, Field, Notice, PageHeader, Section, StatusPill, Tabs, TextInput, Textarea } from "../ui";

/* ------------------------------------------------------- Modelos */

type ModelTab = "aprovacao" | "rejeicao" | "contrato";

export function ModelosScreen(_: ScreenProps) {
  const [tab, setTab] = useState<ModelTab>("aprovacao");
  return (
    <div className="space-y-6">
      <PageHeader title="Modelos de documentos" description="Textos das cartas de decisão e do contrato de concessão. Os campos entre chaves são preenchidos com os dados da solicitação ao gerar o PDF." odId="modelos-header" />
      <Tabs<ModelTab>
        label="Modelo"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "aprovacao", label: "Carta de aprovação" },
          { id: "rejeicao", label: "Carta de rejeição" },
          { id: "contrato", label: "Contrato de concessão" },
        ]}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,18rem)]" data-od-id={`modelo-${tab}`}>
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <Field label="Abertura">
              {(a11y) => <TextInput {...a11y} defaultValue={tab === "contrato" ? "CONTRATO DE CONCESSÃO DE BOLSA DE ESTUDOS — ANO LETIVO {ano_letivo}" : "Itatiba, {data}"} />}
            </Field>
            <Field label="Corpo do texto">
              {(a11y) => (
                <Textarea
                  {...a11y}
                  rows={12}
                  defaultValue={
                    tab === "aprovacao"
                      ? "Prezados {nome_pai} e {nome_mae},\n\nComunicamos que a solicitação de bolsa para {aluno}, matriculado(a) no {escola}, foi aprovada com desconto de {desconto} sobre a mensalidade no ano letivo {ano_letivo}.\n\n{motivo}"
                      : tab === "rejeicao"
                        ? "Prezados {nome_pai} e {nome_mae},\n\nApós análise, não foi possível conceder a bolsa solicitada para {aluno} no ano letivo {ano_letivo}.\n\n{motivo}\n\nPermanecemos à disposição."
                        : "Pelo presente instrumento, a ACIPEC concede a {nome_pai} e {nome_mae}, responsáveis por {aluno}, desconto de {desconto} nas mensalidades do {escola} durante o ano letivo {ano_letivo}, mediante as condições a seguir..."
                  }
                />
              )}
            </Field>
            <Field label="Encerramento">
              {(a11y) => <TextInput {...a11y} defaultValue="Arca Nossa Senhora da Providência — Comissão de Bolsas" />}
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="lg">Salvar modelo</Button>
              <Button type="button" size="lg" variant="outline">Ver PDF de exemplo</Button>
            </div>
          </form>
          <aside className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Campos disponíveis</h3>
            <p className="text-sm text-muted">Clique para copiar e cole no texto.</p>
            <ul className="space-y-1.5">
              {DECISION_TOKENS.map(([token, desc]) => (
                <li key={token}>
                  <button type="button" className="flex w-full items-baseline gap-2 rounded-md border border-border bg-surface px-3 py-2 text-left text-sm hover:border-accent/40 hover:bg-bg">
                    <code className="shrink-0 font-mono text-xs text-accent">{token}</code>
                    <span className="text-muted">{desc}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </Tabs>
    </div>
  );
}

/* ---------------------------------------------------- Cabeçalho */

export function CabecalhoScreen(_: ScreenProps) {
  const [showSeal, setShowSeal] = useState(true);
  return (
    <div className="space-y-6">
      <PageHeader title="Cabeçalho e rodapé" description="Identificação institucional usada em todos os e-mails e PDFs." odId="cabecalho-header" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-5">
          <label className="flex items-center gap-2 text-sm text-fg">
            <input type="checkbox" checked={showSeal} onChange={(e) => setShowSeal(e.target.checked)} className="size-4 accent-[var(--accent)]" />
            Exibir o selo da ANSP no cabeçalho
          </label>
          <Field label="Nome da instituição">{(a11y) => <TextInput {...a11y} defaultValue="Arca Nossa Senhora da Providência" />}</Field>
          <Field label="Linha complementar">{(a11y) => <TextInput {...a11y} defaultValue="Associação mantenedora do Colégio São José" />}</Field>
          <Field label="Rodapé institucional" hint="Até 300 caracteres. Aparece ao final de e-mails e documentos.">
            {(a11y) => <Textarea {...a11y} rows={3} defaultValue="ACIPEC — Associação Civil Para a Educação Católica · CNPJ 42.736.079/0001-63 · Itatiba-SP" />}
          </Field>
          <Button size="lg">Salvar</Button>
        </Card>
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Como fica no documento</h3>
          <Card className="aspect-[1/1.2] bg-white">
            <div className="flex items-center gap-4 border-b-2 border-gold pb-4">
              {showSeal && <span aria-hidden className="size-14 rounded-full border-2 border-gold bg-accent" />}
              <div>
                <div className="font-heading text-lg font-semibold text-fg">Arca Nossa Senhora da Providência</div>
                <div className="text-sm text-muted">Associação mantenedora do Colégio São José</div>
              </div>
            </div>
            <div className="mt-6 space-y-2" aria-hidden>
              <div className="h-2 w-2/3 rounded bg-border" />
              <div className="h-2 w-full rounded bg-border" />
              <div className="h-2 w-5/6 rounded bg-border" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------- Ano letivo */

export function AnoLetivoScreen(_: ScreenProps) {
  const [creating, setCreating] = useState(false);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ano letivo"
        description="O ano ativo é o que aparece no formulário público e nos documentos. Só um ano pode estar ativo."
        odId="ano-letivo-header"
        action={!creating && <Button size="lg" onClick={() => setCreating(true)}><Plus aria-hidden /> Novo ano letivo</Button>}
      />
      {creating && (
        <Card className="space-y-4" odId="ano-letivo-form">
          <h2 className="font-heading text-lg font-semibold">Novo ano letivo</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nome">{(a11y) => <TextInput {...a11y} placeholder="2027" />}</Field>
            <Field label="Início">{(a11y) => <TextInput {...a11y} type="date" />}</Field>
            <Field label="Fim">{(a11y) => <TextInput {...a11y} type="date" />}</Field>
          </div>
          <div className="flex gap-2">
            <Button size="lg" onClick={() => setCreating(false)}>Criar</Button>
            <Button size="lg" variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
          </div>
        </Card>
      )}
      <Card padded={false}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-medium">Ano</th>
              <th className="px-5 py-3 font-medium">Período</th>
              <th className="px-5 py-3 font-medium">Situação</th>
              <th className="px-5 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {SCHOOL_YEARS.map((y) => (
              <tr key={y.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-3 font-semibold">{y.nome}</td>
                <td className="px-5 py-3 text-muted">{formatDate(y.inicio)} a {formatDate(y.fim)}</td>
                <td className="px-5 py-3">{y.ativo ? <StatusPill tone="success">Ativo</StatusPill> : <StatusPill>Encerrado</StatusPill>}</td>
                <td className="px-5 py-3 text-right">
                  {y.ativo ? <Button variant="ghost" size="sm">Desativar</Button> : <><Button variant="outline" size="sm">Tornar ativo</Button> <Button variant="ghost" size="sm" className="text-danger hover:text-danger">Excluir</Button></>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ----------------------------------------------------- Usuários */

export function UsuariosScreen(_: ScreenProps) {
  return (
    <div className="space-y-6">
      <PageHeader title="Usuários" description="Acessos individuais da Secretaria. A Secretaria vê solicitações e benfeitores, sem decidir nem configurar." odId="usuarios-header" />
      <Section title="Novo acesso">
        <Card className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="E-mail">{(a11y) => <TextInput {...a11y} type="email" placeholder="nome@colegiosaojose.exemplo" />}</Field>
          <Field label="Senha inicial" hint="Mínimo de 8 caracteres. Peça para trocar no primeiro acesso.">{(a11y) => <TextInput {...a11y} type="password" />}</Field>
          <Button size="lg" className="sm:mb-6">Criar acesso</Button>
        </Card>
      </Section>
      <Section title="Acessos existentes">
        <Card padded={false}>
          <ul className="divide-y divide-border/60">
            {STAFF_USERS.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-medium text-fg">{u.email}</p>
                  <p className="text-sm text-muted">Criado em {formatDate(u.criado)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {u.ativo ? <StatusPill tone="success">Ativo</StatusPill> : <StatusPill>Inativo</StatusPill>}
                  <Button variant="outline" size="sm">Redefinir senha</Button>
                  <Button variant="ghost" size="sm">{u.ativo ? "Desativar" : "Reativar"}</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Notice>Quem está inativo não consegue entrar, mas o histórico de observações continua registrado em seu nome.</Notice>
      </Section>
    </div>
  );
}
