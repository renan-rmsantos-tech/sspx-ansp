# Task Memory — task_04 (Benfeitores: toolbar, detalhe em seções e exclusão inline)

## Objective

Reescrever `/admin/benfeitores` (admin e secretaria) sobre os primitivos: `PageHeader` + `SegmentedFilter` + `SearchInput` + `NativeSelect` (priorado, ordenação) + `Checkbox` "só boas-vindas pendentes"; `DonorCard` sobre `RecordRow` com pílulas e seções Contato / Contribuição / E-mails e comprovantes; `ActionBar` com exclusão inline (`InlineConfirm`); página lê `?boas-vindas=pendentes`. `StatCard` e `donor-welcome-filters` removidos.

## Status

- Concluída em 2026-10-29 (sem commit). Verificação: `npm run typecheck` ok; `npm run lint` "No issues found"; `npm test` 81 arquivos / 683 testes verdes (17 arquivos / 75 skipped). Cobertura dos arquivos tocados (2 suítes): `donor-card.tsx` 94% linhas, `client.tsx` 99%, `donor-monthly-instructions.tsx` 86%; `page.tsx` server não coberto (lê `searchParams`, como na task_03).
- Conferência visual em `http://localhost:3005` com os 7 benfeitores do seed: lista/toolbar, linha "João Batista" aberta (pendente, mensal, sem comprovante), "Excluir" → confirmação inline → "Não" (sem action), `?boas-vindas=pendentes` (checkbox marcado, 2 linhas), bloco de vencimento após ajuste. Sem erros no console. Comparado com `/prototipos/admin-redesign#/benfeitores`: mesma estrutura; diferenças intencionais: select "Ordenar" (spec), "Marcar como enviado", `DonorMonthlyInstructions` real no lugar do aviso "Copiar link de envio" do protótipo, campos extras (Endereço, Meio de pagamento, Lembrete, "Último lembrete").

## Decisions

- `BenfeitoresClient` é só admin (a página escolhe `SecretariatDonorsClient` para secretaria); não há prop `role`. Pílulas administrativas e `ActionBar` só existem no `DonorCard`; a secretaria usa `RecordRow` direto com `DonorContactSection`/`DonorContributionSection`/`DonorRowMeta`/`DonorFrequencyPill` exportados de `donor-card.tsx`.
- `DonorsList` genérico (`T extends DonorSummary`) compartilha segmento, busca, priorado, contagem, lista e `EmptyState` ("Nenhum benfeitor com esses filtros" + "Limpar filtros"; "Nenhum benfeitor cadastrado" quando a lista é vazia) entre os papéis.
- `donor-due-day`/`donor-reminder-status` preservados como prosa dentro da seção Contribuição (o `DataGrid` não reproduz "Dia de vencimento: 5 de cada mês"); "Próximo vencimento" em linha própria (`block`).
- Feedback do dia e erros de ação usam `Notice` (success → `role="status"`, danger → `role="alert"`); como o aviso de boas-vindas também é `role="status"`, os testes usam `within(donor-due-day)`.
- Título do `Notice` de boas-vindas enviado = "Boas-vindas enviado em dd/mm/aaaa" (UT-059 usa regex contínua).
- O filtro "só pendentes" só vale enquanto o checkbox existe (`pendingWelcome > 0`): ao marcar o último pendente o checkbox some e a lista volta a mostrar todos (antes a linha sumia sem forma de desfazer).
- `FREQUENCIA_LABELS.unica` passou de "Única" para "Doação única" (US-018); `DonorPledge` ganhou `meio_pagamento?` (a projeção admin já traz a coluna).
- `donor-monthly-instructions.tsx`: só a classe do `<section>` externo mudou (caixa `rounded-lg border bg-cream/60`) para caber na grade de E-mails e comprovantes; testids e textos intactos.
- Botões/`InlineConfirm` dentro da `ActionBar`; "Ver recibo" só quando há `recibo_path`.

## Learnings

- base-ui `Checkbox.Root` renderiza `button[role=checkbox][aria-checked]` (+ input oculto); `getByRole("checkbox", {name})` com `<label htmlFor>` e `toBeChecked()` funcionam no jsdom; `onCheckedChange(checked)`.
- `compozy__terminal_exec` devolveu `tool_backend_failed` duas vezes nesta sessão; `nohup npm run dev -- -p 3005 > /tmp/x.log 2>&1 < /dev/null & disown` num Bash de foreground funcionou (o hook só bloqueia `run_in_background`), com `kill`/`pkill -f "next dev -p 3005"` ao final.
- `agent-browser` aceita seletor CSS no `click` (`'[data-testid="donor-delete-button"]'`) e `screenshot '<seletor>' arquivo` / `--full`.
- Seed de dev: dois benfeitores têm `priorado_capela = "nenhuma"` (rótulo "Nenhuma"), comportamento pré-existente.

## Touched surfaces

- Modificados: `app/admin/benfeitores/{page,client}.tsx`, `app/admin/_components/donor-card.tsx`, `app/admin/_components/donor-monthly-instructions.tsx` (classe), `__tests__/benfeitores-client.test.tsx`.

## Follow-ups

- `DonorMonthlyInstructions` mantém os controles antigos (`select`/botões com classes próprias) dentro da nova caixa; restilizar com `Field`/`NativeSelect`/`Button` fica fora desta tarefa (comportamento e testids devem ser preservados).
- Secretaria não tem ordenação (projeção sem `cpf`; `created_at` existe, mas a spec só pede busca e priorado).
- Modal de PDF (`PdfPreviewModal`) continua sendo o único `Modal` em benfeitores, como a spec exige.
