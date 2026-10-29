# Task Memory — task_01 (Base: shadcn, primitivos, tooling)

## Objective

Fundação do redesenho: shadcn add (input, textarea, select, native-select, tabs, badge, card, checkbox), hover fix no Button, 14 primitivos + `status-labels.ts` + `nav.ts` em `app/admin/_components/`, script `lint` → `eslint .`, testes `admin-primitives.test.tsx` e `admin-nav.test.ts`. Nenhuma página muda.

## Status

- Concluída em 2026-10-29. Verificação: `npm run typecheck` ok; `npm run lint` "No issues found"; `npm test` 78 arquivos / 662 testes verdes (17 arquivos / 75 testes skipped, como antes). Cobertura dos arquivos novos: 100% stmts/lines, 97.8% branches.
- Alterações deixadas sem commit (condutor commita).

## Decisions

- `"use client"` só nos primitivos com estado/handlers (`record-row`, `segmented-filter`, `search-input`, `inline-confirm`). Os demais (inclusive `Section`/`Field`, que usam `useId`) ficam sem diretiva para poderem ser usados em páginas server com render prop/slots.
- `status-pill.tsx` exporta `WARN_TEXT_CLASS` (texto warn escurecido, constante local) e `TONE_DOT_CLASS`, reutilizados por `CountBadge`, `Notice`, `SegmentedFilter`, `StatTile`.
- `nav.ts` ganhou `navForRole(role)` além de `NAV`/`isActive`: filtra `adminOnly` e remove grupos vazios (UT-002). `isActive` casa por segmento (`href + "/"`), não por prefixo de string.
- `Field` aceita `id` opcional para fixar o id do controle (ex.: `institutional-footer` em S13). Mensagem de dica/erro usa um único id `${id}-message`; erro substitui a dica.
- `SearchInput` compõe o `Input` do shadcn (`type="search"`, `h-10 bg-surface pl-9`); `data-testid` vai para o input.
- `SegmentedFilter` insere `{" "}` entre rótulo e contagem para o nome acessível ser "Todas 4" (UT-030 exige isso).
- `RecordRow`: `aria-controls` só quando aberto (painel não renderizado fechado); controlado quando `open !== undefined`; `onOpenChange` também dispara no modo não controlado.
- `InlineConfirm`: container `role="group"` com `aria-label={question}`; `pending` desabilita confirmar e cancelar; `cancelLabel` padrão "Não".
- `button.tsx`: além de `hover:bg-muted`→`hover:bg-bg` e `aria-expanded:bg-muted`→`aria-expanded:bg-bg`, o `dark:hover:bg-muted/50` do `ghost` virou `dark:hover:bg-bg/50` para que a string "hover:bg-muted" não apareça (UT-124).

## Learnings

- `npx shadcn@latest add` (shadcn 4.11, estilo base-nova) escreveu `import { cn } from "cn"` nos 8 arquivos e instalou um pacote npm `cn@0.5.0` sem relação com o projeto. Corrigido para `@/lib/utils` e `npm uninstall cn`; `package.json`/lockfile voltaram ao baseline (só o script `lint` mudou).
- `globals.css` não foi tocado pela CLI.
- shadcn `Tabs` (base-ui) no jsdom funciona com `fireEvent.click` no trigger, controlado via `value`/`onValueChange` (padrão documentado em `admin-primitives.test.tsx`, describe "shadcn Tabs (base-ui) no jsdom").
- `npm run lint` com `eslint .` roda limpo (~sem warnings).

## Touched surfaces

- Novos: `components/ui/{input,textarea,select,native-select,tabs,badge,card,checkbox}.tsx`; `app/admin/_components/{page-header,section,status-pill,count-badge,notice,record-row,segmented-filter,data-grid,empty-state,stat-tile,action-bar,field,search-input,inline-confirm}.tsx`, `status-labels.ts`, `nav.ts`; `__tests__/admin-primitives.test.tsx`, `__tests__/admin-nav.test.ts`.
- Modificados: `components/ui/button.tsx`, `package.json` (script `lint`).

## Follow-ups

- `Card` do shadcn (`rounded-xl ring-1 ring-foreground/10 py-4`) difere do `Card` do protótipo (`rounded-lg border border-border bg-surface p-5`): nas fases seguintes, passar `className` para aproximar ou decidir pelo visual shadcn.
- `CountBadge` não traz `ml-auto` (o protótipo trazia); o `AdminShell` (task_02) posiciona o badge.
- `NativeSelect` do shadcn tem `w-fit` no wrapper e `h-8`; filtros/ordenação do protótipo usam 40px e largura total — ajustar via `className` ao consumir.
