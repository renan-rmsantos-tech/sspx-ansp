# Workflow Memory — admin-redesign

## Current State

- Spec e 6 tarefas criadas em 2026-10-29 pelo condutor (sessão sess-61a4ec93e123f4be). Ordem: 01 Base → 02 Shell/Início/abas/redirects → 03 Solicitações → 04 Benfeitores → 05 Pagamentos → 06 Relatórios e Configurações.
- Baseline no worktree antes da task_01: `npm run typecheck` ok; `npm test` 76 arquivos / 630 testes verdes (17 arquivos skipped); `npx eslint . --max-warnings=0` limpo. `npm run lint` quebrado (`next lint` não existe no Next 16) — task_01 corrige para `eslint .`.

## Durable Decisions

- Pagamentos é somente leitura nesta spec: não existe conferência bancária nem CSV no código (tasks 10–14 de `donor-payments-reminders` pendentes). Controles ausentes, não desabilitados.
- Início em `/admin`; `AFTER_LOGIN` passa a `/admin` (task_02).
- Botão de registro manual de boas-vindas: "Marcar como enviado". Pílula "Sem comprovante do mês" só para `admin`.
- Abas com `?aba=` via `useSearchParams` + `router.replace`; páginas server envolvem clientes em `<Suspense>`.
- `components/ui/button.tsx`: `outline`/`ghost` trocam `hover:bg-muted` por `hover:bg-bg` (conflito `--color-muted` texto vs `--muted` shadcn).
- Select nativo (`native-select`) para filtros/ordenação; shadcn `Tabs` para abas.

## Learnings

- Worktree sem `node_modules` na criação: `npm ci` já foi rodado pelo condutor. `.env` copiado do checkout principal (`DATABASE_URL` porta 5433, `AUTH_BYPASS=true`, `STORAGE_DIR=.storage`). Postgres dev (`ansp-postgres-dev`) já roda; porta 3000 livre.
- Conferência visual: `npm run dev` (predev roda migrate/bootstrap/seed) e `npx -y agent-browser@0.39.2`; protótipo em `/prototipos/admin-redesign#/<tela>`. Encerrar o dev server ao terminar.
- Testes que mockam `next/navigation`: `sidebar.test.tsx`, `solicitacoes-client.test.tsx`, `auth-actions.test.ts`; só `sidebar.test.tsx` mocka `next/link`.

## Open Risks

- shadcn `Tabs` (base-ui) em jsdom pode exigir eventos de ponteiro em vez de `click`; documentar helper no teste do primitivo (task_01) para reutilizar nas fases seguintes.
- Muitos `data-testid`/rótulos acoplados a testes: ver `_tests.md` para o que se preserva.

## Handoff Notes

- Workers deixam alterações sem commit; o condutor commita uma vez por tarefa após verificar evidência.
