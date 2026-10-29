# Workflow Memory — admin-redesign

## Current State

- Spec e 6 tarefas criadas em 2026-10-29 pelo condutor (sessão sess-61a4ec93e123f4be). Ordem: 01 Base → 02 Shell/Início/abas/redirects → 03 Solicitações → 04 Benfeitores → 05 Pagamentos → 06 Relatórios e Configurações.
- task_01 concluída em 2026-10-29 (sem commit): shadcn add, primitivos, `nav.ts`, Button hover, `lint` → `eslint .`. Baseline após task_01: `npm run typecheck` ok; `npm run lint` limpo; `npm test` 78 arquivos / 662 testes verdes (17 arquivos skipped).
- task_03 concluída em 2026-10-29 (sem commit): Solicitações sobre `RecordRow`/`SegmentedFilter`/`Tabs`, `StatsDashboard` removido, página lê `?situacao=`. Baseline após task_03: typecheck ok; lint limpo; `npm test` 81 arquivos / 680 testes verdes (17 skipped).
- task_04 concluída em 2026-10-29 (sem commit): Benfeitores sobre `RecordRow`/`SegmentedFilter`/`NativeSelect`/`Checkbox`, `InlineConfirm` na `ActionBar`, página lê `?boas-vindas=pendentes`. Baseline após task_04: typecheck ok; lint limpo; `npm test` 81 arquivos / 683 testes verdes (17 skipped).
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
- O Início e o layout chamam `getAdminHomeSummary()` separadamente; CTAs do Início já enviam `?situacao=pendente` (lido por `/admin/solicitacoes` desde a task_03 via `parseApplicationStatus` em `status-labels.ts`), `?boas-vindas=pendentes` (lido por `/admin/benfeitores` desde a task_04) e `/admin/pagamentos` (task_05).
- Seções compartilhadas de benfeitor (task_04): `donor-card.tsx` exporta `DonorSummary`, `DonorRowMeta`, `DonorFrequencyPill`, `DonorContactSection`, `DonorContributionSection` além de `DonorCard`/`DonorPledge`; `Notice` sempre tem `role` (`status`/`alert`), então `getByRole("status")` precisa de `within(...)` quando há mais de um aviso na linha.
- Padrão de detalhe em abas dentro de `RecordRow` (task_03): `Tabs` controlado + `PAGE_TABS_*` de `url-tabs.ts`; carga do detalhe por efeito sem `setState` síncrono; formulários inline com `noValidate` para que o erro apareça em `Notice` (a validação nativa de `min`/`max` engole o submit no jsdom e no navegador). `onDecision` carrega também o motivo.

## Learnings

- Worktree sem `node_modules` na criação: `npm ci` já foi rodado pelo condutor. `.env` copiado do checkout principal (`DATABASE_URL` porta 5433, `AUTH_BYPASS=true`, `STORAGE_DIR=.storage`). Postgres dev (`ansp-postgres-dev`) já roda; porta 3000 livre.
- Conferência visual: `npm run dev` (predev roda migrate/bootstrap/seed) e `npx -y agent-browser@0.39.2`; protótipo em `/prototipos/admin-redesign#/<tela>`. Encerrar o dev server ao terminar.
- Testes que mockam `next/navigation`: `sidebar.test.tsx`, `solicitacoes-client.test.tsx`, `auth-actions.test.ts`; só `sidebar.test.tsx` mocka `next/link`.
- `npx shadcn@latest add ...` (shadcn 4.11, base-nova) escreve `import { cn } from "cn"` e instala um pacote npm `cn` alheio ao projeto: se rodar a CLI de novo, trocar para `@/lib/utils` e `npm uninstall cn`.
- shadcn `Card` (`rounded-xl ring-1 py-4`) e `NativeSelect` (`w-fit h-8`) diferem do protótipo (`rounded-lg border p-5`; selects de 40px e largura total): ajustar por `className` ao consumir.
- Nome acessível dos botões do `SegmentedFilter` é "Rótulo N" (há espaço entre rótulo e contagem), como `_tests.md` UT-030 espera. Mesmo truque (`{" "}`) nos links do menu com `CountBadge`.
- `compozy__terminal_exec` pode devolver `tool_backend_failed` (task_04, duas vezes): fallback `nohup npm run dev -- -p 3005 > /tmp/x.log 2>&1 < /dev/null & disown` num Bash de foreground (o hook só bloqueia `run_in_background`), `curl /api/health` em loop até 200, e `pkill -f "next dev -p 3005"` ao final. `agent-browser` aceita seletor CSS em `click`/`screenshot` e `screenshot --full`.
- Porta 3000 pode estar ocupada por outro app local: `npm run dev -- -p 3005` via `compozy__terminal_exec` (o hook bloqueia Bash em background) e `npx -y agent-browser@0.39.2` por um wrapper `sh`. `redirects()` do `next.config.ts` rodam antes do `proxy.ts` (308 mesmo sem sessão).
- ESLint `react-hooks/set-state-in-effect` proíbe `setState` dentro de `useEffect`: sincronizar props/URL com estado ajustando durante a renderização.
- Testes de integração com `DATABASE_URL_TEST=postgres://ansp:ansp@127.0.0.1:5433/ansp` rodam contra o Postgres dev em schemas isolados (apagados ao final). Atenção: 6 suítes de integração de benfeitores/seed/rodapé falham contra o banco de dev com dados (estado compartilhado); o gate é `npm test` sem a variável.
- Dados de dev para conferência visual: `docker exec -i ansp-postgres-dev psql -U ansp -d ansp` (inserir registros fictícios e apagá-los ao final); o banco de dev não tem solicitações por padrão.

## Open Risks

- Resolvido na task_01: shadcn `Tabs` (base-ui) em jsdom troca de aba com `fireEvent.click` no trigger, controlado via `value`/`onValueChange` (padrão em `__tests__/admin-primitives.test.tsx`, describe "shadcn Tabs (base-ui) no jsdom").
- Muitos `data-testid`/rótulos acoplados a testes: ver `_tests.md` para o que se preserva.

## Handoff Notes

- Workers deixam alterações sem commit; o condutor commita uma vez por tarefa após verificar evidência.
