# Workflow Memory — admin-redesign

## Current State

- Spec e 6 tarefas criadas em 2026-10-29 pelo condutor (sessão sess-61a4ec93e123f4be). Ordem: 01 Base → 02 Shell/Início/abas/redirects → 03 Solicitações → 04 Benfeitores → 05 Pagamentos → 06 Relatórios e Configurações.
- task_01 concluída em 2026-10-29 (sem commit): shadcn add, primitivos, `nav.ts`, Button hover, `lint` → `eslint .`. Baseline após task_01: `npm run typecheck` ok; `npm run lint` limpo; `npm test` 78 arquivos / 662 testes verdes (17 arquivos skipped).
- task_02 concluída em 2026-10-29 (sem commit): `AdminShell`, Início em `/admin`, `getAdminHomeSummary`, `/admin/emails` e `/admin/modelos` com abas, redirects, `AFTER_LOGIN = "/admin"`. Baseline após task_02: typecheck ok; lint limpo; `npm test` 82 arquivos / 684 testes verdes (17 skipped).

## Durable Decisions

- Pagamentos é somente leitura nesta spec: não existe conferência bancária nem CSV no código (tasks 10–14 de `donor-payments-reminders` pendentes). Controles ausentes, não desabilitados.
- Início em `/admin`; `AFTER_LOGIN` passa a `/admin` (task_02).
- Botão de registro manual de boas-vindas: "Marcar como enviado". Pílula "Sem comprovante do mês" só para `admin`.
- Abas com `?aba=` via `useSearchParams` + `router.replace`; páginas server envolvem clientes em `<Suspense>`.
- `components/ui/button.tsx`: `outline`/`ghost` trocam `hover:bg-muted` por `hover:bg-bg` (conflito `--color-muted` texto vs `--muted` shadcn).
- Select nativo (`native-select`) para filtros/ordenação; shadcn `Tabs` para abas.
- Primitivos em `app/admin/_components/`: `status-pill.tsx` exporta `Tone`, `WARN_TEXT_CLASS`, `TONE_DOT_CLASS`; `nav.ts` exporta `NAV`, `NavItem`, `NavGroup`, `navForRole(role)` (filtra `adminOnly` e grupos vazios) e `isActive`; `status-labels.ts` exporta `STATUS_LABELS`/`STATUS_TONES`/`ApplicationStatus`. `Field` aceita `id` fixo; `SearchInput`, `StatusPill`, `Notice`, `RecordRow`, `InlineConfirm`, `StatTile`, `DataItem` aceitam `data-testid`.
- Só `record-row`, `segmented-filter`, `search-input` e `inline-confirm` são `"use client"`; os demais primitivos podem ser renderizados por páginas server.
- Abas de página: `useUrlTab(basePath, tabs, fallback)` + `PAGE_TABS_LIST_CLASS`/`PAGE_TABS_TRIGGER_CLASS` em `app/admin/_components/url-tabs.ts` (usados por `/admin/emails` e `/admin/modelos`); páginas server envolvem o cliente em `<Suspense>`. Painéis inativos desmontam.
- `Section` aceita `className` e serve de cartão (`rounded-lg border border-border bg-surface p-5`) com `h2` + região nomeada; `TokenReference` (`_components/token-reference.tsx`) é o aside "Campos disponíveis".
- O Início e o layout chamam `getAdminHomeSummary()` separadamente; CTAs do Início já enviam `?situacao=pendente` e `?boas-vindas=pendentes` (tasks 03/04 devem lê-los) e `/admin/pagamentos` (task_05).

## Learnings

- Worktree sem `node_modules` na criação: `npm ci` já foi rodado pelo condutor. `.env` copiado do checkout principal (`DATABASE_URL` porta 5433, `AUTH_BYPASS=true`, `STORAGE_DIR=.storage`). Postgres dev (`ansp-postgres-dev`) já roda; porta 3000 livre.
- Conferência visual: `npm run dev` (predev roda migrate/bootstrap/seed) e `npx -y agent-browser@0.39.2`; protótipo em `/prototipos/admin-redesign#/<tela>`. Encerrar o dev server ao terminar.
- Testes que mockam `next/navigation`: `sidebar.test.tsx`, `solicitacoes-client.test.tsx`, `auth-actions.test.ts`; só `sidebar.test.tsx` mocka `next/link`.
- `npx shadcn@latest add ...` (shadcn 4.11, base-nova) escreve `import { cn } from "cn"` e instala um pacote npm `cn` alheio ao projeto: se rodar a CLI de novo, trocar para `@/lib/utils` e `npm uninstall cn`.
- shadcn `Card` (`rounded-xl ring-1 py-4`) e `NativeSelect` (`w-fit h-8`) diferem do protótipo (`rounded-lg border p-5`; selects de 40px e largura total): ajustar por `className` ao consumir.
- Nome acessível dos botões do `SegmentedFilter` é "Rótulo N" (há espaço entre rótulo e contagem), como `_tests.md` UT-030 espera. Mesmo truque (`{" "}`) nos links do menu com `CountBadge`.
- Porta 3000 pode estar ocupada por outro app local: `npm run dev -- -p 3005` via `compozy__terminal_exec` (o hook bloqueia Bash em background) e `npx -y agent-browser@0.39.2` por um wrapper `sh`. `redirects()` do `next.config.ts` rodam antes do `proxy.ts` (308 mesmo sem sessão).
- ESLint `react-hooks/set-state-in-effect` proíbe `setState` dentro de `useEffect`: sincronizar props/URL com estado ajustando durante a renderização.
- Testes de integração com `DATABASE_URL_TEST=postgres://ansp:ansp@127.0.0.1:5433/ansp` rodam contra o Postgres dev em schemas isolados (apagados ao final).

## Open Risks

- Resolvido na task_01: shadcn `Tabs` (base-ui) em jsdom troca de aba com `fireEvent.click` no trigger, controlado via `value`/`onValueChange` (padrão em `__tests__/admin-primitives.test.tsx`, describe "shadcn Tabs (base-ui) no jsdom").
- Muitos `data-testid`/rótulos acoplados a testes: ver `_tests.md` para o que se preserva.

## Handoff Notes

- Workers deixam alterações sem commit; o condutor commita uma vez por tarefa após verificar evidência.
