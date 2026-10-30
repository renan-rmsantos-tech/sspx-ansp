---
status: completed
title: Generate receipt link for admin to copy
type: frontend
complexity: high
dependencies:
  - task_16
  - task_24
  - task_11
---

# Generate receipt link for admin to copy

## Overview
Let administrators issue a fresh 14-day receipt link for any monthly occurrence whose receipt is still missing, then copy it for manual delivery.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST allow `issueDonorReceiptRecoveryLink` to issue a link any time the monthly occurrence lacks a receipt, including while an earlier link remains valid; reuse `createDonorReceiptRecoveryLink` and its 14-day validity.
- MUST require administrator authentication and audit the generating administrator and timestamp, using migration 0016 consistent with the TechSpec schema style.
- MUST show `Gerar link de comprovante` for eligible rows in `/admin/conferencia-pagamentos` and the current pending occurrence in `/admin/benfeitores`.
- MUST reveal the generated URL, `Copiar link` action, and expiry date only to the authenticated administrator; never send email or log link/ticket values.
- MUST reject nonmonthly, missing, or already receipted occurrences and avoid exposing private storage paths.
</requirements>

## Subtasks
- [x] 26.1 Add persistence for generation audit and adjust link issuance eligibility.
- [x] 26.2 Add the conference and donor-list actions and copy feedback.
- [x] 26.3 Verify authorization, eligibility, expiry, audit, and privacy.

## Implementation Details
Follow the existing signed receipt-link and administrator action contracts.

### Relevant Files
- `app/admin/_actions/donor-receipt-actions.ts` — link issuance.
- `app/admin/conferencia-pagamentos/` and `app/admin/benfeitores/` — administrator UI.
- `lib/db/schema.ts` and `drizzle/0016_*.sql` — audit persistence.

### Dependent Files
- `__tests__/` — action, UI, and PostgreSQL integration coverage.

### Related ADRs
- [ADR-007: Require a receipt for every monthly occurrence](adrs/adr-007.md)

## Deliverables
- Audited, administrator-only receipt link generation and copy UI in both locations.
- Tests with at least 80% coverage of new modules and PostgreSQL integration for audit writes.

## Tests
- Unit tests:
  - [x] Fresh and still-valid earlier links both permit generation for missing receipts; already uploaded receipts do not.
  - [x] Both admin surfaces show the link, expiry, clipboard success/failure feedback, and no email action.
  - [x] Unauthorized calls fail and logs/projections omit tickets and private paths.
- Integration tests:
  - [x] PostgreSQL records administrator identity and generation time; new link expires after 14 days and reaches the correct occurrence.
  - [x] Run `npm test`, coverage gate (>=80% for new modules), and `npm run build` as in `logs/task_14-verification.md`.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Administrators can copy an audited valid link for every eligible pending receipt.
