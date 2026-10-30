---
status: completed
title: Export financial report as PDF
type: backend
complexity: medium
dependencies:
  - task_28
---

# Export financial report as PDF

## Overview
Export the filtered financial report as an institutional PDF using the same data as the screen and CSV.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST reuse task_28 report aggregation so PDF totals match the screen and CSV for identical filters.
- MUST use `@react-pdf/renderer`, `lib/pdf/document-header.tsx`, and the institutional footer.
- MUST state period and frequency filters and include totals, monthly table, and per-donor table with readable pagination.
- MUST guard the route with administrator authentication and return no-store PDF with an appropriate inline or attachment filename.
</requirements>

## Subtasks
- [x] 29.1 Build the PDF document from shared report data.
- [x] 29.2 Add authenticated export route and download UI.
- [x] 29.3 Verify rendered content, pagination, and route protection.

## Implementation Details
Follow existing PDF document and route response patterns.

### Relevant Files
- `lib/pdf/` — financial report document and institutional header/footer.
- `app/api/` — PDF export route.
- `app/admin/relatorios/` — export action.

### Dependent Files
- `__tests__/` — renderer and route tests.

### Related ADRs
- [ADR-004: Reconcile manually against bank-confirmed credits](adrs/adr-004.md)

## Deliverables
- Authenticated PDF export with the same filtered figures as task_28.
- Tests with at least 80% coverage of new modules.

## Tests
- Unit tests:
  - [x] Renderer output includes period, frequency, institutional header/footer, totals, monthly rows, and donor rows.
  - [x] Multi-page content stays readable and matches task_28 totals.
- Integration tests:
  - [x] Route rejects unauthenticated calls and returns PDF content, filename, and no-store headers for authorized calls.
  - [x] Run `npm test`, coverage gate (>=80% for new modules), and `npm run build` as in `logs/task_14-verification.md`.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- PDF reproduces the filtered financial report securely.
