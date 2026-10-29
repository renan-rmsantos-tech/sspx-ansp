"use client";

import type { ScreenProps } from "../shell";
import {
  ActionBar,
  Button,
  Card,
  DataGrid,
  DataItem,
  EmptyState,
  Field,
  Notice,
  PageHeader,
  Section,
  SegmentedFilter,
  StatTile,
  StatusPill,
  TextInput,
} from "../ui";

const COLORS: Array<[string, string, string]> = [
  ["bg", "bg-bg", "Fundo da página (papel)"],
  ["surface", "bg-surface", "Cartões e painéis"],
  ["cream", "bg-cream", "Destaques quentes, formulários de decisão"],
  ["border", "bg-border", "Divisórias"],
  ["muted", "bg-muted", "Texto secundário"],
  ["fg", "bg-fg", "Texto principal (navy)"],
  ["accent", "bg-accent", "Ação primária, item ativo"],
  ["gold", "bg-gold", "Acento: ícone ativo, selo, régua"],
  ["success", "bg-success", "Aprovada, confirmado"],
  ["warn", "bg-warn", "Aguardando, pendente"],
  ["danger", "bg-danger", "Rejeitada, excluir"],
];

const RULES = [
  ["Uma tarefa por tela", "Cada página começa com título, uma frase explicando o que se faz ali e, quando existe, uma única ação principal à direita."],
  ["Lista enxuta, detalhe expandido", "A linha de um registro mostra só nome, resumo e situação. Botões, abas e formulários aparecem ao abrir o registro."],
  ["Um filtro por dimensão", "Situação em segmentos com contagem; busca e ordenação no mesmo trecho. Não repetir o mesmo filtro em dois lugares."],
  ["Estado dito em palavras", "Pílulas com ponto colorido e texto completo: ‘Aguardando decisão’, não ‘Pendente’. Cor nunca é o único sinal."],
  ["Ação primária única e navy", "Aprovar, salvar e confirmar são o botão cheio. Rejeitar e excluir usam o vermelho suave, nunca com o mesmo peso do primário."],
  ["Confirmação no lugar", "Excluir pede confirmação inline (‘Excluir este cadastro?’), sem modal. Ações irreversíveis explicam a consequência."],
  ["Feedback perto do gesto", "Sucesso e erro aparecem como aviso logo acima dos botões que os causaram, com próximo passo em uma frase."],
  ["Alvos generosos", "Controles com 36–40 px de altura, textos a partir de 14 px, foco visível em tudo."],
];

export function PadroesScreen(_: ScreenProps) {
  return (
    <div className="space-y-10">
      <PageHeader title="Padrões visuais" description="Referência para implementar o painel. Tokens vêm de app/globals.css; componentes devem ser adicionados em components/ui (shadcn) com esta aparência." odId="padroes-header" />

      <Section title="Princípios" odId="padroes-principios">
        <ol className="grid gap-3 md:grid-cols-2">
          {RULES.map(([title, body], i) => (
            <li key={title} className="flex gap-3 rounded-lg border border-border bg-surface p-4">
              <span className="font-heading text-2xl font-semibold leading-none text-gold">{i + 1}</span>
              <div>
                <p className="font-semibold text-fg">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Cores" description="Somente estes tokens. Variações por opacidade (ex.: success/10) para fundos de pílulas e avisos." odId="padroes-cores">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {COLORS.map(([name, cls, use]) => (
            <li key={name} className="rounded-lg border border-border bg-surface p-3">
              <div className={`h-10 rounded-md border border-border/60 ${cls}`} />
              <p className="mt-2 font-mono text-xs text-fg">--color-{name}</p>
              <p className="text-xs text-muted">{use}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tipografia" description="Serif institucional só em títulos e números grandes; sans do sistema para tudo que se lê." odId="padroes-tipografia">
        <Card className="space-y-4">
          <p className="font-heading text-2xl font-semibold tracking-tight">Título de página · 24 px serif</p>
          <p className="font-heading text-lg font-semibold">Título de seção · 18 px serif</p>
          <p className="text-base font-semibold">Nome do registro · 16 px sans semibold</p>
          <p className="text-sm">Texto corrente · 14 px sans, entrelinha 1.5</p>
          <p className="text-sm text-muted">Texto secundário · 14 px em muted</p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Rótulo de dado · 12 px caixa alta</p>
          <p className="font-heading text-3xl font-semibold tabular-nums">R$ 1.230,00 <span className="text-sm font-normal text-muted">· número em destaque, serif tabular</span></p>
        </Card>
      </Section>

      <Section title="Botões" description="Hierarquia: um primário por contexto; outline para ações secundárias; ghost para terciárias; destructive suave para remover/rejeitar." odId="padroes-botoes">
        <Card className="flex flex-wrap items-center gap-3">
          <Button size="lg">Primário</Button>
          <Button size="lg" variant="outline">Secundário</Button>
          <Button size="lg" variant="ghost">Terciário</Button>
          <Button size="lg" variant="destructive">Rejeitar / Excluir</Button>
          <Button size="lg" disabled>Desabilitado</Button>
          <Button size="sm" variant="outline">Pequeno</Button>
        </Card>
      </Section>

      <Section title="Situações" description="Vocabulário fechado. Mesma palavra na lista, no filtro e no detalhe." odId="padroes-situacoes">
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="warn">Aguardando decisão</StatusPill>
            <StatusPill tone="success">Aprovada</StatusPill>
            <StatusPill tone="danger">Rejeitada</StatusPill>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="accent" dot={false}>Mensal</StatusPill>
            <StatusPill dot={false}>Doação única</StatusPill>
            <StatusPill tone="warn">Boas-vindas pendente</StatusPill>
            <StatusPill tone="warn">Aguardando conferência</StatusPill>
            <StatusPill tone="success">Confirmado no extrato</StatusPill>
            <StatusPill tone="danger">Não identificado</StatusPill>
            <StatusPill tone="success">Ativo</StatusPill>
            <StatusPill>Inativo</StatusPill>
          </div>
          <SegmentedFilter label="Exemplo de filtro" value="b" onChange={() => {}} options={[{ value: "a", label: "Todas", count: 24 }, { value: "b", label: "Aguardando decisão", count: 6, tone: "warn" }, { value: "c", label: "Aprovadas", count: 15, tone: "success" }]} />
        </Card>
      </Section>

      <Section title="Avisos" description="Quatro tons. Título curto + uma frase com o próximo passo. Ação opcional abaixo do texto." odId="padroes-avisos">
        <div className="grid gap-3 md:grid-cols-2">
          <Notice title="Informação">Explica uma regra antes da ação.</Notice>
          <Notice tone="success" title="Texto salvo">Vale para os próximos envios.</Notice>
          <Notice tone="warn" title="Boas-vindas ainda não enviado" action={<Button size="sm">Enviar agora</Button>}>A mensagem usa o texto configurado.</Notice>
          <Notice tone="danger" title="Não foi possível salvar">Confira a conexão e tente novamente.</Notice>
        </div>
      </Section>

      <Section title="Dados e formulários" description="Dados em rótulo pequeno + valor; campos com rótulo acima, ajuda abaixo, 40 px de altura." odId="padroes-dados">
        <Card className="space-y-6">
          <DataGrid cols={3}>
            <DataItem label="Pai / responsável" value="José Carvalho" />
            <DataItem label="Escola" value="Colégio São José — Itatiba" />
            <DataItem label="Desconto solicitado" value="50%" />
          </DataGrid>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rótulo do campo" hint="Texto de ajuda breve.">{(a11y) => <TextInput {...a11y} placeholder="Valor" />}</Field>
            <Field label="Campo com erro" error="Informe um dia entre 1 e 31.">{(a11y) => <TextInput {...a11y} defaultValue="45" />}</Field>
          </div>
          <ActionBar note="Barra de ações ao final do detalhe: PDFs e ações secundárias.">
            <Button variant="outline" size="lg">Imprimir ficha</Button>
            <Button variant="ghost" size="lg" className="text-danger hover:text-danger">Excluir</Button>
          </ActionBar>
        </Card>
      </Section>

      <Section title="Números e vazio" odId="padroes-numeros">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Esperado" value="R$ 1.730,00" />
          <StatTile label="Recebido" value="R$ 350,00" tone="success" />
          <StatTile label="Em aberto" value="R$ 1.380,00" tone="warn" hint="3 pagamentos aguardando" />
        </div>
        <EmptyState title="Nenhuma solicitação aqui" description="Mude o filtro ou limpe a busca para ver outras solicitações." action={<Button variant="outline">Limpar filtros</Button>} />
      </Section>
    </div>
  );
}
