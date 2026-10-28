---
status: completed
title: Build the public monthly receipt page
type: frontend
complexity: medium
dependencies:
  - task_16
---

# Build the public monthly receipt page

**Later amendment:** This completed task records the original closed-bank-state presentation. Pending tasks task_24 and task_25 supersede it for a valid link when the receipt is still missing after bank confirmation. The completion status of this task is unchanged.

## Overview
Give a monthly benefactor a minimal pt-BR page reached from the reminder email without login. The page identifies only first name, reference month, and amount and explains that uploading a Pix receipt does not confirm bank credit.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST render a dynamic, no-store public page for a valid task-16 capability, showing only first name, competência, expected amount, one image/PDF upload, and a clear replacement rule.
- MUST show a friendly no-detail state for invalid/expired/deleted links and a closed state for bank-confirmed occurrences, without exposing whether another pledge exists.
- MUST show upload validation, progress, and a success state saying bank confirmation is still pending; task_25 updates the page to request the required per-occurrence receipt.
- MUST follow `PRODUCT.md`, `DESIGN.md`, `COPY.md`, runtime design tokens/components, pt-BR copy, keyboard access, mobile layout, and `no-referrer`/`noindex` protections.
- MUST avoid third-party page assets and any public receipt download control or personal identifiers beyond the three approved fields.
</requirements>

## Subtasks
- [x] 17.1 Build the dynamic public page and minimal valid/invalid/closed states.
- [x] 17.2 Build accessible upload, progress, replacement, and success interactions.
- [x] 17.3 Set privacy/cache/robots headers and verify the page sends no bearer link to third parties.
- [x] 17.4 Verify pt-BR copy, mobile/keyboard use, and minimal data projection.

## Implementation Details
Follow TechSpec “Per-Occurrence Receipt Link and Upload.” Read project UX/copy guidance before UI edits. Use the task-16 service to verify the link server-side; GET only reads the existing row and never materializes or uploads.

### Relevant Files
- `app/benfeitor/page.tsx` — public donor page conventions.
- `app/benfeitor/_components/donor-form.tsx` — upload and error-state patterns.
- `app/globals.css` — executable design tokens.

### Dependent Files
- `app/benfeitor/comprovante/page.tsx` — new public route.
- `components/ui/button.tsx` — shared control style.
- `__tests__/` — public page and interaction tests.

### Related ADRs
- [ADR-005: Attach reminder receipts to early occurrence records](adrs/adr-005.md)

## Deliverables
- Public receipt page with minimal context, receipt upload, success, and invalid/closed states; task_25 updates the required-receipt copy.
- Unit tests with at least 80% coverage of page state logic.
- Integration tests for valid upload, expired link, privacy headers, and accessibility.

## Tests
- Unit tests:
  - [x] Valid link shows first name, month, and amount, with no CPF/email/full name or storage path in markup.
  - [x] Invalid/expired link shows the same courteous no-detail state; bank-confirmed row shows a closed state.
  - [x] Upload success announces “Comprovante enviado” and says bank conference is still required.
- Integration tests:
  - [x] Opening a link changes no database row or file; submitting a valid file changes only its occurrence.
  - [x] Keyboard and mobile users can choose a file, understand validation, replace it, and perceive success.
  - [x] Response applies no-store/no-referrer/noindex protections and loads no third-party assets.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Benefactor can use the reminder link without login and sees no other personal or payment records.
