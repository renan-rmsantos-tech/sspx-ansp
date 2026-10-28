---
status: completed
title: Edit monthly due day in donor administration
type: frontend
complexity: medium
dependencies:
  - task_01
  - task_02
---

# Edit monthly due day in donor administration

## Overview
Allow Administrador to correct the inferred or chosen monthly payment day from the existing benefactor list. The edit must show the resulting next due date and preserve the Secretariat's restricted view.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST validate UUID, monthly frequency, integer 1–28, and update result in an action calling `requireAdmin()`.
- MUST show current day and next due date for monthly records; MUST provide success/error feedback and prevent duplicate submits.
- MUST leave one-time `data_pagamento` untouched and deny Secretaria writes on a direct action call.
- MUST recalculate next due from the shared recurrence helper; after phase 3, open future ledger rows also follow edited day.
</requirements>

## Subtasks
- [x] 3.1 Add the admin-only day update action.
- [x] 3.2 Add an accessible edit control and next-due display to monthly donor cards.
- [x] 3.3 Preserve role-specific donor projections and refresh changed data.
- [x] 3.4 Test invalid inputs and direct role bypass attempts.

## Implementation Details
Follow TechSpec “Date and Recurrence Contract” and “API Endpoints.” The phase-3 ledger synchronization is completed in task 09; do not reference a table that does not yet exist.

### Relevant Files
- `app/admin/_actions/admin-actions.ts` — role-aware donor list.
- `app/admin/_components/donor-card.tsx` — administrator card controls.
- `lib/auth/authorization.ts` — `requireAdmin()` boundary.

### Dependent Files
- `app/admin/benfeitores/client.tsx` — local donor state and Secretariat projection.
- `__tests__/helpers/fake-db.ts` — action test double.

### Related ADRs
- [ADR-001: Stage the donor journey and due-day rule](adrs/adr-001.md)
- [ADR-002: Anchor monthly occurrences at registration](adrs/adr-002.md)

## Deliverables
- Due-day edit action and donor-list controls.
- Unit tests with at least 80% coverage of new edit behavior.
- Integration test proving administrator-only persistence.

## Tests
- Unit tests:
  - [x] Editing a monthly day from 5 to 12 updates the displayed next due date.
  - [x] Day 0, 29, decimal, and a one-time pledge return validation errors.
- Integration tests:
  - [x] A direct Secretaria action call is denied and produces no update; an administrator update persists the new day.
  - [x] A one-time payment date remains unchanged after an attempted day edit.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Phase 1 is releasable with corrected form and editable monthly day, without reminder or ledger tables.
