---
status: completed
title: Require five monthly due-day choices and explain emailed payment
type: frontend
complexity: high
dependencies:
  - task_02
  - task_18
---

# Require five monthly due-day choices and explain emailed payment

## Overview
Replace the public monthly numeric day input with simple required choices and explain the post-registration payment email. The one-time journey keeps its Pix details, payment date, and required receipt sequence.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST display only 1, 10, 15, 20, and 30 as accessible pt-BR monthly day choices, with none preselected and a required selection.
- MUST validate the same fixed set in the public server action, rejecting missing, forged 28/29/31, fractional, or otherwise invalid days independently of the UI.
- MUST tell monthly donors before submission that an explanatory email will provide Pix payment instructions, their schedule, and a signed link for the required receipt of each later payment; MUST explain the 10-day/5-day reminder policy and day 30's short-month adjustment.
- MUST hide the on-screen Pix details and receipt control for monthly registration while retaining the reminder opt-in checkbox and monthly duration/value controls.
- MUST keep the one-time Pix details → payment date → required receipt order and show a monthly-specific success message that asks donors to check email without claiming delivery.
</requirements>

## Subtasks
- [x] 19.1 Replace the monthly day input with five unselected choices and clear validation feedback.
- [x] 19.2 Update the monthly explanation and success state while preserving one-time behavior.
- [x] 19.3 Enforce the public choice set in validation and registration.
- [x] 19.4 Verify keyboard use, forged values, branch switching, and one-time receipt requirements.

## Implementation Details
Follow TechSpec “Phase 1 amendment” and “Transactional Monthly Payment Instructions.” The actual email sender is task_21; this task updates the public contract and copy.

### Relevant Files
- `app/benfeitor/_components/donor-form.tsx` — public choices, explanatory copy, success state.
- `app/benfeitor/_components/pix-payment-details.tsx` — retain only in the one-time branch.
- `lib/validations/donor-schema.ts` — public five-day allowlist.
- `app/benfeitor/_actions/donor-actions.ts` — independent server validation and stored choice.

### Dependent Files
- `__tests__/donor-form.test.tsx` and `__tests__/donor-schema.test.ts` — UI and validation assertions.
- `__tests__/donor-submission.integration.test.ts` — persisted choice and one-time receipt behavior.

### Related ADRs
- [ADR-001: Stage the donor journey and due-day rule](adrs/adr-001.md)
- [ADR-006: Use fixed public due-day choices and transactional instructions](adrs/adr-006.md)

## Deliverables
- Updated public monthly form, server validation, and success copy.
- Unit tests with at least 80% coverage of the changed form/validation behavior and integration tests for registration.

## Tests
- Unit tests:
  - [x] Monthly form begins with no selected day, blocks submit until one of five options is selected, and supports keyboard selection.
  - [x] Monthly branch explains email, required later per-payment receipt, chosen day 30 adjustment, and opted-in reminders while omitting Pix details and receipt input at registration.
  - [x] Public validation accepts exactly 1/10/15/20/30 and rejects undefined, 28, 29, 31, 0, 32, and 10.5.
  - [x] One-time branch still shows Pix before payment date and required receipt, with no monthly day requirement.
- Integration tests:
  - [x] Monthly registration stores the selected allowed day and no receipt; a forged day 31 is rejected despite database support.
  - [x] Monthly success asks the donor to check email; one-time success does not promise monthly instructions.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every new monthly pledge has one explicitly chosen public day, and one-time registration remains intact.
