# Test Specification: Redesenho do painel administrativo

Contrato de testes do redesenho de `/admin`. Companheiro de `_spec.md`. Derivado de `_user_stories.md`, `_spec.md` Parte II, `_dx.md` e `_uiux.md`.

## Strategy

- Frameworks: Vitest 4 + Testing Library + jsdom (`vitest.config.ts`, `__tests__/setup.ts`); actions com `__tests__/helpers/fake-db.ts` (`queryFor("<schemaExport>").findMany/findFirst`, `inserted/updated/deleted`).
- Execução: `npm test` (gate de deploy), `npm run typecheck`, `npm run lint` (`eslint .`).
- Convenções: um arquivo por componente/página, `describe` por comportamento; mocks de `next/navigation` (`usePathname`, `useRouter`, `useSearchParams`) e de módulos de actions com `vi.mock`; preferir `getByRole`/`getByLabelText`; `data-testid` só onde já existe ou onde o papel não basta.
- Verificação visual manual com `agent-browser` contra `/prototipos/admin-redesign` (sem automação).

## Coverage Matrix

| Source | Behavior | Unit | Integration | E2E |
| --- | --- | --- | --- | --- |
| US-001 | Menu por papel, grupos, contadores, ativo | UT-001–UT-006 | — | manual |
| US-001.EC-1 | Contadores indisponíveis | UT-007 | — | — |
| US-002 | Menu mobile, Escape, backdrop, usuário/papel, Sair | UT-008–UT-011 | — | manual |
| US-003 | Início: cartões, CTAs, papel, plural | UT-020–UT-024 | IT-001 | manual |
| US-003.EC-2 | Erro de resumo | UT-025 | — | — |
| US-004 | Resumo numérico | UT-026 | IT-001 | — |
| US-005 | Segmento + busca + ordenação + `?situacao` | UT-030–UT-035 (atualiza `solicitacoes-client.test.tsx`) | — | manual |
| US-005.EC-1/2 | Vazio filtrado / total | UT-036 | — | — |
| US-006 | Linha, abas, aba padrão, ActionBar, PDFs | UT-037–UT-041 (`solicitacoes-client.test.tsx`, `export-decision.test.tsx`) | — | manual |
| US-007 | Decisão inline, validação, erro, sucesso | UT-042–UT-045 | — | — |
| US-008 | Secretaria acompanha | UT-046 | — | — |
| US-009 | Toolbar benfeitores + `?boas-vindas` | UT-050–UT-054 (`benfeitores-client.test.tsx`) | — | manual |
| US-010 | Detalhe, pílulas, dia de vencimento, boas-vindas | UT-055–UT-060 | — | — |
| US-011 | Excluir inline | UT-061–UT-062 | — | — |
| US-012 | Secretaria consulta | UT-063 | — | — |
| US-013 | Pagamentos leitura | UT-070–UT-074 | IT-002 | manual |
| US-013.EC-1/2/3 | Mês inválido / vazio / papel | UT-075–UT-077 | — | — |
| US-014 | E-mails em abas | UT-080–UT-082 (+ testes existentes dos clientes) | — | manual |
| US-015 | Modelos em abas | UT-083–UT-085 (+ `template-editor.test.tsx`, `contract-template-editor.test.tsx`) | — | — |
| US-016 | Ano letivo / Usuários / Cabeçalho / Relatórios | UT-090–UT-095 (`school-year.test.tsx`, `institutional-footer-client.test.tsx`, `donor-reports-client.test.tsx`) | — | manual |
| US-017 | Redirects | UT-100 | — | manual |
| US-018 | Vocabulário | UT-101 | — | — |
| Primitivos | roles/aria/callbacks | UT-110–UT-123 | — | — |
| Button hover | variantes outline/ghost | UT-124 | — | — |
| `npm run lint` | script válido | existente: execução do comando | — | — |

## Unit Tests

### AdminShell / nav (Spec: System Architecture) — `__tests__/admin-shell.test.tsx`, `__tests__/admin-nav.test.ts` (substituem `sidebar.test.tsx` e `topbar.test.tsx`)

- **UT-001** (happy): `NAV` filtrado para `admin` — grupos `[undefined, "Bolsas", "Benfeitores", "Configurações"]` com itens/hrefs exatos: Início `/admin`; Solicitações `/admin/solicitacoes`, Ano letivo `/admin/ano-letivo`; Benfeitores `/admin/benfeitores`, Pagamentos `/admin/pagamentos`, E-mails `/admin/emails`, Relatórios `/admin/relatorios`; Modelos de documentos `/admin/modelos`, Cabeçalho e rodapé `/admin/cabecalho`, Usuários `/admin/usuarios`.
- **UT-002** (happy): para `secretaria`, só Início, Solicitações, Benfeitores; `queryByText("Configurações")` null; nenhum grupo vazio.
- **UT-003** (state): `isActive("/admin/solicitacoes/x", "/admin/solicitacoes")` true; `isActive("/admin/solicitacoes", "/admin")` false; `isActive("/admin", "/admin")` true.
- **UT-004** (happy): `counts={{pendingApplications: 3, pendingWelcome: 2}}` → link "Solicitações" contém "3" e "Benfeitores" contém "2" (`admin`).
- **UT-005** (boundary): `pendingApplications: 0` → nenhum badge no item.
- **UT-006** (state): `secretaria` com `pendingWelcome: 2` → sem badge em Benfeitores.
- **UT-007** (error): `counts={null}` → renderiza sem badges.
- **UT-008** (happy): botão `aria-label="Abrir menu"` com `aria-expanded="false"`; após clique, `aria-label="Fechar menu"` e `aria-expanded="true"`.
- **UT-009** (happy): com menu aberto, `keyDown Escape` fecha e foco volta ao botão.
- **UT-010** (happy): header mostra `staff.email` e "Administração" para `admin`, "Secretaria" para `secretaria`; botão "Sair" chama `logout` mockado.
- **UT-011** (state): link ativo tem `aria-current="page"`.
- **UT-012** (happy): `Padrões visuais` não aparece para nenhum papel.

### Início (Spec: Core Features) — `__tests__/admin-home.test.tsx`

- **UT-020** (happy): `AdminHome summary role="admin"` com `pendente: 2, pendingWelcome: 1, payments.count: 3` → "2 solicitações aguardando decisão", "1 benfeitor sem e-mail de boas-vindas", "3 pagamentos aguardando conferência".
- **UT-021** (boundary): `pendente: 1` → "1 solicitação aguardando decisão".
- **UT-022** (happy): links "Ver solicitações" → `/admin/solicitacoes?situacao=pendente`; "Ver benfeitores" → `/admin/benfeitores?boas-vindas=pendentes`; "Conferir pagamentos" → `/admin/pagamentos`.
- **UT-023** (state): `role="secretaria"` → só o cartão de solicitações; sem "Resumo".
- **UT-024** (state): `schoolYear: null` → descrição "Nenhum ano letivo ativo…".
- **UT-025** (error): `summary={null} error="x"` → `role="alert"` com "Não foi possível carregar o resumo".
- **UT-026** (happy): `StatTile`s "Solicitações no ano" = total com dica "X aprovadas · Y rejeitadas"; "Benfeitores"; "Contribuição mensal" = `R$ 1.230,00` formatado; "Esperado em outubro de 2026".

### Solicitações — `__tests__/solicitacoes-client.test.tsx` (atualizado), `__tests__/export-decision.test.tsx` (atualizado)

- **UT-030** (happy): segmento `role="group"` "Filtrar por situação" com botões "Todas 4", "Aguardando decisão 2", "Aprovadas 1", "Rejeitadas 1"; `filter-pendente` `aria-pressed="true"` após clique e lista com 2 cards (`/^application-card-/`).
- **UT-031** (happy): `status-badge` do pendente = "Aguardando decisão" (nunca "Pendente").
- **UT-032** (happy): busca "São José" (label "Buscar solicitações") mantém só cards com escola correspondente; busca por nome do aluno funciona.
- **UT-033** (happy): `sort-select` "Nome da família" ordena por `pai_nome`.
- **UT-034** (happy): `results-count` "2 solicitações · aguardando decisão".
- **UT-035** (state): `initialStatus="pendente"` (de `?situacao=`) → `filter-pendente` pressionado ao montar.
- **UT-036** (boundary): filtro sem resultados → "Nenhuma solicitação aqui" e botão "Limpar filtros" volta a "Todas".
- **UT-037** (happy): `card-toggle` tem `aria-expanded`; clique mostra `card-detail` com `detail-tab-resumo|documentos|financeiro|decisao` e rótulos "Resumo", "Documentos (1)", "Renda e despesas", "Decisão".
- **UT-038** (state): pendente com documentos → aba padrão `detail-tab-documentos` selecionada (`aria-selected="true"`).
- **UT-039** (happy): `ActionBar` do pendente só tem `export-data-button` "Imprimir dados da solicitação"; aprovada tem também `export-button` "Carta de decisão" e `contract-button` "Contrato"; rejeitada tem `export-button` e não `contract-button`.
- **UT-040** (happy): clicar `contract-button` abre `pdf-preview-modal` com `pdf-preview-frame`, `pdf-print-button`, `pdf-download-button` (export-decision).
- **UT-041** (happy): `preview-d1` "Visualizar" abre `pdf-preview`; `download-d1` chama `getDocumentUrl("pending/rg.pdf","app-1")`.
- **UT-042** (happy): aba Decisão pendente mostra "Desconto solicitado" "50%", botões `approve-trigger` "Aprovar solicitação" e `reject-trigger` "Rejeitar"; clique em aprovar mostra `approve-form` com `discount-input` value "50", `confirm-decision` "Confirmar aprovação", `cancel-decision` "Voltar".
- **UT-043** (error): `discount-input` = 150 → `decision-error` "Desconto deve estar entre 0 e 100." e `approveApplication` não chamado.
- **UT-044** (happy): confirmar aprovação com 40 → `approveApplication("app-1", 40, undefined)`; `status-badge` "Aprovada"; `decision-info` com "Aprovada com 40% de desconto"; `decision-actions` ausente; segmento atualiza contagens.
- **UT-045** (happy): `reject-trigger` → `reject-form` com texto "Esta ação é definitiva e a família será informada."; `reason-input` "Bom histórico" → `rejectApplication("app-1","Bom histórico")`; `decision-info` contém "Bom histórico".
- **UT-046** (state): `SecretariatApplicationsClient` mostra "Aguardando decisão", abas "Resumo", "Documentos finais", "Observações"; sem "Aprovar solicitação"; "Baixar decisão" e "Registrar observação" presentes.

### Benfeitores — `__tests__/benfeitores-client.test.tsx` (atualizado)

- **UT-050** (happy): segmento "Filtrar por frequência" com `donor-filter-todos|mensal|unica` ("Todos", "Mensais", "Doação única" + contagens); `donor-filter-mensal` filtra; `donor-results-count` "1 benfeitor".
- **UT-051** (happy): `donor-search-input` (`role="searchbox"`, label "Buscar benfeitores") filtra por nome/CPF/e-mail/telefone.
- **UT-052** (happy): `donor-priorado-filter` (label "Priorado ou capela") com `__nao_informado__` filtra; `donor-sort-select` "Maior valor" ordena.
- **UT-053** (happy): `admin` com 1 pendente → checkbox "Mostrar só quem ainda não recebeu boas-vindas (1)" (`donor-welcome-pending-only`); marcado → só cards pendentes; `secretaria` → checkbox ausente.
- **UT-054** (state): `initialWelcomePendingOnly` (de `?boas-vindas=pendentes`) → checkbox marcado ao montar.
- **UT-055** (happy): card mensal `admin` pendente mostra pílulas "Boas-vindas pendente", "Sem comprovante do mês" (quando `current_receipt.status === "Comprovante pendente"`), "Mensal"; `secretaria` vê só "Mensal"/"Doação única".
- **UT-056** (happy): `donor-due-day` textos preservados: "Dia de vencimento: 5 de cada mês", "Próximo vencimento: 05/11/2026", "Próximo vencimento: Encerrado"; "Cadastro em 28/09/2026".
- **UT-057** (happy): "Alterar dia de vencimento" → spinbutton "Novo dia de vencimento" `max="31"`, dica "De 1 a 31. Em meses mais curtos, vale o último dia."; "Salvar" chama `updateDonorDueDay(id, 12)`; `role="status"` "Dia de vencimento atualizado."; "Salvando…" desabilitado durante a action.
- **UT-058** (error): dia 45 → `role="alert"` "Informe um dia inteiro entre 1 e 31."; action rejeita → "Contribuição mensal não encontrada.".
- **UT-059** (happy): `donor-welcome-status`/`Notice` warn "Boas-vindas ainda não enviado" com `donor-welcome-send` "Enviar agora" e `donor-welcome-mark-sent` "Marcar como enviado"; após `retryDonorWelcomeEmail` → `Notice` success /Boas-vindas enviado em 13\/10\/2026/ e `donor-welcome-unmark-sent` "Desmarcar envio"; erro → `role="alert"` "Tente novamente.".
- **UT-060** (happy): `donor-reminder-status` textos preservados (6 variantes do teste atual) e `donor-instructions-send` presente só em mensal (`getAllByTestId` length 1).
- **UT-061** (happy): `donor-delete-button` "Excluir" → texto "Excluir este cadastro?" com `donor-delete-confirm` "Sim, excluir" e botão "Não"; "Não" volta ao estado inicial sem chamar action.
- **UT-062** (happy/error): "Sim, excluir" chama `deleteDonorPledge(id)` e remove o card; erro → `donor-delete-error` `role="alert"`.
- **UT-063** (state): `SecretariatDonorsClient` mostra busca (`searchbox`), select "Priorado ou capela", card com "Contato" e "Contribuição", sem `donor-welcome-send` nem `donor-reminder-status`; vazio → "Nenhum benfeitor com esses filtros".

### Pagamentos — `__tests__/donor-payment-actions.test.ts`, `__tests__/pagamentos-client.test.tsx`

- **UT-070** (happy): `getMonthlyPayments("2026-10")` com `requireAdmin` resolvido e `queryFor("donorPaymentLedger").findMany` → `{data:{competencia:"2026-10", rows:[...]}}` com `nome` do pledge e `expected_value` numérico; ordenado por `due_date`.
- **UT-071** (error): `getMonthlyPayments("2026-13")` → `{data:null, error:"Mês inválido."}` sem consultar o banco.
- **UT-072** (error): `requireAdmin` lança → a action propaga (comportamento igual às demais).
- **UT-073** (happy): `PagamentosClient` com 3 linhas (2 sem comprovante, 1 com) → `StatTile` "Esperado em outubro de 2026" = soma; "Com comprovante" = valor da linha com comprovante; "Sem comprovante" = soma das duas com dica "2 pagamentos".
- **UT-074** (happy): linhas ordenadas sem comprovante primeiro; cada uma com `StatusPill` "Aguardando conferência"; meta "Comprovante disponível" / "Sem comprovante"; detalhe da linha com comprovante tem "Ver comprovante" que chama `getDocumentUrl(receipt_path)`; linha sem comprovante não tem o botão.
- **UT-075** (boundary): `invalidMonth` prop → `Notice` warn "Mês inválido; mostrando outubro de 2026".
- **UT-076** (boundary): `rows=[]` → `EmptyState` "Nenhum pagamento mensal esperado em outubro de 2026".
- **UT-077** (state): nenhum texto "Confirmar crédito", "Não encontrei no extrato" ou "Baixar CSV" renderizado.

### E-mails e Modelos — `__tests__/emails-tabs.test.tsx`, `__tests__/modelos-tabs.test.tsx`

- **UT-080** (happy): `EmailsTabs` com `useSearchParams` mock `aba=instrucoes` → `tab-instrucoes` `aria-selected="true"` e cliente de instruções visível (`getByLabelText("Tokens permitidos")`).
- **UT-081** (happy): sem `aba` → `tab-boas-vindas` selecionada; clicar `tab-lembretes` chama `router.replace("/admin/emails?aba=lembretes", {scroll:false})`.
- **UT-082** (happy): testes existentes `donor-email-client.test.tsx`, `donor-monthly-instructions-preview.test.tsx`, `donor-reminder-client.test.tsx` continuam passando (sem `<h1>` próprio; regiões "Pré-visualização" preservadas).
- **UT-083** (happy): `ModelosTabs` sem `aba` → `tab-aprovacao` selecionada e `field-corpo` com texto do modelo de aprovação; `aba=contrato` → `tab-contrato` e `contract-template-editor`.
- **UT-084** (happy): `template-editor.test.tsx` adaptado: `tab-aprovacao`/`tab-rejeicao` com textContent "Carta de aprovação"/"Carta de rejeição" (ou mantém "Aprovação"/"Rejeição" se o editor preservar abas internas — o teste segue a opção implementada); `token-item` ×8; `save-message` "Modelo salvo com sucesso."; `template-preview` "Prezado João da Silva".
- **UT-085** (happy): `contract-template-editor.test.tsx` passa sem alterações de `data-testid`.

### Configurações e Relatórios — `__tests__/school-year.test.tsx`, `__tests__/usuarios-client.test.tsx`, `__tests__/institutional-footer-client.test.tsx`, `__tests__/donor-reports-client.test.tsx`

- **UT-090** (happy): Ano letivo: botão "Novo ano letivo" revela `school-year-form`; `submit-button` "Criar ano letivo"; `form-error` "Nome é obrigatório." / "Data de fim deve ser posterior à data de início."; `status-badge` "Ativo"/"Encerrado".
- **UT-091** (happy): `delete-button` → `confirm-dialog` contém "Excluir este ano letivo?" com `confirm-ok` "Sim, excluir" e `confirm-cancel` "Não"; `confirm-ok` chama `deleteSchoolYear`; `toggle-button` em ano ativo → "Desativar este ano letivo?".
- **UT-092** (happy): Usuários: "Criar acesso" chama `createSecretariatUser(email, senha)`; lista mostra `StatusPill` "Ativo"/"Inativo", botões "Redefinir senha", "Desativar"/"Reativar"; vazio → "Nenhum acesso da Secretaria cadastrado.".
- **UT-093** (happy): Cabeçalho: `getByLabelText("Rodapé institucional")`, `footer-preview` textContent exato, `header-save` /^Salvar$/, `header-error` "Tente novamente", "Restaurar rodapé padrão" — testes atuais passam.
- **UT-094** (happy): Relatórios: labels "Data inicial", "Data final", "Frequência"; "Aplicar filtros" → `getDonorReports({from:"2026-01-01", to:undefined, frequency:"mensal"})`; tabelas e `img` preservados — teste atual passa.
- **UT-095** (happy): `communication-layout.test.tsx` e `configured-header.test.tsx` inalterados e verdes.

### Rotas e vocabulário — `__tests__/admin-redirects.test.ts`, `__tests__/auth-actions.test.ts` (atualizado)

- **UT-100** (happy): `next.config.ts` `redirects()` retorna exatamente as 6 entradas de `_dx.md`, todas `permanent: true`.
- **UT-101** (happy): login válido redireciona para `"REDIRECT:/admin"`; `middleware.test.ts` continua: `/admin` sem sessão → 307 `/login`.
- **UT-102** (state): `grep`-like: nenhum componente em `app/admin/**` renderiza a string exata "Pendente" como rótulo de situação (teste lê `STATUS_LABELS` exportado de `app/admin/_components/status-labels.ts`: `{pendente:"Aguardando decisão", aprovada:"Aprovada", rejeitada:"Rejeitada"}`).

### Primitivos — `__tests__/admin-primitives.test.tsx`

- **UT-110** (happy): `PageHeader title description action` → `h1` com título, `p` com descrição, slot de ação renderizado.
- **UT-111** (happy): `Section title` → `section[aria-labelledby]` apontando para o `h2`.
- **UT-112** (happy): `StatusPill tone="warn"` → texto visível + `span[aria-hidden]` do ponto; `dot={false}` sem ponto.
- **UT-113** (happy): `Notice tone="danger"` → `role="alert"`; `tone="success"` → `role="status"`; `title` em `p.font-semibold`; `action` renderizado.
- **UT-114** (happy): `RecordRow` fechado → botão `aria-expanded="false"`, filho não renderizado; clique → `aria-expanded="true"`, `aria-controls` aponta para o painel com o filho; `defaultOpen` abre; `toggleTestId`/`detailTestId` aplicados.
- **UT-115** (state): `RecordRow open onOpenChange` controlado: clique chama `onOpenChange(true)` sem alterar sozinho.
- **UT-116** (happy): `SegmentedFilter` → `role="group"` com `aria-label`; opção ativa `aria-pressed="true"`; clique chama `onChange(value)`; `count` renderizado; `testIdPrefix="filter"` gera `filter-<value>`.
- **UT-117** (happy): `DataGrid`/`DataItem` → `dl > div > dt + dd`; valor `null` → "—".
- **UT-118** (happy): `EmptyState` → título, descrição, ação opcional.
- **UT-119** (happy): `StatTile label value hint tone` → rótulo caixa alta, valor, dica; ponto só quando `tone !== "neutral"`.
- **UT-120** (happy): `ActionBar note` → botões + nota.
- **UT-121** (happy): `Field label hint` → `label[for]` ligado ao controle; `aria-describedby` aponta para a dica; `error` → `aria-invalid="true"` e texto do erro.
- **UT-122** (happy): `SearchInput label placeholder` → `input[type=search]` com label sr-only e `onChange(value)`.
- **UT-123** (happy): `InlineConfirm question confirmLabel` → texto da pergunta, botão confirmar chama `onConfirm`, botão "Não" chama `onCancel`; `pending` desabilita confirmar.
- **UT-124** (happy): `buttonVariants({variant:"outline"})` e `{variant:"ghost"}` contêm `hover:bg-bg` e não `hover:bg-muted`.

## Integration Tests

### Resumo do Início (fake-db)

- **IT-001**: `getAdminHomeSummary()` com `requireStaff` resolvido e `queryFor` para `applications` (2 pendente, 1 aprovada, 1 rejeitada), `schoolYears` (1 ativo "2026"), `donorPledges` (2 mensais 150+300, 1 única, 1 sem `welcome_email_sent_at`), `donorPaymentLedger` (competência corrente: 2 linhas 150+300, 1 com comprovante) → `{data:{schoolYear:{nome:"2026"}, applications:{total:4,pendente:2,aprovada:1,rejeitada:1}, donors:{total:3,mensal:2,unica:1,monthlyAmount:450,pendingWelcome:1}, payments:{competencia, expectedAmount:450, count:2, withReceipt:1}}}`; com `db` lançando → `{data:null, error}`.

### Pagamentos (fake-db)

- **IT-002**: `getMonthlyPayments("2026-10")` junta `donorPaymentLedger` + `donorPledges.nome`; linha cujo pledge não existe é omitida; `expected_value` string "150.00" vira `150`.

## End-to-End Tests

Manual (não automatizado neste repositório): `npm run dev` → `/admin` (bypass) → menu, Início, Solicitações (filtro, abrir linha, aba Decisão), Benfeitores (checkbox boas-vindas, excluir inline cancelado), Pagamentos (mês), E-mails e Modelos (abas e `?aba=`), rotas antigas redirecionando; comparação lado a lado com `/prototipos/admin-redesign#/<tela>` via `agent-browser`. Evidência: descrição no relatório final de cada tarefa.
