---
status: completed
title: Implement bank conference actions and totals
type: backend
complexity: high
dependencies:
  - task_09
---

# Implement bank conference actions and totals

## Overview
Provide the authorized server operations that turn bank-statement checks into ledger states. The same month query must supply exact expected, received, and outstanding totals and identify aged open items.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST call `requireAdmin()` in every read and write action; MUST validate month, row UUID, amount, date, and note.
- MUST set `confirmado` for equal positive credit and `divergente` for unequal positive credit, recording `confirmed_by`/`confirmed_at`.
- MUST support explicit `nao_identificado` with a note and reset to `pendente` with cleared credit metadata.
- MUST compute totals from ledger decimals: expected sum, received verified sum, outstanding sum of per-row positive balances.
- MUST list open balances more than one São Paulo calendar month past due; MUST guard deletion of a pledge with bank-confirmed rows and clean private monthly receipts when deleting an unconfirmed pledge.
- MUST expose receipt pending/sent separately from bank-review state and identify overdue monthly occurrences without receipts even if a bank credit was confirmed; receipt absence alone MUST NOT become a bank nonpayment claim.
</requirements>

## Subtasks
- [x] 10.1 Add authorized month and overdue queries with bounded materialization.
- [x] 10.2 Add confirm, correct, mark-not-identified, and reset actions.
- [x] 10.3 Add financial aggregation and deletion guard.
- [x] 10.4 Verify role, amount, date, divergence, and aging behavior.

## Implementation Details
Follow TechSpec “Conference, Totals, and Export Contract” and “API Endpoints.” Reuse the existing action and fake-DB conventions; use Postgres integration tests for constraints.

### Relevant Files
- `app/admin/_actions/donor-report-actions.ts` — current admin aggregate action style.
- `app/admin/_actions/admin-actions.ts` — donor deletion action.
- `lib/auth/authorization.ts` — administrator authorization.

### Dependent Files
- `lib/db/schema.ts` — ledger data model.
- `__tests__/helpers/fake-db.ts` — server-action test double.
- `__tests__/donor-report-actions.test.ts` — report action test pattern.

### Related ADRs
- [ADR-004: Reconcile manually against bank-confirmed credits](adrs/adr-004.md)
- [ADR-005: Attach reminder receipts to early occurrence records](adrs/adr-005.md)

## Deliverables
- Authorized conference actions, exact totals, overdue query, and donor deletion guard.
- Unit tests with at least 80% coverage of new action/aggregation logic.
- Integration tests for ledger constraints and role denial.

## Tests
- Unit tests:
  - [x] Expected 100/received 80 is divergent with outstanding 20; received 120 is divergent with outstanding 0.
  - [x] Marking `nao_identificado` requires a note and retains received 0; reset clears credit date and confirmer.
  - [x] Invalid `2026-13`, negative amount, sub-cent amount, and invalid credit date are rejected.
- Integration tests:
  - [x] A direct Secretaria read/confirm/reset call is denied and writes nothing.
  - [x] A confirmed ledger row prevents donor deletion; deleting an unconfirmed donor removes its ledger rows and private monthly receipts through the documented cleanup path.
  - [x] An item due more than one local calendar month ago appears in overdue; a newer one does not.
  - [x] An overdue monthly item without a receipt is flagged as missing evidence independently of its bank-credit state; one with a receipt is not flagged.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Month totals reconcile to ledger rows and every confirmed credit records its administrator and time.
