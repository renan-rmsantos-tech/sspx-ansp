---
status: pending
title: "Solicitações: filtro único, linha enxuta e detalhe em abas"
type: frontend
complexity: high
dependencies:
  - task_02
---

# Task 3: Solicitações: filtro único, linha enxuta e detalhe em abas

## Overview

Reescreve a lista de solicitações sobre os primitivos: um segmento de situação com contagens substitui o `StatsDashboard` e as pílulas de filtro, as linhas viram `RecordRow` com `StatusPill` "Aguardando decisão", o detalhe usa abas Resumo / Documentos / Renda e despesas / Decisão, a decisão é inline com botões primário/destructive e os PDFs ficam na `ActionBar` do detalhe. A visão da Secretaria recebe o mesmo padrão.

<critical>
- ALWAYS READ `_spec.md`, `_user_stories.md` (US-005–US-008, US-018), `_uiux.md` (S3, S4), `_tests.md`
- REFERENCE `_spec.md` Part II; não duplicar
- FOCUS ON "WHAT"
- MINIMIZE CODE
- TESTS REQUIRED
</critical>

<requirements>
1. MUST reescrever `app/admin/solicitacoes/client.tsx` (admin e secretaria) com `PageHeader` (descrição por papel), `SegmentedFilter` "Filtrar por situação" (`testIdPrefix="filter"`, opções "Todas/Aguardando decisão/Aprovadas/Rejeitadas" com contagens), `SearchInput` "Buscar solicitações" (`search-input`), `NativeSelect` "Ordenar" (`sort-select`: "Mais recentes", "Mais antigas", "Nome da família"), contagem `aria-live` (`results-count`), lista (`application-list`), `EmptyState` com "Limpar filtros".
2. MUST aceitar `initialStatus` vindo de `?situacao=` (página server lê `searchParams` e valida `pendente|aprovada|rejeitada`).
3. MUST remover `app/admin/_components/stats-dashboard.tsx` e `__tests__/stats-dashboard.test.tsx`.
4. MUST reescrever `app/admin/_components/application-card.tsx` sobre `RecordRow` (`data-testid=application-card-{id}`, `toggleTestId="card-toggle"`, `detailTestId="card-detail"`), `StatusPill` (`status-badge`, rótulos de `STATUS_LABELS`), meta com escola, `student-count`, "Enviada em dd/mm/aaaa"; detalhe com `ApplicationDetail` e `ActionBar` (`export-data-button` "Imprimir dados da solicitação"; `export-button` "Carta de decisão" quando decidida; `contract-button` "Contrato" quando aprovada; nota "Os PDFs são gerados com o cabeçalho e os modelos configurados."); erros em `Notice danger` (`export-data-error`, `export-error`, `contract-error`); primeira pendente aberta por padrão. Remover `card-header-actions`.
5. MUST adaptar `app/admin/_components/application-detail.tsx` para shadcn `Tabs` (`detail-tabs`, `detail-tab-resumo|documentos|financeiro|decisao`, rótulos "Resumo", "Documentos (N)", "Renda e despesas", "Decisão" com ponto de atenção quando pendente), `DataGrid`/`DataItem` para dados do solicitante e renda, tabela de alunos no padrão do protótipo; aba padrão "documentos" quando pendente com documentos, senão "resumo"; `decision-info` como `Notice`.
6. MUST restilizar `app/admin/_components/decision-actions.tsx` preservando `data-testid`s (`decision-actions`, `approve-trigger`, `reject-trigger`, `approve-form`, `reject-form`, `discount-input`, `reason-input`, `decision-error`, `confirm-decision`, `cancel-decision`) com rótulos "Aprovar solicitação" (primário), "Rejeitar" (`destructive`), "Confirmar aprovação"/"Confirmar rejeição", "Voltar" (ghost), texto "Esta ação é definitiva e a família será informada.", `Field` para desconto e motivo, `Notice` para erro; botão de confirmação desabilitado enquanto a action roda.
7. MUST restilizar `document-preview.tsx` (lista de documentos no padrão `li` com "Abrir"/"Baixar", preservando `documents-section`, `preview-{id}`, `download-{id}`, `document-error`, `pdf-preview`) sem alterar o `Modal` de visualização.
8. MUST manter `SecretariatApplicationsClient` com o mesmo shell visual: `RecordRow`, `StatusPill`, abas "Resumo", "Documentos finais", "Observações" (`IssuedDocuments`/`SecretariatApplicationCard` existentes restilizados), botões "Baixar decisão"/"Baixar contrato", "Registrar observação".
9. MUST NOT alterar actions, `lib/**`, PDFs, `app/prototipos/**`, `docs/design/**`.
</requirements>

## Subtasks

- [ ] 3.1 Página server lê `?situacao=` e passa `initialStatus`; cliente admin com segmento, busca, ordenação, contagem, vazio.
- [ ] 3.2 `ApplicationCard` sobre `RecordRow` + `ActionBar`; remover `StatsDashboard`.
- [ ] 3.3 `ApplicationDetail` com `Tabs` shadcn e `DataGrid`; `DecisionActions` restilizado.
- [ ] 3.4 `DocumentPreview` restilizado; visão da Secretaria no padrão.
- [ ] 3.5 Atualizar `__tests__/solicitacoes-client.test.tsx` e `__tests__/export-decision.test.tsx` (UT-030–UT-046, UT-102); apagar `stats-dashboard.test.tsx`.
- [ ] 3.6 `npm run typecheck`, `npm run lint`, `npm test`; conferência visual de `/admin/solicitacoes` (lista, linha aberta, aba Decisão em modo aprovar) contra `/prototipos/admin-redesign#/solicitacoes`.

## Implementation Details

Siga `_uiux.md` S3/S4 e `_spec.md` "Key Decisions" (Tabs shadcn, select nativo). Referência visual: `screens/solicitacoes.tsx` (`SolicitacoesScreen`, `ApplicationRow`, `DecisionPanel`). O título da linha usa `pai_nome` e `mae_nome` (não há campo de família). Mantenha `PdfPreviewModal` para os PDFs. Se o `Tabs` do base-ui exigir eventos de ponteiro em jsdom, documente o helper usado nos testes.

### Relevant Files

- `app/admin/solicitacoes/{page,client}.tsx` — página e clientes atuais.
- `app/admin/_components/application-card.tsx`, `application-detail.tsx`, `decision-actions.tsx`, `document-preview.tsx`, `pdf-preview-modal.tsx`, `issued-documents.tsx`, `application-observations.tsx`.
- `app/admin/_components/stats-dashboard.tsx` — a remover.
- `app/admin/_components/status-labels.ts` e primitivos (task_01).
- `app/admin/_actions/admin-actions.ts` (`getApplications`, `getApplicationDetail`, `approveApplication`, `rejectApplication`, `exportDecision`, `exportContract`, `exportApplication`, `getDocumentUrl`) — contratos usados.
- `app/prototipos/_designs/admin-redesign/screens/solicitacoes.tsx` — referência.

### Dependent Files

- `__tests__/solicitacoes-client.test.tsx`, `__tests__/export-decision.test.tsx` — atualizar.
- `__tests__/stats-dashboard.test.tsx` — apagar.

## Deliverables

- Lista e detalhe de solicitações no novo padrão (admin e secretaria).
- `StatsDashboard` removido.
- Testes atualizados **(REQUIRED)**: UT-030–UT-046, UT-102; cobertura ≥ 80% dos arquivos tocados.

## Tests

- Unit tests: UT-030–UT-046 (`solicitacoes-client.test.tsx`, `export-decision.test.tsx`), UT-102 (`STATUS_LABELS`).
- Integration tests: nenhum novo (actions inalteradas).
- Test coverage target: ≥ 80%.
- All tests must pass.

## Success Criteria

- `npm run typecheck`, `npm run lint`, `npm test` passam.
- Nenhuma ocorrência visível de "Pendente" como situação em `app/admin/**`.
- Conferência visual descrita (lista, detalhe, decisão) sem divergência estrutural com o protótipo.
