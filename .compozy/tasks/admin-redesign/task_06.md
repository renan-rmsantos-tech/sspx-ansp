---
status: completed
title: "Relatórios e Configurações no novo padrão"
type: frontend
complexity: high
dependencies:
  - task_02
---

# Task 6: Relatórios e Configurações no novo padrão

## Overview

Leva Relatórios, Ano letivo, Usuários e Cabeçalho e rodapé para a mesma gramática: `PageHeader`, `Card`, `Section`, `StatusPill`, `Field`/`Input`, `Notice` e confirmação inline no lugar do `Modal`. Nenhuma action muda; os testes existentes são adaptados onde rótulos ou estrutura mudam.

<critical>
- ALWAYS READ `_spec.md`, `_user_stories.md` (US-016), `_uiux.md` (S10–S13), `_tests.md`
- REFERENCE `_spec.md` Part II
- FOCUS ON "WHAT"
- MINIMIZE CODE
- TESTS REQUIRED
</critical>

<requirements>
1. MUST reescrever `app/admin/ano-letivo/client.tsx`: `PageHeader` "Ano letivo" (descrição do protótipo) com ação `Button` "Novo ano letivo" que revela `SchoolYearForm` em `Card` (fechado após criar/cancelar); `SchoolYearForm` restilizado com `Field`/`Input` (`school-year-form`, `input-nome|inicio|fim`, `submit-button` "Criar ano letivo", `form-error` em `Notice danger`, botão "Cancelar"); `SchoolYearList` como tabela "Ano / Período / Situação / Ações" (`school-year-list`, `school-year-row-{id}`, `status-badge` `StatusPill` "Ativo"/"Encerrado", `toggle-button` "Desativar"/"Tornar ativo", `delete-button` "Excluir") com `InlineConfirm` (`confirm-dialog` container, `confirm-ok` "Sim, excluir"/"Sim, desativar", `confirm-cancel` "Não") substituindo o `Modal`; vazio "Nenhum ano letivo cadastrado…".
2. MUST reescrever `app/admin/usuarios/client.tsx`: `PageHeader` "Usuários"; `Section` "Novo acesso" em `Card` (`Field` e-mail, senha inicial com dica "Mínimo de 8 caracteres. Peça para trocar no primeiro acesso.", `Button` "Criar acesso"); `Section` "Acessos existentes" em `Card padded={false}` com `StatusPill` "Ativo"/"Inativo", "Redefinir senha" (`outline sm`, mantém `window.prompt`), "Desativar"/"Reativar" (`ghost sm`); `Notice` "Quem está inativo não consegue entrar…"; `EmptyState` quando vazio; erros em `Notice danger`.
3. MUST reescrever `app/admin/cabecalho/client.tsx`: `PageHeader` "Cabeçalho e rodapé"; grid 2 colunas: `Card` com `Checkbox` (`header-mostrar-selo`, "Exibir o selo da ANSP no cabeçalho"), `Field`/`Input` (`header-linha1|2|3`), `Field`/`Textarea` "Rodapé institucional" (id `institutional-footer`, `FOOTER_HELP`), "Restaurar rodapé padrão" (`outline sm`), `header-save` "Salvar"/"Salvando..."; `header-saved` (`Notice success` "Cabeçalho e rodapé salvos.") / `header-error` (`Notice danger`); coluna "Como fica no documento" com `DocumentHeaderPreview` + `DocumentFooterPreview` (`footer-preview`) em `Card`.
4. MUST reescrever `app/admin/relatorios/reports-client.tsx` casca: `PageHeader` "Relatórios"; filtros em `Card` com `Field`/`Input date` ("Data inicial", "Data final"), `NativeSelect` "Frequência", `Button` "Aplicar filtros"/"Atualizando…"; "População selecionada: N cadastros"; cada série em `Section` com `Card` (tabela e `DonorReportCharts` inalterados).
5. MUST apagar `app/admin/_components/modal.tsx` apenas se nenhum consumidor restar; `document-preview.tsx` ainda o usa — então manter e registrar.
6. MUST NOT alterar actions, `lib/**`, `document-header-preview.tsx`/`document-footer-preview.tsx`/`reports-charts.tsx` (apenas wrappers), `app/prototipos/**`, `docs/design/**`.
</requirements>

## Subtasks

- [x] 6.1 Ano letivo: cabeçalho com ação, formulário em `Card`, tabela, confirmação inline.
- [x] 6.2 Usuários: duas seções, pílulas, aviso, vazio.
- [x] 6.3 Cabeçalho e rodapé: formulário + prévia.
- [x] 6.4 Relatórios: casca nova.
- [x] 6.5 Atualizar `__tests__/school-year.test.tsx`, criar `__tests__/usuarios-client.test.tsx`, manter verdes `institutional-footer-client.test.tsx`, `donor-reports-client.test.tsx`, `communication-layout.test.tsx`, `configured-header.test.tsx` (UT-090–UT-095).
- [x] 6.6 `npm run typecheck`, `npm run lint`, `npm test`; conferência visual de `/admin/ano-letivo`, `/admin/usuarios`, `/admin/cabecalho`, `/admin/relatorios` contra `/prototipos/admin-redesign#/ano-letivo`, `#/usuarios`, `#/cabecalho`, `#/relatorios`.

## Implementation Details

Siga `_uiux.md` S10–S13. Referência visual: `screens/configuracoes.tsx` (`AnoLetivoScreen`, `UsuariosScreen`, `CabecalhoScreen`) e `screens/relatorios.tsx`. O teste atual de ano letivo usa `fireEvent.submit` no `school-year-form` e espera `form-error` com texto exato — preservar. `institutional-footer-client.test.tsx` espera `footer-preview` ausente quando o rodapé está vazio e botão /^Salvar$/ — preservar.

### Relevant Files

- `app/admin/ano-letivo/client.tsx`, `_components/school-year-form.tsx`, `school-year-list.tsx`, `modal.tsx`.
- `app/admin/usuarios/client.tsx`, `_actions/staff-actions.ts`.
- `app/admin/cabecalho/client.tsx`, `_components/document-header-preview.tsx`, `document-footer-preview.tsx`.
- `app/admin/relatorios/{page,reports-client,reports-charts}.tsx`, `_actions/donor-report-actions.ts`.
- `app/prototipos/_designs/admin-redesign/screens/configuracoes.tsx`, `screens/relatorios.tsx` — referência.

### Dependent Files

- `__tests__/school-year.test.tsx` — atualizar (confirmação inline, "Encerrado", "Tornar ativo", "Criar ano letivo").
- `__tests__/usuarios-client.test.tsx` — novo.
- `__tests__/institutional-footer-client.test.tsx`, `donor-reports-client.test.tsx`, `communication-layout.test.tsx`, `configured-header.test.tsx` — verdes sem mudança ou com ajuste mínimo.

## Deliverables

- Quatro telas no novo padrão.
- Testes **(REQUIRED)**: UT-090–UT-095; cobertura ≥ 80% dos arquivos tocados.

## Tests

- Unit tests: UT-090–UT-095.
- Integration tests: nenhum novo.
- Test coverage target: ≥ 80%.
- All tests must pass.

## Success Criteria

- `npm run typecheck`, `npm run lint`, `npm test` passam.
- Nenhum `Modal` de confirmação em ano letivo; `Modal` permanece só para PDF.
- Conferência visual descrita sem divergência estrutural com o protótipo.
