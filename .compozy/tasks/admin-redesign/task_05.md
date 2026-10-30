---
status: completed
title: "Pagamentos: leitura do livro mensal"
type: frontend
complexity: medium
dependencies:
  - task_02
---

# Task 5: Pagamentos: leitura do livro mensal

## Overview

Cria `/admin/pagamentos` (admin) como leitura do livro `donor_payment_ledger` por mês: seletor de mês, três totais, lista de pagamentos esperados com estado do comprovante e acesso ao comprovante. A conferência bancária (confirmar crédito, não identificado, CSV) não existe no sistema e fica fora: os controles são ausentes, com um aviso explicando.

<critical>
- ALWAYS READ `_spec.md` (Non-Goals, Core Interfaces), `_user_stories.md` (US-013), `_uiux.md` (S7), `_tests.md`
- REFERENCE `_spec.md` Part II
- FOCUS ON "WHAT"
- MINIMIZE CODE
- TESTS REQUIRED
</critical>

<requirements>
1. MUST criar `app/admin/_actions/donor-payment-actions.ts` com `getMonthlyPayments(month)`: `requireAdmin`; valida `^\d{4}-(0[1-9]|1[0-2])$` (inválido → `{data:null, error:"Mês inválido."}` sem consultar o banco); lê `donorPaymentLedger` da competência com `nome` de `donorPledges`; `expected_value` numérico; ordena por `due_date`; retorna `{data:{competencia, rows}, error?}`. Não alterar actions existentes.
2. MUST criar `app/admin/pagamentos/page.tsx` (server, `requireAdmin`): lê `?mes=`; inválido/ausente → competência corrente (`saoPauloDate`) e flag `invalidMonth` quando inválido; chama a action; renderiza `PagamentosClient`.
3. MUST criar `app/admin/pagamentos/client.tsx`: `PageHeader` "Pagamentos" (descrição do protótipo) com ação `form method="get"` contendo `Field` "Mês" (`Input type="month"` name `mes`) e botão "Ver mês"; `StatTile` "Esperado em {mês por extenso}", "Com comprovante" (success), "Sem comprovante" (warn, dica "N pagamentos"); `Section` "Pagamentos do mês" com `RecordRow`s (`payment-row-{id}`; título nome; meta valor, "Mensal", "Vencimento dd/mm/aaaa", "Comprovante disponível"/"Sem comprovante"; `StatusPill warn` "Aguardando conferência"); detalhe com `DataGrid` (valor esperado, vencimento, comprovante enviado em) e, quando houver comprovante, botão `outline sm` "Ver comprovante" (`payment-receipt-button`) que chama `getDocumentUrl(receipt_path)` e abre em nova aba; `Notice` informativo "A confirmação do crédito no extrato ainda não está disponível neste painel."; `Notice warn` quando `invalidMonth`; `EmptyState` quando vazio; `Notice danger` quando `error`.
4. MUST NOT renderizar "Confirmar crédito", "Não encontrei no extrato", "Baixar CSV", nem totais "Recebido"/"Em aberto".
5. MUST NOT alterar schema, `lib/**`, actions existentes, `app/prototipos/**`, `docs/design/**`.
</requirements>

## Subtasks

- [x] 5.1 Implementar `getMonthlyPayments` com testes fake-db (UT-070–UT-072, IT-002).
- [x] 5.2 Implementar página server com leitura/validação de `?mes=`.
- [x] 5.3 Implementar `PagamentosClient` (totais, lista, detalhe, avisos, vazio).
- [x] 5.4 Testes `__tests__/pagamentos-client.test.tsx` (UT-073–UT-077).
- [x] 5.5 `npm run typecheck`, `npm run lint`, `npm test`; conferência visual de `/admin/pagamentos` contra `/prototipos/admin-redesign#/pagamentos` (registrando as ausências deliberadas).

## Implementation Details

Siga `_spec.md` "Core Interfaces" (`MonthlyPaymentRow`, `getMonthlyPayments`) e `_uiux.md` S7. Referência visual: `screens/pagamentos.tsx`, descontando o formulário de confirmação e o CSV. Mês por extenso em pt-BR (`Intl.DateTimeFormat("pt-BR", {month:"long", year:"numeric"})`). `getDocumentUrl(path)` sem `applicationId` já é usado para recibos de benfeitores em `donor-card.tsx`.

### Relevant Files

- `lib/db/schema.ts:396-434` (`donorPaymentLedger`), `:323-383` (`donorPledges`).
- `lib/donor-payment-ledger.ts:25-34` (`hasMonthlyReceipt`), `lib/donor-recurrence.ts` (`saoPauloDate`).
- `app/admin/_actions/donor-report-actions.ts` — padrão de action de leitura com `requireAdmin`.
- `app/admin/_actions/admin-actions.ts` (`getDocumentUrl`).
- `__tests__/helpers/fake-db.ts`, `__tests__/donor-report-actions.test.ts` — padrão de teste.
- `app/prototipos/_designs/admin-redesign/screens/pagamentos.tsx` — referência.

### Dependent Files

- `app/admin/_components/nav.ts` — item "Pagamentos" já aponta para `/admin/pagamentos`.
- `app/admin/_components/admin-home.tsx` — CTA "Conferir pagamentos".

## Deliverables

- `donor-payment-actions.ts`, `app/admin/pagamentos/{page,client}.tsx`.
- Testes **(REQUIRED)**: `donor-payment-actions.test.ts` (UT-070–UT-072, IT-002), `pagamentos-client.test.tsx` (UT-073–UT-077); cobertura ≥ 80% dos arquivos novos.

## Tests

- Unit tests: UT-070–UT-077.
- Integration tests: IT-002.
- Test coverage target: ≥ 80%.
- All tests must pass.

## Success Criteria

- `npm run typecheck`, `npm run lint`, `npm test` passam.
- `/admin/pagamentos?mes=2026-13` mostra o mês corrente com aviso; `/admin/pagamentos` para secretaria lança como as demais páginas admin.
- Conferência visual descrita, incluindo a lista de controles ausentes por decisão de escopo.
