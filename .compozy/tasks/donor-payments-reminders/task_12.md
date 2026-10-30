---
status: completed
title: Export selected payment conference as CSV
type: backend
complexity: medium
dependencies:
  - task_10
  - task_11
---

# Export selected payment conference as CSV

## Overview
Provide a spreadsheet-friendly copy of the selected conference month for administrative review. The export must reflect the same ledger rows and totals as the screen while omitting unnecessary personal data.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST require Administrador on the export action/route and validate the selected `YYYY-MM` month.
- MUST export only safe columns from the selected ledger rows, with pt-BR labels, exact decimal values, and UTF-8 BOM.
- MUST include separate receipt and bank-review labels, so missing evidence, uploaded evidence, confirmed credit, divergence, and not-identified review are distinguishable without exporting receipt paths.
- MUST quote commas/newlines and neutralize spreadsheet formula prefixes in free text.
- MUST omit CPF, full address, email, phone, free-form notes, receipt path/URL, and provider error text.
</requirements>

## Subtasks
- [x] 12.1 Add a guarded CSV export using the conference month query.
- [x] 12.2 Add a download control to the conference screen.
- [x] 12.3 Verify encoding, safe columns, month match, and formula escaping.

## Implementation Details
Follow TechSpec “Conference, Totals, and Export Contract.” Keep the export query aligned with task 10 and avoid a separate financial calculation path.

### Relevant Files
- `app/admin/_actions/donor-report-actions.ts` — current report authorization and filters.
- `app/admin/relatorios/reports-client.tsx` — existing filter UI pattern.
- `app/admin/conferencia-pagamentos/` — task-11 conference route.

### Dependent Files
- `lib/auth/authorization.ts` — administrator guard.
- `__tests__/donor-report-actions.test.ts` — action test pattern.

### Related ADRs
- [ADR-004: Reconcile manually against bank-confirmed credits](adrs/adr-004.md)

## Deliverables
- CSV generation and visible download control for the selected month.
- Unit tests with at least 80% coverage of CSV serialization.
- Integration test for administrator-only month export.

## Tests
- Unit tests:
  - [x] A donor name beginning `=SUM(1,1)` is exported as inert text; embedded comma, quote, and newline round-trip correctly.
  - [x] A 100.00 expected/80.00 received row exports 20.00 outstanding, matching the screen.
  - [x] Header and rows contain no CPF, email, address, phone, note, receipt URL, or provider error.
  - [x] A pending-receipt row and an uploaded-receipt row export different evidence labels while `Confirmado no extrato`, `Divergente`, and `Não identificado` remain separate bank labels.
- Integration tests:
  - [x] Secretaria direct export call is denied; administrator receives only rows from the chosen month.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- The downloaded CSV is safe, month-scoped, and numerically consistent with conference totals.
