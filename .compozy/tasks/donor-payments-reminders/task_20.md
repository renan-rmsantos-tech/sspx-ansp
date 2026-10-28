---
status: completed
title: Persist monthly instructions template and send history
type: backend
complexity: high
dependencies:
  - task_04
  - task_16
  - task_18
---

# Persist monthly instructions template and send history

## Overview
Give the transactional monthly instructions their own editable template and durable send-attempt state. This provides a recoverable record separate from both welcome emails and opted-in reminders.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add a singleton subject/body template, bootstrapped only when absent, with pt-BR default copy that explains Pix details, value, chosen day, first due, duration, day-30 month-end adjustment, opted-in reminders, and the required first-occurrence receipt upload.
- MUST use `lib/data/pix-details.ts` as the Pix source and render with the existing institutional email header, readable text, escaped HTML, and seal behavior.
- MUST validate/document required payment-fact tokens and the TechSpec allowlist, including mandatory body-only `{link_comprovante}`; MUST append the fixed day-30/receipt/reminder policy note and use a clearly nonfunctional sample link for preview/test.
- MUST add per-pledge send-attempt history with generation, optional targeted receipt competence for manual sends, pending/sending/sent/failed/uncertain status, acceptance and safe error data, reservation fields, frozen payload, and unique keys.
- MUST preserve old monthly pledges without automatic send rows; new registration will create generation 1 pending in task_21.
</requirements>

## Subtasks
- [x] 20.1 Add the additive template and send-history schema/migration with constraints and unique keys.
- [x] 20.2 Bootstrap the default template only when no custom template exists.
- [x] 20.3 Implement token validation and rendering for real, preview, and test contexts.
- [x] 20.4 Verify persistence, token rules, Pix source, and nonfunctional test link.

## Implementation Details
Follow TechSpec “Transactional Monthly Payment Instructions” for the persistence and rendering contracts. Task_21 consumes these interfaces for post-commit delivery.

### Relevant Files
- `lib/db/schema.ts` and `drizzle/` — new singleton and send-attempt tables.
- `scripts/bootstrap.ts` — idempotent default template insertion.
- `lib/email/donor-welcome-template.ts` — shared institutional email renderer.
- `lib/email/donor-reminder-template.ts` — token validation and sample-link precedent.
- `lib/data/pix-details.ts` — beneficiary, CNPJ, and Pix key source.

### Dependent Files
- `lib/email/donor-monthly-instructions-template.ts` and template store — new renderer and persistence helper.
- `__tests__/donor-reminder-template.test.ts` and a new monthly instructions template test — escaping and token conventions.

### Related ADRs
- [ADR-003: Use a daily opted-in email job with per-occurrence reservations](adrs/adr-003.md)
- [ADR-006: Use fixed public due-day choices and transactional instructions](adrs/adr-006.md)

## Deliverables
- Additive migration, idempotent bootstrap, default template, renderer, and persisted send-attempt contract.
- Unit tests with at least 80% coverage of new template logic and Postgres integration tests for singleton/unique constraints.

## Tests
- Unit tests:
  - [x] Default message contains Pix key, beneficiary, CNPJ, chosen day, first due date, duration, month-end rule, opt-in wording, and required per-payment receipt link explanation.
  - [x] Subject rejects `{link_comprovante}`; unknown or missing required payment-fact/link tokens are rejected; inserted HTML characters are escaped.
  - [x] Edited body still renders the fixed day-30 month-end, required-receipt, and opted-in reminder policy note.
  - [x] Preview/test link is visibly fictitious and never a signed donor capability.
- Integration tests:
  - [x] Repeated bootstrap retains an administrator-edited template and never creates a second singleton row.
  - [x] Duplicate `(pledge_id, generation)` or provider idempotency key is rejected; historical monthly pledges receive no backfilled attempt.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Instructions templates and send state are independent of welcome and reminder records.
