---
status: completed
title: Present two geographic charts and equivalent tables
type: frontend
complexity: high
dependencies:
  - task_07
---

# Task 8: Present two geographic charts and equivalent tables

## Overview
Administrators need a separate visual and exact data view for residence and priory/chapel counts. The report area should keep shared filters and the selected total visible while remaining usable on mobile and by keyboard.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not HOW
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add an administrator-only Reports route and navigation entry.
- MUST render separate charts for residence UF and selected priory/chapel using a React chart library.
- MUST render a semantic table with the same categories and counts beside or below each chart.
- MUST expose shared period and frequency filters, default to all registrations, and display the selected-population total.
- MUST keep unknown/none categories visible, label counts as registrations, and work by keyboard and on mobile.
- MUST avoid donor-level data in chart props and page payloads.
</requirements>

## Subtasks
- [x] 8.1 Select a React 19/Next.js 16 compatible chart package and add it to the report route only.
- [x] 8.2 Add the protected report page and admin-only sidebar entry.
- [x] 8.3 Render shared filters, total, two charts, and two matching tables.
- [x] 8.4 Verify chart/table consistency, role restriction, keyboard use, and mobile layout.

## Implementation Details
Follow TechSpec “Reports” and ADR-007. Read `PRODUCT.md`, `DESIGN.md`, and `COPY.md`; use executable tokens in `app/globals.css` and existing admin components.

### Relevant Files
- `app/admin/_components/sidebar.tsx` — role-filtered navigation.
- `app/admin/benfeitores/page.tsx` — admin page conventions.
- `app/globals.css` — current design tokens.
- `package.json` — chart dependency.

### Dependent Files
- `app/admin/_actions/donor-report-actions.ts` — aggregate data contract from task 07.
- `lib/auth/authorization.ts` — report route authorization.
- `__tests__/stats-dashboard.test.tsx` — existing visual data test pattern.

### Related ADRs
- [ADR-001: Two complementary donor location reports](adrs/adr-001.md)
- [ADR-002: Administrator-only access to benefactor reports](adrs/adr-002.md)
- [ADR-007: Chart library with equivalent data tables](adrs/adr-007.md)

## Deliverables
- Protected Reports route with two charts, two equivalent tables, shared filters, and total.
- Unit tests with at least 80% coverage of new report presentation logic.
- Integration tests covering filter changes and administrator/Secretariat access.

## Tests
- Unit tests:
  - [ ] Each chart's categories and counts match its adjacent table, including unknown and none categories.
  - [ ] Default filters show all registrations and updated filters keep the selected total visible.
- Integration tests:
  - [ ] Administrator can use filters by keyboard and read both report questions on a narrow viewport.
  - [ ] Secretariat cannot open `/admin/relatorios` and does not see its navigation item.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Both charts and tables reconcile with the displayed total for every selected population.
