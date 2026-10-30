# Task Memory — task_05 (Pagamentos: leitura do livro mensal)

## Objective

Criar `/admin/pagamentos` (admin) como leitura do `donor_payment_ledger` por competência: `getMonthlyPayments(month)` nova, página server lendo `?mes=`, `PagamentosClient` com 3 `StatTile`, `RecordRow`s e `Notice` explicando a ausência da conferência bancária.

## Status

- Concluída em 2026-10-29 (sem commit). Verificação: `npm run typecheck` ok; `npm run lint` "No issues found"; `npm test` 84 arquivos / 702 testes verdes (17 arquivos / 75 skipped). Cobertura das 2 suítes principais: `donor-payment-actions.ts` 100% linhas, `client.tsx` 100%; `page.tsx` coberta por `pagamentos-page.test.tsx` (chama o server component e inspeciona as props do elemento devolvido).
- Conferência visual em `http://localhost:3005` (admin bypass; ledger de outubro materializado ao abrir `/admin/benfeitores`): `/admin/pagamentos` com 2 linhas do seed (R$ 1.500,00 esperado, nenhum comprovante), `?mes=2026-09` (vazio), `?mes=2026-13` (aviso + mês corrente), `?mes=` (mês corrente sem aviso). Sem erros no console. Comparado com `/prototipos/admin-redesign#/pagamentos`.
- Ausências deliberadas em relação ao protótipo (decisão de escopo): "Baixar CSV" (no lugar, botão "Ver mês" do formulário GET), totais "Recebido no extrato"/"Em aberto" (no lugar, "Com comprovante"/"Sem comprovante"), formulário "Valor encontrado no extrato"/"Data do crédito"/"Observação", botões "Confirmar crédito"/"Não encontrei no extrato", pílulas "Confirmado no extrato"/"Não identificado", seção "Pendências de meses anteriores", linhas "Doação única" (o livro só tem mensais).
- Não verificado visualmente com dados reais: botão "Ver comprovante" (nenhum comprovante no banco de dev; dados não alterados). Coberto por UT-074 e pelo teste de erro do `getDocumentUrl`.

## Decisions

- Join `ledger` + `pledges.nome` em duas consultas relacionais (`donorPaymentLedger.findMany` + `donorPledges.findMany` com `inArray`) e junção em memória: `donorPaymentLedger` não tem `relations()` no schema e `lib/**` é intocável; linha sem pledge é omitida (IT-002). `inArray` com lista vazia lança no Drizzle, então a segunda consulta só roda com ids.
- Ordenação por `due_date` feita também em JS (`localeCompare`, desempate por nome) para o fake-db devolver ordem estável; o cliente reordena "sem comprovante primeiro".
- `Notice` informativo fica no detalhe de cada linha (AC-4), onde o protótipo tinha o formulário de confirmação; `ActionBar` com "Ver comprovante" (`outline sm`) e `receipt_name` como nota, só quando há comprovante.
- `?mes=` vazio = ausente (sem aviso); só valor não vazio e inválido liga `invalidMonth`. Array em `?mes=` usa o primeiro valor.
- `competenciaLabel` reaproveitada de `admin-home.tsx`; `hasMonthlyReceipt` reimplementada localmente no cliente (ver Learnings).
- Primeira linha da lista ordenada abre por padrão, como no protótipo.

## Learnings

- `lib/donor-payment-ledger.ts` importa `db`: não pode ser importado por componentes `"use client"` (o teste jsdom quebra com "DATABASE_URL environment variable is not set" e o bundle do navegador puxaria o Postgres). Funções puras desse módulo precisam ser duplicadas no cliente.
- Testar um server component de página: `await Page({ searchParams: Promise.resolve({...}) })` e assertar `element.type`/`element.props`; é preciso mockar `admin-actions` também, porque o cliente importa `getDocumentUrl`.
- `agent-browser fill` num `input type="month"` do Chromium limpa o valor (submit vai como `?mes=`); usar `eval` com `input.value = 'AAAA-MM'; input.form.requestSubmit()`.
- O ledger do mês corrente só existe depois que um admin abre `/admin/benfeitores` (materialização); meses anteriores ao lançamento ficam vazios.

## Touched surfaces

- Novos: `app/admin/_actions/donor-payment-actions.ts`, `app/admin/pagamentos/{page,client}.tsx`, `__tests__/donor-payment-actions.test.ts`, `__tests__/pagamentos-client.test.tsx`, `__tests__/pagamentos-page.test.tsx`.

## Follow-ups

- Conferência bancária e CSV: tasks 10–14 da spec `donor-payments-reminders`; quando existirem, trocar o `Notice` do detalhe pelo formulário e os totais por Recebido/Em aberto.
- O campo "Mês" não tem `max` (o protótipo limita ao mês corrente): o livro já materializa o mês seguinte, então meses futuros são consulta válida.
