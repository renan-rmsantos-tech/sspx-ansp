# Task Memory — task_03 (Solicitações: filtro único, linha enxuta e detalhe em abas)

## Objective

Reescrever `/admin/solicitacoes` (admin e secretaria) sobre os primitivos: `SegmentedFilter` + `SearchInput` + `NativeSelect`, `RecordRow` por solicitação, detalhe em shadcn `Tabs` (Resumo / Documentos / Renda e despesas / Decisão), decisão inline restilizada, PDFs na `ActionBar`; remover `StatsDashboard`; página lê `?situacao=`.

## Status

- Concluída em 2026-10-29 (sem commit). Verificação: `npm run typecheck` ok; `npm run lint` "No issues found"; `npm test` 81 arquivos / 680 testes verdes (17 arquivos / 75 skipped). Cobertura dos arquivos tocados (2 suítes): client 100% linhas, card 97%, detail 100%, decision 97%, document-preview 80%, issued-documents 93%; `page.tsx` server não coberto (lê `searchParams`).
- Conferência visual em `http://localhost:3005` com 2 solicitações fictícias inseridas por SQL no Postgres dev (removidas ao final): lista, linha pendente aberta, aba Decisão idle e modo aprovar, linha aprovada (Decisão com `Notice` + Carta/Contrato na `ActionBar`), Renda e despesas, `?situacao=aprovada`, vazio total. Sem erros no console.

## Decisions

- `onDecision(id, status, desconto_concedido?, motivo?)` (`DecisionHandler` exportado de `application-card.tsx`): o motivo viaja no callback para o `decision-info` mostrar o motivo logo após a decisão (UT-045) sem refetch.
- Detalhe carregado por efeito (`open && !detail && !detailError`), sem `setState` síncrono no efeito; "Carregando…" é estado derivado. `status` vai como prop ao `ApplicationDetail` (não mais mesclado no objeto `detail`).
- Primeira pendente da lista visível abre por padrão (`defaultOpen={app.id === firstPendingId}`); o `RecordRow` é controlado (`open`/`onOpenChange`) para o efeito de carga funcionar.
- `IssuedDocuments` (admin) fica na aba Decisão só quando decidida; `ApplicationObservations` (leitura) no fim da aba Resumo via prop `afterResumo`.
- Formulário de decisão com `noValidate`: a validação nativa de `max=100` engolia o submit e escondia o erro "Desconto deve estar entre 0 e 100." (UT-043).
- Secretaria: lista própria de documentos finais (`getIssuedDocumentHistory` exige admin); sem select de ordenação (resumo da secretaria não traz `data_envio`); abas `detail-tab-resumo|documentos-finais|observacoes`.
- Abas do detalhe reutilizam `PAGE_TABS_LIST_CLASS`/`PAGE_TABS_TRIGGER_CLASS` de `url-tabs.ts`; `TabsList` aceita `data-testid` (`detail-tabs`).
- `parseApplicationStatus(raw)` + `APPLICATION_STATUSES` em `status-labels.ts` validam `?situacao=`.
- Botão de visualizar documento: "Abrir" (task_03 req. 7); `_tests.md` UT-041 citava "Visualizar" — o testid `preview-{id}` é o contrato.
- Título da linha "{pai_nome} e {mae_nome}" (decisão da spec: não há campo de família).

## Learnings

- `docker exec ansp-postgres-dev psql -U ansp -d ansp` funciona para inspecionar/inserir dados de dev; heredoc exige `docker exec -i`. `applications` tem muitas colunas NOT NULL (ver `information_schema.columns`).
- Com `DATABASE_URL_TEST` apontando ao Postgres dev, 6 suítes de integração alheias (donor ledger, receipt upload, reminder/instructions persistence, footer migration, seed-dev) falham por estado compartilhado do banco de dev; o gate (`npm test` sem a variável) passa.
- `fireEvent.click` em `Button type="submit"` do base-ui dispara `submit` no jsdom, mas a validação nativa (`min`/`max`) bloqueia o evento sem `noValidate`.
- Textos repetidos (telefone na meta e no `DataGrid`) exigem `within(card-detail)` nos testes.

## Touched surfaces

- Modificados: `app/admin/solicitacoes/{page,client}.tsx`, `app/admin/_components/{application-card,application-detail,decision-actions,document-preview,issued-documents,application-observations}.tsx`, `status-labels.ts`; testes `solicitacoes-client.test.tsx`, `export-decision.test.tsx`.
- Apagados: `app/admin/_components/stats-dashboard.tsx`, `__tests__/stats-dashboard.test.tsx`.

## Follow-ups

- Aba Documentos pendente: documentos enviados pelo formulário sempre são PDF/imagem; só PDFs têm "Abrir" (imagens só "Baixar"), como antes.
- `getApplications` continua trazendo todas as solicitações; o filtro `?situacao=` é só de UI (sem paginação, como antes).
- Secretaria não tem ordenação (falta `data_envio` no resumo da secretaria); se desejado, ampliar as colunas em `getApplications` (fora desta spec: actions inalteradas).
