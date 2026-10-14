---
status: completed
title: Coordinate welcome email sends with database reservations
type: backend
complexity: high
dependencies:
  - task_01
---

# Task 5: Coordinate welcome email sends with database reservations

## Overview
Automatic sends and administrator retries currently share a sent timestamp but can race before it is written. A shared reservation path must prevent simultaneous attempts while preserving successful donor registration when Resend is unavailable.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not HOW
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST acquire a conditional reservation before calling Resend for both automatic and manual sends.
- MUST return distinct sent, already-sent, in-progress, and failed outcomes to callers.
- MUST let only the reservation owner mark acceptance or release a failed attempt.
- MUST allow an expired reservation to be recovered; expiry must exceed the Resend API timeout.
- MUST record `welcome_email_sent_at` only after Resend accepts the message, without claiming inbox delivery.
- MUST preserve the existing welcome template editor and test-send behavior.
</requirements>

## Subtasks
- [x] 5.1 Share one reservation-aware sending operation across registration and manual retry.
- [x] 5.2 Ensure reservation ownership and expiry are enforced by database updates.
- [x] 5.3 Map Resend success and failure to durable status and typed outcomes.
- [x] 5.4 Preserve the registration success boundary and admin authorization.
- [x] 5.5 Cover concurrent attempts and recovery after failure or expiry.

## Implementation Details
Follow TechSpec “Welcome email service” and ADR-005. Do not hold a database transaction open while waiting for Resend. A crash after provider acceptance and before the timestamp update remains a documented residual risk.

### Relevant Files
- `lib/email/send-donor-welcome.ts` — Resend API call and timestamp update.
- `app/admin/_actions/donor-email-actions.ts` — admin retry and template operations.
- `app/benfeitor/_actions/donor-actions.ts` — automatic post-registration send.
- `lib/db/schema.ts` — reservation and send fields.

### Dependent Files
- `__tests__/send-donor-welcome.test.ts` — provider send tests.
- `__tests__/donor-email-client.test.tsx` — later UI outcome tests.
- `app/admin/benfeitores/client.tsx` — later consumes typed outcomes.

### Related ADRs
- [ADR-005: Database reservation for welcome email sends](adrs/adr-005.md)
- [ADR-002: Administrator-only access to benefactor reports](adrs/adr-002.md)

## Deliverables
- Reservation-aware email operation and typed manual-send result.
- Unit tests with at least 80% coverage of outcome mapping and reservation decisions.
- Postgres integration tests for concurrent sends, failure release, and expiry recovery.

## Tests
- Unit tests:
  - [ ] Already-sent registration returns `already_sent` without invoking Resend.
  - [ ] Resend rejection returns `failed`, clears the owned reservation, and leaves the sent timestamp null.
  - [ ] Registration remains successful when its automatic email attempt fails.
- Integration tests:
  - [ ] Two simultaneous calls for one donor acquire at most one active reservation and start at most one Resend request.
  - [ ] An expired reservation is reclaimable; a fresh one returns `in_progress`.
  - [ ] A Secretariat user cannot call the manual retry action.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every recorded send date means Resend accepted the message, and concurrent attempts do not cause avoidable duplicates.
