---
status: completed
title: Suppress reminders for bank-confirmed credits
type: backend
complexity: medium
dependencies:
  - task_09
  - task_10
  - task_11
  - task_12
  - task_13
---

# Suppress reminders for bank-confirmed credits

## Overview
Connect the reminder sender to the now-available bank conference fields so benefactors with a verified bank credit do not receive another request for that occurrence. This finishes phase 3 while preserving the phase-2 receipt-upload suppression for all other items.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST skip both `10d` and `5d` for a competence with `confirmado` or a bank-confirmed `divergente` credit.
- MUST check credit state at candidate selection and again immediately before the provider request, including manual failed retry.
- MUST preserve the phase-2 daily materialization of current and next competences for all active monthly pledges, including non-opted-in donors.
- MUST keep pending and not-identified rows eligible only while the receipt is missing and other reminder conditions hold; receipt upload from task_24 MUST continue suppressing remaining reminders and MUST NOT reopen a sent one.
- MUST report skipped-paid counts without donor PII and run the full phase-3 verification gate.
</requirements>

## Subtasks
- [x] 14.1 Add ledger-based paid-occurrence checks to automatic and manual sender paths.
- [x] 14.2 Add an integration test covering a credit recorded between selection and send.
- [x] 14.3 Verify no regression to phase-2 opt-in, lease, and retry behavior.
- [x] 14.4 Run phase-3 tests/build and confirm coverage of conference, export, and report.

## Implementation Details
Follow TechSpec “Reminder Reservation and Send Flow” and “Conference, Totals, and Export Contract.” Keep the paid check narrow so no personal ledger detail enters operational logs.

### Relevant Files
- `lib/email/` — task-05 reminder sender.
- `lib/db/schema.ts` — task-09 ledger states.
- `scripts/` — daily reminder script.

### Dependent Files
- `app/admin/_actions/` — task-06 manual retry and task-10 confirmation.
- `__tests__/send-donor-welcome.integration.test.ts` — concurrent sender test pattern.

### Related ADRs
- [ADR-003: Use a daily opted-in email job with per-occurrence reservations](adrs/adr-003.md)
- [ADR-004: Reconcile manually against bank-confirmed credits](adrs/adr-004.md)
- [ADR-005: Attach reminder receipts to early occurrence records](adrs/adr-005.md)

## Deliverables
- Automatic and manual suppression for bank-confirmed occurrences.
- Unit tests with at least 80% coverage of new suppression logic.
- Integration tests for race timing and phase-3 `npm test`/build gate.

## Tests
- Unit tests:
  - [x] `confirmado` and positive-credit `divergente` suppress both kinds; `pendente` and `nao_identificado` are eligible only when their receipt is pending, while an uploaded receipt suppresses the remaining kind.
  - [x] A sent 10-day row stays sent when a later credit is recorded; 5-day selection is skipped.
- Integration tests:
  - [x] A bank credit committed after candidate selection but before provider call prevents send.
  - [x] Manual retry of a failed row after confirmation returns skipped-paid and makes no provider call.
  - [x] `npm test` and `npm run build` pass with the phase-3 conference, CSV, and report enabled.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- No reminder is sent after a verified credit for that occurrence, and phase 3 is independently releasable.
