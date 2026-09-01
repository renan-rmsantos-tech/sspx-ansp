---
status: pending
title: Implement Administrator and Secretariat profiles
type: refactor
complexity: critical
dependencies:
  - task_01
---

# Task 2: Implement Administrator and Secretariat profiles

## Overview

Implement distinct administrative experiences for Administrators and Secretariat staff while keeping both under `/admin`. Preserve every current Administrator capability, expose only approved operational workflows to the Secretariat, and prevent prohibited fields from being selected or delivered to the client.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. Every administrative page and Server Action MUST use Task 01 identities and capabilities; hidden navigation or buttons MUST NOT be the security boundary.
2. Administrators MUST retain every current operation and MUST be able to list, create, deactivate, reactivate, and reset individual Secretariat accounts.
3. Staff management MUST operate only on `secretaria` accounts; the server assigns the role, accounts cannot be deleted, and client input cannot create or alter Administrators.
4. The Secretariat application projection MUST contain only ID, status, school, parent names, phone, email, decision date, and student IDs/names.
5. The Secretariat projection MUST NOT select or return income, expenses, requested or granted discounts, rationale, decision author, applicant documents, vehicles, collaboration, other children, or suggested benefactors.
6. Secretariat users MUST see pending applications as “Aguardando decisão” but MUST NOT access complete detail, full exports, approval, rejection, configuration, or PDF issuance.
7. Observations MUST be append-only, trimmed to 1–2,000 characters, authored and dated by the server, and chronological. Secretariat may create/read; Administrators may read; no edit/delete path may exist.
8. Secretariat donor data MUST read only public donor-form enrollments from `donor_pledges`, follow the operational allowlist in the TechSpec, exclude scholarship-suggested benefactors, and exclude CPF, address, CEP, receipt metadata/download, export, and deletion.
9. Navigation, titles, empty states, and controls MUST reflect the active role in pt-BR and direct access to unauthorized pages MUST be denied.
10. Logs SHOULD contain only actor/target IDs and authorization metadata, never passwords, hashes, note bodies, CPF, contact details, or family data.
11. Existing Administrator behavior, including the pending-only concurrent decision guard, MUST remain compatible.
12. Current applicant-evidence download MUST remain Administrator-only and MUST NOT be exposed through the Secretariat experience.
</requirements>

## Subtasks

- [ ] 2.1 Classify and protect every existing administrative page and Server Action with the approved capability matrix.
- [ ] 2.2 Deliver `/admin/usuarios` for Secretariat account creation, listing, deactivation, reactivation, and password reset.
- [ ] 2.3 Make the admin layout and navigation role-aware and deny direct access to unavailable areas.
- [ ] 2.4 Create operational application list/detail projections and a Secretariat experience without sensitive fields or decision controls.
- [ ] 2.5 Add immutable observation history with authorship, timestamps, and focused operational guidance.
- [ ] 2.6 Add a read-only Secretariat donor projection while preserving the full Administrator donor experience.
- [ ] 2.7 Cover the complete action, projection, route, and component matrix, including direct-access attempts.

## Implementation Details

Follow the TechSpec sections “Capability Matrix,” “Server Action Surface,” “Authentication and Account Management,” “Applications,” “Observations,” and “Benefactors.” Because the user approved a maximum of five tasks, this task intentionally aggregates several tightly related administrative surfaces; preserve internal boundaries by extracting staff and observation actions rather than expanding the existing monolithic file without limit.

`getApplications()` and `getApplicationDetail()` currently return broad rows and relations. The Secretariat path requires explicit server allowlists, not post-query object removal or client-side hiding. Likewise, `getDonorPledges()` requires a role-specific projection before data reaches client components.

Task 03 owns issued final-document persistence and Secretariat download. This task must not grant Secretariat access to the current path-based applicant-evidence action while waiting for Task 03.

### Relevant Files

- `app/admin/_actions/admin-actions.ts` — Existing operations, capability classification, and role-specific projections.
- `app/admin/_actions/staff-actions.ts` — New Administrator-only Secretariat account lifecycle.
- `app/admin/_actions/observation-actions.ts` — New append-only observation operations.
- `app/admin/layout.tsx` — Resolves active identity and provides role to the shell.
- `app/admin/_components/sidebar.tsx` — Role-specific navigation and Administrator user-management entry.
- `app/admin/solicitacoes/page.tsx` and `client.tsx` — Select and render the appropriate application experience.
- `app/admin/_components/application-card.tsx` and `application-detail.tsx` — Preserve full Administrator detail and add restricted operational presentation.
- `app/admin/benfeitores/page.tsx`, `client.tsx`, and `_components/donor-card.tsx` — Role-aware donor projections and controls.
- `app/admin/usuarios/page.tsx` and `client.tsx` — New Administrator-only account-management interface.

### Dependent Files

- `app/admin/_components/decision-actions.tsx` — Must never be rendered or reachable for Secretariat users.
- `app/admin/_components/document-preview.tsx` — Applicant evidence remains Administrator-only.
- `app/admin/ano-letivo/page.tsx`, `cabecalho/page.tsx`, `textos/page.tsx`, and `contrato/page.tsx` — Require Administrator capability at page and action boundaries.
- `lib/auth/password.ts` — Existing scrypt hashing used by creation and reset.
- `lib/db/schema.ts` — Supplies staff and observation models from Task 01.
- `__tests__/helpers/fake-db.ts` — Supports role projections and new observation/account writes.
- `__tests__/admin-actions.test.ts`, `solicitacoes-client.test.tsx`, `sidebar.test.tsx`, and `topbar.test.tsx` — Existing administrative test patterns.
- `__tests__/staff-management.test.ts`, `application-observations.test.ts`, and `benfeitores-role-access.test.tsx` — New focused coverage.

### Related ADRs

- [ADR-002: Separate Administrator and Secretariat capabilities by job responsibility](adrs/adr-002.md) — Defines the allowed product capabilities.
- [ADR-003: Extend the existing staff account model and centralize authorization](adrs/adr-003.md) — Requires database-backed checks on every protected operation.
- [ADR-004: Store Secretariat observations as append-only records](adrs/adr-004.md) — Defines observation immutability and authorship.

## Deliverables

- Capability matrix applied to every existing administrative page and action.
- Administrator-only Secretariat account lifecycle interface.
- Role-aware administrative shell and direct-access denial.
- Server-side allowlist projections for applications and donor enrollments.
- Append-only observations with author and timestamp.
- Full preservation of current Administrator behavior.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for role separation, direct access, and account revocation **(REQUIRED)**.

## Tests

- Unit tests — authorization and accounts:
  - [ ] Every exported administrative action accepts Administrator and denies Secretariat unless explicitly granted by the matrix.
  - [ ] Secretariat is denied approval, rejection, complete application detail/export, evidence tickets, school-year operations, templates, headers, donor export, and donor deletion.
  - [ ] Administrator retains the existing success and pending-only concurrent-decision behavior.
  - [ ] Account creation normalizes email, hashes the password, forces `secretaria` and active state, and ignores any client role value.
  - [ ] Duplicate email and short password fail without leaking database details or creating a row.
  - [ ] Listing omits password hashes and returns only Secretariat accounts.
  - [ ] Activation, deactivation, and reset cannot target an Administrator; no delete action exists.
- Unit tests — application projection:
  - [ ] Administrator receives the current complete application detail.
  - [ ] Secretariat receives exactly the approved allowlist keys.
  - [ ] Student rows contain only ID and name.
  - [ ] Returned keys never include financial fields, discounts, rationale, author, applicant documents, vehicles, collaboration, other children, or suggested benefactors.
  - [ ] Pending applications display “Aguardando decisão”.
- Unit tests — observations and donors:
  - [ ] Empty, whitespace-only, and 2,001-character notes fail; valid input is trimmed and attributed from the authenticated user.
  - [ ] Secretariat creates and reads observations; Administrator reads but does not create; no update/delete path exists.
  - [ ] Observation history is chronological and never enters PDF or full-export inputs.
  - [ ] Secretariat donor results contain only the operational allowlist and exclude CPF, address, CEP, receipt fields, export, and deletion.
  - [ ] Secretariat donor search works by name, email, and phone without CPF.
  - [ ] Administrator donor behavior remains unchanged.
- Integration tests:
  - [ ] Administrator sidebar shows Solicitações, Benfeitores, Usuários, and all Configurações; Secretariat sidebar shows only Solicitações and Benfeitores.
  - [ ] Direct Secretariat access to `/admin/usuarios`, `/admin/ano-letivo`, `/admin/cabecalho`, `/admin/textos`, and `/admin/contrato` is denied.
  - [ ] Secretariat solicitation UI contains approved operational data and no discount, finance, evidence, export, or decision controls.
  - [ ] Secretariat donor UI contains no CPF, address, receipt, export, or delete control.
  - [ ] An Administrator creates a Secretariat account; login succeeds; deactivation denies the next protected request; reactivation and password reset restore expected access.
  - [ ] A Secretariat observation becomes readable to an Administrator with author/date and appears in no family-facing PDF.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing.
- Test coverage >=80%.
- Administrators retain every existing capability and can manage individual Secretariat accounts.
- Secretariat can complete only the approved application, observation, and donor workflows.
- No prohibited application or donor field reaches a Secretariat client payload.
- Every direct page and Server Action access follows the same capability matrix.
- Observations remain immutable, authored, dated, internal, and excluded from PDFs.
- Applicant evidence and configuration surfaces remain Administrator-only.
