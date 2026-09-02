# Deep Review — worktree:origin/main (round 1)

**Verdict: FIX_BEFORE_SHIP** — 0 Critical and 3 Major findings remain open; each names a bounded fix
**Defects: 4** (🔴 0 · 🟠 3 · 🟡 1) · advisories: 11 · duplicates: 0 · resolved since last round: 0 · merged duplicate reports: 0

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

**Cover issued-document actions at the role and eligibility boundary.**

Premise: the new current-document, ticket, and history actions have no direct tests; export tests only assert rendered PDF content and the UI tests mock these actions. → Path: a regression that returns every issued row to Secretaria, permits an old ID in getIssuedDocumentUrl, or removes the rejected/pending eligibility filtering still leaves the current suite green. → Verdict: Secretariat can receive a superseded or ineligible final document without a failing-capable test. Add action-level cases for administrator versus Secretaria, pending/rejected/approved status, old versus current IDs, missing files, download-only ticket scope, and admin-only history; assert the export actions create the immutable record as part of the same boundary coverage.

Certificate: Premise: no test directly invokes the actions added at app/admin/_actions/admin-actions.ts:815-842 with a Secretaria identity. → Path: returning all versions or accepting an old issued ID bypasses the role-specific branches. → Verdict: a Secretaria document-disclosure regression passes the current suite.

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In app/admin/_actions/admin-actions.ts around lines 815-842, correct the failure mode described in the finding at the owning layer
Reference anchor: app/admin/_actions/admin-actions.ts:815; rules: review evidence.
```
</details>
<!-- deep-review:fp:6dde159cd9407e68 -->

### `app/form/_components/step-4-expenses.tsx`

_⚠️ Potential issue_ | _🟠 Major_

**Arquivos obrigatórios com mesmo nome se sobrescrevem após o envio.**

Premise: `step-3-income.tsx:98-105` e `step-4-expenses.tsx:85-94` habilitam múltiplos arquivos por categoria, enquanto `form-actions.ts:349-355` remove o UUID por-upload ao mover cada caminho para `applications/{applicationId}/{category}/{filename}`; o driver em `lib/storage/index.ts:60-65` usa `rename`, que substitui um destino existente no POSIX. → Path: uma família envia, por exemplo, dois extratos bancários chamados `extrato.pdf`; os tickets produzem UUIDs distintos, mas os dois moves miram o mesmo destino e o segundo substitui o primeiro, embora sejam inseridas duas linhas de documento. → Verdict: a aplicação aceita e registra evidências múltiplas, mas uma delas é perdida e ambos os registros passam a apontar para o arquivo remanescente. Preserve o segmento UUID (ou acrescente um nome de destino único) no caminho final e cubra nomes repetidos.

Certificate: Premise: app/form/_components/step-3-income.tsx:98-105 e step-4-expenses.tsx:85-94 permitem múltiplos arquivos, app/form/_actions/form-actions.ts:349-355 remove o UUID por upload e lib/storage/index.ts:60-65 chama rename sem recusar um alvo existente. → Path: dois arquivos de mesma categoria e mesmo nome são movidos para applications/{applicationId}/{category}/{filename}. → Verdict: o segundo rename substitui o primeiro, e duas linhas de documentos passam a referenciar apenas o último arquivo.

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In app/form/_components/step-4-expenses.tsx around lines 92, correct the failure mode described in the finding at the owning layer
Reference anchor: app/form/_components/step-4-expenses.tsx:92; rules: review evidence.
```
</details>
<!-- deep-review:fp:d94e3659fe8091f9 -->

### `lib/documents/issued-documents.ts`

_⚠️ Potential issue_ | _🟠 Major_

**Test the concurrent version-allocation invariant.**

Premise: the only version-allocation test invokes one issuance serially and only asserts the resulting version; it neither starts competing transactions nor observes the FOR UPDATE call. → Path: removing or weakening the application-row lock at issued-documents.ts:23 lets two concurrent same-kind issuances both read the same latest version and attempt the same next version. → Verdict: the suite still passes while the required concurrency guarantee can regress into a failed issuance/orphaned stored PDF. Add a deterministic two-caller test that holds the first allocation until the second attempts it, then verifies distinct persisted versions (and the expected compensation behavior).

Certificate: Premise: __tests__/issued-documents.test.ts:15-22 invokes persistIssuedDocument only once and does not observe tx.execute. → Path: removing the FOR UPDATE at lib/documents/issued-documents.ts:23 allows two concurrent callers to allocate the same next version. → Verdict: this required concurrency regression passes the current suite.

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In lib/documents/issued-documents.ts around lines 23, correct the failure mode described in the finding at the owning layer
Reference anchor: lib/documents/issued-documents.ts:23; rules: review evidence.
```
</details>
<!-- deep-review:fp:ed9d0b2c5b3228df -->

### `components/ui/seal-logo.tsx`

_⚠️ Potential issue_ | _🟡 Minor_ | _⚡ Quick win_

**Selos decorativos repetem o nome institucional para leitores de tela.**

Premise: `SealLogo` torna toda chamada informativa por padrão, mas a navegação e o rodapé já contêm o nome completo visível, e as páginas canônicas também apresentam texto institucional imediatamente ao lado do selo. → Path: um leitor de tela entra em `app/page.tsx:337-342` ou `app/solicitar-bolsa/page.tsx:16` e recebe primeiro o alt do selo e logo o mesmo nome textual. → Verdict: as instâncias decorativas não usam a semântica decorativa que o novo componente oferece, contrariando o requisito de evitar nomes acessíveis duplicados. Passe `decorative` nessas instâncias (mantendo alt informativo somente quando o selo for a única identificação).

Certificate: Premise: components/ui/seal-logo.tsx:8-16 define alt informativo por padrão, enquanto app/page.tsx:337-342 e 546-550 e as páginas canônicas já exibem o nome institucional junto do selo. → Path: um leitor de tela anuncia o alt do img e o texto institucional adjacente em cada uma dessas instâncias. → Verdict: nomes acessíveis são duplicados em usos decorativos, contrariando o requisito de distinguir essas instâncias.
<!-- deep-review:fp:1d3c4a2990826d86 -->

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

### `.compozy/tasks/donor-first-role-access/_tasks.md`

_🛠️ Refactor suggestion_ | _🟡 Minor_ | _⚡ Quick win_

**Atualize o rastreador para refletir as tarefas entregues.**

As tarefas 02–05 continuam marcadas como `pending`, embora o mesmo change set já inclua seus módulos, rotas, migração e testes. Isso torna o artefato de acompanhamento inconsistente com a entrega e impede que um leitor determine quais critérios ainda demandam trabalho. Marque cada tarefa concluída após conferir seus critérios de aceite e os gates finais.

Certificate: Premise: .compozy/tasks/donor-first-role-access/_tasks.md:8-11 mantém as quatro tarefas de implementação como `pending` → Improvement: o status passa a comunicar com precisão o estado da release e os critérios restantes → Fix: após a verificação final de cada tarefa, altere seus quatro status para `completed`.
<!-- deep-review:fp:d4754eccf1ec52e3 -->

### `app/admin/_components/application-observations.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_ | _⚡ Quick win_

**Make observation loading state explicit.**

The asynchronous fetch is fire-and-forget and casts its result directly into state. A rejected request is silently rendered as no observations, which makes operational troubleshooting difficult. Use a typed result state with a rejection handler and a mounted guard.

Certificate: Premise: app/admin/_components/application-observations.tsx:7-9 initializes items as [] and only sets it in .then(...) → Improvement: let staff distinguish an unavailable history from an empty history → Fix: replace the assertion-based callback with a typed async loader that exposes loading/error and cancels on cleanup.
<!-- deep-review:fp:8a59e9be51d15b42 -->

### `app/admin/_components/issued-documents.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_ | _⚡ Quick win_

**Handle issued-document loading failures explicitly.**

The effect assumes both server actions resolve and has no cancellation guard. Give this component a small loading/error state (and ignore a settled effect) so an authorization or network failure does not leave an indistinguishable empty document section or attempt a state update after the card is closed.

Certificate: Premise: app/admin/_components/issued-documents.tsx:11 calls Promise.all(...).then(...) with no rejection handler or cleanup → Improvement: distinguish a failed fetch from an empty list and avoid stale state updates → Fix: track mounted/loading/error around the async load and render a concise retry/error message.
<!-- deep-review:fp:b552dac7434d29ef -->

### `app/admin/benfeitores/client.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Break the secretariat donor view into readable JSX units.**

The complete secretary view is encoded as two very long JSX lines. This makes changes to the role-specific data boundary and labels unnecessarily hard to review, test, and maintain. Format it into conventional nested JSX and extract the repeated donor card body if it remains substantial.

Certificate: Premise: app/admin/benfeitores/client.tsx:93-97 contains the component state, filtering, search field, empty state, and entire donor-card tree in a compact block → Improvement: reviewers can inspect each displayed operational field and future edits produce focused diffs → Fix: expand the JSX and, if useful, introduce a small SecretariatDonorCard component.
<!-- deep-review:fp:c645201d9207cf5e -->

### `app/admin/benfeitores/page.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Remove role-branching donor type assertions.**

The page uses assertions, including a double unknown cast, to turn one untyped action result into two incompatible client contracts. Encode the admin and secretariat projections in getDonorPledges' return type (or normalize them at the action boundary) so new sensitive fields cannot be accidentally passed to the secretary client without a compile-time review.

Certificate: Premise: app/admin/benfeitores/page.tsx:21-23 passes `(donors as SecretariatDonorPledge[])` and `(donors as unknown as DonorPledge[])` → Improvement: preserve the server's role-specific projection as a checked boundary → Fix: return a role-discriminated typed result from getDonorPledges and narrow it before rendering.
<!-- deep-review:fp:4bc4c171d415071a -->

### `app/admin/solicitacoes/client.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_ | _⚡ Quick win_

**Derive the secretariat state types from the actions.**

The state assignments silence their static contract with `as typeof notes` and `as typeof documents`. If either Server Action changes its projection, the component will still compile while incorrectly assuming the old payload shape. Declare the state types from `Awaited<ReturnType<…>>` (or export shared DTOs from the actions) and remove the assertions.

Certificate: Premise: app/admin/solicitacoes/client.tsx:103-109 manually declares abbreviated result shapes and then casts both Server Action results to those shapes → Improvement: action projection changes become TypeScript errors at this consumer → Fix: type each state from the corresponding `Awaited<ReturnType<typeof action>>` and pass the values without assertions.
<!-- deep-review:fp:ea70bf1c5913cd12 -->

### `app/admin/usuarios/client.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_ | _⚡ Quick win_

**Format the Secretaria-user client into maintainable units.**

All handlers and the complete form/list JSX are encoded in one source line. That prevents useful blame and diff granularity and makes changes to validation, state updates, and controls unnecessarily difficult to review. Split the three handlers and JSX into conventional multi-line statements; apply the same treatment to the compact page wrapper.

Also applies to: app/admin/usuarios/page.tsx:7

Certificate: Premise: app/admin/usuarios/client.tsx:8 contains `create`, `toggle`, `reset`, and both rendered sections in one line; app/admin/usuarios/page.tsx:7 follows the same pattern → Improvement: future edits have line-level review/blame and maintainers can reason about each asynchronous transition separately → Fix: reflow the handlers and JSX into named, multi-line blocks.
<!-- deep-review:fp:a3cc45549e2fbe5f -->

### `app/seja-um-benfeitor/page.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Formate os JSXs das páginas canônicas.**

As duas novas páginas concentram toda a árvore JSX em uma única linha. Isso torna alterações no conteúdo, nas classes Tailwind e na estrutura semântica desnecessariamente difíceis de revisar e aumenta a chance de conflitos de merge. Reestruture cada árvore com quebras e indentação por elemento, mantendo o comportamento atual.

Also applies to: app/solicitar-bolsa/page.tsx:16

Certificate: Premise: app/seja-um-benfeitor/page.tsx:12 contém o formulário, a seção bancária e o cabeçalho em uma única linha → Improvement: uma árvore JSX estruturada permite localizar e alterar cada elemento sem varrer uma linha de centenas de caracteres → Fix: expanda o retorno em elementos e filhos indentados.
<!-- deep-review:fp:ffba6d35d1d303ef -->

### `.compozy/tasks/donor-first-role-access/_techspec.md`

_🧹 Nitpick_ | _🔵 Trivial_ | _⚡ Quick win_

**Remova o exemplo Go que não pertence ao runtime.**

A TechSpec de uma aplicação TypeScript introduz um `CapabilityContext` em Go apenas para uma alegada conformidade de template, sem consumidor ou outra referência Go no projeto. O contrato fica duplicado e pode divergir do `StaffIdentity` TypeScript que a própria seção já define. Preserve somente a interface TypeScript como fonte documental do contrato de autorização.

Certificate: Premise: .compozy/tasks/donor-first-role-access/_techspec.md:207-216 adiciona uma struct Go declarada como sem componente de runtime → Improvement: elimina um segundo contrato sem consumidor e reduz risco de divergência da interface TypeScript → Fix: remova o bloco de explicação e a struct Go, mantendo `StaffIdentity` em linhas 167-179 como contrato documentado.
<!-- deep-review:fp:6e75c4f4664d6cb8 -->

### `__tests__/application-schema.test.ts`

_🛠️ Refactor suggestion_ | _🔵 Trivial_ | _⚡ Quick win_

**Cover nested parent-document requirements independently.**

The new parameterized test covers only top-level document groups. It does not prove that the two nested required groups (`pai.documentos` and `mae.documentos`) reject an empty array independently, so a future schema relaxation for either parent can pass this focused required-upload suite unnoticed.

Certificate: Premise: __tests__/application-schema.test.ts:154-160 enumerates declaracao_vaga, certidao_casamento, comprovante_endereco, extrato_ir, and extratos_bancarios only → Improvement: each required parent upload has an explicit regression boundary → Fix: add pai.documentos and mae.documentos empty-array cases using their nested paths.
<!-- deep-review:fp:1dfebcbc9afdf744 -->

### `docs/changes/2026-07-27.md`

_🧹 Nitpick_ | _🔵 Trivial_ | _⚡ Quick win_

**Revise a redação dos requisitos de perfis.**

O registro que define os limites entre administrador e secretaria contém erros de concordância, capitalização e frases ambíguas. Como este texto é a origem legível dos requisitos de acesso, uma revisão curta reduz a chance de interpretações diferentes em futuras alterações.

Also applies to: docs/changes/2026-07-27.md:15-17

Certificate: Premise: docs/changes/2026-07-27.md:12 escreve "todos as funcionalidades" e a seção Secretaria em :17 contém "observaçÕes", "Ver somente só um resultado" e "acessa também a os documentos" → Improvement: requisitos de autorização ficam inequívocos para manutenção futura → Fix: reescreva as duas descrições em português revisado, preservando as permissões pretendidas.
<!-- deep-review:fp:43fbb84541cf93d9 -->

## Review observability

- Candidates investigated: 49
- Reported before deduplication: 15
- Suppressed with recorded reason: 34
- Selected hunk lines covered by both lanes: 5276
