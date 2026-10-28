---
status: completed
title: Reorder Pix and conditional donor submission
type: frontend
complexity: high
dependencies:
  - task_01
---

# Reorder Pix and conditional donor submission

## Overview
Make the public contribution sequence usable for a one-time Pix and clear for a monthly pledge. The server must preserve the receipt requirement only for one-time submissions and discard forged monthly receipt data.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST show existing Pix key, QR, bank, beneficiary, and CNPJ before the one-time date and required receipt.
- MUST show a 1–28 monthly day input and no monthly receipt control; MUST explain opt-in reminders and no receipt at registration.
- MUST require valid one-time date and receipt on the server; MUST ignore monthly receipt fields and preserve the current one-time file move/rollback.
- MUST keep copy in pt-BR and support keyboard/mobile use with visible errors.
</requirements>

## Subtasks
- [x] 2.1 Consolidate the existing Pix details so form and public page cannot drift.
- [x] 2.2 Reorder one-time controls and add the monthly day/copy.
- [x] 2.3 Update client and server validation and persistence by frequency.
- [x] 2.4 Verify both journeys, including forged monthly receipt input.

## Implementation Details
Follow TechSpec “Phase 1” and “Data Models and Migrations.” Read `PRODUCT.md`, `DESIGN.md`, and `COPY.md`; runtime components and CSS are the visual authority.

### Relevant Files
- `app/seja-um-benfeitor/page.tsx` — current Pix details appear after the form.
- `app/benfeitor/_components/donor-form.tsx` — conditional controls and payload.
- `lib/validations/donor-schema.ts` — server-side conditional rules.

### Dependent Files
- `app/benfeitor/_actions/donor-actions.ts` — persistence and receipt handling.
- `__tests__/donor-form.test.tsx` — public journey tests.
- `__tests__/donor-schema.test.ts` — validation tests.

### Related ADRs
- [ADR-001: Stage the donor journey and due-day rule](adrs/adr-001.md)

## Deliverables
- Corrected public form and one Pix detail source.
- Unit tests with at least 80% coverage of changed conditional validation.
- Integration tests for one-time receipt handling and monthly receipt discard.

## Tests
- Unit tests:
  - [x] With `unica`, Pix details precede date and receipt; submitting without either shows the matching error.
  - [x] With `mensal`, day 1 and 28 submit, day 0/29 fail, and no receipt field is rendered.
  - [x] A forged monthly payload containing `recibo_path`/`recibo_nome` persists both as null.
- Integration tests:
  - [x] A valid one-time registration moves a pending receipt to `donors/`; a failed insert restores its pending path.
  - [x] A valid monthly registration persists day, duration, and email opt-in without moving a receipt.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- The one-time user can see where to pay before the required upload, and the monthly user can submit without evidence.
