---
status: completed
title: Show monthly instructions status and manual send in donor list
type: frontend
complexity: high
dependencies:
  - task_07
  - task_21
  - task_24
---

# Show monthly instructions status and manual send in donor list

## Overview
Surface the transactional instructions result on each monthly donor and give administrators a controlled way to send, retry, or explicitly resend it. This also covers pre-existing monthly donors, who must never receive an automatic retroactive message.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST show the latest instructions status and acceptance time for each monthly donor, including “não enviado” for historical rows without an attempt; MUST also show the current occurrence's receipt state independently of bank and email status. One-time donors must not show a monthly instructions control.
- MUST let Administrador manually send when absent/pending, retry a definite failure, and deliberately resend after an accepted attempt as a new recorded generation.
- MUST let Administrador select a receipt-pending occurrence for a manual instructions send or resend, including for a donor who declined reminders; the action MUST reject a different pledge, an already uploaded receipt, or an invalid competence.
- MUST prevent duplicate provider calls under concurrent actions and never automatically retry an uncertain provider outcome; allow an authorized resolution of uncertain state before retry.
- MUST authenticate each manual action with `requireAdmin()`, validate the pledge UUID and monthly frequency, and expose only safe status/error labels.
- MUST distinguish Resend acceptance from inbox delivery and keep welcome/reminder status independent.
</requirements>

## Subtasks
- [x] 23.1 Add safe latest-instructions status to the donor-list projection.
- [x] 23.2 Add monthly-only send/retry/resend controls with explicit resend intent and feedback.
- [x] 23.3 Add authenticated manual actions and uncertain-state resolution using the sender from task_21.
- [x] 23.4 Verify legacy rows, concurrency, role boundaries, and separate email statuses.

## Implementation Details
Follow TechSpec “Transactional Monthly Payment Instructions.” Reuse donor-list status and manual email action patterns without treating a manual resend as an automatic duplicate.

### Relevant Files
- `app/admin/_actions/admin-actions.ts` — donor-list projection.
- `app/admin/_components/donor-card.tsx` and `app/admin/benfeitores/client.tsx` — monthly donor status/actions.
- `app/admin/_actions/donor-email-actions.ts` — welcome manual action precedent.
- `lib/email/send-donor-monthly-instructions.ts` — sender from task_21.

### Dependent Files
- New monthly instructions admin actions and donor-list tests — authorization/state transitions.
- `__tests__/donor-list-reminder.integration.test.ts` — existing list projection precedent.

### Related ADRs
- [ADR-006: Use fixed public due-day choices and transactional instructions](adrs/adr-006.md)

## Deliverables
- Monthly-only donor-list status and manual send/retry/resend controls with audited attempt history.
- Unit tests with at least 80% coverage of new status/action behavior and integration tests for concurrency and role boundaries.

## Tests
- Unit tests:
  - [x] Historical monthly donor displays “não enviado” and a send action; one-time donor displays neither. The current monthly occurrence displays `Comprovante pendente` until its own receipt is uploaded.
  - [x] Sent status shows provider acceptance time and does not claim inbox delivery; failed and uncertain states display safe labels.
  - [x] Resend after acceptance requires explicit intent and creates a new generation in the UI state.
- Integration tests:
  - [x] Manual send for a historical monthly donor records one attempt; no background backfill sent it first.
  - [x] An opted-out donor's later pending occurrence can receive a manually sent, correctly scoped link without enrolling them in 10-day/5-day reminders.
  - [x] An expired standard link can be renewed for a selected pending occurrence by Administrador; Secretaria and public callers cannot trigger renewal.
  - [x] Concurrent manual calls do not duplicate a generation; a definite failure can retry and an uncertain result cannot auto-retry.
  - [x] A deliberate resend after acceptance creates a second generation while preserving the first; Secretaria and unauthenticated calls are denied.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every monthly donor has a truthful instructions status and Administrator can recover failed or missing sends.
