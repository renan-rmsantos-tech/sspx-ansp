---
status: completed
title: Track required monthly receipts and skip remaining reminders
type: backend
complexity: high
dependencies:
  - task_05
  - task_15
  - task_16
  - task_18
---

# Track required monthly receipts and skip remaining reminders

## Overview
Treat each monthly occurrence's receipt as required evidence while leaving bank confirmation separate. Once that occurrence has a valid receipt, its remaining scheduled or retried reminders must be skipped without changing other months.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST derive `Comprovante pendente` from a monthly ledger row without receipt metadata and `Comprovante enviado – aguardando conferência` after an upload; do not count either as bank-confirmed credit.
- MUST keep registration free of receipt upload while requiring a separate receipt for every materialized monthly occurrence.
- MUST suppress 10-day and 5-day reminders for an occurrence once its receipt is uploaded, including selection, an in-progress pre-provider recheck, and manual retry; another competence remains eligible.
- MUST preserve an already accepted 10-day send record when a receipt arrives later, skip that occurrence's 5-day send, and report a safe `skipped_receipt` result without treating it as a provider failure.
- MUST revise the default and rendered reminder copy to request the required receipt for that occurrence and explain that upload does not confirm bank credit; migrate/normalize known saved optional wording and reject new explicit optional claims without discarding other admin edits.
- MUST support an administrator-issued 14-day recovery link for a receipt-pending occurrence after the standard due-date-based link expires, without allowing public expiry selection or cross-occurrence access.
- MUST accept a valid receipt upload or replacement after bank status `confirmado` or `divergente` without clearing that bank status, amount, credit date, or confirmer; the receipt requirement remains independent of bank review.
</requirements>

## Subtasks
- [x] 24.1 Expose the monthly occurrence receipt state from existing private ledger metadata.
- [x] 24.2 Exclude receipt-uploaded occurrences from scheduled reminder selection.
- [x] 24.3 Recheck receipt state immediately before provider calls and manual retries.
- [x] 24.4 Update reminder copy and safe skipped-receipt status.
- [x] 24.5 Verify upload-before-both and upload-between-reminders scenarios.
- [x] 24.6 Preserve bank review on a late receipt upload and allow an authenticated recovery link for an overdue missing receipt.

## Implementation Details
Follow TechSpec “Receipt-required amendment,” “Per-Occurrence Receipt Link and Upload,” and “Reminder Reservation and Send Flow.” The signed upload and replacement flow from task_16 remains the authority for receipt metadata; task_25 updates public/admin presentation.

### Relevant Files
- `lib/donor-payment-ledger.ts` — occurrence and receipt-state projection.
- `lib/email/donor-reminder-policy.ts` — schedule eligibility.
- `lib/email/send-donor-reminder.ts` — claim/pre-provider checks and manual retry.
- `lib/email/donor-reminder-template.ts` — required-receipt copy and fixed policy sentence.
- `lib/donor-receipts/` — receipt upload metadata and replacement behavior.

### Dependent Files
- `scripts/send-donor-reminders.ts` — safe `skipped_receipt` counts.
- `__tests__/donor-reminder-policy.test.ts` and reminder/receipt integration tests — suppression boundaries.

### Related ADRs
- [ADR-005: Attach reminder receipts to early occurrence records](adrs/adr-005.md)
- [ADR-007: Require a receipt for every monthly occurrence](adrs/adr-007.md)

## Deliverables
- Per-occurrence receipt state and receipt-aware reminder selection/retry.
- Updated reminder default/rendered copy and safe skipped-receipt status.
- Unit tests with at least 80% coverage of new eligibility logic and integration tests for send/upload ordering.

## Tests
- Unit tests:
  - [x] New monthly ledger row reports `Comprovante pendente`; a valid upload changes only its own row to `Comprovante enviado – aguardando conferência` without received value.
  - [x] An occurrence with a receipt is not selected for 10-day or 5-day reminders, while the next month remains eligible.
  - [x] Default and edited reminder renderings request the required per-payment receipt and avoid bank-confirmation claims.
  - [x] The persisted legacy default and a custom body containing “O comprovante é opcional” render without that conflicting sentence; new optional-claim edits are rejected.
- Integration tests:
  - [x] Upload through the instructions link before the 10-day date skips both reminders for that competence.
  - [x] Upload after an accepted 10-day send leaves it accepted and skips the 5-day send; manual retry after upload returns `skipped_receipt` without a provider call.
  - [x] Receipt uploaded during a reserved send is detected by the pre-provider check; another competence is unaffected.
  - [x] A server-issued 14-day recovery ticket validates for the same pledge/competence after standard expiry, while public receipt routes expose no expiry override.
  - [x] A valid late upload after `confirmado` or `divergente` updates receipt metadata only; subsequent reminder selection remains suppressed.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- No reminder is newly sent for an occurrence with a recorded receipt.
