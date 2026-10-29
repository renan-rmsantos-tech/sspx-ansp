---
status: pending
title: "Base: componentes shadcn, primitivos compartilhados e ajustes de tooling"
type: frontend
complexity: high
dependencies: []
---

# Task 1: Base: componentes shadcn, primitivos compartilhados e ajustes de tooling

## Overview

Cria a fundação do redesenho: adiciona os componentes shadcn que faltam em `components/ui`, reimplementa os padrões do protótipo como componentes compartilhados em `app/admin/_components/`, define a configuração de navegação e corrige o script de lint. Nenhuma página muda ainda; tudo é coberto por testes unitários para que as fases seguintes só componham.

<critical>
- ALWAYS READ `_spec.md`, `_uiux.md`, `_tests.md` e `docs/design/admin-redesign/handoff.md` antes de começar
- REFERENCE `_spec.md` Part II "Core Interfaces" e `_uiux.md` "Component plan" — não duplicar aqui
- FOCUS ON "WHAT" — este arquivo descreve o que entregar, não como
- MINIMIZE CODE — o protótipo `app/prototipos/_designs/admin-redesign/ui.tsx` é referência visual, nunca copiado
- TESTS REQUIRED — `__tests__/admin-primitives.test.tsx`, `__tests__/admin-nav.test.ts`
</critical>

<requirements>
1. MUST adicionar via `npx shadcn@latest add input textarea select native-select tabs badge card checkbox` (aceitar os defaults; não editar além do necessário para compilar). Se `native-select` não existir no registro, criar `components/ui/native-select.tsx` manualmente com as classes de controle do protótipo.
2. MUST ajustar `components/ui/button.tsx`: variantes `outline` e `ghost` usam `hover:bg-bg` (e `aria-expanded:bg-bg`) em vez de `hover:bg-muted`, com comentário no topo explicando o conflito `--color-muted` (texto) vs `--muted` (shadcn). Nenhuma outra variante muda.
3. MUST criar em `app/admin/_components/`: `page-header.tsx`, `section.tsx`, `status-pill.tsx` (com `Tone`), `count-badge.tsx`, `notice.tsx`, `record-row.tsx`, `segmented-filter.tsx`, `data-grid.tsx` (`DataGrid`, `DataItem`), `empty-state.tsx`, `stat-tile.tsx`, `action-bar.tsx`, `field.tsx`, `search-input.tsx`, `inline-confirm.tsx`, `status-labels.ts` (`STATUS_LABELS`, `STATUS_TONES` para `pendente|aprovada|rejeitada`), `nav.ts` (`NAV`, `NavItem`, `isActive`). Assinaturas conforme `_spec.md` "Core Interfaces"; aparência conforme `ui.tsx`/`padroes.tsx` do protótipo, usando só tokens de `app/globals.css`.
4. MUST garantir acessibilidade: `RecordRow` com `aria-expanded`/`aria-controls`; `SegmentedFilter` com `role="group"`, `aria-label`, `aria-pressed`; `Notice` com `role="alert"` para `danger` e `role="status"` para os demais; `Field` ligando `label`, `aria-describedby`, `aria-invalid`; foco visível (`focus-visible:ring-2 focus-visible:ring-accent/40`); transições com `motion-reduce:transition-none`.
5. MUST aceitar `data-testid` e `className` nos primitivos onde `_uiux.md`/`_tests.md` exigem (`StatusPill`, `RecordRow` + `toggleTestId`/`detailTestId`, `SegmentedFilter testIdPrefix`, `Notice`, `InlineConfirm confirmTestId/cancelTestId`).
6. MUST trocar `package.json` `"lint": "next lint"` por `"lint": "eslint ."` e confirmar que `npm run lint` roda limpo.
7. MUST NOT alterar `app/globals.css` (exceto se o `shadcn add` inserir algo estritamente necessário; registrar), `app/prototipos/**`, `docs/design/**`, páginas ou actions.
8. MUST NOT incluir item "Padrões visuais" em `NAV`.
</requirements>

## Subtasks

- [ ] 1.1 Adicionar os componentes shadcn e verificar que `npm run typecheck` passa com eles.
- [ ] 1.2 Corrigir o hover de `outline`/`ghost` no `Button` e documentar.
- [ ] 1.3 Implementar os 14 primitivos compartilhados + `status-labels.ts` com a aparência do protótipo.
- [ ] 1.4 Implementar `nav.ts` com os 4 grupos, `adminOnly`, chaves de badge e `isActive`.
- [ ] 1.5 Corrigir o script `lint`.
- [ ] 1.6 Escrever `__tests__/admin-primitives.test.tsx` (UT-110–UT-124) e `__tests__/admin-nav.test.ts` (UT-001–UT-003 na parte de dados/`isActive`).
- [ ] 1.7 Rodar `npm run typecheck`, `npm run lint`, `npm test`.

## Implementation Details

Siga `_spec.md` Part II "System Architecture", "Core Interfaces", "Key Decisions" e `_uiux.md` "Component plan" e "Signal & state mapping". A referência visual é `app/prototipos/_designs/admin-redesign/ui.tsx` (cada bloco) e `screens/padroes.tsx` (vocabulário, hierarquia de botões). Ícones via `lucide-react` (já dependência). `Tabs` do shadcn é o primitivo de abas; não criar um `Tabs` próprio. Não há consumidores ainda: os primitivos podem ser verificados montando-os em testes.

### Relevant Files

- `app/prototipos/_designs/admin-redesign/ui.tsx` — aparência e aria de cada primitivo (referência).
- `app/prototipos/_designs/admin-redesign/shell.tsx:69-105` — conteúdo de `NAV` (sem "Referência").
- `app/prototipos/_designs/admin-redesign/screens/padroes.tsx` — vocabulário e hierarquia.
- `components/ui/button.tsx` — variantes a ajustar.
- `components.json`, `app/globals.css` — configuração shadcn e tokens.
- `lib/utils.ts` — `cn`.
- `__tests__/setup.ts`, `vitest.config.ts` — harness.
- `package.json` — script `lint`.

### Dependent Files

- `app/admin/**` (fases seguintes) — consumirão os primitivos.
- `__tests__/sidebar.test.tsx` — será substituído na task_02 (não tocar aqui).

## Deliverables

- Componentes shadcn adicionados em `components/ui/`.
- `components/ui/button.tsx` ajustado.
- 14 primitivos + `status-labels.ts` + `nav.ts` em `app/admin/_components/`.
- `package.json` com `lint` funcional.
- Testes unitários `admin-primitives.test.tsx` e `admin-nav.test.ts` **(REQUIRED)**; cobertura ≥ 80% dos arquivos novos.

## Tests

- Unit tests (`_tests.md`):
  - [ ] UT-110 PageHeader; UT-111 Section; UT-112 StatusPill; UT-113 Notice roles; UT-114/UT-115 RecordRow não controlado/controlado; UT-116 SegmentedFilter; UT-117 DataGrid/DataItem; UT-118 EmptyState; UT-119 StatTile; UT-120 ActionBar; UT-121 Field; UT-122 SearchInput; UT-123 InlineConfirm; UT-124 buttonVariants.
  - [ ] UT-001/UT-002 (dados de `NAV` filtrados por papel), UT-003 (`isActive`).
- Integration tests: nenhum nesta tarefa (sem actions).
- Test coverage target: ≥ 80% dos arquivos novos.
- All tests must pass: `npm test` completo verde.

## Success Criteria

- `npm run typecheck`, `npm run lint`, `npm test` passam.
- Todos os testes acima passando; cobertura ≥ 80% nos arquivos novos.
- Nenhum import de `app/prototipos/**` em código de produção.
- `git diff --stat` não toca `app/prototipos/**`, `docs/design/**`, `lib/**`, `app/admin/_actions/**`.
