---
status: pending
title: "Shell, Início em /admin, páginas com abas e redirects"
type: frontend
complexity: critical
dependencies:
  - task_01
---

# Task 2: Shell, Início em /admin, páginas com abas e redirects

## Overview

Substitui `Sidebar`/`Topbar` pelo `AdminShell` do protótipo (3 grupos, contadores, usuário/papel, menu mobile na barra, conteúdo 1040px), transforma `/admin` na página Início alimentada por uma nova action de leitura, reúne e-mails e modelos em páginas com abas e registra os redirects permanentes das rotas antigas. É a fatia que resolve o problema motivador.

<critical>
- ALWAYS READ `_spec.md`, `_user_stories.md` (US-001–US-004, US-014, US-015, US-017), `_uiux.md` (S1, S2, S8, S9), `_dx.md`, `_tests.md`
- REFERENCE `_spec.md` Part II para `AdminHomeSummary`, `nav.ts`, decisões de abas/URL
- FOCUS ON "WHAT"
- MINIMIZE CODE
- TESTS REQUIRED — ver seção Tests
</critical>

<requirements>
1. MUST criar `app/admin/_components/admin-shell.tsx` (client) com barra superior (botão de menu `md:hidden` com `aria-label` "Abrir menu"/"Fechar menu" e `aria-expanded`; `SealLogo` 30; "Arca N. S. da Providência" + "Administração"; e-mail do usuário e papel "Administração"/"Secretaria"; `Button variant="outline" size="lg"` "Sair" chamando `logout` em `startTransition`, "Saindo…" quando pendente), sidebar 260px (`NAV` de `nav.ts`, filtro `adminOnly`, item ativo `aria-current="page"` `bg-accent text-white` + ícone `text-gold`, `CountBadge` quando `counts` > 0), menu mobile (backdrop, Escape devolve foco, link fecha, `motion-reduce`), `main` com `mx-auto max-w-[1040px]`.
2. MUST atualizar `app/admin/layout.tsx`: `requireStaff()`; chamar `getAdminHomeSummary()` e derivar `counts = { pendingApplications, pendingWelcome }` (ou `null` em erro); renderizar `<AdminShell staff={{email, role}} counts>`.
3. MUST criar `app/admin/_actions/admin-home-actions.ts` com `getAdminHomeSummary()` (`requireStaff`; retorno `AdminHomeSummary` conforme `_spec.md`; competência corrente via `saoPauloDate`; erros capturados em `{data:null, error}`). Não alterar actions existentes.
4. MUST transformar `app/admin/page.tsx` em Início (server): `PageHeader` "Início" com descrição do ano letivo; `Section` "Precisa de atenção" com cartões (contagem, título singular/plural, detalhe, `Button outline lg` + `ArrowRight` como `Link`) — solicitações (todos), boas-vindas e pagamentos (só admin) — e `Section` "Resumo" com 4 `StatTile` (só admin). Componente cliente/presentacional `app/admin/_components/admin-home.tsx` recebe `summary`, `role`, `error`.
5. MUST alterar `AFTER_LOGIN` em `app/login/_actions/auth-actions.ts` para `"/admin"` e atualizar o comentário; `__tests__/auth-actions.test.ts` passa a esperar `REDIRECT:/admin`.
6. MUST criar `app/admin/emails/page.tsx` (`requireAdmin`; carrega dados dos três e-mails como as páginas atuais fazem) e `app/admin/emails/emails-tabs.tsx` (client; shadcn `Tabs` com `tab-boas-vindas|instrucoes|lembretes`; `?aba=` lido com `useSearchParams` e escrito com `router.replace(..., {scroll:false})`; envolver em `<Suspense>`). Mover os clientes para `app/admin/emails/_clients/{welcome,monthly-instructions,reminders}.tsx` (ou manter caminho atual) removendo seus `<h1>`/wrappers de largura e trocando controles por `Field`/`Input`/`Textarea`/`Notice`/`Button`, preservando rótulos acessíveis, regiões "Pré-visualização", `aria-label="Tokens permitidos"` e todos os textos asseridos nos testes existentes. Apagar `app/admin/{email,instrucoes,lembretes}-benfeitores/page.tsx`.
7. MUST criar `app/admin/modelos/page.tsx` (`requireAdmin`; `getTemplates` + `getContractTemplate`) e `app/admin/modelos/modelos-tabs.tsx` (`tab-aprovacao|rejeicao|contrato`, `?aba=`), compondo `TemplateEditor` (uma aba por tipo, ou abas internas ocultas — preservar `field-*`, `token-item`, `save-button`, `save-message`, `template-preview`) e `ContractTemplateEditor` (testids inalterados), restilizados com os primitivos e aside "Campos disponíveis". Apagar `app/admin/textos/page.tsx` e `app/admin/contrato/page.tsx`.
8. MUST adicionar `redirects()` em `next.config.ts` com as 6 entradas de `_dx.md`, `permanent: true`.
9. MUST apagar `app/admin/_components/sidebar.tsx`, `topbar.tsx` e seus testes `__tests__/sidebar.test.tsx`, `__tests__/topbar.test.tsx`, substituídos por `__tests__/admin-shell.test.tsx`.
10. MUST NOT alterar actions existentes (os `revalidatePath` para rotas antigas ficam como estão; as páginas são dinâmicas), `lib/**`, `proxy.ts`, `app/prototipos/**`, `docs/design/**`.
11. MUST manter as páginas Solicitações, Benfeitores, Relatórios, Ano letivo, Usuários, Cabeçalho funcionando dentro do novo shell (sem restilizar — fases seguintes), com `npm test` inteiro verde.
</requirements>

## Subtasks

- [ ] 2.1 Implementar `AdminShell` e atualizar `layout.tsx`; remover `Sidebar`/`Topbar`.
- [ ] 2.2 Implementar `getAdminHomeSummary` com testes fake-db.
- [ ] 2.3 Implementar Início (`page.tsx` + `admin-home.tsx`) e ajustar `AFTER_LOGIN`.
- [ ] 2.4 Criar `/admin/emails` com abas e mover/restilizar os três clientes; apagar páginas antigas.
- [ ] 2.5 Criar `/admin/modelos` com abas; apagar páginas antigas.
- [ ] 2.6 Registrar redirects em `next.config.ts`.
- [ ] 2.7 Escrever/atualizar testes (lista abaixo) e rodar `npm run typecheck`, `npm run lint`, `npm test`.
- [ ] 2.8 Conferência visual: `npm run dev` → `/admin` (admin e, via alteração temporária de papel não commitada, secretaria se viável), `/admin/emails?aba=lembretes`, `/admin/modelos?aba=contrato`, rota antiga `/admin/textos` redirecionando; comparar com `/prototipos/admin-redesign#/inicio`, `#/comunicacoes`, `#/modelos` via `agent-browser`.

## Implementation Details

Siga `_spec.md` "System Architecture", "Core Interfaces" (`AdminHomeSummary`, `NAV`, `isActive`), "Key Decisions" (abas com URL, contadores no layout, Início em `/admin`) e `_uiux.md` S1/S2/S8/S9. Referência visual: `shell.tsx`, `screens/inicio.tsx`, `screens/comunicacoes.tsx`, `screens/configuracoes.tsx` (`ModelosScreen`). Preserve o comportamento de foco do menu mobile existente em `sidebar.tsx:143-185` (focus trap/Escape). `useSearchParams` exige `<Suspense>` no server component pai. Os clientes de e-mail usam `Link` para `/admin/cabecalho` — manter.

### Relevant Files

- `app/admin/layout.tsx`, `app/admin/page.tsx` — pontos de entrada a reescrever.
- `app/admin/_components/sidebar.tsx`, `topbar.tsx` — comportamento a preservar (mobile, logout) e a apagar.
- `app/admin/_components/nav.ts`, primitivos da task_01.
- `app/admin/email-benfeitores/{page,client}.tsx`, `instrucoes-benfeitores/{page,client}.tsx`, `lembretes-benfeitores/{page,client}.tsx` — dados carregados e clientes a compor.
- `app/admin/textos/page.tsx`, `app/admin/contrato/page.tsx`, `_components/template-editor.tsx`, `contract-template-editor.tsx`, `template-preview.tsx`.
- `app/admin/_actions/admin-actions.ts` (`getTemplates`, `getContractTemplate`), `donor-email-actions.ts`, `donor-monthly-instructions-actions.ts`, `donor-reminder-actions.ts` — leituras existentes.
- `lib/db/schema.ts` (`applications`, `schoolYears`, `donorPledges`, `donorPaymentLedger`), `lib/donor-recurrence.ts` (`saoPauloDate`), `lib/auth/authorization.ts`.
- `app/login/_actions/auth-actions.ts:22-28` — `AFTER_LOGIN`.
- `next.config.ts` — `redirects()`.
- `__tests__/helpers/fake-db.ts`, `__tests__/donor-report-actions.test.ts` — padrão de teste de action.

### Dependent Files

- `__tests__/sidebar.test.tsx`, `__tests__/topbar.test.tsx` — apagados.
- `__tests__/auth-actions.test.ts` — `REDIRECT:/admin`.
- `__tests__/donor-email-client.test.tsx`, `donor-monthly-instructions-preview.test.tsx`, `donor-reminder-client.test.tsx`, `template-editor.test.tsx`, `contract-template-editor.test.tsx` — imports/rótulos conforme a opção escolhida.
- `__tests__/middleware.test.ts` — continua verde.

## Deliverables

- `admin-shell.tsx`, `layout.tsx`, `page.tsx` (Início), `admin-home.tsx`, `admin-home-actions.ts`.
- `app/admin/emails/*`, `app/admin/modelos/*`; páginas antigas removidas.
- `next.config.ts` com redirects; `auth-actions.ts` com `AFTER_LOGIN = "/admin"`.
- Testes: `admin-shell.test.tsx` (UT-004–UT-012), `admin-home.test.tsx` (UT-020–UT-026), `admin-home-actions.test.ts` (IT-001), `emails-tabs.test.tsx` (UT-080–UT-082), `modelos-tabs.test.tsx` (UT-083–UT-085), `admin-redirects.test.ts` (UT-100), `auth-actions.test.ts` (UT-101) **(REQUIRED)**; cobertura ≥ 80% dos arquivos novos.

## Tests

- Unit tests: UT-004–UT-012, UT-020–UT-026, UT-080–UT-085, UT-100, UT-101 (ver `_tests.md`).
- Integration tests: IT-001 (`getAdminHomeSummary` com fake-db).
- Test coverage target: ≥ 80% dos arquivos novos.
- All tests must pass: `npm test` completo verde.

## Success Criteria

- `npm run typecheck`, `npm run lint`, `npm test` passam.
- `/admin` renderiza Início; `/admin/emails`, `/admin/modelos` funcionam com `?aba=`; rotas antigas redirecionam com 308 (verificado com `curl -I` no dev server).
- Secretaria vê só Início/Solicitações/Benfeitores no menu; "Padrões visuais" ausente.
- Conferência visual descrita no relatório da tarefa (telas e diferenças encontradas).
