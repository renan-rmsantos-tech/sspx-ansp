---
status: completed
title: Show welcome status and manual send in the donor list
type: frontend
complexity: high
dependencies:
  - task_05
---

# Task 6: Show welcome status and manual send in the donor list

## Overview
Administrators need to find every pending welcome email in the donor list they already use. The list must show a state for every registration and provide clear progress and outcome feedback for individual sends.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not HOW
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST display a recorded acceptance date or clear pending state for every administrator-visible donor registration.
- MUST filter the full donor population by welcome email state; the 50-record limit in the separate email-settings pending query must not restrict this workflow.
- MUST show the manual send action only to administrators for unsent registrations.
- MUST show in-progress, sent, already-sent, and failure feedback from task 05.
- MUST preserve search, frequency, priory, sorting, and the existing editor/test-send route.
</requirements>

## Subtasks
- [x] 6.1 Include send state in the administrator donor list projection and card type.
- [x] 6.2 Add the welcome-state filter and status display.
- [x] 6.3 Add individual send action with progress and accessible result feedback.
- [x] 6.4 Ensure Secretariat sees no manual send control or sensitive new status fields beyond its authorization.
- [x] 6.5 Confirm all pending registrations remain findable beyond 50 records.

## Implementation Details
Follow TechSpec “Admin donor list.” Keep the welcome editor and test-send flow in `app/admin/email-benfeitores/`; this task brings follow-up into the full donor list.

### Relevant Files
- `app/admin/benfeitores/client.tsx` — full list filtering and rendering.
- `app/admin/_components/donor-card.tsx` — administrator card and actions.
- `app/admin/_actions/admin-actions.ts` — role-specific donor projections.
- `app/admin/_actions/donor-email-actions.ts` — typed retry result.

### Dependent Files
- `app/admin/benfeitores/page.tsx` — role-based client selection.
- `app/admin/email-benfeitores/client.tsx` — retained editor and test-send flow.
- `__tests__/benfeitores-client.test.tsx` — list behavior tests.

### Related ADRs
- [ADR-002: Administrator-only access to benefactor reports](adrs/adr-002.md)
- [ADR-005: Database reservation for welcome email sends](adrs/adr-005.md)

## Deliverables
- Full-list welcome status filter and per-record admin send action.
- Unit tests with at least 80% coverage of new filtering and status behavior.
- Integration test for pending registration number 51 and the manual-send result.

## Tests
- Unit tests:
  - [ ] Sent donor displays the acceptance date and no send button; pending donor displays an action.
  - [ ] Pending filter finds the 51st unsent donor after search and sort changes.
  - [ ] `in_progress` disables repeated action and failure shows a retryable message.
- Integration tests:
  - [ ] An administrator sends from `/admin/benfeitores` and sees the updated status after server confirmation.
  - [ ] Secretariat list renders without the manual send control.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- 100% of administrator-visible registrations show a welcome state and every pending registration can be found.
