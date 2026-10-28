---
status: completed
title: Send monthly instructions after successful registration
type: backend
complexity: high
dependencies:
  - task_05
  - task_15
  - task_16
  - task_17
  - task_19
  - task_20
  - task_24
---

# Send monthly instructions after successful registration

## Overview
Send the new transactional instructions to every new monthly donor after their pledge commits, regardless of reminder opt-in. A reservation and recorded outcome keep repeated calls safe and leave registration successful when email delivery fails.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create generation 1 `pending` in the same transaction as a new monthly pledge and its first ledger occurrence, then attempt the instructions send after commit independently of the welcome email.
- MUST send for every new monthly pledge, including `lembrete_canal=null`, and MUST never send for one-time pledges or automatically sweep pre-existing monthly rows.
- MUST render value, chosen day, adjusted first due date, duration, Pix details, reminder policy, and the required first-occurrence `{link_comprovante}` from server-owned data.
- MUST reserve atomically, freeze the payload, use a stable provider idempotency key per generation, record accepted/failed/uncertain outcomes, and avoid replay of accepted or uncertain sends.
- MUST leave registration successful if the email fails; manual later send for an older pledge uses an eligible receipt-pending occurrence and is unavailable with a clear safe message when none is active.
- MUST support a deliberate admin manual attempt targeted at one pending monthly competence, freeze that competence and its signed link on the send generation, and label the linked month; do not send a recurring automatic email to donors who declined reminders.
- MUST keep `scripts/seed-dev.ts` free of email sends and avoid CPF, contact data, message content, bearer links, and raw provider errors in logs.
</requirements>

## Subtasks
- [x] 21.1 Insert the initial pending attempt with monthly pledge and occurrence in one transaction.
- [x] 21.2 Implement the reserved, idempotent post-commit sender and safe outcome recording.
- [x] 21.3 Handle the first-occurrence link and historical manual-send link eligibility.
- [x] 21.4 Preserve registration success and independent welcome email behavior on send failure.
- [x] 21.5 Verify seed isolation, concurrency, retry, and uncertain-send behavior.

## Implementation Details
Follow TechSpec “Transactional Monthly Payment Instructions” and reuse the existing Resend/header and receipt-capability patterns. The admin controls are added in task_23.

### Relevant Files
- `app/benfeitor/_actions/donor-actions.ts` — pledge transaction and post-commit email calls.
- `lib/email/send-donor-welcome.ts` and `lib/email/send-donor-reminder.ts` — reservation and provider conventions.
- `lib/donor-payment-ledger.ts` and `lib/donor-receipts/tickets.ts` — first or eligible occurrence link.
- `scripts/seed-dev.ts` — local-only direct inserts.

### Dependent Files
- `lib/email/send-donor-monthly-instructions.ts` — new sender.
- `__tests__/donor-submission.integration.test.ts` and new sender integration tests — transaction and claim behavior.

### Related ADRs
- [ADR-005: Attach reminder receipts to early occurrence records](adrs/adr-005.md)
- [ADR-006: Use fixed public due-day choices and transactional instructions](adrs/adr-006.md)

## Deliverables
- Transactionally recorded pending attempt and post-commit transactional send service.
- Unit tests with at least 80% coverage of new sender decisions and integration tests for concurrent claims and registration failure isolation.

## Tests
- Unit tests:
  - [x] Monthly opt-in and opt-out both trigger instructions; one-time registration does not.
  - [x] A first due date on February 28/29 renders with chosen day 30 and the month-end explanation.
  - [x] A historical pledge with no usable first link selects an eligible pending occurrence; when none is active, manual receipt-link send is unavailable with a safe message.
- Integration tests:
  - [x] A failed monthly registration transaction leaves no pledge, occurrence, or pending instruction attempt.
  - [x] Email rejection after commit returns registration success and records `failed`; Resend acceptance records `sent` without claiming inbox delivery.
  - [x] Concurrent/repeated send calls cause one provider request for the same generation; an uncertain result is not automatically resent.
  - [x] Seed insertion and reset do not call welcome, instructions, or reminder senders.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every successful new monthly pledge has a visible instructions status and email failures never undo the pledge.
