---
status: completed
title: Preview receipts inline in payment conference
type: frontend
complexity: medium
dependencies:
  - task_11
---

# Preview receipts inline in payment conference

## Overview
Open receipt evidence in a responsive inline panel beside the payment conference list.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST render images inline and PDFs in an embedded viewer; other types offer `Abrir em nova aba`.
- MUST use existing private short-lived download tickets with authorization, `Content-Disposition: inline`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and correct content type.
- MUST provide a labeled panel, keyboard focus management, Escape close, and responsive layout.
</requirements>

## Subtasks
- [x] 27.1 Provide authorized inline document delivery.
- [x] 27.2 Add preview panel and fallback to the conference screen.
- [x] 27.3 Verify accessibility, media handling, and privacy.

## Implementation Details
Follow existing document ticket and conference UI contracts.

### Relevant Files
- `app/admin/conferencia-pagamentos/` — receipt row and preview panel.
- `app/api/documents/` and `lib/storage/` — authorized inline response.

### Dependent Files
- `__tests__/` — UI and route tests.

### Related ADRs
- [ADR-005: Attach reminder receipts to early occurrence records](adrs/adr-005.md)

## Deliverables
- Accessible inline image/PDF preview with safe fallback.
- Tests with at least 80% coverage of new modules.

## Tests
- Unit tests:
  - [x] Images, PDFs, and unsupported types select their expected presentation.
  - [x] Opening moves focus into the panel; Escape closes it and restores focus; narrow layouts remain usable.
- Integration tests:
  - [x] Authorized short-lived ticket serves correct inline headers and bytes; expired/invalid tickets fail without private path disclosure.
  - [x] Run `npm test`, coverage gate (>=80% for new modules), and `npm run build` as in `logs/task_14-verification.md`.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Administrators can inspect supported receipts in the conference screen.
