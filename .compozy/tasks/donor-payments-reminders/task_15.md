---
status: completed
title: Materialize minimal monthly payment occurrences for phase 2
type: backend
complexity: high
dependencies:
  - task_03
---

# Materialize minimal monthly payment occurrences for phase 2

## Overview
Create a durable target for each monthly payment before reminder links are sent. The phase-2 table stores expected-payment snapshots and one active receipt slot, while bank-confirmation fields remain a phase-3 extension. Task_24 adds the required receipt state.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add minimal `donor_payment_ledger` rows with unique `(pledge_id, competencia)`, due-date and expected-value snapshots, nullable receipt path/name/upload time, and a São Paulo launch-competence marker.
- MUST backfill eligible existing monthly plans only from launch competence, materialize current and next eligible competences for all active monthly pledges independently of opt-in, and avoid older inferred debt.
- MUST create the first eligible monthly row with each new pledge in one transaction and make repeated/concurrent materialization idempotent.
- MUST update only eligible future open due-date snapshots after day edits; retain rows with receipt evidence and never silently move evidence to another competence.
- MUST preserve the one-time receipt flow and make no claim that an occurrence has been paid.
</requirements>

## Subtasks
- [x] 15.1 Add minimal ledger schema, migration, uniqueness/check constraints, and coverage marker.
- [x] 15.2 Backfill eligible monthly launch rows and implement bounded idempotent materialization.
- [x] 15.3 Create first monthly row atomically with new registration.
- [x] 15.4 Reconcile future unreviewed due-date snapshots after an admin day change.
- [x] 15.5 Verify concurrency, migration boundary, and one-time registration behavior.

## Implementation Details
Follow TechSpec “Data Models and Migrations” (Phase 2) and “Date and Recurrence Contract.” Keep the table extensible for task 09; task 16 adds receipt writes and task 05 calls the materializer before reminder sends.

### Relevant Files
- `lib/db/schema.ts` — pledge model and new occurrence table.
- `lib/donor-recurrence.ts` — shared eligible-month calculation.
- `app/benfeitor/_actions/donor-actions.ts` — monthly registration transaction.

### Dependent Files
- `drizzle/` — additive phase-2 migration.
- `app/admin/_actions/admin-actions.ts` — due-day edit synchronization.
- `__tests__/helpers/fake-db.ts` — action test double.

### Related ADRs
- [ADR-002: Anchor monthly occurrences at registration](adrs/adr-002.md)
- [ADR-005: Attach reminder receipts to early occurrence records](adrs/adr-005.md)

## Deliverables
- Phase-2 occurrence migration, coverage marker, and idempotent monthly materializer.
- Unit tests with at least 80% coverage of new materialization rules.
- Postgres integration tests for migration boundary, uniqueness, and atomic registration.

## Tests
- Unit tests:
  - [x] A one-year plan starting next month creates exactly its eligible first row and never a thirteenth occurrence.
  - [x] A non-opted-in active monthly pledge is materialized; a one-time pledge is untouched in phase 2.
  - [x] A due-day edit does not move a row with receipt evidence or a past-due snapshot.
- Integration tests:
  - [x] Two concurrent materializers for one pledge/competence leave one row with its original expected-value snapshot.
  - [x] Launch migration creates no historical monthly rows before the coverage marker.
  - [x] A failed new monthly pledge transaction leaves neither pledge nor initial occurrence.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every phase-2 reminder has one stable occurrence row and phase 2 is independently deployable.
