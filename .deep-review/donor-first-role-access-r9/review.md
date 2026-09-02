# Deep Review — worktree:origin/main (round 1)

**Verdict: FIX_BEFORE_SHIP** — 0 Critical and 4 Major findings remain open; each names a bounded fix
**Defects: 4** (🔴 0 · 🟠 4 · 🟡 0) · advisories: 8 · duplicates: 0 · resolved since last round: 0 · merged duplicate reports: 0

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

### `__tests__/admin-actions.test.ts`

_⚠️ Potential issue_ | _🟠 Major_

**Privileged action tests do not exercise a real Secretaria denial matrix.**

Premise: __tests__/admin-actions.test.ts:96-105 makes both mocked guards resolve for any non-null identity, including the Secretaria fixture at :191, while :117-142 tests only an unauthenticated caller. → Path: a future change that replaces requireAdmin() in approve/reject, applicant-detail/evidence, donor mutation/export, templates, or school-year actions with a Secretariat capability will still make every current test pass. → Verdict: the suite cannot detect a regression that grants a Secretaria role prohibited administrative operations, despite Task 2 requiring a deny assertion for every exported action outside the explicit matrix. Add a table-driven test that configures requireAdmin to reject and requireCapability to resolve for Secretaria, then verifies every privileged export rejects before any database/storage call; keep separate positive tests only for the approved operational actions.

Certificate: Premise: __tests__/admin-actions.test.ts:96-105 resolves both authorization mocks for every authenticated identity → Path: a privileged action is weakened from requireAdmin() to an operational capability that resolves for Secretaria → Verdict: the suite stays green while Secretaria gains a prohibited administrative operation.

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In __tests__/admin-actions.test.ts around lines 96-142, correct the failure mode described in the finding at the owning layer
Reference anchor: __tests__/admin-actions.test.ts:96; rules: review evidence.
```
</details>
<!-- deep-review:fp:12123d42536a55f2 -->

_⚠️ Potential issue_ | _🟠 Major_ | _⚡ Quick win_

**Secretariat projections have no field-level regression test.**

Premise: __tests__/admin-actions.test.ts:154-188 exercises getApplications only with the default Administrator identity and asserts returned fixture data, while no test invokes getApplications or getDonorPledges as Secretaria or inspects the Drizzle columns. → Path: adding cpf, income, discounts, rationale, documents, receipt metadata, or another sensitive field to either Secretaria query in app/admin/_actions/admin-actions.ts will leave the current suite green. → Verdict: the changed server-side privacy boundary has no failing-capable protection against leaking family or donor data to the Secretaria client. Add role-specific tests that assert the exact selected and returned key sets (including nested students) and that forbidden fields are absent for both application and donor projections.

Certificate: Premise: __tests__/admin-actions.test.ts:154-188 calls getApplications only as the default Administrator and asserts no selected/returned keys → Path: a forbidden sensitive column is added to a Secretaria application or donor projection → Verdict: family or donor data reaches the Secretaria client while npm test remains green.

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In __tests__/admin-actions.test.ts around lines 154-188, correct the failure mode described in the finding at the owning layer
Reference anchor: __tests__/admin-actions.test.ts:154; rules: review evidence.
```
</details>
<!-- deep-review:fp:0572c36824cb0f6f -->

_⚠️ Potential issue_ | _🟠 Major_ | _⚡ Quick win_

**PDF export tests do not prove immutable issuance is wired to exports.**

Premise: __tests__/issued-documents.test.ts:15-34 verifies persistIssuedDocument in isolation, but the decision and contract export tests at __tests__/admin-actions.test.ts:536-706 assert only base64/filename/template rendering and never inspect storage or issued_documents writes. → Path: deleting or bypassing persistIssuedDocument after either render leaves exports visually successful and all current tests passing. → Verdict: the primary Task 3 contract—each final export creates an immutable persisted version—is unprotected at the action boundary. Add one success test per export asserting storage write plus an issued_documents row with kind, actor, version, immutable path, and a compensating failure test for metadata persistence.

Certificate: Premise: __tests__/issued-documents.test.ts:15-34 tests persistence directly while export tests assert only rendered output → Path: persistIssuedDocument is removed or bypassed after a decision or contract render → Verdict: a final PDF is returned without an immutable issued-document version and all current tests pass.

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In __tests__/admin-actions.test.ts around lines 536-706, correct the failure mode described in the finding at the owning layer
Reference anchor: __tests__/admin-actions.test.ts:536; rules: review evidence.
```
</details>
<!-- deep-review:fp:0bdc0f64c3f83ff0 -->

### `__tests__/form-page.test.tsx`

_⚠️ Potential issue_ | _🟠 Major_

**The donor-first route and identity migration has no regression suite.**

Premise: the changed public surface adds canonical donor/scholarship routes, permanent legacy redirects, link hierarchy, contact replacement, and shared seal usage, but the current test directory contains no public-experience test and form-page coverage is limited to the scholarship page. → Path: changing /benfeitor or /form to a temporary/chained redirect, restoring an old public CTA/email/admin shortcut, or breaking SealLogo accessibility would pass npm test. → Verdict: the Task 4 route and public-identity contract lacks failing-capable automated protection. Add a focused public-experience suite covering direct 308 targets, DOM order/CTA destinations, old-link/email absence, SealLogo informative/decorative semantics, canonical dynamic page behavior, and the FSSPX responsive acceptance with rendered checks.

Certificate: Premise: rg --files __tests__ finds no public-experience, canonical-route, or seal-logo suite → Path: a legacy route becomes temporary/chained or a public CTA/email/seal semantic regresses → Verdict: the donor-first public contract breaks while npm test remains green.

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In __tests__/form-page.test.tsx around lines 1-60, correct the failure mode described in the finding at the owning layer
Reference anchor: __tests__/form-page.test.tsx:1; rules: review evidence.
```
</details>
<!-- deep-review:fp:6e761d562684e0a6 -->

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

### `app/admin/_components/sidebar.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_ | _⚡ Quick win_

**Require the rendered staff role.**

The component defaults an omitted role to `admin`, so a future authenticated caller that forgets the prop silently renders privileged navigation rather than failing at compile time. Make `role` required and update isolated component tests to pass the intended role explicitly.

Certificate: Premise: app/admin/_components/sidebar.tsx:94 assigns `role = "admin"` when no identity is supplied → Improvement: missing role propagation becomes a TypeScript error instead of an implicit privileged UI → Fix: make `role: StaffRole` mandatory and pass `role="admin"` in tests.
<!-- deep-review:fp:b12ebfb87364cdf8 -->

### `app/admin/benfeitores/page.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Avoid the double assertion for the admin donor projection.**

Casting through `unknown` hides any future mismatch between the admin query result and `DonorPledge`, including a missing field that the administrative card consumes. Expose role-specific return types from `getDonorPledges` (or construct a typed admin projection) so this boundary is checked by TypeScript.

Certificate: Premise: app/admin/benfeitores/page.tsx:23 converts `donors` with `as unknown as DonorPledge[]` → Improvement: changes to the database projection remain type-checked at the rendering boundary → Fix: give `getDonorPledges` discriminated/role-specific result types and remove the `unknown` bridge.
<!-- deep-review:fp:b9c435d2e2fa4d2f -->

### `app/admin/solicitacoes/client.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Split the Secretariat card into readable units.**

The new card keeps its state, asynchronous data loading, mutations, and both UI sections in densely packed single-line expressions. Splitting the document and observation sections into named components/functions and formatting their handlers makes the role-restricted surface auditable and lowers the cost of changing either action.

Also applies to: app/admin/usuarios/client.tsx:13-16, app/admin/usuarios/page.tsx:8

Certificate: Premise: app/admin/solicitacoes/client.tsx:103-136 → Improvement: separating the 34-line dense card flow makes its independent async actions and sensitive-data UI straightforward to inspect → Fix: extract the document and observation subsections plus their handlers into readable named units.
<!-- deep-review:fp:0cb11adc44af3fcc -->

### `app/admin/solicitacoes/page.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Expose the role-specific application projection in the action type.**

Both render branches assert the untyped result of getApplications, including an as unknown as cast for the admin view. Those casts make a future projection change compile while silently breaking either client contract. Return a typed, role-discriminated result (or dedicated typed queries) and narrow it before rendering.

Certificate: Premise: app/admin/solicitacoes/page.tsx:20-22 → Improvement: a typed role-specific result lets TypeScript verify every field consumed by each client → Fix: model the two projections in the server-action return type and narrow on role instead of casting at the JSX boundary.
<!-- deep-review:fp:2596cfb24d3adda1 -->

### `app/solicitar-bolsa/layout.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Share the duplicated scholarship layout.**

The new canonical layout is byte-for-byte identical to app/form/layout.tsx. Keeping two route layouts means institutional copy, logo semantics, and responsive styling can silently diverge even though /form redirects to the canonical flow.

Also applies to: app/form/layout.tsx:1-104

Certificate: Premise: app/solicitar-bolsa/layout.tsx:11-104 and app/form/layout.tsx:1-104 have identical contents → Improvement: one authoritative layout removes duplicate maintenance and future drift → Fix: extract the layout body to a shared component and have both route layouts delegate to it, or make the redirect-only legacy route reuse the canonical layout.
<!-- deep-review:fp:be778157dfbc3f43 -->

### `lib/documents/issued-documents.ts`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Give the transaction client its actual type.**

The double assertion makes the transaction client appear to have exactly the root database type, bypassing static checking of the transaction API. Defining and using the Drizzle transaction type keeps relation queries and inserts checked when the database setup changes.

Certificate: Premise: lib/documents/issued-documents.ts:20 coerces tx through unknown to typeof db → Improvement: changes to the transaction API remain type-checked instead of being masked by an opaque assertion → Fix: export or derive the concrete transaction type from the configured Drizzle client and annotate tx/queryable with it.
<!-- deep-review:fp:0f0c7c6c976aa92c -->

### `__tests__/admin-actions.test.ts`

_🛠️ Refactor suggestion_ | _🔵 Trivial_ | _⚡ Quick win_

**Model the Secretaria fixture without an Administrator cast.**

The role-boundary tests pass a Secretaria fixture through `as typeof MOCK_USER`, which asserts at compile time that `role` is the literal `admin`. Giving `authAs` a shared staff-identity type lets the fixture retain its actual role and keeps these authorization tests honest as their helper evolves.

Certificate: Premise: __tests__/admin-actions.test.ts:194 and :205 cast a `{ role: "secretaria" }` fixture to the Administrator fixture type → Improvement: the mock input preserves the role under test and cannot silently rely on an unsound cast → Fix: type `authAs` against a role-union staff fixture (or `StaffIdentity`) and pass `secretaria` directly.
<!-- deep-review:fp:2b55029766623809 -->

### `app/seja-um-benfeitor/page.tsx`

_🛠️ Refactor suggestion_ | _🔵 Trivial_ | _⚡ Quick win_

**Format the canonical donor page as readable JSX.**

The whole page body is emitted as one 2,000+ character JSX line. Breaking the header, bank-details section, and form into normal JSX blocks makes future copy and accessibility changes reviewable without changing behavior.

Certificate: Premise: app/seja-um-benfeitor/page.tsx:12 contains the complete component tree on one physical line → Improvement: individual semantic sections and attributes become locally reviewable → Fix: format the returned JSX into the repository's normal multiline component style.
<!-- deep-review:fp:fa7a4fc1d449f8ea -->

## Review observability

- Candidates investigated: 55
- Reported before deduplication: 12
- Suppressed with recorded reason: 43
- Selected hunk lines covered by both lanes: 5406
