---
status: completed
title: Build administrator payment conference screen
type: frontend
complexity: high
dependencies:
  - task_10
---

# Build administrator payment conference screen

## Overview
Give Administrador a month-by-month workspace for checking expected contributions against the bank statement. One-time and monthly receipts should be accessible as supporting evidence while the screen keeps bank confirmation separate.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST protect the page with `requireAdmin()` and expose admin-only navigation; server actions retain their own checks.
- MUST offer month filter, expected list, receipt link for one-time rows through existing authorized document flow, and confirm value/date/note controls.
- MUST show `Comprovante pendente` when a monthly occurrence lacks a receipt and “Comprovante enviado – aguardando conferência” after upload through an admin-only row-ID lookup and short-lived download ticket.
- MUST show expected/received/outstanding totals, distinguish `Confirmado no extrato`, `Divergente`, and `Não identificado` from the receipt state, and highlight overdue monthly occurrences without receipts.
- MUST keep CPF and full address out of the conference list and its summary data.
- MUST label legacy coverage start and one-time historical pending rows; MUST not call a receipt “paid.”
- MUST provide keyboard focus, field errors, progress, and accessible mobile layout in pt-BR.
</requirements>

## Subtasks
- [x] 11.1 Add the protected conference route and sidebar entry.
- [x] 11.2 Add month selector, totals, expected rows, and overdue section.
- [x] 11.3 Add confirm/correct/reset/not-identified interactions and receipt access.
- [x] 11.4 Show monthly receipt evidence and preserve the distinct bank status after administrator review.
- [x] 11.5 Verify role denial, mobile, keyboard, and clear state copy.

## Implementation Details
Follow TechSpec “Conference, Totals, and Export Contract” and existing report style. Read `PRODUCT.md`, `DESIGN.md`, and `COPY.md` before UI/copy changes.

### Relevant Files
- `app/admin/relatorios/page.tsx` — protected admin report page pattern.
- `app/admin/relatorios/reports-client.tsx` — filters, totals, accessible table pattern.
- `app/admin/_components/donor-card.tsx` — authorized receipt opening pattern.

### Dependent Files
- `app/admin/_components/sidebar.tsx` — admin-only navigation.
- `app/admin/_actions/admin-actions.ts` — document ticket action.
- `__tests__/donor-reports-client.test.tsx` — UI test pattern.

### Related ADRs
- [ADR-004: Reconcile manually against bank-confirmed credits](adrs/adr-004.md)
- [ADR-005: Attach reminder receipts to early occurrence records](adrs/adr-005.md)

## Deliverables
- Administrator conference page with month filter, states, totals, and overdue list.
- Unit tests with at least 80% coverage of new interaction branches.
- Integration tests for route/action access and receipt state.

## Tests
- Unit tests:
  - [x] One-time pending row displays “Aguardando conferência” and a receipt control but zero received.
  - [x] Monthly pending row with a receipt displays “Comprovante enviado – aguardando conferência”; reviewed rows retain evidence but show their bank state first.
  - [x] Monthly row without a receipt displays “Comprovante pendente”; overdue missing-receipt rows remain visibly flagged even if the bank credit was confirmed.
  - [x] A confirmed amount/date shows confirmer/time; underpayment shows “Divergente” and positive outstanding.
  - [x] Month change updates list and totals, while failed save preserves entered fields and announces an error.
- Integration tests:
  - [x] Secretaria cannot render the page or call the conference actions directly.
  - [x] Only Administrador can obtain a monthly receipt download ticket by ledger row ID; the public reminder link cannot download the file.
  - [x] Keyboard users can filter, inspect receipt, confirm credit, and reach the overdue list.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Administrador can reconcile one-time and monthly rows without confusing uploaded evidence with received funds.
