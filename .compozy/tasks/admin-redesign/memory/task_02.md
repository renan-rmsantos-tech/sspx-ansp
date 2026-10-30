# Task Memory — task_02 (Shell, Início em /admin, abas e redirects)

## Objective

`AdminShell` substitui Sidebar/Topbar; `/admin` vira Início alimentado por `getAdminHomeSummary`; `/admin/emails` e `/admin/modelos` com abas `?aba=`; redirects 308 em `next.config.ts`; `AFTER_LOGIN = "/admin"`.

## Status

- Concluída em 2026-10-29 (sem commit). Verificação: `npm run typecheck` ok; `npm run lint` "No issues found"; `npm test` 82 arquivos / 684 testes verdes (17 arquivos / 75 testes skipped). Os dois testes de integração que renderizam a página de e-mails passaram com `DATABASE_URL_TEST` apontando ao Postgres dev (8/8).
- Conferência visual feita em `http://localhost:3005` (porta 3000 ocupada por outro processo node da máquina): Início, `/admin/emails?aba=lembretes`, `/admin/modelos?aba=contrato`, troca de aba atualizando a URL, menu mobile (390px) com Escape, `curl` 308 nas 6 rotas antigas.

## Decisions

- Clientes de e-mail movidos para `app/admin/emails/_clients/{welcome,monthly-instructions,reminders}.tsx`; restilizados com `Section` (cartão) + `Field`/`Input`/`Textarea`/`Notice`/`Button`; textos/rótulos asseridos nos testes preservados.
- `TemplateEditor` recebe `tipo` obrigatório (um editor por aba em `ModelosTabs`); abas internas removidas. `tab-aprovacao|rejeicao|contrato` vivem em `modelos-tabs.tsx` ("Carta de aprovação"/"Carta de rejeição"/"Contrato de concessão"). Aside "Campos disponíveis" = `TokenReference` (copia token para a área de transferência), compartilhado pelos dois editores; testids `token-item`/`contract-token-item` ficam no `li`.
- Painéis de aba inativos ficam desmontados (padrão base-ui), como `_tests.md` pressupõe. Rascunho não salvo se perde ao trocar de aba (mesmo comportamento das páginas separadas).
- `useUrlTab` (`app/admin/_components/url-tabs.ts`): estado local (troca imediata) + `router.replace(..., {scroll:false})`; segue a URL ajustando estado durante a renderização (o `react-hooks/set-state-in-effect` do ESLint proíbe `setState` em efeito). Exporta `PAGE_TABS_LIST_CLASS`/`PAGE_TABS_TRIGGER_CLASS` (estilo sublinhado por cima do `Tabs variant="line"`).
- `AdminShell`: badge `pendingWelcome` só para `admin`; há `{" "}` entre rótulo e `CountBadge` para o nome acessível ser "Solicitações 3". Bloco usuário tem `data-testid="shell-user"` (o título "Administração" se repete no header).
- `AdminHome` sem `"use client"` (server component); CTA = `Link` com `buttonVariants`. Cartões têm `data-testid="home-task-{id}"` e `{" "}` entre número e título para `toHaveTextContent("2 solicitações…")`.
- `getAdminHomeSummary`: `requireStaff` fora do try (propaga); 4 leituras em `Promise.all`; `payments` = linhas do livro da competência corrente (`saoPauloDate(new Date()).slice(0,7)`). O layout e a página Início chamam a action cada um (sem `cache()` em arquivo "use server").
- `redirects()` do `next.config.ts` rodam antes do `proxy.ts`: `curl -sI /admin/textos` sem sessão já devolve 308 (não passa pelo 307 para /login).

## Learnings

- Porta 3000 pode estar ocupada por outro app da máquina: usar `npm run dev -- -p 3005` via `compozy__terminal_exec` (o hook do Bash bloqueia processos em background) e `terminal_wait` até "Ready in".
- `npx -y agent-browser@0.39.2` funciona com um wrapper `sh` (em zsh, uma variável com o comando inteiro falha). Login pelo formulário com o bypass leva a `/admin`.
- `donor-monthly-instructions-editor.integration.test.ts` cria schema isolado só com as tabelas listadas: a página de e-mails exige também `donor_pledges`, `donor_payment_ledger`, `donor_reminder_sends` (adicionadas). Ambos os testes de integração mockam `next/navigation` (`useSearchParams` com `aba=`) para `renderToStaticMarkup(page())`.

## Touched surfaces

- Novos: `app/admin/_components/{admin-shell,admin-home,token-reference}.tsx`, `url-tabs.ts`; `app/admin/_actions/admin-home-actions.ts`; `app/admin/emails/{page,emails-tabs}.tsx` + `_clients/*`; `app/admin/modelos/{page,modelos-tabs}.tsx`; testes `admin-shell`, `admin-home`, `admin-home-actions`, `emails-tabs`, `modelos-tabs`, `admin-redirects`.
- Modificados: `app/admin/{layout,page}.tsx`, `template-editor.tsx`, `contract-template-editor.tsx`, `template-preview.tsx`, `next.config.ts`, `auth-actions.ts`, testes `auth-actions`, `template-editor`, 3 testes de cliente de e-mail (imports), 2 testes de integração.
- Apagados: `sidebar.tsx`, `topbar.tsx`, seus testes, páginas `textos`, `contrato`, `email-benfeitores`, `instrucoes-benfeitores`, `lembretes-benfeitores`.

## Follow-ups

- `/admin/pagamentos` ainda não existe (task_05): o item do menu e o CTA "Conferir pagamentos" levam a 404 até lá.
- Páginas Solicitações/Benfeitores ainda não leem `?situacao=`/`?boas-vindas=` (tasks 03/04); os links do Início já os enviam.
- Troca de aba via `router.replace` refaz o fetch RSC da página (dinâmica): aceitável; se incomodar, avaliar `window.history.replaceState` (fora do contrato UT-081).
- `revalidatePath` das actions de e-mail continua apontando às rotas antigas (por decisão da spec); os dados vêm frescos por a página ser dinâmica.
- Rótulos dos campos em Modelos seguem os existentes (Cabeçalho/Corpo/Rodapé) e não os do protótipo (Abertura/Corpo do texto/Encerramento); prévia ao vivo mantida no lugar de "Ver PDF de exemplo".
