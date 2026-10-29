# Task Memory — task_06 (Relatórios e Configurações no novo padrão)

## Objective

Levar `/admin/ano-letivo`, `/admin/usuarios`, `/admin/cabecalho` e `/admin/relatorios` para `PageHeader` + `Card` + `Section` + `StatusPill` + `Field`/`Input` + `Notice`, com `InlineConfirm` no lugar do `Modal` em ano letivo. Actions, `lib/**`, `document-*-preview.tsx` e `reports-charts.tsx` intocados.

## Status

- Concluída em 2026-10-29 (sem commit). Verificação: `npm run typecheck` ok; `npm run lint` "No issues found"; `npm test` 86 arquivos / 716 testes verdes (17 arquivos / 75 skipped). Cobertura das suítes tocadas: `school-year-form.tsx` 86% linhas, `school-year-list.tsx` 100%, `usuarios/client.tsx` 100%, `cabecalho/client.tsx` 100%, `reports-client.tsx` 96%; `page.tsx` server não cobertos (como nas tasks 03–05).
- Conferência visual em `http://localhost:3005` (login pelo formulário com `admin@admin.com`/`admin123`, bypass): `/admin/ano-letivo` (lista com 1 ano ativo; "Novo ano letivo" revela o `Card` com o formulário e "Cancelar" o esconde; "Desativar" → confirmação inline "Desativar este ano letivo?" com "Sim, desativar"/"Não" → "Não" sem action), `/admin/usuarios` (vazio: `EmptyState` + `Notice`), `/admin/cabecalho` (formulário + "Como fica no documento"), `/admin/relatorios` (filtros em `Card`, duas séries em `Section`). Sem erros no console. Comparado com `/prototipos/admin-redesign#/ano-letivo|usuarios|cabecalho|relatorios`.
- Não exercitado no navegador: "Excluir" (o banco de dev só tem o ano ativo e não se cria/apaga dados; o mesmo `InlineConfirm` foi visto no "Desativar" e UT-091 cobre o fluxo) e lista de usuários com registros (sem acessos de secretaria no dev; coberto por `usuarios-client.test.tsx`).

## Decisions

- `modal.tsx` permanece: `document-preview.tsx` e `pdf-preview-modal.tsx` ainda o usam (visualização de PDF). Só a confirmação de ano letivo deixa de usá-lo.
- Confirmação inline em ano letivo numa `<tr>` extra (`colSpan=4`) logo abaixo da linha, `data-testid="confirm-dialog"` no `InlineConfirm`; botões da tabela ficam `disabled` enquanto há confirmação pendente.
- Linha ativa só tem "Desativar"; "Tornar ativo" e "Excluir" só nas encerradas (US-016 AC-1). "Ativar" virou "Tornar ativo"; "Inativo" virou "Encerrado" (ano letivo) — `usuarios` mantém "Ativo"/"Inativo".
- `SchoolYearForm` ganhou `onCancel?` (botão "Cancelar" só quando passado) e `noValidate`; `AnoLetivoClient` fecha o formulário após criar/cancelar e esconde a ação do `PageHeader` enquanto o formulário está aberto (como o protótipo).
- `PageHeader` passou para dentro dos clientes (ano letivo precisa da ação com estado); as quatro `page.tsx` só renderizam o cliente.
- Usuários: formulário real (`<form noValidate>` + submit) com dois erros separados: `formError` (`Notice danger` dentro do `Card` "Novo acesso") e `listError` (abaixo da lista). `data-testid="user-row-{id}"` por linha; "Criado em dd/mm/aaaa" só quando a data é válida.
- Cabeçalho: `Checkbox` (base-ui) com `id`/`data-testid="header-mostrar-selo"`; `Field` com `id` fixo (`header-linha1..3`, `institutional-footer`) para `getByLabelText`; a dica do rodapé vem do `Field` (`hint={FOOTER_HELP}`, `aria-describedby` automático; o antigo `#footer-help` deixou de existir); "Restaurar rodapé padrão" é `Button outline sm`; `header-saved`/`header-error` são `Notice` (role `status`/`alert`).
- Relatórios: `ReportSeries` = `Section` + `Card`; "População selecionada" vive dentro do `Card` de filtros, separada por borda; opção "Única" renomeada para "Doação única" (US-018); descrição do `PageHeader` reaproveita o texto antigo da página.
- Classes de `Card` shadcn ajustadas por `className` como nas tasks anteriores: `gap-4 rounded-lg border border-border bg-surface p-5 ring-0` (com padding) e `gap-0 ... py-0 ring-0` (tabela/lista encostadas).

## Learnings

- `agent-browser` 0.39.2: `click 'text=…'` não achou o botão do `PageHeader` (texto com ícone); `click 'main header button'` e seletores `[data-testid=…]` funcionam; `snapshot -i` lista refs. Com `AUTH_BYPASS=true` ainda é preciso passar pelo `/login` (preencher e enviar) antes de abrir `/admin/*` no navegador de teste.
- `npx -y agent-browser@… --session X` numa variável zsh não faz word-split: usar um wrapper `sh` (`/tmp/ansp-t06/ab.sh`).
- O aviso "Not implemented: navigation to another Document" do `npm test` vem de suíte alheia (não aparece nas suítes desta tarefa).

## Touched surfaces

- Modificados: `app/admin/_components/{school-year-form,school-year-list}.tsx`, `app/admin/ano-letivo/{client,page}.tsx`, `app/admin/usuarios/{client,page}.tsx`, `app/admin/cabecalho/{client,page}.tsx`, `app/admin/relatorios/{reports-client,page}.tsx`, `__tests__/school-year.test.tsx`.
- Novos: `__tests__/usuarios-client.test.tsx`, `__tests__/cabecalho-client.test.tsx`.

## Follow-ups

- Seletor "Relatório" e "Baixar PDF" do protótipo de Relatórios não existem no produto (sem action correspondente); fora desta spec.
- `modal.tsx` só poderá ser apagado quando a visualização de PDF (`document-preview.tsx`/`pdf-preview-modal.tsx`) migrar para outro primitivo.
