import { definePrototype, type PrototypeProps } from "@compozy/proto";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SealLogo } from "@/components/ui/seal-logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ActionBar } from "@/app/admin/_components/action-bar";
import { CountBadge } from "@/app/admin/_components/count-badge";
import { DataGrid, DataItem } from "@/app/admin/_components/data-grid";
import { EmptyState } from "@/app/admin/_components/empty-state";
import { Field } from "@/app/admin/_components/field";
import { InlineConfirm } from "@/app/admin/_components/inline-confirm";
import { Notice } from "@/app/admin/_components/notice";
import { PageHeader } from "@/app/admin/_components/page-header";
import { RecordRow } from "@/app/admin/_components/record-row";
import { SearchInput } from "@/app/admin/_components/search-input";
import { Section } from "@/app/admin/_components/section";
import { SegmentedFilter } from "@/app/admin/_components/segmented-filter";
import { StatTile } from "@/app/admin/_components/stat-tile";
import { StatusPill } from "@/app/admin/_components/status-pill";

export const meta = definePrototype({
  title: "Componentes de interface",
  spec: "componentes",
  states: [
    { id: "base", label: "Base (components/ui)" },
    { id: "painel", label: "Blocos do painel" },
  ],
});

/** Catálogo dos componentes reais, com as variantes lado a lado. */
export default function Componentes({ state }: PrototypeProps) {
  return (
    <div className="min-h-screen bg-bg px-8 py-10 text-fg">
      <div className="mx-auto grid max-w-[1040px] gap-10">
        {state === "painel" ? <PainelBlocks /> : <BaseComponents />}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

function BaseComponents() {
  return (
    <>
      <header className="flex items-center gap-4">
        <SealLogo size={56} />
        <div>
          <h1 className="font-heading text-2xl font-semibold">Componentes base</h1>
          <p className="text-sm text-muted">
            <code>components/ui</code>, com os tokens de <code>app/globals.css</code>.
          </p>
        </div>
      </header>

      <Group title="Button — variantes">
        <Button>Salvar alterações</Button>
        <Button variant="outline">Cancelar</Button>
        <Button variant="secondary">Secundário</Button>
        <Button variant="ghost">Discreto</Button>
        <Button variant="destructive">Excluir</Button>
        <Button variant="link">Ver detalhes</Button>
        <Button disabled>Desabilitado</Button>
      </Group>

      <Group title="Button — tamanhos">
        <Button size="xs">Extra pequeno</Button>
        <Button size="sm">Pequeno</Button>
        <Button>Padrão</Button>
        <Button size="lg">Grande</Button>
      </Group>

      <Group title="Badge">
        <Badge>Padrão</Badge>
        <Badge variant="secondary">Secundário</Badge>
        <Badge variant="outline">Contorno</Badge>
        <Badge variant="destructive">Erro</Badge>
        <Badge variant="ghost">Discreto</Badge>
      </Group>

      <Group title="Campos">
        <div className="grid w-full max-w-[480px] gap-3">
          <Input placeholder="Nome do responsável" />
          <Input defaultValue="maria.souza@example.com" />
          <Input aria-invalid defaultValue="email-invalido" />
          <Input disabled placeholder="Desabilitado" />
          <Textarea placeholder="Observações" />
          <NativeSelect defaultValue="mensal">
            <NativeSelectOption value="mensal">Mensal</NativeSelectOption>
            <NativeSelectOption value="unica">Doação única</NativeSelectOption>
          </NativeSelect>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox defaultChecked /> Li e aceito os termos
          </label>
        </div>
      </Group>

      <Group title="Tabs">
        <Tabs defaultValue="resumo" className="w-full max-w-[480px]">
          <TabsList>
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
          </TabsList>
          <TabsContent value="resumo" className="pt-3 text-sm text-muted">Conteúdo do resumo.</TabsContent>
          <TabsContent value="documentos" className="pt-3 text-sm text-muted">Lista de documentos.</TabsContent>
        </Tabs>
        <Tabs defaultValue="mes" className="w-full max-w-[480px]">
          <TabsList variant="line">
            <TabsTrigger value="mes">Mês</TabsTrigger>
            <TabsTrigger value="ano">Ano</TabsTrigger>
          </TabsList>
        </Tabs>
      </Group>

      <Group title="Card">
        <Card className="w-[320px]">
          <CardHeader>
            <CardTitle>Família Carvalho</CardTitle>
            <CardDescription>Colégio São José — Itatiba</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">2 alunos · Enviada em 27/10/2026</CardContent>
        </Card>
      </Group>
    </>
  );
}

function PainelBlocks() {
  const [filter, setFilter] = useState("todas");
  const [search, setSearch] = useState("");
  return (
    <>
      <PageHeader
        title="Blocos do painel"
        description="Componentes de app/admin/_components usados por todas as telas do painel."
        action={<Button>Ação principal</Button>}
      />

      <Group title="StatusPill">
        <StatusPill>Neutro</StatusPill>
        <StatusPill tone="warn">Aguardando decisão</StatusPill>
        <StatusPill tone="success">Aprovada</StatusPill>
        <StatusPill tone="danger">Rejeitada</StatusPill>
        <StatusPill tone="accent">Mensal</StatusPill>
        <CountBadge>4</CountBadge>
      </Group>

      <Group title="Notice">
        <div className="grid w-full gap-3">
          <Notice title="Informação">Os PDFs são gerados com o cabeçalho e os modelos configurados.</Notice>
          <Notice tone="success" title="Salvo">As alterações valem para os próximos envios.</Notice>
          <Notice tone="warn" title="Atenção">2 benfeitores ainda não receberam boas-vindas.</Notice>
          <Notice tone="danger" title="Não foi possível carregar o resumo">O banco de dados não respondeu.</Notice>
        </div>
      </Group>

      <Group title="StatTile">
        <div className="grid w-full grid-cols-4 gap-3">
          <StatTile label="Solicitações no ano" value="38" hint="29 aprovadas · 5 rejeitadas" />
          <StatTile label="Recebido no extrato" value="R$ 1.400,00" tone="success" />
          <StatTile label="Em aberto" value="R$ 2.030,00" tone="warn" hint="3 aguardando conferência" />
          <StatTile label="Não identificado" value="R$ 80,00" tone="danger" />
        </div>
      </Group>

      <Group title="Filtros e busca">
        <div className="grid w-full gap-3">
          <SegmentedFilter
            label="Situação"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "todas", label: "Todas", count: 7 },
              { value: "pendente", label: "Aguardando decisão", count: 3, tone: "warn" },
              { value: "aprovada", label: "Aprovadas", count: 3, tone: "success" },
              { value: "rejeitada", label: "Rejeitadas", count: 1, tone: "danger" },
            ]}
          />
          <SearchInput label="Buscar" value={search} onChange={setSearch} placeholder="Buscar família, aluno ou escola" />
        </div>
      </Group>

      <Section title="Section com DataGrid" description="Agrupa informações de um registro.">
        <DataGrid cols={4}>
          <DataItem label="Competência" value="novembro de 2026" />
          <DataItem label="Esperado" value="R$ 1.200,00" />
          <DataItem label="Recebido no extrato" value="R$ 0,00" />
          <DataItem label="Em aberto" value="R$ 1.200,00" />
        </DataGrid>
      </Section>

      <Group title="RecordRow">
        <div className="grid w-full gap-3">
          <RecordRow
            title="Maria Aparecida Souza"
            meta="R$ 200,00 por mês · Vence dia 10"
            status={<StatusPill tone="warn">Aguardando conferência</StatusPill>}
            defaultOpen
          >
            <ActionBar note="Ações do registro aberto.">
              <Button>Confirmar crédito</Button>
              <Button variant="outline">Não encontrei no extrato</Button>
            </ActionBar>
          </RecordRow>
          <RecordRow title="João Batista Pereira" meta="R$ 80,00 · Mensal" status={<StatusPill tone="success">Conferido</StatusPill>}>
            <p className="text-sm text-muted">Detalhe fechado.</p>
          </RecordRow>
        </div>
      </Group>

      <Group title="Field e InlineConfirm">
        <div className="grid w-full max-w-[480px] gap-4">
          <Field label="Desconto concedido (%)" hint="Solicitado: 60%">
            {(props) => <Input {...props} defaultValue="60" />}
          </Field>
          <Field label="E-mail" error="Informe um e-mail válido.">
            {(props) => <Input {...props} defaultValue="maria@" />}
          </Field>
          <InlineConfirm question="Excluir o ano letivo 2027?" confirmLabel="Sim, excluir" onConfirm={() => {}} onCancel={() => {}} />
        </div>
      </Group>

      <Group title="EmptyState">
        <EmptyState
          className="w-full"
          title="Nenhuma solicitação recebida"
          description="As solicitações enviadas pelo formulário aparecem aqui."
        />
      </Group>
    </>
  );
}
