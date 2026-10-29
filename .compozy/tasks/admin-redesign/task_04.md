---
status: completed
title: "Benfeitores: toolbar, detalhe em seções e exclusão inline"
type: frontend
complexity: high
dependencies:
  - task_02
---

# Task 4: Benfeitores: toolbar, detalhe em seções e exclusão inline

## Overview

Reescreve a lista de benfeitores: segmento de frequência, busca, select de priorado, ordenação e checkbox "só boas-vindas pendentes" substituem os quatro cartões de estatística e as duas fileiras de pílulas; cada benfeitor vira `RecordRow` com pílulas de estado e detalhe em Contato / Contribuição / E-mails e comprovantes; as ações (imprimir, recibo, excluir com confirmação inline) vão para o rodapé. A visão da Secretaria segue o mesmo padrão reduzido.

<critical>
- ALWAYS READ `_spec.md`, `_user_stories.md` (US-009–US-012, US-018), `_uiux.md` (S5, S6), `_tests.md`
- REFERENCE `_spec.md` Part II
- FOCUS ON "WHAT"
- MINIMIZE CODE
- TESTS REQUIRED
</critical>

<requirements>
1. MUST reescrever `app/admin/benfeitores/client.tsx`: `PageHeader` "Benfeitores"; `SegmentedFilter` "Filtrar por frequência" (`testIdPrefix="donor-filter"`; "Todos/Mensais/Doação única" + contagens); `SearchInput` "Buscar benfeitores" (`donor-search-input`); `NativeSelect` "Priorado ou capela" (`donor-priorado-filter`, valores `__todos__`/`__nao_informado__`); `NativeSelect` "Ordenar" (`donor-sort-select`: "Mais recentes", "Mais antigos", "Nome", "Maior valor"); `Checkbox` "Mostrar só quem ainda não recebeu boas-vindas (M)" (`donor-welcome-pending-only`, só admin e M > 0); contagem `donor-results-count`; `donor-list`; `EmptyState`. Remover `StatCard` e `donor-welcome-filters`.
2. MUST aceitar `initialWelcomePendingOnly` vindo de `?boas-vindas=pendentes` (página server lê `searchParams`).
3. MUST reescrever `app/admin/_components/donor-card.tsx` sobre `RecordRow` (`donor-card-{id}`) com título nome; meta "R$ X por mês"/"R$ X", priorado, "Vence dia D" (mensal), "Cadastro em dd/mm/aaaa"; pílulas: `frequencia-badge` ("Mensal" accent / "Doação única" neutral), "Boas-vindas pendente" (warn, admin), "Sem comprovante do mês" (neutral, admin, mensal com `current_receipt.status === "Comprovante pendente"`); seções `<h3>` "Contato" (`DataGrid` 2 col: e-mail `mailto:`, telefone, CPF, priorado, observações), "Contribuição" (`DataGrid`: valor, frequência/duração, dia de vencimento, próximo vencimento — `donor-due-day` com os textos atuais —, lembrete `donor-reminder-status`; edição inline do dia com `Field`/`Input` "Novo dia de vencimento", "Salvar"/"Cancelar", `role="status"`/`role="alert"` conforme hoje), "E-mails e comprovantes" (admin: `donor-welcome-status` como `Notice` success "Boas-vindas enviado" + "Desmarcar envio" (`donor-welcome-unmark-sent`) ou `Notice` warn "Boas-vindas ainda não enviado" + "Enviar agora" (`donor-welcome-send`) + "Marcar como enviado" (`donor-welcome-mark-sent`), `donor-welcome-error`; `DonorMonthlyInstructions` existente inalterado em comportamento).
4. MUST colocar em `ActionBar` (admin): "Imprimir ficha" (`donor-export-button`, abre `PdfPreviewModal`), "Ver recibo" (`donor-recibo-button`), "Excluir" (`donor-delete-button`, ghost vermelho) → `InlineConfirm` "Excluir este cadastro?" com `donor-delete-confirm` "Sim, excluir" e "Não"; erros `donor-delete-error`, `donor-export-error`, `donor-recibo-error` como `Notice danger`/`role="alert"`.
5. MUST manter `SecretariatDonorsClient` no padrão: busca (`searchbox`), select "Priorado ou capela", `RecordRow` com só "Contato" e "Contribuição", sem pílulas administrativas, sem `ActionBar`; vazio "Nenhum benfeitor com esses filtros".
6. MUST NOT alterar actions, `lib/**`, `donor-monthly-instructions.tsx` (apenas restilizar classes se necessário, preservando testids e textos), `app/prototipos/**`, `docs/design/**`.
</requirements>

## Subtasks

- [x] 4.1 Página server lê `?boas-vindas=`; cliente admin com toolbar nova, contagem, lista, vazio.
- [x] 4.2 `DonorCard` sobre `RecordRow` com pílulas e seções Contato/Contribuição.
- [x] 4.3 Seção E-mails e comprovantes (boas-vindas com "Marcar como enviado", instruções mensais) e `ActionBar` com exclusão inline.
- [x] 4.4 Visão da Secretaria no padrão.
- [x] 4.5 Atualizar `__tests__/benfeitores-client.test.tsx` (UT-050–UT-063).
- [x] 4.6 `npm run typecheck`, `npm run lint`, `npm test`; conferência visual de `/admin/benfeitores` (lista, linha aberta, confirmação de exclusão cancelada) contra `/prototipos/admin-redesign#/benfeitores`.

## Implementation Details

Siga `_uiux.md` S5/S6. Referência visual: `screens/benfeitores.tsx` (`BenfeitoresScreen`, `DonorRow`). Texto do botão de registro manual é "Marcar como enviado" (decisão do Goal; substitui "Já enviei por fora" do protótipo). A pílula "Sem comprovante do mês" aparece só para `admin`. `DonorPledge` (tipo exportado de `donor-card.tsx`) é importado por `__tests__/donor-list-reminder.integration.test.ts` — manter o export.

### Relevant Files

- `app/admin/benfeitores/{page,client}.tsx`.
- `app/admin/_components/donor-card.tsx`, `donor-monthly-instructions.tsx`, `pdf-preview-modal.tsx`.
- `app/admin/_actions/admin-actions.ts` (`getDonorPledges`, `updateDonorDueDay`, `deleteDonorPledge`, `exportDonorPledge`, `getDocumentUrl`), `donor-email-actions.ts` (`retryDonorWelcomeEmail`, `markDonorWelcomeEmailSent`, `unmarkDonorWelcomeEmailSent`), `donor-monthly-instructions-actions.ts`.
- `lib/donor-payment-ledger.ts` (`monthlyReceiptState`) — vocabulário do comprovante.
- `app/prototipos/_designs/admin-redesign/screens/benfeitores.tsx` — referência.

### Dependent Files

- `__tests__/benfeitores-client.test.tsx` — atualizar.
- `__tests__/donor-monthly-instructions-client.test.tsx`, `__tests__/donor-list-reminder.integration.test.ts` — devem continuar verdes.

## Deliverables

- Lista e detalhe de benfeitores no novo padrão (admin e secretaria).
- Testes atualizados **(REQUIRED)**: UT-050–UT-063; cobertura ≥ 80% dos arquivos tocados.

## Tests

- Unit tests: UT-050–UT-063.
- Integration tests: nenhum novo.
- Test coverage target: ≥ 80%.
- All tests must pass.

## Success Criteria

- `npm run typecheck`, `npm run lint`, `npm test` passam.
- Nenhum modal de confirmação em benfeitores; `Modal` só permanece para PDF.
- Conferência visual descrita sem divergência estrutural com o protótipo.
