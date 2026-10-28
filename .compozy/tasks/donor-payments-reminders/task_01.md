---
status: completed
title: Add due-day schema and recurrence rules
type: backend
complexity: high
dependencies: []
---

# Add due-day schema and recurrence rules

## Overview
Give monthly pledges a valid payment day and one shared calendar rule for subsequent work. Existing monthly records must retain their registration-based starting point without altering one-time payment dates.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add `dia_vencimento` to `donor_pledges` with monthly 1–28 and one-time null constraints.
- MUST backfill legacy monthly day from `created_at` in `America/Sao_Paulo`, capped at 28; MUST preserve `data_pagamento`.
- MUST compute the first due date on or after registration and exactly 12 occurrences for `um_ano`.
- MUST return no occurrence outside duration or before registration; MUST use due-month `YYYY-MM` competence.
</requirements>

## Subtasks
- [x] 1.1 Add the Drizzle field, migration, and database constraints.
- [x] 1.2 Backfill existing monthly rows without changing one-time rows.
- [x] 1.3 Provide pure recurrence and next-due helpers for reminders and ledger.
- [x] 1.4 Verify local-date boundaries and migration on legacy data.

## Implementation Details
Follow TechSpec “Date and Recurrence Contract” and “Data Models and Migrations.” Keep the helper independent of email and ledger tables so phase 1 can deploy alone.

### Relevant Files
- `lib/db/schema.ts` — pledge model and checks.
- `drizzle/0008_furry_zeigeist.sql` — latest migration pattern.
- `lib/donor-date.ts` — existing donor date formatting.

### Dependent Files
- `lib/validations/donor-schema.ts` — task 02 consumes the new day.
- `app/admin/_actions/admin-actions.ts` — task 03 consumes next-due logic.
- `__tests__/donor-schema.test.ts` — schema constraint pattern.

### Related ADRs
- [ADR-001: Stage the donor journey and due-day rule](adrs/adr-001.md)
- [ADR-002: Anchor monthly occurrences at registration](adrs/adr-002.md)

## Deliverables
- Additive migration and typed recurrence helper.
- Unit tests with at least 80% coverage of new date logic.
- Integration test applying the migration to legacy monthly and one-time rows.

## Tests
- Unit tests:
  - [x] Registration on 2026-10-26 with day 5 yields 2026-11-05 first due; day 28 yields 2026-10-28.
  - [x] `um_ano` yields 12 due dates, while index 12 has no occurrence; February and leap-year transitions keep the selected day.
  - [x] A timestamp near midnight UTC resolves to the correct São Paulo registration date.
- Integration tests:
  - [x] Migration changes a legacy monthly registration on day 31 to day 28 and leaves a one-time `data_pagamento` unchanged.
  - [x] Database rejects monthly day 0/29/null and a non-null one-time day.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every monthly row has one valid day and the helper produces deterministic local-calendar occurrences.
