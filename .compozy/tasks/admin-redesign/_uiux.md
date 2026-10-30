# UI/UX Change Map: Redesenho do painel administrativo

Toda superfície tocada, estado atual com âncoras, mudança, estados e referência visual. Referência visual = protótipo aprovado em `app/prototipos/_designs/admin-redesign/` (tela indicada por arquivo). Evidência renderizada: `docs/design/admin-redesign/index.html`.

Companions: `_spec.md` Parte I, `_user_stories.md`, `_dx.md`.

## Design constraints (aplicam-se a todas as telas)

- Tokens somente de `app/globals.css` (`bg surface cream border muted fg accent gold success warn danger`); variações por opacidade (`success/10`, `warn/12`, `danger/10`, `accent/8`). Texto do tom `warn` usa `oklch(45% 0.12 70)` (constante local, herdada do protótipo) por contraste.
- Tipografia: `font-heading` (serif) em títulos h1 (24px), h2 (18px) e números grandes; sans em todo o resto; rótulo de dado 12px caixa alta `text-muted`.
- Estado em palavras: `StatusPill` = ponto colorido + texto completo. Cor nunca é o único sinal.
- Botões: um primário por contexto (`Button` padrão navy); `outline` secundário; `ghost` terciário; `destructive` para Rejeitar/Excluir. Altura `lg` (36px) para ações de formulário; `sm` em linhas/tabelas.
- Confirmação no lugar (`InlineConfirm`), nunca modal. Feedback (`Notice`) logo acima dos botões que o causaram, com próximo passo.
- Truthful UI: contadores indisponíveis → sem badge; conferência bancária inexistente → controles ausentes, não desabilitados; "—" para dado ausente.
- Teclado: linhas são `<button aria-expanded>`; segmento `role=group` + `aria-pressed`; abas shadcn `Tabs`; menu mobile com Escape, backdrop e foco devolvido; `motion-reduce` em transições.
- Copy: `COPY.md` (acolhedora, direta, sem urgência). Vocabulário fechado em `_user_stories.md` US-018.

## Surface map

| # | Surface | Kind | Core change | Stories |
| --- | --- | --- | --- | --- |
| S1 | Shell (barra superior + sidebar + main) | modify | 3 grupos, contadores, usuário/papel, menu mobile no topo, 1040px | US-001, US-002 |
| S2 | Início `/admin` | new | Cartões "Precisa de atenção" + "Resumo" | US-003, US-004 |
| S3 | Solicitações lista | modify | Segmento único + busca + ordenação; `RecordRow` | US-005, US-008 |
| S4 | Solicitações detalhe | modify | Abas Resumo / Documentos / Renda e despesas / Decisão; `ActionBar` com PDFs | US-006, US-007 |
| S5 | Benfeitores lista | modify | Toolbar nova; linha com pílulas | US-009, US-012 |
| S6 | Benfeitores detalhe | modify | Contato / Contribuição / E-mails e comprovantes; `ActionBar`; exclusão inline | US-010, US-011 |
| S7 | Pagamentos `/admin/pagamentos` | new | Mês + 3 `StatTile` + lista somente leitura | US-013 |
| S8 | E-mails `/admin/emails` | new (compõe 3 páginas) | Abas sobre clientes existentes | US-014 |
| S9 | Modelos `/admin/modelos` | new (compõe 2 páginas) | Abas sobre editores existentes | US-015 |
| S10 | Relatórios | modify | Casca: `PageHeader`, `Card` de filtros, `Section` | US-016 |
| S11 | Ano letivo | modify | Ação no cabeçalho, tabela, confirmação inline | US-016 |
| S12 | Usuários | modify | Duas seções + `StatusPill` | US-016 |
| S13 | Cabeçalho e rodapé | modify | `Card` + prévia "Como fica no documento" | US-016 |

### S1. Shell

- **Today**: `app/admin/layout.tsx:11-20` (`Topbar` sem props, `Sidebar role`, `main max-w-[900px]`); `sidebar.tsx:9-135` (4 grupos, 11 itens, SVG inline); `sidebar.tsx:190-212` botão flutuante inferior; `topbar.tsx:15-35` (selo, "Administração", "Sair").
- **Change**: `AdminShell` cliente com barra 56px (botão menu `md:hidden` à esquerda, selo 30px, "Arca N. S. da Providência" + "Administração", à direita e-mail + papel e `Button outline lg` "Sair"); sidebar 260px `sticky top-14` com `NAV` de `nav.ts`, item ativo `bg-accent text-white` + ícone `text-gold`, `CountBadge` warn; `main` com `max-w-[1040px]`.
- **States**: admin / secretaria; ativo; badge > 0 / 0 / indisponível; mobile fechado / aberto / reduced-motion; logout pendente.
- **Artboard**: `shell.tsx`.

### S2. Início

- **Today**: `app/admin/page.tsx:1-5` redirect.
- **Change**: página server `requireStaff` + `getAdminHomeSummary`; `PageHeader` "Início"; `Section` "Precisa de atenção" com `Card`s (número serif 30px, título, detalhe, `Button outline lg` com `ArrowRight`); `Section` "Resumo" com 4 `StatTile` (admin).
- **States**: admin (3 cartões + resumo) / secretaria (1 cartão); contagens 0/1/n; ano ativo ausente; erro de leitura (`Notice danger`).
- **Artboard**: `screens/inicio.tsx`.

### S3. Solicitações lista

- **Today**: `solicitacoes/client.tsx` com `StatsDashboard` (`stats-dashboard.tsx`), `status-filters` pills "Todos/Pendente/Aprovada/Rejeitada", `search-input`, `sort-select`, `results-count`, `application-list`.
- **Change**: `PageHeader` "Solicitações de bolsa" (descrição por papel); `SegmentedFilter` "Filtrar por situação" (`testIdPrefix="filter"` → `filter-todas|pendente|aprovada|rejeitada`); `SearchInput` "Buscar solicitações"; `NativeSelect` "Ordenar" (`sort-select`); contagem `aria-live` (`results-count`); lista (`application-list`) de `ApplicationRow`; `EmptyState` com "Limpar filtros".
- **States**: filtro × busca × ordenação; vazio filtrado / vazio total; `?situacao=`; secretaria.
- **Artboard**: `screens/solicitacoes.tsx`.

### S4. Solicitações detalhe

- **Today**: `application-card.tsx` (`card-toggle`, `status-badge` "Pendente", `student-count`, `card-header-actions` com 3 botões de PDF no cabeçalho, `card-detail`); `application-detail.tsx` (abas `detail-tab-*` "Resumo/Documentos (N)/Financeiro/Decisão"); `decision-actions.tsx` (`approve-trigger`, `reject-trigger`, formulários, `confirm-decision`, `cancel-decision`).
- **Change**: `RecordRow` (`data-testid=application-card-{id}`, `toggleTestId=card-toggle`, `detailTestId=card-detail`); `StatusPill` (`status-badge`) "Aguardando decisão/Aprovada/Rejeitada"; abas via shadcn `Tabs` com `detail-tab-resumo|documentos|financeiro|decisao` e rótulos "Resumo", "Documentos (N)", "Renda e despesas", "Decisão"; `DataGrid`/`DataItem` no Resumo e Renda; `DecisionActions` restilizado (mesmos testids; botões "Aprovar solicitação" primário / "Rejeitar" destructive; "Confirmar aprovação"/"Confirmar rejeição"; "Voltar" ghost; sem painel em cinza); `ActionBar` com `export-data-button` "Imprimir dados da solicitação", `export-button` "Carta de decisão" (decidida), `contract-button` "Contrato" (aprovada); `decision-info` como `Notice`.
- **States**: pendente / aprovada / rejeitada; modo idle / aprovar / rejeitar; erro de desconto; erro de action; carregando; sem documentos; secretaria (abas Resumo / Documentos finais / Observações).
- **Artboard**: `screens/solicitacoes.tsx` (`ApplicationRow`, `DecisionPanel`).

### S5. Benfeitores lista

- **Today**: `benfeitores/client.tsx` com 4 `StatCard`, `donor-search-input`, `donor-priorado-filter`, `donor-sort-select`, `donor-filters` ("Todos/Mensal/Única"), `donor-welcome-filters` (3 pills), `donor-results-count`, `donor-list`.
- **Change**: `PageHeader` "Benfeitores"; `SegmentedFilter` "Filtrar por frequência" (`testIdPrefix="donor-filter"` → `donor-filter-todos|mensal|unica`, rótulos "Todos/Mensais/Doação única"); `SearchInput` (`donor-search-input`, label "Buscar benfeitores"); `NativeSelect` "Priorado ou capela" (`donor-priorado-filter`, valores `__todos__`/`__nao_informado__`); `NativeSelect` "Ordenar" (`donor-sort-select`); `Checkbox` "Mostrar só quem ainda não recebeu boas-vindas (M)" (`donor-welcome-pending-only`) substitui `donor-welcome-filters`; contagem `donor-results-count`; `donor-list`; `EmptyState`.
- **States**: admin / secretaria; filtros; vazio; `?boas-vindas=pendentes`.
- **Artboard**: `screens/benfeitores.tsx`.

### S6. Benfeitores detalhe

- **Today**: `donor-card.tsx:1-539` (`donor-card-{id}`, `frequencia-badge`, `donor-due-day`, `donor-reminder-status`, `donor-welcome-status|send|mark-sent|unmark-sent|error`, `donor-delete-*`, `donor-export-*`, `donor-recibo-*`); `donor-monthly-instructions.tsx` (`donor-current-receipt`, `donor-instructions-*`).
- **Change**: `RecordRow` (`donor-card-{id}`) com pílulas (`frequencia-badge` "Mensal"/"Doação única"; "Boas-vindas pendente"; "Sem comprovante do mês"); seções `<h3>` "Contato" (`DataGrid` 2 col), "Contribuição" (`DataGrid` + edição inline do dia com `Field`/`Input`, "Salvar"/"Cancelar"; `donor-due-day`; `donor-reminder-status`), "E-mails e comprovantes" (admin: `Notice` success "Boas-vindas enviado" + "Desmarcar envio" | `Notice` warn "Boas-vindas ainda não enviado" + "Enviar agora" (`donor-welcome-send`) + "Marcar como enviado" (`donor-welcome-mark-sent`); `donor-welcome-status`; `DonorMonthlyInstructions` inalterado); `ActionBar` (admin): "Imprimir ficha" (`donor-export-button`), "Ver recibo" (`donor-recibo-button`), "Excluir" (`donor-delete-button`) → `InlineConfirm` "Excluir este cadastro?" (`donor-delete-confirm` = "Sim, excluir").
- **States**: mensal / única; boas-vindas enviado / pendente / em andamento / erro; comprovante recebido / pendente / n.a.; dia editando / salvando / erro; excluir idle / confirmando / erro; secretaria (só Contato e Contribuição).
- **Artboard**: `screens/benfeitores.tsx` (`DonorRow`).

### S7. Pagamentos

- **Today**: não existe.
- **Change**: página server `requireAdmin` + `getMonthlyPayments(mes)`; `PageHeader` "Pagamentos" com ação `Field` "Mês" (`Input type=month`, submit via `<form method=get>`); 3 `StatTile`; `Section` "Pagamentos do mês" com `RecordRow`s (`payment-row-{id}`), `StatusPill warn` "Aguardando conferência"; detalhe `DataGrid` + "Ver comprovante" (`outline sm`, `payment-receipt-button`) + `Notice` informativo.
- **States**: com dados / vazio / mês inválido / erro de leitura / sem comprovante / com comprovante.
- **Artboard**: `screens/pagamentos.tsx` (sem formulário de confirmação nem CSV).

### S8. E-mails

- **Today**: três páginas `email-benfeitores/page.tsx`, `instrucoes-benfeitores/page.tsx`, `lembretes-benfeitores/page.tsx`, cada uma com `<h1>` e `max-w-[1200px]`.
- **Change**: `app/admin/emails/page.tsx` (`requireAdmin`, carrega os três conjuntos de dados como hoje) → `EmailsTabs` cliente com shadcn `Tabs` ("Boas-vindas", "Instruções de pagamento", "Lembretes de vencimento"; `data-testid` `tab-boas-vindas|instrucoes|lembretes`); `?aba=` sincronizado; conteúdo = clientes existentes restilizados com `Field`/`Input`/`Textarea`/`Notice`/`Button`, sem `<h1>` próprio; seções "Conteúdo", "Pré-visualização", "Enviar e-mail de teste", "Envios pendentes"/"Lembretes que exigem atenção" preservadas com seus rótulos acessíveis.
- **States**: aba ativa; Resend não configurado (`Notice warn`); salvo / erro; prévia desatualizada.
- **Artboard**: `screens/comunicacoes.tsx`.

### S9. Modelos

- **Today**: `textos/page.tsx` (`TemplateEditor` com abas internas `tab-aprovacao`/`tab-rejeicao`), `contrato/page.tsx` (`ContractTemplateEditor`).
- **Change**: `app/admin/modelos/page.tsx` (`requireAdmin`; `getTemplates` + `getContractTemplate`) → `ModelosTabs` com `Tabs` ("Carta de aprovação" `tab-aprovacao`, "Carta de rejeição" `tab-rejeicao`, "Contrato de concessão" `tab-contrato`); `TemplateEditor` passa a receber `tipo` fixo por aba (ou mantém abas internas ocultas: decisão do implementador, preservando `field-*`, `token-item`, `save-button`, `save-message`); layout formulário + aside "Campos disponíveis" (tokens clicáveis copiam para a área de transferência).
- **States**: aba; salvo / erro; prévia.
- **Artboard**: `screens/configuracoes.tsx` (`ModelosScreen`).

### S10. Relatórios

- **Today**: `relatorios/page.tsx` + `reports-client.tsx` (filtros, "População selecionada", tabelas, `reports-charts.tsx`).
- **Change**: `PageHeader` "Relatórios"; filtros em `Card` com `Field`/`Input date`/`NativeSelect` e `Button` "Aplicar filtros"; cada série em `Section` com `Card` (tabela e gráfico inalterados).
- **States**: carregando ("Atualizando…"); erro; vazio.
- **Artboard**: `screens/relatorios.tsx` (casca).

### S11. Ano letivo

- **Today**: `ano-letivo/client.tsx` (`SchoolYearForm` sempre visível + `SchoolYearList` com `Modal confirm-dialog`).
- **Change**: `PageHeader` "Ano letivo" com ação `Button` "Novo ano letivo" que revela `SchoolYearForm` em `Card` (`school-year-form`, `input-*`, `submit-button` "Criar ano letivo", `form-error` via `Notice danger`); tabela "Ano / Período / Situação / Ações" (`school-year-list`, `school-year-row-{id}`, `status-badge` "Ativo"/"Encerrado"); `toggle-button` "Desativar"/"Tornar ativo"; `delete-button` "Excluir" → `InlineConfirm` (`confirm-ok` "Sim, excluir", `confirm-cancel` "Não"; container `confirm-dialog`); desativar também confirma inline.
- **States**: criando / lista; ativo / encerrado; confirmando; erro; vazio.
- **Artboard**: `screens/configuracoes.tsx` (`AnoLetivoScreen`).

### S12. Usuários

- **Today**: `usuarios/client.tsx` ("Novo acesso", lista, `window.prompt` para senha).
- **Change**: `PageHeader` "Usuários"; `Section` "Novo acesso" em `Card` (e-mail, senha inicial com dica, "Criar acesso"); `Section` "Acessos existentes" em `Card padded=false` lista com `StatusPill` "Ativo"/"Inativo", "Redefinir senha" (`outline sm`, mantém `window.prompt`), "Desativar"/"Reativar" (`ghost sm`); `Notice` sobre inativos; `EmptyState` quando vazio.
- **States**: vazio; criando; erro; ativo/inativo.
- **Artboard**: `screens/configuracoes.tsx` (`UsuariosScreen`).

### S13. Cabeçalho e rodapé

- **Today**: `cabecalho/client.tsx` (headings "Configuração" / "Pré-visualização"; testids `header-*`, `footer-preview`).
- **Change**: `PageHeader` "Cabeçalho e rodapé"; grid 2 colunas: `Card` com `Checkbox` (`header-mostrar-selo`), `Field`/`Input` (`header-linha1..3`), `Textarea` "Rodapé institucional" (id `institutional-footer`), "Restaurar rodapé padrão" (`outline sm`), "Salvar" (`header-save`); `Notice` success (`header-saved`) / danger (`header-error`); coluna direita "Como fica no documento" com `DocumentHeaderPreview` + `DocumentFooterPreview` em `Card`.
- **States**: salvando / salvo / erro; sem rodapé.
- **Artboard**: `screens/configuracoes.tsx` (`CabecalhoScreen`).

## Component plan (design → production mapping)

### Rules

- Compor a partir de `components/ui` (shadcn, base-nova) e dos primitivos de `app/admin/_components/`. O CSS do protótipo (`ui.tsx`) é contrato visual, nunca importado.
- Componentes de domínio existentes são restilizados no lugar; `data-testid`s listados em `_tests.md` são preservados.

### New shared primitives (`components/ui`, via `npx shadcn add`)

`input`, `textarea`, `select`, `native-select`, `tabs`, `badge`, `card`, `checkbox`. Justificativa: inexistentes no inventário (só `button`, `seal-logo`). `button.tsx` recebe ajuste de hover (`outline`/`ghost`: `hover:bg-bg`).

### New domain components (`app/admin/_components/`)

| Componente | Composto de | Usado por |
| --- | --- | --- |
| `PageHeader` | h1 serif + p + slot de ação | todas as páginas |
| `Section` | h2 serif + descrição + aside | Início, Pagamentos, Usuários, Relatórios |
| `StatusPill` | span + ponto | S3–S7, S11, S12 |
| `CountBadge` | span warn | sidebar |
| `Notice` | ícone lucide + título + texto + ações; `role` | todas |
| `RecordRow` | article + button `aria-expanded` + painel | S3, S5, S7 |
| `SegmentedFilter` | `role=group` + botões `aria-pressed` | S3, S5 |
| `DataGrid` / `DataItem` | `dl`/`dt`/`dd` | S4, S6, S7 |
| `EmptyState` | borda tracejada + título + texto + ação | S3, S5, S7, S12 |
| `StatTile` | rótulo + número serif + dica | S2, S7 |
| `ActionBar` | divisória + botões + nota | S4, S6, S7 |
| `Field` | label + controle (render prop com `id`/`aria-describedby`/`aria-invalid`) + dica/erro | formulários |
| `SearchInput` | `Input type=search` + ícone + label sr-only | S3, S5 |
| `InlineConfirm` | pergunta + `destructive` + ghost | S6, S11 |
| `AdminShell` + `nav.ts` | header, aside, main; `NAV`, `isActive` | layout |
| `EmailsTabs`, `ModelosTabs` | `Tabs` + `useSearchParams` | S8, S9 |

### Signal & state mapping

| Sinal no protótipo | Primitivo + token |
| --- | --- |
| Aguardando decisão / Boas-vindas pendente / Aguardando conferência | `StatusPill tone="warn"` (`bg-warn/12`, texto warn-escuro, `border-warn/30`) |
| Aprovada / Confirmado no extrato / Ativo | `StatusPill tone="success"` (`bg-success/10 text-success`) |
| Rejeitada / Não identificado | `StatusPill tone="danger"` (`bg-danger/10 text-danger`) |
| Mensal | `StatusPill tone="accent" dot={false}` (`bg-accent/8 text-accent`) |
| Doação única / Sem comprovante do mês / Encerrado / Inativo | `StatusPill tone="neutral"` (`bg-bg text-muted`) |
| Contador do menu | `CountBadge` (`bg-warn/15`) |
| Aviso info / sucesso / atenção / erro | `Notice` neutral (`bg-cream/60`) / success / warn / danger |
| Ação primária | `Button` (`bg-primary` navy) |
| Rejeitar / Excluir | `Button variant="destructive"` (`bg-destructive/10 text-destructive`) |
| Item de menu ativo | `bg-accent text-white` + ícone `text-gold` |
| Ponto de atenção na aba Decisão | `span.size-1.5.rounded-full.bg-warn` + `sr-only` "pendente" |
