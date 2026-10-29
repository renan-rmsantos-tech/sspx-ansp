# Workflow Memory — admin-redesign

## Current State

- Spec e 6 tarefas criadas em 2026-10-29 pelo condutor (sessão sess-61a4ec93e123f4be). Ordem: 01 Base → 02 Shell/Início/abas/redirects → 03 Solicitações → 04 Benfeitores → 05 Pagamentos → 06 Relatórios e Configurações.
- task_01 concluída em 2026-10-29 (sem commit): shadcn add, primitivos, `nav.ts`, Button hover, `lint` → `eslint .`. Baseline após task_01: `npm run typecheck` ok; `npm run lint` limpo; `npm test` 78 arquivos / 662 testes verdes (17 arquivos skipped).

## Durable Decisions

- Pagamentos é somente leitura nesta spec: não existe conferência bancária nem CSV no código (tasks 10–14 de `donor-payments-reminders` pendentes). Controles ausentes, não desabilitados.
- Início em `/admin`; `AFTER_LOGIN` passa a `/admin` (task_02).
- Botão de registro manual de boas-vindas: "Marcar como enviado". Pílula "Sem comprovante do mês" só para `admin`.
- Abas com `?aba=` via `useSearchParams` + `router.replace`; páginas server envolvem clientes em `<Suspense>`.
- `components/ui/button.tsx`: `outline`/`ghost` trocam `hover:bg-muted` por `hover:bg-bg` (conflito `--color-muted` texto vs `--muted` shadcn).
- Select nativo (`native-select`) para filtros/ordenação; shadcn `Tabs` para abas.
- Primitivos em `app/admin/_components/`: `status-pill.tsx` exporta `Tone`, `WARN_TEXT_CLASS`, `TONE_DOT_CLASS`; `nav.ts` exporta `NAV`, `NavItem`, `NavGroup`, `navForRole(role)` (filtra `adminOnly` e grupos vazios) e `isActive`; `status-labels.ts` exporta `STATUS_LABELS`/`STATUS_TONES`/`ApplicationStatus`. `Field` aceita `id` fixo; `SearchInput`, `StatusPill`, `Notice`, `RecordRow`, `InlineConfirm`, `StatTile`, `DataItem` aceitam `data-testid`.
- Só `record-row`, `segmented-filter`, `search-input` e `inline-confirm` são `"use client"`; os demais primitivos podem ser renderizados por páginas server.

## Learnings

- Worktree sem `node_modules` na criação: `npm ci` já foi rodado pelo condutor. `.env` copiado do checkout principal (`DATABASE_URL` porta 5433, `AUTH_BYPASS=true`, `STORAGE_DIR=.storage`). Postgres dev (`ansp-postgres-dev`) já roda; porta 3000 livre.
- Conferência visual: `npm run dev` (predev roda migrate/bootstrap/seed) e `npx -y agent-browser@0.39.2`; protótipo em `/prototipos/admin-redesign#/<tela>`. Encerrar o dev server ao terminar.
- Testes que mockam `next/navigation`: `sidebar.test.tsx`, `solicitacoes-client.test.tsx`, `auth-actions.test.ts`; só `sidebar.test.tsx` mocka `next/link`.
- `npx shadcn@latest add ...` (shadcn 4.11, base-nova) escreve `import { cn } from "cn"` e instala um pacote npm `cn` alheio ao projeto: se rodar a CLI de novo, trocar para `@/lib/utils` e `npm uninstall cn`.
- shadcn `Card` (`rounded-xl ring-1 py-4`) e `NativeSelect` (`w-fit h-8`) diferem do protótipo (`rounded-lg border p-5`; selects de 40px e largura total): ajustar por `className` ao consumir.
- Nome acessível dos botões do `SegmentedFilter` é "Rótulo N" (há espaço entre rótulo e contagem), como `_tests.md` UT-030 espera.

## Open Risks

- Resolvido na task_01: shadcn `Tabs` (base-ui) em jsdom troca de aba com `fireEvent.click` no trigger, controlado via `value`/`onValueChange` (padrão em `__tests__/admin-primitives.test.tsx`, describe "shadcn Tabs (base-ui) no jsdom").
- Muitos `data-testid`/rótulos acoplados a testes: ver `_tests.md` para o que se preserva.

## Handoff Notes

- Workers deixam alterações sem commit; o condutor commita uma vez por tarefa após verificar evidência.
