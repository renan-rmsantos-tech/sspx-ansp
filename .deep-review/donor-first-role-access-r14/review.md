# Deep Review — worktree:origin/main (round 1)

**Verdict: SHIP** — no Critical or Major finding remains open
**Defects: 0** (🔴 0 · 🟠 0 · 🟡 0) · advisories: 6 · duplicates: 0 · resolved since last round: 0 · merged duplicate reports: 0

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

**Atualizar o quadro de acompanhamento das tarefas concluídas.**

O quadro ainda marca as tarefas 02–05 como pendentes, embora as implementações correspondentes estejam presentes neste mesmo conjunto de alterações. Atualize os quatro estados para `completed` para que o artefato de execução continue sendo uma fonte de acompanhamento confiável.

Certificate: Premise: .compozy/tasks/donor-first-role-access/_tasks.md:7-10 marca as tarefas 02–05 como `pending` → Improvement: o status passa a refletir a execução efetiva e evita reexecução/relato incorreto → Fix: trocar os quatro estados para `completed`.
<!-- deep-review:fp:0bf59f9093c1531b -->

### `.compozy/tasks/donor-first-role-access/task_02.md`

_🛠️ Refactor suggestion_ | _🟡 Minor_ | _⚡ Quick win_

**Sincronizar o status dos arquivos de tarefa com a entrega.**

Os arquivos detalhados das tarefas 02–05 ainda declaram `status: pending`, apesar de suas implementações e testes terem sido adicionados. Marque-os como concluídos para manter o rastreamento do workflow consistente.

Also applies to: .compozy/tasks/donor-first-role-access/task_03.md:new:1-131, .compozy/tasks/donor-first-role-access/task_04.md:new:1-138, .compozy/tasks/donor-first-role-access/task_05.md:new:1-143

Certificate: Premise: .compozy/tasks/donor-first-role-access/task_02.md:2 declara `status: pending` → Improvement: o estado dos artefatos detalhados corresponde ao quadro e à implementação entregue → Fix: mudar o frontmatter das tarefas 02–05 para `completed`.
<!-- deep-review:fp:474aea773112af26 -->

### `app/admin/solicitacoes/client.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Extrair o painel expandido da Secretaria em componentes legíveis.**

O conteúdo expandido de documentos e observações foi concentrado em uma única expressão JSX longa. Separá-lo em componentes pequenos deixa os estados, ações assíncronas e futura alteração de permissões mais fáceis de revisar e testar.

Certificate: Premise: app/admin/solicitacoes/client.tsx:108 contém documentos, observações, textarea e ações de download/salvamento numa expressão JSX única → Improvement: reduzir a densidade local torna alterações de fluxo e revisão de dados restritos mais seguras → Fix: extrair painéis de documentos e observações em componentes nomeados com props explícitas.
<!-- deep-review:fp:e7caeeca36eb46c3 -->

### `__tests__/secretariat-donors-client.test.tsx`

_🧹 Nitpick_ | _🔵 Trivial_ | _⚡ Quick win_

**Extract the secretariat donor fixture.**

The complete donor projection is embedded inline in the render call. A named fixture keeps the test assertion focused on filter behavior and makes later projection-field changes easier to review.

Certificate: Premise: __tests__/secretariat-donors-client.test.tsx:11 embeds all donor fields inside render → Improvement: fixture changes and interaction assertions become visually separate → Fix: declare a `const donor` fixture above the test and pass `[donor]` to the component.
<!-- deep-review:fp:9bb37d107e897630 -->

### `app/seja-um-benfeitor/page.tsx`

_🛠️ Refactor suggestion_ | _🔵 Trivial_ | _⚡ Quick win_

**Format the donor page JSX into named blocks.**

The whole donor page, including the bank-data section and donor form, is encoded as one JSX line. Splitting it into normal multiline JSX (and optionally a small `BankDetails` component) makes copy and account details reviewable and reduces the chance of accidental edits to the transfer instructions.

Certificate: Premise: app/seja-um-benfeitor/page.tsx:12 contains the complete page tree on one line → Improvement: account details and hierarchy become independently readable in review and maintenance → Fix: expand the JSX into semantic multiline blocks, optionally extracting the bank-details section.
<!-- deep-review:fp:c52f30920c9f6d2c -->

### `lib/documents/issued-documents.ts`

_🛠️ Refactor suggestion_ | _🔵 Trivial_ | _⚡ Quick win_

**Make current-document selection explicit.**

The comma-expression predicate in `listCurrentIssuedDocuments` mutates `seen` as part of `filter`. An explicit loop or a `Map` communicates the one-current-version-per-kind invariant directly and is easier to safely extend when a third final-document type is introduced.

Certificate: Premise: lib/documents/issued-documents.ts:57-58 combines membership testing and Set mutation inside a filter predicate → Improvement: the current-version selection invariant becomes immediately legible → Fix: build a map/array with an explicit loop over the ordered records.
<!-- deep-review:fp:1fbe28b95f89b8cb -->

## Review observability

- Candidates investigated: 25
- Reported before deduplication: 6
- Suppressed with recorded reason: 19
- Selected hunk lines covered by both lanes: 5543
