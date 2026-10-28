---
status: completed
title: Manage monthly instructions template in admin
type: frontend
complexity: high
dependencies:
  - task_06
  - task_20
  - task_21
---

# Manage monthly instructions template in admin

## Overview
Give administrators an editable monthly instructions message alongside the existing welcome and reminder templates. Preview and test sending must be safe and clear about the nonfunctional sample receipt link.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST expose the monthly instructions template in the existing admin email/templates navigation and protect page reads and every server action with `requireAdmin()`.
- MUST allow editing subject/body, saving, and previewing with the institutional header and the documented token list.
- MUST send a clearly labeled `[TESTE]` message to a validated explicit address without creating a donor attempt or live receipt capability.
- MUST show that `{link_comprovante}` is required and body-only, identify required payment-fact tokens, and preview the fixed day-30 month-end, receipt requirement, and opt-in reminder wording.
- MUST show useful pt-BR success/error feedback without exposing provider details or donor secrets.
</requirements>

## Subtasks
- [x] 22.1 Add the template to admin email navigation with an authenticated page.
- [x] 22.2 Add edit/save, token help, preview, and test-send controls.
- [x] 22.3 Validate authorization and test-address handling in the actions.
- [x] 22.4 Verify preview/test isolation and accessibility.

## Implementation Details
Follow TechSpec “Transactional Monthly Payment Instructions.” Use the established welcome/reminder admin page conventions and the template/renderer from task_20.

### Relevant Files
- `app/admin/email-benfeitores/page.tsx` and `app/admin/email-benfeitores/client.tsx` — welcome editor pattern.
- `app/admin/lembretes-benfeitores/page.tsx` and `app/admin/lembretes-benfeitores/client.tsx` — preview, token help, test pattern.
- `app/admin/_components/sidebar.tsx` — email/templates navigation.
- `app/admin/_actions/donor-email-actions.ts` — current authenticated email actions.

### Dependent Files
- New monthly instructions admin page/client/actions — editable interface.
- `__tests__/donor-email-client.test.tsx` and new monthly instructions admin tests — interaction and authorization conventions.

### Related ADRs
- [ADR-006: Use fixed public due-day choices and transactional instructions](adrs/adr-006.md)

## Deliverables
- Authenticated admin editor with token documentation, preview, test send, and navigation entry.
- Unit tests with at least 80% coverage of new UI/action behavior and integration tests for persistence and unauthorized calls.

## Tests
- Unit tests:
  - [x] Editor documents all supported tokens and identifies `{link_comprovante}` as required/body-only.
  - [x] Preview reflects unsaved edits, labels its receipt link as nonfunctional, and uses the institutional header.
  - [x] Invalid email address or template shows a pt-BR validation error without attempting a test send.
- Integration tests:
  - [x] Administrator saves a template, reloads the page, and sees the saved text; bootstrap does not overwrite it.
  - [x] Test send reaches only the explicit address with `[TESTE]` and creates no donor send-attempt row.
  - [x] Secretaria and unauthenticated direct action calls cannot read, save, preview, or test the template.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Administrators can review and test the exact template used for future monthly instructions.
