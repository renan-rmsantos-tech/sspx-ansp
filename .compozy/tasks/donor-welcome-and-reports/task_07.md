---
status: completed
title: Aggregate administrator-only geographic reports
type: backend
complexity: high
dependencies:
  - task_01
  - task_04
---

# Task 7: Aggregate administrator-only geographic reports

## Overview
The report data path must answer two separate geographic questions using one selected registration population. SQL aggregation limits the response to categories and counts and keeps donor-level information outside the chart page.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not HOW
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST require administrator authorization before every report read.
- MUST validate one shared period and contribution-frequency filter contract for both series; default includes all registrations.
- MUST aggregate by residence UF and selected priory/chapel separately in Postgres.
- MUST include “Local não identificado” for missing residence and explicit none/unknown chapel categories.
- MUST return only aggregate counts and a selected-population total; no CPF, email, or full address.
- MUST make each series sum to the same selected-population total for every valid filter.
</requirements>

## Subtasks
- [x] 7.1 Define and validate shared report filters and aggregate result shape.
- [x] 7.2 Add SQL counts for residence and chapel using identical population filters.
- [x] 7.3 Protect the read action with `requireAdmin()`.
- [x] 7.4 Cover empty populations, unknown categories, date boundaries, and role denial.

## Implementation Details
Follow TechSpec “Reports,” “Core Interfaces,” and “Data Models.” Use `donor_pledges.created_at` as the period field and the existing `frequencia` values. The report must count registrations, not unique people or received revenue.

### Relevant Files
- `lib/db/schema.ts` — donor pledge residence, chapel, date, and frequency fields.
- `lib/auth/authorization.ts` — administrator guard.
- `app/admin/_actions/admin-actions.ts` — existing server-action patterns.
- `lib/data/priorados-capelas.ts` — display labels and none value.

### Dependent Files
- `app/admin/relatorios/page.tsx` — later consumes aggregate result.
- `__tests__/admin-actions.test.ts` — existing fake DB action patterns.

### Related ADRs
- [ADR-001: Two complementary donor location reports](adrs/adr-001.md)
- [ADR-002: Administrator-only access to benefactor reports](adrs/adr-002.md)
- [ADR-006: Database aggregation for geographic reports](adrs/adr-006.md)

## Deliverables
- Administrator-only aggregate report action with validated filters.
- Unit tests with at least 80% coverage of filter validation and category labeling.
- Postgres integration tests for grouped totals and privacy of the returned shape.

## Tests
- Unit tests:
  - [ ] Invalid date range and unknown frequency are rejected before querying.
  - [ ] Missing UF maps to “Local não identificado”; explicit no-chapel and null chapel stay distinct.
- Integration tests:
  - [ ] All-time report with known, unknown, and no-chapel rows returns two series each summing to total registrations.
  - [ ] A filtered period with mensal frequency excludes rows outside either condition from both series.
  - [ ] Secretariat access is denied and aggregate payload contains no donor CPF, email, or address.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Both report series reconcile to the same selected total and expose aggregate data only.
