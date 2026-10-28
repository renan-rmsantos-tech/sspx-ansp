---
status: completed
title: Manage reminder template, preview, test, and failed retries
type: frontend
complexity: high
dependencies:
  - task_05
---

# Manage reminder template, preview, test, and failed retries

## Overview
Give Administrador a usable reminder editor and recovery path. Saved content, preview, test send, and failure retry must use the same rendering rules as the scheduled sender.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST restrict template read/save, test send, and failed-send retry with `requireAdmin()` in each server action and the page.
- MUST show the allowed tokens, rendered preview, and distinct test recipient with `[TESTE]` subject; test sends create no scheduled-send row.
- MUST show `{link_comprovante}` in the token help and a clearly nonfunctional example URL in preview/test; saving cannot remove the link from real reminders.
- MUST validate length and tokens before save, and show specific progress and safe errors.
- MUST allow retry only for `failed` rows inside their pre-due retry window that remain opted in and unpaid; MUST not resend `sent` or active `sending` rows.
- MUST show `uncertain` rows for administrator review against Resend and allow an explicit accepted/failed resolution before any retry.
</requirements>

## Subtasks
- [x] 6.1 Add administrator template and test-send actions.
- [x] 6.2 Add an accessible editor, preview, and test-send UI.
- [x] 6.3 Add failed retry and uncertain-outcome review controls.
- [x] 6.4 Verify direct Secretaria calls and duplicate-send states.

## Implementation Details
Follow TechSpec “API Endpoints” and “Reminder Reservation and Send Flow.” Reuse the structure of the existing `/admin/email-benfeitores` page and client.

### Relevant Files
- `app/admin/email-benfeitores/page.tsx` — existing editor page.
- `app/admin/email-benfeitores/client.tsx` — preview and test UI pattern.
- `app/admin/_actions/donor-email-actions.ts` — role checks and template actions.

### Dependent Files
- `app/admin/_components/sidebar.tsx` — discoverable admin-only navigation.
- `__tests__/donor-email-client.test.tsx` — UI test pattern.
- `lib/email/` — task-05 sender and task-04 renderer.

### Related ADRs
- [ADR-003: Use a daily opted-in email job with per-occurrence reservations](adrs/adr-003.md)
- [ADR-005: Attach reminder receipts to early occurrence records](adrs/adr-005.md)

## Deliverables
- Admin-only reminder editor, preview/test, and failed retry UI/actions.
- Unit tests with at least 80% coverage of new action/render states.
- Integration tests for authorization and retry boundaries.

## Tests
- Unit tests:
  - [x] Preview resolves `{data_vencimento}`, `{chave_pix}`, and one example `{link_comprovante}` with sample values and the current header.
  - [x] Test send adds `[TESTE]`, targets the supplied address, and creates no reminder row.
  - [x] A `sent` row has no retry control; eligible `failed` displays one, and `uncertain` requires explicit review.
- Integration tests:
  - [x] Secretaria direct calls to save, test, and retry are denied.
  - [x] A failed row retries once inside its window; a late retry is expired, and an active lease returns in-progress without a second provider call.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Administrador can edit, preview, test, and recover eligible failed reminders without changing already accepted sends.
