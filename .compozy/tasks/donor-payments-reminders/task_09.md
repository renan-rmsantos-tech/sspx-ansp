---
status: pending
title: Extend occurrence ledger for bank conference
type: backend
complexity: high
dependencies:
  - task_08
  - task_15
  - task_18
  - task_19
  - task_20
  - task_21
  - task_22
  - task_23
  - task_24
  - task_25
---

# Extend occurrence ledger for bank conference

## Overview
Extend the phase-2 monthly occurrence ledger with bank-confirmation fields without treating uploaded receipts as money received. Add one-time pledges to the same ledger and preserve the existing monthly coverage boundary and receipt metadata.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add bank received value, credit date, status, confirmer/time, and note to the existing phase-2 occurrence rows without replacing their IDs, expected snapshots, or receipt metadata; MUST retain the distinct pending/sent receipt state derived from that metadata.
- MUST enforce unique pledge/competence, nonnegative cent-precise values, and valid confirmation metadata.
- MUST preserve the phase-2 monthly coverage start and create one pending row for every legacy one-time pledge without inferring payment.
- MUST create a first row with each new one-time pledge atomically; MUST keep monthly materialization idempotent and independent of email opt-in.
- MUST sync open future due-date snapshots using the month-end-adjusted due date only when no receipt evidence or bank review exists; MUST protect confirmed and reviewed history.
</requirements>

## Subtasks
- [ ] 9.1 Add bank fields, defaults, and constraints to the existing ledger.
- [ ] 9.2 Backfill legacy one-time rows and retain monthly receipt metadata and coverage marker.
- [ ] 9.3 Materialize bounded selected-month occurrences and new one-time rows with conflict safety.
- [ ] 9.4 Synchronize eligible future open rows without rewriting receipt or reviewed history.
- [ ] 9.5 Verify pledge insertion and legacy one-time evidence linkage.

## Implementation Details
Follow TechSpec “Phase 3” and “Conference, Totals, and Export Contract.” Extend the table created by task 15; keep expected amount/due date and receipt metadata as snapshots/evidence.

### Relevant Files
- `lib/db/schema.ts` — ledger model and constraints.
- `app/benfeitor/_actions/donor-actions.ts` — new pledge transaction and receipt path.
- `lib/donor-date.ts` — date presentation boundary.

### Dependent Files
- `drizzle/` — additive migration and backfill.
- `app/admin/_actions/admin-actions.ts` — due-day edit synchronization.
- `__tests__/helpers/fake-db.ts` — transaction test double.

### Related ADRs
- [ADR-002: Anchor monthly occurrences at registration](adrs/adr-002.md)
- [ADR-004: Reconcile manually against bank-confirmed credits](adrs/adr-004.md)
- [ADR-005: Attach reminder receipts to early occurrence records](adrs/adr-005.md)

## Deliverables
- Ledger-extension migration, one-time backfill, and bounded conference materialization.
- Unit tests with at least 80% coverage of new materialization rules.
- Postgres integration tests for uniqueness, backfill, and atomic registration.

## Tests
- Unit tests:
  - [ ] Existing phase-2 monthly occurrence and receipt fields survive the phase-3 migration unchanged; a missing monthly receipt remains `Comprovante pendente`.
  - [ ] A one-time receipt produces one pending row and never a confirmed amount.
  - [ ] Editing the due day changes eligible future open rows but not a row with receipt evidence, bank review, or past-due date.
- Integration tests:
  - [ ] Two materializers for one pledge/month leave one row with the original expected snapshot and receipt path.
  - [ ] Legacy monthly months before the phase-2 launch competence are not labeled overdue; existing one-time rows remain pending.
  - [ ] A failed new one-time pledge transaction leaves neither pledge nor ledger row.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every covered occurrence has at most one row and no uploaded receipt is counted as bank credit.
