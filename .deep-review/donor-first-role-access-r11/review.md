# Deep Review — worktree:origin/main (round 1)

**Verdict: FIX_BEFORE_SHIP** — 0 Critical and 4 Major findings remain open; each names a bounded fix
**Defects: 5** (🔴 0 · 🟠 4 · 🟡 1) · advisories: 9 · duplicates: 0 · resolved since last round: 0 · merged duplicate reports: 0

<!-- deep-review:walkthrough -->

## Walkthrough

Review of the donor-first public routes, mandatory scholarship evidence, staff-role access controls, and persisted issued documents.

## Changes

Role-aware staff authorization, immutable issued-document records, canonical public URLs, and mandatory upload validation.

## Estimated code review effort

High: the change spans authorization, database migration, public submissions, and admin workflows.

## Review details

The review checks security, migrations, tests, consistency, and specification parity against the Compozy artifacts.

## Findings

### `app/admin/_actions/admin-actions.ts`

_⚠️ Potential issue_ | _🟠 Major_ | _⚡ Quick win_

**Projeção restrita de benfeitores não possui teste de regressão.**

Premise: app/admin/_actions/admin-actions.ts:131-153 introduz a allowlist que protege CPF, endereço, CEP e metadados de recibo da Secretaria, mas __tests__/admin-actions.test.ts:220-228 só inspeciona a projeção restrita de solicitações. → Path: substituir esta consulta de Secretaria por findMany sem columns, ou adicionar cpf/endereço/recibo à allowlist, continua aprovando toda a suíte. → Verdict: uma regressão que reexpõe dados sensíveis de benfeitores ao papel Secretaria não tem teste capaz de falhar. Adicione caso com identidade Secretaria que inspecione a projeção de donorPledges e confirme os campos proibidos ausentes.

Certificate: Premise: app/admin/_actions/admin-actions.ts:131-153 limita colunas de benfeitores para Secretaria → Path: nenhum teste chama getDonorPledges como Secretaria → Verdict: reintroduzir campos sensíveis mantém a suíte verde.

<details>
<summary>📝 Committable suggestion</summary>

> ‼️ **IMPORTANT**: review before committing — generated against lines 131-153.

```suggestion
Cubra getDonorPledges como Secretaria, verificando a allowlist completa e a ausência explícita de cpf, endereço, cep e recibo_path.
```
</details>

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In app/admin/_actions/admin-actions.ts around lines 131-153, Cubra getDonorPledges como Secretaria, verificando a allowlist completa e a ausência explícita de cpf, endereço, cep e recibo_path.
Reference anchor: app/admin/_actions/admin-actions.ts:131; rules: review evidence.
```
</details>
<!-- deep-review:fp:0536d6f5ca06c54d -->

_⚠️ Potential issue_ | _🟠 Major_

**Emissão imutável não é protegida pelos testes de exportação.**

Premise: app/admin/_actions/admin-actions.ts:552 persiste a versão final depois de renderizar a decisão (e app/admin/_actions/admin-actions.ts:807 faz o mesmo para contrato), mas __tests__/admin-actions.test.ts:570 e :706 só verificam o PDF retornado. → Path: remover ou quebrar qualquer chamada a persistIssuedDocument nos dois exports ainda deixa os testes atuais verdes. → Verdict: uma regressão elimina o histórico imutável exigido sem teste capaz de falhar. Faça os testes de decisão e contrato verificarem a escrita de issued_documents, incluindo application_id, kind, emissor e a falha de persistência.

Also applies to: app/admin/_actions/admin-actions.ts:807

Certificate: Premise: app/admin/_actions/admin-actions.ts:552 e :807 persistem o artefato final → Path: os testes de exportação só observam PDF/filename → Verdict: remover a persistência mantém a suíte verde e perde o histórico imutável.

<details>
<summary>📝 Committable suggestion</summary>

> ‼️ **IMPORTANT**: review before committing — generated against lines 552.

```suggestion
Adicione asserções de inserted para cada export e um caso que simule a falha de persistência e exija o erro de emissão.
```
</details>

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In app/admin/_actions/admin-actions.ts around lines 552, Adicione asserções de inserted para cada export e um caso que simule a falha de persistência e exija o erro de emissão.
Reference anchor: app/admin/_actions/admin-actions.ts:552; rules: review evidence.
```
</details>
<!-- deep-review:fp:ae643b4cdebf424f -->

### `app/admin/solicitacoes/client.tsx`

_⚠️ Potential issue_ | _🟠 Major_

**Fluxo operacional exclusivo da Secretaria não tem cobertura de UI.**

Premise: app/admin/solicitacoes/client.tsx:83-141 e app/admin/benfeitores/client.tsx:93-102 adicionam as interfaces pelas quais a Secretaria lê o acompanhamento, emite observações e baixa documentos finais, mas os testes de clientes importam somente SolicitacoesClient administrativo. → Path: quebrar o carregamento ao abrir o cartão, a submissão de observação ou a listagem/busca da interface de Secretaria não falha em teste algum. → Verdict: os fluxos públicos de trabalho introduzidos para o novo papel podem regressar silenciosamente apesar da suíte verde. Teste a abertura do cartão, carregamento de observações/documentos, registro de nota e a busca de benfeitores da Secretaria.

Also applies to: app/admin/benfeitores/client.tsx:93

Certificate: Premise: app/admin/solicitacoes/client.tsx:103-127 implementa o acompanhamento da Secretaria → Path: os testes montam somente o cliente administrativo → Verdict: falhas de abertura, nota ou documentos da Secretaria mantêm a suíte verde.

<details>
<summary>📝 Committable suggestion</summary>

> ‼️ **IMPORTANT**: review before committing — generated against lines 83-141.

```suggestion
Inclua testes de renderização e interação para ambos os clientes de Secretaria, com ações assíncronas controladas.
```
</details>

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In app/admin/solicitacoes/client.tsx around lines 83-141, Inclua testes de renderização e interação para ambos os clientes de Secretaria, com ações assíncronas controladas.
Reference anchor: app/admin/solicitacoes/client.tsx:83; rules: review evidence.
```
</details>
<!-- deep-review:fp:c44f87be4e3afb59 -->

### `lib/documents/issued-documents.ts`

_⚠️ Potential issue_ | _🟠 Major_ | _⚡ Quick win_

**Lock de versão concorrente não é exercitado pela suíte.**

Premise: lib/documents/issued-documents.ts:23 usa SELECT ... FOR UPDATE para serializar a alocação de versão, mas __tests__/issued-documents.test.ts:16-22 apenas simula a leitura da última versão e a inserção. → Path: remover o lock, movê-lo para depois da consulta, ou emitir duas solicitações concorrentes com a mesma versão ainda deixa a suíte atual verde. → Verdict: a garantia que evita colisão de versão/reemissão concorrente não tem proteção capaz de detectar regressão. Faça o duplo registrar tx.execute e teste que o lock ocorre antes de findFirst; idealmente cubra duas emissões concorrentes em PostgreSQL ou um teste de integração equivalente.

Certificate: Premise: lib/documents/issued-documents.ts:23 serializa versões com FOR UPDATE → Path: o teste não observa execute nem a ordem com findFirst → Verdict: remover ou reordenar o lock mantém a suíte verde e permite regressão concorrente.

<details>
<summary>📝 Committable suggestion</summary>

> ‼️ **IMPORTANT**: review before committing — generated against lines 23.

```suggestion
Exponha/registre o execute transacional no fake DB e assegure que o lock ocorre antes da consulta da versão; complemente com uma prova de concorrência real quando a infraestrutura de integração estiver disponível.
```
</details>

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In lib/documents/issued-documents.ts around lines 23, Exponha/registre o execute transacional no fake DB e assegure que o lock ocorre antes da consulta da versão; complemente com uma prova de concorrência real quando a infraestrutura de integração estiver disponível.
Reference anchor: lib/documents/issued-documents.ts:23; rules: review evidence.
```
</details>
<!-- deep-review:fp:053e2529b8ec8646 -->

### `drizzle/0006_flimsy_spacker_dave.sql`

_⚠️ Potential issue_ | _🟡 Minor_

**Populated-database migration behavior lacks deploy-gate coverage.**

Premise: `0006` changes populated `admin_users` rows by adding nullable `role`, backfilling it, and then enforcing the role constraint and non-null state at lines 26–31, but the automated suite does not invoke the migration from the preceding schema. → Path: a future change to the DDL order, legacy backfill, or constraints can leave fake-DB action tests green while failing on the deployed database containing existing users and `applications.decided_by` references. → Verdict: the required additive rollout behavior can regress without detection before deployment.

Certificate: Premise: populated admin_users is mutated in ordered DDL → Path: no test applies 0006 from snapshot 0005 with a legacy account and decision reference → Verdict: rollout compatibility is unguarded.
<!-- deep-review:fp:cb494e8e5a245701 -->

## Outside diff range

None.

## Spec conformance

| Artifact | Assessment |
| --- | --- |
| `.compozy/tasks/donor-first-role-access/_prd.md` | conforms — no divergence found |
| `.compozy/tasks/donor-first-role-access/_techspec.md` | conforms — no divergence found |
| `.compozy/tasks/donor-first-role-access/_tasks.md` | conforms — no divergence found |

## Duplicates (unresolved from round 0)

None.

## Advisories

### `.compozy/tasks/donor-first-role-access/_techspec.md`

_🛠️ Refactor suggestion_ | _🟡 Minor_ | _⚡ Quick win_

**Align the documented application action surface with exported actions.**

The Server Action table presents `getCurrentStaff` and `getOperationalApplicationDetail`, neither of which is exported, while the actual role-specific projection is performed by `getApplications`. The same table calls the existing `exportApplication` action Administrator-only but does not identify the current export names in the final-document section. Keeping the contract names synchronized avoids implementers and future tests targeting a nonexistent action boundary.

Also applies to: .compozy/tasks/donor-first-role-access/_techspec.md:407-408

Certificate: Premise: .compozy/tasks/donor-first-role-access/_techspec.md:322 and :342 name `getCurrentStaff` and `getOperationalApplicationDetail` → Improvement: the design document becomes an accurate action contract for maintenance and test planning → Fix: remove or rename the nonexistent rows and describe the existing role dispatch in `getApplications`; use the actual final-document export action names.
<!-- deep-review:fp:9bdc51bf85c453a3 -->

### `app/admin/_actions/admin-actions.ts`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Name the administrative authorization guard for its actual policy.**

`requireAuth` now exclusively calls `requireAdmin`, but its generic name still implies that any authenticated staff member can use the action. Renaming the local helper to `requireAdminAction` (or calling `requireAdmin` directly) makes the administrator-only boundary obvious at each protected action and reduces the chance that a future action accidentally inherits the stricter policy.

Also applies to: app/admin/_actions/admin-actions.ts:97, app/admin/_actions/admin-actions.ts:164, app/admin/_actions/admin-actions.ts:198, app/admin/_actions/admin-actions.ts:494, app/admin/_actions/admin-actions.ts:744, app/admin/_actions/admin-actions.ts:841

Certificate: Premise: app/admin/_actions/admin-actions.ts:43-45 defines `requireAuth` as a wrapper around `requireAdmin` → Improvement: callers communicate the role boundary without having to inspect the helper → Fix: rename it to an administrator-specific name and update its callers, or use `requireAdmin` directly.
<!-- deep-review:fp:80985b1fd053b3c8 -->

### `app/admin/solicitacoes/client.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Decompose the secretariat card into named UI sections.**

The new card combines data loading, note mutation, download handling, status presentation, document links, and the complete observations form in one component. Extracting named sections and small view-model helpers would make its role-specific data boundary and later UI changes easier to review without changing behavior.

Certificate: Premise: app/admin/solicitacoes/client.tsx:100-139 keeps the role-specific state, actions, and all rendered sections in SecretariatApplicationCard → Improvement: named sections isolate each operational concern and reduce the review surface for future sensitive-data changes → Fix: extract the status, issued-documents, and observations sections plus their small handlers into named components/helpers.
<!-- deep-review:fp:9d1b162fc7d24519 -->

### `app/admin/usuarios/client.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Give the staff-management flows readable function bodies.**

Creation, activation, reset, and rendering are each compressed into single physical lines. Expanding them into normal blocks would make the error and optimistic-update branches auditable, especially for a component that manages privileged access.

Certificate: Premise: app/admin/usuarios/client.tsx:8-16 defines three asynchronous account-management flows and the complete JSX tree as one-line expressions → Improvement: branch behavior can be inspected and changed without re-parsing dense expressions → Fix: format the handlers and JSX into conventional blocks, retaining the same calls and state transitions.
<!-- deep-review:fp:d2f7b649b87b3db0 -->

### `app/solicitar-bolsa/layout.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Centralize the duplicated scholarship layout.**

The canonical layout duplicates app/form/layout.tsx exactly. Maintaining both copies lets institutional copy, accessibility semantics, and responsive classes drift even though the legacy route only redirects to the canonical flow.

Also applies to: app/form/layout.tsx:1-104

Certificate: Premise: app/solicitar-bolsa/layout.tsx:11-104 has the same layout implementation as app/form/layout.tsx:1-104 → Improvement: one authoritative layout prevents future visual and semantic drift across the two route trees → Fix: extract the shared layout body to a component and make both route layouts delegate to it.
<!-- deep-review:fp:9547c9f325dcced2 -->

### `lib/documents/issued-documents.ts`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Evite converter a transação para o tipo global de banco.**

A conversão `tx as unknown as typeof db` descarta a verificação de tipos exatamente no bloco que precisa permanecer atômico. Consultar a versão com o query builder da própria transação (por exemplo, `tx.select({ version: issuedDocuments.version })...`) preserva os tipos e torna futuras mudanças na transação verificáveis pelo compilador.

Certificate: Premise: lib/documents/issued-documents.ts:20 converte `tx` por `unknown` para `typeof db` → Improvement: o compilador volta a validar a API usada dentro da unidade atômica → Fix: substitua a leitura relacional por uma consulta tipada em `tx`.
<!-- deep-review:fp:92de4a0864a6f635 -->

### `.compozy/tasks/donor-first-role-access/_tasks.md`

_🧹 Nitpick_ | _🔵 Trivial_ | _⚡ Quick win_

**Keep task tracking status aligned with the delivered work.**

The task list leaves tasks 02 through 05 as `pending`, although their corresponding implementation files and tests are present in this same change set. Updating the tracker when each acceptance checklist is verified makes the Compozy artifact usable as an accurate handoff and avoids asking a later executor to repeat completed work.

Certificate: Premise: .compozy/tasks/donor-first-role-access/_tasks.md:8-11 marks all remaining scoped tasks pending → Improvement: the workflow artifact can reliably show what remains after verification → Fix: set each completed task to completed and retain pending only for unverified acceptance work.
<!-- deep-review:fp:a2d4514d7f775214 -->

### `.compozy/tasks/donor-first-role-access/task_02.md`

_🧹 Nitpick_ | _🔵 Trivial_ | _⚡ Quick win_

**Update completed task tracking.**

Tasks 02 through 05 still declare `status: pending` and retain unchecked subtasks even though their matching implementation and focused tests are included in this change. Updating each verified task record makes the Compozy handoff accurately identify completed scope rather than suggesting the next executor must repeat it.

Also applies to: .compozy/tasks/donor-first-role-access/task_03.md:2-43, .compozy/tasks/donor-first-role-access/task_04.md:2-43, .compozy/tasks/donor-first-role-access/task_05.md:2-39

Certificate: Premise: .compozy/tasks/donor-first-role-access/task_02.md:2 and :41-47 retain pending status and unchecked subtasks while the matching staff, observation, role-projection, and test files are present in this change → Improvement: the workflow handoff identifies completed scope accurately → Fix: mark verified tasks and subtasks complete after the final acceptance evidence is recorded.
<!-- deep-review:fp:01f50a317222fe48 -->

### `app/form/_components/scholarship-form.tsx`

_🧹 Nitpick_ | _🔵 Trivial_ | _⚡ Quick win_

**Remove vestigial unconditional validation blocks.**

After removing the feature flag, four standalone brace blocks remain around required-document validation. They do not create a meaningful scope and look like a condition was accidentally removed, which obscures that these checks are now unconditional.

Also applies to: app/form/_components/scholarship-form.tsx:new:102-102, app/form/_components/scholarship-form.tsx:new:127-127, app/form/_components/scholarship-form.tsx:new:137-138

Certificate: Premise: app/form/_components/scholarship-form.tsx:52-63 wraps unconditional document checks in a bare block → Improvement: direct control flow makes the mandatory-upload invariant immediately apparent → Fix: remove the bare braces in all four validators without changing the contained checks.
<!-- deep-review:fp:9a08a7c7d26529aa -->

## Review observability

- Candidates investigated: 65
- Reported before deduplication: 14
- Suppressed with recorded reason: 51
- Selected hunk lines covered by both lanes: 5437
