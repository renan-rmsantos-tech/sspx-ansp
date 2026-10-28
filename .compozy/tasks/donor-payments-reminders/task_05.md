---
status: completed
title: Implement reserved reminder delivery and daily job
type: backend
complexity: high
dependencies:
  - task_04
  - task_16
---

# Implement reserved reminder delivery and daily job

## Overview
Send the 10-day and 5-day emails only for opted-in, active monthly occurrences. A durable row and short lease must make repeated or overlapping daily runs safe and expose failures for recovery.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST select exact 10-day and 5-day local scheduled dates for `mensal` plus `lembrete_canal='email'`; MUST skip dates before registration and after a 12-occurrence term.
- MUST acquire/release a conditional lease per unique send row, call Resend outside a transaction, and record API acceptance separately from inbox delivery.
- MUST use a stable provider key and frozen payload; MUST never resend recorded `sent` rows on rerun.
- MUST ensure the phase-2 occurrence row exists before sending and put that pledge/competence's signed `{link_comprovante}` into every 10-day and 5-day frozen payload.
- MUST classify failed/uncertain outcomes without logging donor contact data or provider response bodies; MUST exit nonzero on operational failure.
- MUST remain independent of phase-3 bank-confirmation columns while using the phase-2 occurrence ledger.
</requirements>

## Subtasks
- [x] 5.1 Select eligible occurrences using the shared recurrence helper.
- [x] 5.2 Materialize eligible occurrences and render their receipt links before provider calls.
- [x] 5.3 Reserve one send and implement provider acceptance/failure recording.
- [x] 5.4 Expose an internal daily npm script with count-based output and exit status.
- [x] 5.5 Exercise duplicate runs, competing leases, and crash recovery.

## Implementation Details
Follow TechSpec “Reminder Reservation and Send Flow” and “Integration Points.” Build on `lib/email/send-donor-welcome.ts` behavior, but do not change welcome-email status semantics.

### Relevant Files
- `lib/email/send-donor-welcome.ts` — Resend timeout, header, seal, reservation pattern.
- `lib/db/schema.ts` — task-04 send rows.
- `lib/storage/donor-receipt-links.ts` — task-16 scoped link generator.
- `scripts/cleanup-pending.ts` — standalone script convention.

### Dependent Files
- `package.json` — task 08 documents the script invocation.
- `__tests__/send-donor-welcome.integration.test.ts` — concurrent-send test pattern.
- `__tests__/helpers/fake-db.ts` — action/service mocks.

### Related ADRs
- [ADR-002: Anchor monthly occurrences at registration](adrs/adr-002.md)
- [ADR-003: Use a daily opted-in email job with per-occurrence reservations](adrs/adr-003.md)
- [ADR-005: Attach reminder receipts to early occurrence records](adrs/adr-005.md)

## Deliverables
- Reserved sender and daily script without a public endpoint.
- Unit tests with at least 80% coverage of selection and outcome mapping.
- Postgres integration test for unique key and conditional lease.

## Tests
- Unit tests:
  - [x] A monthly opted-in day-20 occurrence selects `10d` on day 10 and `5d` on day 15; day 11 selects neither.
  - [x] One-time, opted-out, pre-registration, and thirteenth one-year occurrences select no message.
  - [x] Both reminder kinds for one competence contain a valid link to that competence; retries retain the originally frozen link.
  - [x] Provider timeout produces a safe failed/uncertain state without exposing recipient or body.
- Integration tests:
  - [x] Two workers racing for one send row yield at most one provider request under an active lease.
  - [x] Re-running after `sent` yields `already_sent`; an expired lease can be recovered safely.
  - [x] A send cannot be accepted without a materialized occurrence and its receipt link.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- The daily job can rerun on its scheduled date without duplicating a recorded accepted reminder.
