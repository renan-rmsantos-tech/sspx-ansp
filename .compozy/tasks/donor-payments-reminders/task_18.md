---
status: completed
title: Support days through 31 and month-end recurrence
type: backend
complexity: high
dependencies:
  - task_01
  - task_03
  - task_05
  - task_15
---

# Support days through 31 and month-end recurrence

## Overview
Extend the completed due-day and recurrence baseline to support the operator's day-30 choice and administrator days through 31. Every monthly occurrence and reminder must use the actual last day of a short month while retaining the stored nominal day.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST preserve the existing legacy backfill that capped old registration days at 28 while relaxing the monthly database check to integer 1–31 and keeping one-time day null.
- MUST allow Administrator to edit a monthly due day to any integer 1–31; invalid days and one-time edits remain rejected.
- MUST calculate each competence's due date as the lesser of the stored day and its calendar month's last day, including leap February.
- MUST determine the first due date using the adjusted date on or after São Paulo registration, preserve exactly 12 occurrences for `um_ano`, and derive both reminder offsets from the adjusted due date.
- MUST keep ledger materialization and open future snapshot synchronization coherent with the new recurrence; existing receipt, reviewed, or past-due snapshots remain protected.
</requirements>

## Subtasks
- [x] 18.1 Relax the database check and admin due-day validation to 1–31 without changing the historical backfill.
- [x] 18.2 Update recurrence and first/next occurrence calculations for month-end dates.
- [x] 18.3 Update reminder selection and ledger snapshot behavior to use adjusted due dates.
- [x] 18.4 Verify day-30 and admin day-31 boundaries, first occurrence, and reminder offsets.

## Implementation Details
Follow TechSpec “Date and Recurrence Contract” and “Phase 1 amendment.” This task changes the shared date contract; task_19 handles the narrower five-choice public form and validation.

### Relevant Files
- `lib/donor-recurrence.ts` — first, next, and per-month occurrence rules.
- `lib/donor-payment-ledger.ts` — first materialized occurrence and due snapshots.
- `lib/db/schema.ts` and `drizzle/` — monthly day check and additive migration.
- `app/admin/_actions/admin-actions.ts` — authenticated day edit.

### Dependent Files
- `lib/email/donor-reminder-policy.ts` and `lib/email/send-donor-reminder.ts` — 10-day/5-day selection uses adjusted due dates.
- `scripts/seed-dev.ts` — retain fictional reminder examples and never send email.
- `__tests__/donor-recurrence.test.ts` and relevant donor ledger/admin integration tests — boundary coverage.

### Related ADRs
- [ADR-002: Anchor monthly occurrences at registration](adrs/adr-002.md)
- [ADR-006: Use fixed public due-day choices and transactional instructions](adrs/adr-006.md)

## Deliverables
- Database constraint migration and shared month-end recurrence behavior.
- Admin 1–31 edit and coherent ledger/reminder behavior.
- Unit tests with at least 80% coverage of new date logic and Postgres integration tests for the constraint and snapshot behavior.

## Tests
- Unit tests:
  - [x] Stored day 30 yields 28 February in a common year, 29 February in a leap year, and 30 March; stored admin day 31 yields 30 April.
  - [x] Registration on 27 February with day 30 starts on 28 February; registration after the adjusted due date starts in the next month.
  - [x] Each adjusted due date produces 10-day and 5-day reminder dates; dates before registration do not send.
  - [x] A one-year day-30 plan yields exactly 12 competences.
- Integration tests:
  - [x] Database accepts monthly days 29–31 and rejects 0/32 and one-time non-null days while old backfilled rows remain unchanged.
  - [x] Admin day 31 updates an eligible future snapshot but leaves a receipt-bearing or reviewed row unchanged.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every monthly competence has one adjusted due date and both reminder offsets use it.
