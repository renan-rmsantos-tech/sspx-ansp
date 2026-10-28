---
status: completed
title: Show next due and last reminder in the donor list
type: frontend
complexity: medium
dependencies:
  - task_05
---

# Show next due and last reminder in the donor list

## Overview
Make the schedule and most recent reminder outcome visible where administrators already review benefactors. The list should distinguish a pending reminder from Resend acceptance without exposing the private send payload.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST show next due date for active monthly plans and a clear ended state after the twelfth one-year occurrence.
- MUST show latest reminder kind, competence, state, and accepted time or safe failure/uncertain label to Administrador.
- MUST query reminder metadata without sending frozen body or recipient payload to the client.
- MUST preserve Secretariat's limited donor projection and avoid showing financial reminder operations to that role.
</requirements>

## Subtasks
- [x] 7.1 Extend the administrator list query with next due and latest reminder metadata.
- [x] 7.2 Display readable pt-BR states in the donor card.
- [x] 7.3 Verify active, ended, failed, and accepted views.

## Implementation Details
Follow TechSpec “Component Overview” and “Date and Recurrence Contract.” Preserve existing list search/filter behavior and welcome-email controls.

### Relevant Files
- `app/admin/_actions/admin-actions.ts` — admin versus Secretariat donor projection.
- `app/admin/_components/donor-card.tsx` — donor status display.
- `app/admin/benfeitores/client.tsx` — list state.

### Dependent Files
- `lib/db/schema.ts` — reminder status fields.
- `__tests__/donor-email-client.test.tsx` — list/email status pattern.

### Related ADRs
- [ADR-002: Anchor monthly occurrences at registration](adrs/adr-002.md)
- [ADR-003: Use a daily opted-in email job with per-occurrence reservations](adrs/adr-003.md)

## Deliverables
- Donor-list schedule and last-reminder metadata in admin view.
- Unit tests with at least 80% coverage of new display branches.
- Integration test that role-specific reads omit private payload.

## Tests
- Unit tests:
  - [x] A monthly plan shows the next due date; an expired one-year plan shows “Encerrado.”
  - [x] A `sent` 5-day row displays acceptance time without claiming inbox delivery; a failed row shows failure.
- Integration tests:
  - [x] Admin projection contains only reminder metadata, not frozen HTML/text or recipient fields.
  - [x] Secretariat projection does not include reminder operations or ledger fields.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every active monthly administrator card communicates its next due date and latest known reminder result.
