# Deep Review — worktree:origin/main (round 1)

**Verdict: FIX_BEFORE_SHIP** — 0 Critical and 3 Major findings remain open; each names a bounded fix
**Defects: 4** (🔴 0 · 🟠 3 · 🟡 1) · advisories: 7 · duplicates: 0 · resolved since last round: 0 · merged duplicate reports: 0

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

_⚠️ Potential issue_ | _🟠 Major_

**Exports finais podem deixar de ser persistidos sem falhar na suíte.**

Premise: app/admin/_actions/admin-actions.ts:552 e :807 chamam persistIssuedDocument, que é a única ligação dos exports ao histórico imutável. → Path: os cenários de sucesso de exportDecision e exportContract em __tests__/admin-actions.test.ts:581-613 e :717-743 verificam somente o PDF renderizado, nome e tokens; remover as chamadas de persistência, ou deixar de propagar sua falha, mantém esses testes e __tests__/issued-documents.test.ts verdes. → Verdict: uma regressão elimina o registro obrigatório de emissões finais sem qualquer teste capaz de falhar.

Also applies to: app/admin/_actions/admin-actions.ts:807

Certificate: Premise: app/admin/_actions/admin-actions.ts:549-555 e :804-810 usam persistIssuedDocument como única escrita auditável. → Path: os testes de exportação não observam essa escrita. → Verdict: remover a chamada mantém a suíte verde e elimina o histórico final.

<details>
<summary>📝 Committable suggestion</summary>

> ‼️ **IMPORTANT**: review before committing — generated against lines 552.

```suggestion
Nos dois exports, asserte a inserção de issued_documents com application_id, kind, issued_by e versão; cubra também que uma falha de persistência retorna o erro de emissão, sem devolver um PDF como sucesso.
```
</details>

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In app/admin/_actions/admin-actions.ts around lines 552, Nos dois exports, asserte a inserção de issued_documents com application_id, kind, issued_by e versão; cubra também que uma falha de persistência retorna o erro de emissão, sem devolver um PDF como sucesso.
Reference anchor: app/admin/_actions/admin-actions.ts:552; rules: review evidence.
```
</details>
<!-- deep-review:fp:53842744fe25db86 -->

### `app/admin/solicitacoes/client.tsx`

_⚠️ Potential issue_ | _🟠 Major_

**Fluxos exclusivos da Secretaria não são exercitados pela UI.**

Premise: app/admin/solicitacoes/client.tsx:103-127 acrescenta o fluxo pelo qual a Secretaria abre o acompanhamento, carrega observações/documentos, registra nota e baixa o documento final; app/admin/benfeitores/client.tsx:93-102 acrescenta a busca operacional de benfeitores. → Path: __tests__/solicitacoes-client.test.tsx importa e renderiza apenas SolicitacoesClient, e não há ocorrência de SecretariatApplicationsClient ou SecretariatDonorsClient em __tests__. Quebrar o useEffect, deixar de chamar addApplicationObservation ou quebrar a busca de benfeitores deixa os 345 testes verdes. → Verdict: os únicos fluxos de trabalho do novo papel podem regredir silenciosamente.

Also applies to: app/admin/benfeitores/client.tsx:93

Certificate: Premise: app/admin/solicitacoes/client.tsx:103-127 contém o carregamento e gravação exclusivos da Secretaria. → Path: nenhum teste renderiza esse cliente. → Verdict: quebra do fluxo operacional mantém a suíte verde.

<details>
<summary>📝 Committable suggestion</summary>

> ‼️ **IMPORTANT**: review before committing — generated against lines 83-141.

```suggestion
Adicione testes de interação que abram um cartão de Secretaria, aguardem observações/documentos, gravem uma observação e acionem download; cubra também a filtragem de SecretariatDonorsClient.
```
</details>

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In app/admin/solicitacoes/client.tsx around lines 83-141, Adicione testes de interação que abram um cartão de Secretaria, aguardem observações/documentos, gravem uma observação e acionem download; cubra também a filtragem de SecretariatDonorsClient.
Reference anchor: app/admin/solicitacoes/client.tsx:83; rules: review evidence.
```
</details>
<!-- deep-review:fp:30e43c345bdba252 -->

### `lib/documents/issued-documents.ts`

_⚠️ Potential issue_ | _🟠 Major_ | _⚡ Quick win_

**A garantia de serialização da versão não tem teste observável.**

Premise: lib/documents/issued-documents.ts:23 bloqueia a solicitação antes de ler a última versão em :24-29; essa ordem é a garantia contra versões concorrentes duplicadas. → Path: __tests__/issued-documents.test.ts:15-24 verifica somente put e inserted, enquanto o fake em __tests__/helpers/fake-db.ts:121-123 cria o execute transacional como mock descartado e não expõe sua ordem. Remover o FOR UPDATE, executá-lo depois da leitura, ou trocar o lock pela tabela errada ainda aprova a suíte. → Verdict: uma regressão de concorrência na alocação da versão não possui proteção capaz de falhar.

Certificate: Premise: lib/documents/issued-documents.ts:21-29 depende de lock antes de findFirst e insert. → Path: o teste não observa execute nem ordem. → Verdict: remover ou reordenar o lock mantém a suíte verde e perde a garantia concorrente.

<details>
<summary>📝 Committable suggestion</summary>

> ‼️ **IMPORTANT**: review before committing — generated against lines 23-27.

```suggestion
Exponha o execute da transação no fake e registre a ordem dos mocks, então exija lock da aplicação antes da consulta da última versão; complemente com uma prova de concorrência em PostgreSQL quando a infraestrutura estiver disponível.
```
</details>

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In lib/documents/issued-documents.ts around lines 23-27, Exponha o execute da transação no fake e registre a ordem dos mocks, então exija lock da aplicação antes da consulta da última versão; complemente com uma prova de concorrência em PostgreSQL quando a infraestrutura estiver disponível.
Reference anchor: lib/documents/issued-documents.ts:23; rules: review evidence.
```
</details>
<!-- deep-review:fp:75c06a0aa1639f8c -->

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

### `__tests__/admin-actions.test.ts`

_🛠️ Refactor suggestion_ | _🟡 Minor_ | _⚡ Quick win_

**Make the authorization fixture honor the staff role.**

`authAs` resolves both authorization mocks for every non-null identity, including `secretaria`. The new Secretary tests therefore need one-off `mockRequireAdmin.mockRejectedValueOnce(...)` calls to simulate the production boundary, and a future direct Secretary call can accidentally execute with Administrator authorization. Configure `requireAdmin` to reject whenever `user.role === "secretaria"` while continuing to resolve the permitted capability mock; individual tests then start from the same role invariant as production.

Also applies to: __tests__/admin-actions.test.ts:203-207

Certificate: Premise: __tests__/admin-actions.test.ts:102-107 resolves `mockRequireAdmin` and `mockRequireCapability` for every truthy user → Improvement: Secretary tests receive the production role boundary by default → Fix: branch the fixture on `user.role` and reject `mockRequireAdmin` for Secretaria.
<!-- deep-review:fp:94264c701db68d1b -->

### `app/admin/benfeitores/client.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Desdobre os novos componentes de operação por papel.**

Os novos fluxos de Secretaria estão concentrados em expressões de uma única linha, que misturam estado, filtragem, renderização condicional e campos sensíveis. Essa forma torna mudanças de permissão ou de dados operacionais difíceis de revisar e aumenta o custo de manter os componentes; desdobre as declarações e extraia os cartões/linhas repetidos em JSX estruturado.

Also applies to: app/admin/_actions/observation-actions.ts:18-36, app/admin/_actions/staff-actions.ts:27-75, app/admin/_components/issued-documents.tsx:8-13, app/admin/_components/application-observations.tsx:6-9, app/admin/_components/application-card.tsx:311

Certificate: Premise: app/admin/benfeitores/client.tsx:93-100 contém todo o fluxo de busca e a árvore de cartões da Secretaria em poucas expressões sem quebras estruturais → Improvement: reduz o custo de revisar campos expostos e de alterar cada estado do fluxo → Fix: formate o componente e extraia um cartão de benfeitor da Secretaria com props tipadas.
<!-- deep-review:fp:448e6d06dec33646 -->

### `app/solicitar-bolsa/layout.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Evite manter duas cópias idênticas do layout do formulário.**

O novo layout canônico é byte a byte idêntico a `app/form/layout.tsx`. Qualquer correção de acessibilidade, texto ou composição terá de ser aplicada e revisada duas vezes, e as duas rotas podem divergir silenciosamente. Extraia o conteúdo para um componente/layout compartilhado consumido pelas duas rotas, ou remova o layout legado se ele não for necessário durante o redirecionamento.

Certificate: Premise: app/solicitar-bolsa/layout.tsx:11-104 é idêntico a app/form/layout.tsx:11-104 → Improvement: uma única fonte elimina duas superfícies de manutenção para o mesmo cabeçalho e conteúdo institucional → Fix: mover a composição para um componente compartilhado e usá-lo nos dois layouts, ou eliminar a cópia legada após confirmar que o redirect não a requer.
<!-- deep-review:fp:bae7aeab2d253fcb -->

### `lib/documents/issued-documents.ts`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Evite converter a transação para o tipo global de banco.**

A conversão `tx as unknown as typeof db` descarta a verificação de tipos exatamente no bloco que precisa permanecer atômico. Consultar a versão com o query builder da própria transação preserva os tipos e torna futuras mudanças na transação verificáveis pelo compilador.

Certificate: Premise: lib/documents/issued-documents.ts:20 converte `tx` por `unknown` para `typeof db` → Improvement: o compilador volta a validar a API usada dentro da unidade atômica → Fix: substitua a leitura relacional por uma consulta tipada em `tx`.
<!-- deep-review:fp:92de4a0864a6f635 -->

### `.compozy/tasks/donor-first-role-access/_techspec.md`

_🛠️ Refactor suggestion_ | _🔵 Trivial_ | _⚡ Quick win_

**Remove o pseudo-contrato Go sem consumidor.**

O TechSpec introduz um struct Go apenas para alegada conformidade de template, embora o projeto seja Next.js/TypeScript e o próprio texto diga que não há componente Go. Mantê-lo cria uma segunda representação de identidade que não é usada nem verificada e aumenta o risco de documentação divergente.

Certificate: Premise: .compozy/tasks/donor-first-role-access/_techspec.md:207-216 declara que CapabilityContext é somente uma estrutura Go de conformidade e não introduz runtime → Improvement: elimina uma representação de contrato sem consumidor, deixando a especificação alinhada ao runtime TypeScript → Fix: remova o parágrafo e o bloco Go.
<!-- deep-review:fp:1afe46414eb99043 -->

### `__tests__/application-schema.test.ts`

_🧹 Nitpick_ | _🔵 Trivial_ | _⚡ Quick win_

**Assert which required document field produced each rejection.**

The new table-driven checks only assert `success === false`. They prove the fixture is rejected, but not that the document group under iteration is the reason; a future unrelated validation regression could keep these tests green while the required-document rule changes. Inspect the Zod issue paths and assert that each iteration includes its field, and do the same for the two student fields.

Also applies to: __tests__/application-schema.test.ts:161-166

Certificate: Premise: __tests__/application-schema.test.ts:151-157 mutates one named group but asserts only the aggregate parse result → Improvement: preserves a field-specific regression signal for each mandatory upload → Fix: collect `result.error.issues` and assert the current field path is present.
<!-- deep-review:fp:81609d616099bc69 -->

### `app/seja-um-benfeitor/page.tsx`

_🧹 Nitpick_ | _🔵 Trivial_ | _⚡ Quick win_

**Formate a árvore JSX da página de benfeitor.**

Toda a árvore JSX, incluindo os dados bancários que tendem a receber alterações, está em uma única linha. Isso torna diffs, revisão e mudanças localizadas desnecessariamente difíceis. Quebre os elementos e atributos em linhas estruturadas, seguindo o padrão já usado no layout de solicitação.

Certificate: Premise: app/seja-um-benfeitor/page.tsx:12 concentra a árvore completa de página em uma linha → Improvement: linhas estruturadas tornam alterações nos campos bancários e na semântica revisáveis isoladamente → Fix: reformatar o retorno JSX em blocos aninhados sem alterar comportamento.
<!-- deep-review:fp:63db90b0264e7848 -->

## Review observability

- Candidates investigated: 61
- Reported before deduplication: 11
- Suppressed with recorded reason: 50
- Selected hunk lines covered by both lanes: 5448
