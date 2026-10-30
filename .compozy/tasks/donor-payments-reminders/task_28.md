---
status: completed
title: Add financial report data, screen, and CSV
type: frontend
complexity: high
dependencies:
  - task_10
  - task_13
---

# Add financial report data, screen, and CSV

## Overview
Extend `/admin/relatorios` with a period-filtered financial report and downloadable CSV.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST filter by bounded start/end month and frequency, including monthly and one-time pledges.
- MUST show previsto, recebido confirmado no banco, em aberto, and crédito não identificado/divergente with cent-accurate totals.
- MUST show a month-by-month table and chart, plus per-donor paid, owed, and overdue installment values, split by frequency.
- MUST require administrator authentication for data and CSV; export UTF-8 BOM CSV with formula-injection escaping following `lib/donor-conference-csv.ts`, and no-store headers.
- MUST define shared report data semantics that task_29 can reuse for PDF parity.
</requirements>

## Subtasks
- [x] 28.1 Implement bounded financial aggregation and frequency filters.
- [x] 28.2 Add summaries, monthly chart/table, and donor table.
- [x] 28.3 Add authorized CSV export and verify parity.

## Implementation Details
Follow the TechSpec conference totals contract and existing reporting screen patterns.

### Relevant Files
- `app/admin/relatorios/` — filters and financial report UI.
- `lib/` — shared financial report aggregation and CSV generation.
- `app/api/` — authorized CSV response.

### Dependent Files
- `__tests__/` — aggregation, UI, route, and PostgreSQL integration tests.

### Related ADRs
- [ADR-004: Reconcile manually against bank-confirmed credits](adrs/adr-004.md)

## Deliverables
- Financial report screen and secure CSV export.
- Tests with at least 80% coverage of new modules and PostgreSQL integration for ledger aggregation.

## Tests
- Unit tests:
  - [x] Month bounds, frequency splits, overdue counts, and cent-level totals reconcile across summary, chart, tables, and CSV.
  - [x] CSV includes BOM and escapes formula-leading cells.
- Integration tests:
  - [x] PostgreSQL report covers confirmed, open, unidentified, and divergent credits without double-counting; unauthorized CSV requests fail.
  - [x] Run `npm test`, coverage gate (>=80% for new modules), and `npm run build` as in `logs/task_14-verification.md`.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Filtered screen and CSV reconcile to the same cent-accurate data.
