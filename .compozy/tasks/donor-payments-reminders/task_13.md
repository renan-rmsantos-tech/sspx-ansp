---
status: completed
title: Chart expected and received amounts by month
type: frontend
complexity: medium
dependencies:
  - task_10
  - task_11
---

# Chart expected and received amounts by month

## Overview
Let administrators compare planned and bank-confirmed contributions across months. The chart must share its aggregate data with an exact-value table, following the established report style and coverage boundary.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST aggregate a bounded rolling 12-month window ending in the selected month, with zero rows for empty months and monthly coverage clipped to ledger launch.
- MUST show expected and received per month using existing Recharts styles and a semantic table with the same figures.
- MUST show monthly counts of receipt pending and receipt sent in the semantic table, separate from bank-confirmed amount totals, and highlight overdue missing-receipt counts without treating them as unpaid funds.
- MUST use exact ledger totals and omit individual names, CPF, email, address, phone, receipt details, and notes from chart props.
- MUST label prelaunch coverage limits and make the table usable without color or hover.
</requirements>

## Subtasks
- [x] 13.1 Add month-series aggregation from the ledger.
- [x] 13.2 Add chart and equivalent table near the conference view.
- [x] 13.3 Verify empty months, divergence, accessibility, and data parity.

## Implementation Details
Follow TechSpec “Conference, Totals, and Export Contract” and the current `/admin/relatorios` chart/table structure. Keep bank amounts and pledge counts conceptually separate from the existing geographic registration report.

### Relevant Files
- `app/admin/relatorios/reports-charts.tsx` — established Recharts visual style.
- `app/admin/relatorios/reports-client.tsx` — equivalent semantic table pattern.
- `app/admin/_actions/donor-report-actions.ts` — aggregate action pattern.

### Dependent Files
- `app/admin/conferencia-pagamentos/` — task-11 conference screen.
- `__tests__/donor-reports-client.test.tsx` — chart/table UI test pattern.

### Related ADRs
- [ADR-004: Reconcile manually against bank-confirmed credits](adrs/adr-004.md)

## Deliverables
- Rolling monthly aggregate, chart, and exact-value table.
- Unit tests with at least 80% coverage of new aggregation/display logic.
- Integration test comparing chart and table against ledger totals.

## Tests
- Unit tests:
  - [x] A month with no rows renders zero expected and received in both chart data and table.
  - [x] A divergent 100/80 row contributes 100 expected and 80 received, not 100 received.
  - [x] A bank-confirmed occurrence without a receipt contributes to received funds and the missing-receipt count independently.
  - [x] Twelve months ending 2026-12 include 2026-01 through 2026-12, clipped at coverage start.
- Integration tests:
  - [x] For each selected month, chart values equal table cells and the underlying ledger aggregate.
  - [x] Chart props contain no donor-level identifiers or notes, and the table remains keyboard readable.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Administrators can compare expected and received money by month with exact figures available in a table.
