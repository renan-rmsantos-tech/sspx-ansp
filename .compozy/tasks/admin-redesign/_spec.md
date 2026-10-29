# Spec: Redesenho do painel administrativo (admin-redesign)

Protótipo aprovado em 2026-10-29 (commit `08b101b`): `app/prototipos/_designs/admin-redesign/`. Brief: `docs/design/admin-redesign/handoff.md`. Esta spec é técnica: não reabre decisões de design.

---

# Part I — Product

## Overview

- **Motivating Problem**: o painel `/admin` cresceu página a página. Hoje tem 4 grupos e 11 itens de menu, rótulos inconsistentes ("Pendente" na lista, "Aguardando decisão" na Secretaria), quatro cartões de estatística repetindo o filtro, classes inline espalhadas, conteúdo limitado a 900px, confirmações em modal e um botão flutuante de menu no celular. A equipe não tem um ponto de partida: `/admin` redireciona para Solicitações. O comportamento mínimo que resolve isso, observável de fora: um membro da equipe entra em `/admin`, vê quantas solicitações aguardam decisão e quantos benfeitores estão sem boas-vindas, clica e cai na lista já filtrada, com a mesma linguagem visual e o mesmo vocabulário em todas as telas.
- Para quem: Administração (papel `admin`) e Secretaria (papel `secretaria`) da Arca Nossa Senhora da Providência.
- Por que vale: menos erros de leitura de estado (cor nunca é o único sinal), menos cliques para a tarefa do dia, uma única gramática de componentes para manter.

## Goals

- A equipe começa em uma página Início que lista o que precisa de atenção e leva à tarefa filtrada.
- Toda lista administrativa segue o mesmo padrão: cabeçalho de página, um segmento de situação com contagens, busca e ordenação, linhas enxutas que expandem para detalhe em abas/seções, ações no rodapé do detalhe.
- O vocabulário de situações é fechado e idêntico em lista, filtro e detalhe.
- Secretaria vê exatamente o que vê hoje (sem decidir nem configurar), apenas com a nova aparência; `requireStaff`/`requireAdmin` não mudam.
- Rotas antigas continuam funcionando por redirect permanente.
- `npm test`, `npm run typecheck` e lint passam; os testes existentes são atualizados sem perder cobertura de comportamento.

## User Stories

- US-001–US-002: Shell (menu lateral, barra superior, celular).
- US-003–US-004: Início em `/admin`.
- US-005–US-008: Solicitações (filtro único, linha + abas, decisão inline, Secretaria).
- US-009–US-012: Benfeitores (toolbar, detalhe em seções, exclusão inline, Secretaria).
- US-013: Pagamentos (leitura do livro mensal).
- US-014–US-015: E-mails e Modelos em abas.
- US-016: Configurações (ano letivo, usuários, cabeçalho, relatórios).
- US-017–US-018: Redirects e vocabulário.
- [Full user stories](_user_stories.md)

## Core Features

- **Shell**: `app/admin/layout.tsx` (server) carrega identidade e contadores e renderiza um shell cliente com barra superior (botão de menu mobile, selo, "Administração", usuário + papel, "Sair") e sidebar de 260px com grupos Início / Bolsas / Benfeitores / Configurações; conteúdo em `max-w-[1040px]`. Itens `adminOnly` são escondidos para Secretaria.
- **Início** (`/admin`): cartões "Precisa de atenção" com contagens e CTAs; "Resumo" com quatro `StatTile` (admin). Alimentado por uma nova action de leitura `getAdminHomeSummary()`.
- **Solicitações**: segmento de situação + busca + ordenação; `RecordRow` por solicitação; detalhe com abas Resumo / Documentos / Renda e despesas / Decisão; decisão inline; PDFs na `ActionBar`. Secretaria: abas Resumo / Documentos finais / Observações.
- **Benfeitores**: segmento de frequência, busca, select de priorado, checkbox de boas-vindas pendentes (admin), ordenação; `RecordRow` com pílulas; detalhe em Contato / Contribuição / E-mails e comprovantes; `ActionBar` com Imprimir ficha / Ver recibo / Excluir (confirmação inline).
- **Pagamentos** (`/admin/pagamentos`, admin): leitura do livro mensal (`donor_payment_ledger`) por mês com totais e estado do comprovante. Sem confirmação bancária e sem CSV nesta spec (ver Non-Goals).
- **E-mails** (`/admin/emails`, admin): abas Boas-vindas / Instruções de pagamento / Lembretes de vencimento compondo os três clientes existentes.
- **Modelos** (`/admin/modelos`, admin): abas Carta de aprovação / Carta de rejeição / Contrato de concessão compondo `TemplateEditor` e `ContractTemplateEditor`.
- **Configurações**: Ano letivo em tabela com ação de criar no cabeçalho; Usuários em duas seções; Cabeçalho e rodapé com formulário + prévia; Relatórios com filtros em cartão e séries em seções.

## Business Rules

- Papéis: `admin` vê tudo; `secretaria` vê Início, Solicitações e Benfeitores. A regra vive em `lib/auth/authorization.ts` e não muda; o menu apenas filtra `adminOnly`.
- Vocabulário fechado: solicitações = "Aguardando decisão" / "Aprovada" / "Rejeitada"; benfeitores = "Mensal" / "Doação única" / "Boas-vindas pendente" / "Sem comprovante do mês"; pagamentos = "Aguardando conferência" (futuro: "Confirmado no extrato", "Não identificado"); configuração = "Ativo" / "Encerrado" (ano) e "Ativo" / "Inativo" (usuário).
- Botões: Aprovar / Salvar / Confirmar / Criar = `Button` padrão (navy). Rejeitar / Excluir = `variant="destructive"`. Exclusão e decisão confirmam inline, nunca em modal. PDFs continuam no `PdfPreviewModal` existente (não é confirmação).
- Contadores do menu: "Solicitações" = solicitações com `status = 'pendente'`; "Benfeitores" = cadastros sem `welcome_email_sent_at` (admin). Zero não exibe badge.
- Início: "pagamentos aguardando conferência" = linhas do `donor_payment_ledger` da competência corrente (America/Sao_Paulo). Visível só para admin.
- Pagamentos: mês padrão = competência corrente em São Paulo; `?mes=AAAA-MM` inválido cai no padrão com aviso.
- Largura: conteúdo 1040px; sidebar 260px; barra superior 56px.
- Tokens: apenas `--color-{bg,surface,fg,muted,border,accent,gold,cream,success,warn,danger}` e variações por opacidade; nenhuma cor nova em `app/globals.css`. A única exceção herdada do protótipo é o texto escurecido do tom `warn` (`oklch(45% 0.12 70)`) por contraste — mantido como constante local no `StatusPill`/`Notice`, não como token.
- Redirects permanentes (308) das rotas antigas; ver `_dx.md`.

## User Experience

- Administração abre `/admin`, lê "Precisa de atenção", clica "Ver solicitações", decide dentro da linha, imprime a carta pela `ActionBar`. Depois vai a Benfeitores filtrado por boas-vindas pendentes e envia o e-mail no detalhe.
- Secretaria abre `/admin`, vê só o cartão de solicitações, acompanha famílias e registra observações.
- Acessibilidade: tudo navegável por teclado; `aria-expanded` nas linhas; `role="group"` + `aria-pressed` no segmento; abas com `role="tablist"`; `aria-live` nas contagens; `role="status"`/`role="alert"` nos avisos; foco visível; `motion-reduce`; contraste de corpo ≥ 4.5:1.
- Mapa tela a tela: [`_uiux.md`](_uiux.md).

## High-Level Technical Constraints

- Só a camada de UI muda. Server actions existentes, validações, schema, migrações, PDFs, e-mails e regras de negócio permanecem. Dados novos entram por **actions de leitura pequenas e testadas** em arquivos novos.
- Componentes compartilhados em `app/admin/_components/`; primitivos shadcn em `components/ui` via `npx shadcn add`. Nada de `app/prototipos/**` é importado em produção.
- `npm test` é gate de deploy (roda no Docker build).
- pt-BR em toda a UI; voz de `COPY.md`.
- Dados sensíveis: nenhum log ou URL de documento novo; `getDocumentUrl` continua emitindo tickets.

## Non-Goals (Out of Scope)

- **Conferência bancária e CSV** (`Confirmar crédito`, `Não encontrei no extrato`, `Baixar CSV`, totais recebido/em aberto): não existem hoje nem rota `/admin/conferencia-pagamentos` nem colunas de conferência no livro; são as tarefas 10–14 pendentes da spec `donor-payments-reminders`. Esta spec entrega Pagamentos somente leitura e deixa esses controles ausentes (não desabilitados). Decisão registrada para o Renan.
- Alterar actions existentes, schema, migrações ou e-mails.
- Tela "Padrões visuais" em produção.
- Tocar em `app/prototipos/**` e `docs/design/**`.
- Novos relatórios ou gráficos (Relatórios só muda a casca).

## Open Questions

Nenhuma bloqueante. Decisões aplicadas sem perguntar (instrução do Goal): Início em `/admin`; botão "Marcar como enviado"; pílula "Sem comprovante do mês" na lista só para `admin`. Pontos para o Renan validar na revisão: (1) Pagamentos somente leitura; (2) `AFTER_LOGIN` passa de `/admin/solicitacoes` para `/admin` (o comentário atual em `auth-actions.ts` explica que `/admin` não servia porque redirecionava; agora é página real); (3) `npm run lint` troca `next lint` (removido no Next 16) por `eslint .`.

---

# Part II — Technical

## Executive Summary

Reescrita da camada de apresentação de `/admin` sobre as actions existentes. Um conjunto de primitivos compartilhados (`app/admin/_components/*`) reimplementa os padrões do protótipo com componentes shadcn (`components/ui`) e tokens de `app/globals.css`. O shell passa a ser um componente cliente alimentado por `layout.tsx`; páginas que hoje redirecionam ou vivem em três rotas viram uma página com abas; rotas antigas viram redirects em `next.config.ts`. Duas actions de leitura novas alimentam Início/contadores e Pagamentos. Testes existentes são adaptados aos novos rótulos e `data-testid`s; cada primitivo ganha teste próprio.

## MVP Boundary

MVP = tarefas 01–06. Fatia 1 = tarefas 01 (Base) + 02 (Shell + Início + rotas), que resolve o problema motivador: entrar em `/admin` e seguir para a tarefa. Pós-MVP (fora desta spec): conferência bancária e CSV.

## Developer Experience

- [Developer experience contract](_dx.md) — rotas, redirects, query params, scripts npm.
- [UI change map](_uiux.md) — superfícies, estados e plano de componentes.

## System Architecture

- `app/admin/layout.tsx` (server): `requireStaff()` → `getAdminHomeSummary()` (apenas contadores; falha vira `null`) → `<AdminShell staff counts>`.
- `app/admin/_components/admin-shell.tsx` (client): barra superior + sidebar + `<main>`; estado do menu mobile; usa `NAV` de `app/admin/_components/nav.ts` e `usePathname`.
- Primitivos (client, sem actions): `page-header.tsx`, `section.tsx`, `status-pill.tsx`, `count-badge.tsx`, `notice.tsx`, `record-row.tsx`, `segmented-filter.tsx`, `data-grid.tsx` (`DataGrid` + `DataItem`), `empty-state.tsx`, `stat-tile.tsx`, `action-bar.tsx`, `field.tsx`, `search-input.tsx`, `inline-confirm.tsx`.
- Páginas (server) continuam lendo via actions e passando dados a clientes; clientes compõem primitivos + componentes de domínio existentes (`ApplicationDetail`, `DecisionActions`, `DocumentPreview`, `DonorMonthlyInstructions`, `TemplateEditor`, `ContractTemplateEditor`, `SchoolYearForm`, `DonorEmailClient`, etc.) restilizados.
- Novas actions de leitura: `app/admin/_actions/admin-home-actions.ts` (`getAdminHomeSummary`) e `app/admin/_actions/donor-payment-actions.ts` (`getMonthlyPayments`). Ambas `requireStaff`/`requireAdmin` conforme uso.

## Architectural Boundaries

- `app/admin/_components/*` importa de `components/ui`, `lucide-react`, `@/lib/utils`, tipos de `lib/`; nunca de `app/prototipos/**`.
- `components/ui/*` só via `npx shadcn add` (input, textarea, select, native-select, tabs, badge, card, checkbox) mais o ajuste de hover do `button.tsx` (ver Key Decisions).
- `lib/**` não muda, exceto nada. Novas consultas vivem nas actions novas usando `db` e `schema` existentes.
- `app/prototipos/**` e `docs/design/**` intocados.

## Implementation Design

### Core Interfaces

```ts
// app/admin/_components/status-pill.tsx
export type Tone = "neutral" | "warn" | "success" | "danger" | "accent";
export function StatusPill(props: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string; "data-testid"?: string }): JSX.Element;

// app/admin/_components/segmented-filter.tsx
export function SegmentedFilter<T extends string>(props: {
  label: string; value: T; onChange: (v: T) => void;
  options: Array<{ value: T; label: string; count?: number; tone?: Tone }>;
  testIdPrefix?: string; // gera `${prefix}-${value}` em cada botão
}): JSX.Element;

// app/admin/_components/record-row.tsx
export function RecordRow(props: {
  title: ReactNode; meta: ReactNode; status?: ReactNode; children: ReactNode;
  defaultOpen?: boolean; open?: boolean; onOpenChange?: (o: boolean) => void;
  "data-testid"?: string; toggleTestId?: string; detailTestId?: string;
}): JSX.Element;

// app/admin/_components/notice.tsx
export function Notice(props: { tone?: "neutral" | "success" | "danger" | "warn"; title?: string; children: ReactNode; action?: ReactNode; role?: "status" | "alert"; "data-testid"?: string }): JSX.Element;
// role padrão: "alert" para danger, "status" para os demais.

// app/admin/_components/inline-confirm.tsx
export function InlineConfirm(props: { question: string; confirmLabel: string; cancelLabel?: string; onConfirm: () => void; onCancel: () => void; pending?: boolean; confirmTestId?: string; cancelTestId?: string }): JSX.Element;

// app/admin/_components/nav.ts
export type NavItem = { id: string; label: string; href: string; icon: LucideIcon; adminOnly?: boolean; badge?: "pendingApplications" | "pendingWelcome" };
export const NAV: Array<{ title?: string; items: NavItem[] }>;
export function isActive(pathname: string, href: string): boolean; // "/admin" só exato; demais por prefixo

// app/admin/_actions/admin-home-actions.ts
export type AdminHomeSummary = {
  schoolYear: { nome: string } | null;
  applications: { total: number; pendente: number; aprovada: number; rejeitada: number };
  donors: { total: number; mensal: number; unica: number; monthlyAmount: number; pendingWelcome: number };
  payments: { competencia: string; expectedAmount: number; count: number; withReceipt: number };
};
export async function getAdminHomeSummary(): Promise<{ data: AdminHomeSummary | null; error?: string }>; // requireStaff

// app/admin/_actions/donor-payment-actions.ts
export type MonthlyPaymentRow = { id: string; pledge_id: string; nome: string; competencia: string; due_date: string; expected_value: number; receipt_path: string | null; receipt_name: string | null; receipt_uploaded_at: string | null };
export async function getMonthlyPayments(month: string): Promise<{ data: { competencia: string; rows: MonthlyPaymentRow[] } | null; error?: string }>; // requireAdmin; valida ^\d{4}-(0[1-9]|1[0-2])$
```

### Data Models

Nenhum campo, tabela, migração ou chave de configuração nova. Leituras novas usam `applications.status`, `school_years.ativo`, `donor_pledges` (`frequencia`, `valor`, `welcome_email_sent_at`) e `donor_payment_ledger` (`competencia`, `expected_value`, `due_date`, `receipt_*`) com `join` em `donor_pledges.nome`.

### API Endpoints

Nenhum endpoint novo. Redirects em `next.config.ts` (`redirects()`), todos `permanent: true`; ver `_dx.md`.

## Integration Points

Nenhum novo. `getDocumentUrl` continua emitindo tickets para comprovantes.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
| --- | --- | --- | --- |
| `app/admin/layout.tsx`, `_components/sidebar.tsx`, `topbar.tsx` | modified/deprecated | Sidebar/Topbar substituídos por `admin-shell.tsx`; `sidebar.test.tsx` e `topbar.test.tsx` reescritos. Risco baixo. | Apagar `sidebar.tsx`/`topbar.tsx` após migrar testes. |
| `app/admin/page.tsx` | modified | Deixa de redirecionar; vira Início. `auth-actions.ts` `AFTER_LOGIN` → `/admin`; `auth-actions.test.ts` atualizado. | Ajustar constante e teste. |
| `app/admin/solicitacoes/client.tsx`, `application-card.tsx`, `stats-dashboard.tsx` | modified/deprecated | `StatsDashboard` removido (`stats-dashboard.test.tsx` apagado); `ApplicationCard` reescrito sobre `RecordRow`. Risco médio: muitos `data-testid`. | Preservar `data-testid`s listados em `_tests.md`. |
| `app/admin/benfeitores/client.tsx`, `donor-card.tsx` | modified | Toolbar e cartão reescritos; `StatCard` inline removido. | Preservar `data-testid`s de boas-vindas, vencimento, lembrete, instruções. |
| `app/admin/{email,instrucoes,lembretes}-benfeitores/*` | deprecated → `app/admin/emails/` | Páginas removidas; clientes movidos para `app/admin/emails/_clients/` ou mantidos no lugar e importados. Redirects. | Mover clientes; manter testes importando o caminho novo. |
| `app/admin/{textos,contrato}/*` | deprecated → `app/admin/modelos/` | Idem com abas. | Redirects + teste de abas. |
| `app/admin/conferencia-pagamentos` | n/a | Nunca existiu; redirect preventivo para `/admin/pagamentos`. | Registrar em `next.config.ts`. |
| `components/ui/button.tsx` | modified | `outline`/`ghost` `hover:bg-muted` → `hover:bg-bg` (conflito `--color-muted` vs `--muted`). | Teste unitário de `buttonVariants`. |
| `package.json` `lint` | modified | `next lint` não existe no Next 16; `eslint .`. | Atualizar script. |
| `__tests__/*` | modified | Ver `_tests.md`. | Atualizar rótulos/testids; adicionar testes dos primitivos. |

Delete targets (código interno): `app/admin/_components/sidebar.tsx`, `topbar.tsx`, `stats-dashboard.tsx`, `modal.tsx` (se nenhum consumidor restar após inline-confirm; `document-preview.tsx` ainda usa `Modal` para visualizar PDF — manter), `app/admin/{email-benfeitores,instrucoes-benfeitores,lembretes-benfeitores,textos,contrato}/page.tsx`. Não há estado persistido afetado. Superfície pública afetada = URLs, cobertas por redirect permanente sem janela de remoção.

## Extensibility Integration Plan

Não aplicável: nenhum manifesto, hook, skill ou MCP é alterado.

## Agent Manageability Plan

Não aplicável além do existente: `GET /api/health` continua o sinal operacional. Nenhum verbo CLI novo.

## Config Lifecycle

Sem chaves de configuração novas. `next.config.ts` ganha `redirects()`. `package.json` troca o script `lint`.

## Testing Approach

- Vitest + Testing Library + jsdom (`vitest.config.ts`); actions testadas com `__tests__/helpers/fake-db.ts` (`queryFor(...).findMany/findFirst`, arrays `inserted/updated/deleted`).
- Unidade: cada primitivo compartilhado (roles, aria, rótulos, callbacks); `nav.ts` (filtro por papel, `isActive`); actions novas (autorização, validação de mês, agregação).
- Componente/integração: clientes de página com actions mockadas (padrão atual de `solicitacoes-client.test.tsx`, `benfeitores-client.test.tsx`).
- Redirects: teste lê `next.config.ts` e verifica a lista (padrão de `layout.test.tsx`, que lê fonte).
- Visual: comparação manual com `/prototipos/admin-redesign` via `agent-browser` (não automatizada).

## Development Sequencing

### Build Order

1. **Base** (task_01): shadcn add; primitivos + testes; `nav.ts`; ajuste do `Button`; script `lint`.
2. **Shell + Início + rotas** (task_02): `admin-shell.tsx`, `layout.tsx`, `page.tsx` Início, `getAdminHomeSummary`, `/admin/emails`, `/admin/modelos`, redirects, `AFTER_LOGIN`, remoção das páginas antigas; testes de shell/nav/redirects/Início/abas.
3. **Solicitações** (task_03).
4. **Benfeitores** (task_04).
5. **Pagamentos** (task_05): `getMonthlyPayments` + página.
6. **Relatórios e Configurações** (task_06): ano letivo, usuários, cabeçalho, relatórios.

Cada fase termina com `npm run typecheck`, `npm run lint`, `npm test` verdes e conferência visual; um commit por fase.

### Technical Dependencies

Postgres de dev (porta 5433) para a conferência visual; nenhuma dependência externa nova além dos componentes shadcn (código copiado para o repositório).

## Monitoring and Observability

Sem métricas novas. Erros de leitura em Início/Pagamentos retornam `{ error }` e são exibidos em `Notice`, não lançados.

## Technical Considerations

### Key Decisions

- **Abas via shadcn `Tabs`** (base-ui): dá `role=tablist/tab/tabpanel` e teclado; `data-testid` repassado aos triggers preserva `detail-tab-*`, `tab-aprovacao`, `tab-rejeicao`.
- **Select nativo (`native-select`)** para ordenação/filtros/mês: testável com `fireEvent.change`, acessível por `getByLabelText`, igual ao protótipo (chevron decorativo).
- **Hover do Button**: `--color-muted` (texto cinza) colide com `--muted` do shadcn; trocar `hover:bg-muted` por `hover:bg-bg` em `outline`/`ghost`, mantendo o restante do arquivo shadcn.
- **Abas com URL** (`?aba=`): leitura por `useSearchParams`, escrita com `router.replace` sem scroll; redirects antigos apontam para a aba certa.
- **Contadores no layout**: uma chamada `getAdminHomeSummary()` no layout (dinâmico via `cookies()`); falha → `counts = null`, menu sem badges.
- **Início em `/admin`** e `AFTER_LOGIN = "/admin"`: o problema de redirect encadeado deixa de existir porque `/admin` passa a renderizar.
- **Pagamentos somente leitura**: respeita a regra "nenhuma regra de negócio nova"; os controles de conferência ficam ausentes até a spec `donor-payments-reminders` (tasks 10–14).
- **Exclusão inline substitui `Modal`** em benfeitores e ano letivo; `Modal` permanece para visualização de PDF (`document-preview.tsx`).

### Known Risks

- Muitos testes acoplados a `data-testid`/rótulos (risco médio): mitigação = lista explícita em `_tests.md` do que se preserva e do que muda.
- shadcn `Tabs` (base-ui) em jsdom: triggers controlados precisam de `value`/`onValueChange`; testar com `fireEvent.click` nos triggers (base-ui usa clique; se exigir pointer events, usar `userEvent`-like via `fireEvent.pointerDown` documentado no teste do primitivo).
- `useSearchParams` em páginas dinâmicas: envolver clientes em `<Suspense>` para evitar erro de prerender.
- Hover do Button é mudança em arquivo gerado pelo shadcn: documentar no topo do arquivo.

## Safety Invariants

Sem caminhos de concorrência ou propriedade novos; nenhuma escrita nova. Invariante único: 1. Nenhuma página, action ou componente novo expõe caminho de arquivo de documento sem passar por `getDocumentUrl`/tickets.

## File References

### Repo Files

- `docs/design/admin-redesign/handoff.md` — regras de implementação e ordem de fases aprovadas.
- `app/prototipos/_designs/admin-redesign/shell.tsx:1-244` — NAV, barra superior, sidebar, larguras; referência visual do shell.
- `app/prototipos/_designs/admin-redesign/ui.tsx:1-458` — aparência/aria de cada primitivo a reimplementar (não copiar o arquivo).
- `app/prototipos/_designs/admin-redesign/screens/*.tsx` — composição de cada tela; `padroes.tsx` = vocabulário e hierarquia de botões.
- `app/admin/layout.tsx`, `app/admin/page.tsx` — shell e redirect atuais.
- `app/admin/_components/sidebar.tsx:9-135` — itens/hrefs atuais e flag `adminOnly`; `:137-269` menu mobile com focus trap (preservar comportamento).
- `app/admin/_components/topbar.tsx` — logout via `startTransition(logout)`.
- `app/admin/solicitacoes/client.tsx`, `_components/application-card.tsx`, `application-detail.tsx`, `decision-actions.tsx`, `document-preview.tsx`, `pdf-preview-modal.tsx` — Solicitações atual, `data-testid`s.
- `app/admin/benfeitores/client.tsx`, `_components/donor-card.tsx`, `donor-monthly-instructions.tsx` — Benfeitores atual.
- `app/admin/{email,instrucoes,lembretes}-benfeitores/client.tsx` — clientes a compor em `/admin/emails`.
- `app/admin/_components/template-editor.tsx`, `contract-template-editor.tsx`, `template-preview.tsx` — clientes a compor em `/admin/modelos`.
- `app/admin/ano-letivo/client.tsx`, `_components/school-year-form.tsx`, `school-year-list.tsx` — ano letivo (tabela, confirmação via `Modal` a substituir).
- `app/admin/usuarios/client.tsx`, `app/admin/cabecalho/client.tsx`, `app/admin/relatorios/*.tsx` — configurações e relatórios.
- `app/admin/_actions/admin-actions.ts` — `getApplications`, `getDonorPledges`, `getSchoolYears`, `getTemplates`, `getContractTemplate`, `getDocumentHeader`, `getDocumentUrl`; padrão de `requireAuth` e retorno `{data, error}`.
- `app/admin/_actions/donor-report-actions.ts` — padrão de action de agregação com `requireAdmin`.
- `lib/auth/authorization.ts:7-69` — `StaffRole`, `requireStaff`, `requireAdmin`.
- `lib/db/schema.ts:35-54` (`school_years`), `:54-143` (`applications`), `:323-383` (`donor_pledges`), `:396-434` (`donor_payment_ledger`).
- `lib/donor-payment-ledger.ts:25-34` — `hasMonthlyReceipt`, `monthlyReceiptState`; `lib/donor-recurrence.ts` — `saoPauloDate`.
- `app/login/_actions/auth-actions.ts:22-28` — `AFTER_LOGIN` e o comentário sobre redirect encadeado.
- `proxy.ts` — guarda `/admin/:path*` (não muda).
- `next.config.ts` — onde entram `redirects()`.
- `components/ui/button.tsx:8-20` — variantes `outline`/`ghost` com `hover:bg-muted`.
- `components.json`, `app/globals.css:7-28` — estilo shadcn e tokens.
- `__tests__/helpers/fake-db.ts`, `__tests__/setup.ts`, `vitest.config.ts` — harness de testes.
- `__tests__/sidebar.test.tsx`, `topbar.test.tsx`, `solicitacoes-client.test.tsx`, `benfeitores-client.test.tsx`, `stats-dashboard.test.tsx`, `export-decision.test.tsx`, `template-editor.test.tsx`, `contract-template-editor.test.tsx`, `school-year.test.tsx`, `donor-email-client.test.tsx`, `donor-reminder-client.test.tsx`, `donor-monthly-instructions-client.test.tsx`, `donor-monthly-instructions-preview.test.tsx`, `donor-reports-client.test.tsx`, `institutional-footer-client.test.tsx`, `auth-actions.test.ts`, `middleware.test.ts` — testes afetados.
- `package.json:6-21` — scripts (`lint`).

### Design and Analysis Sources

- `docs/design/admin-redesign/index.html` — evidência renderizada do protótipo aprovado.
- `DESIGN.md`, `PRODUCT.md`, `COPY.md` — autoridade visual, de produto e de voz.

## Assumptions and Defaults

- Implementer Agent: `code_implementer` (padrão do Loop; nenhum outro nomeado no Goal).
- `shadcn` CLI acessível via `npx shadcn@latest add ...` sem credenciais; componentes `input textarea select native-select tabs badge card checkbox`.
- Mês corrente calculado em America/Sao_Paulo via `saoPauloDate(new Date().toISOString()).slice(0, 7)`.
- Título da linha de solicitação: "{pai_nome} e {mae_nome}" como título quando não for possível derivar sobrenome; manter simples: título = `pai_nome` + " e " + `mae_nome`, meta = escola, alunos, data. (O protótipo usa "Família X"; sem campo de família no schema, usamos os nomes.)
- `?situacao=` aceita `pendente|aprovada|rejeitada`; `?boas-vindas=pendentes`; `?aba=` conforme `_dx.md`.
- Testes dos primitivos vivem em `__tests__/admin-primitives.test.tsx` (um arquivo, agrupado por `describe`).
- Visual check: `npm run dev` neste worktree (porta 3000 livre) + `npx -y agent-browser@0.39.2` com sessão própria; sem evidência salva em `docs/design/**`.

## Architecture Decision Records

Nenhum ADR separado: as decisões acima são rotineiras ou já aprovadas no handoff.
