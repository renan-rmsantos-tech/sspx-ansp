---
status: completed
title: Explain required receipts in donor and admin interfaces
type: frontend
complexity: high
dependencies:
  - task_17
  - task_19
  - task_20
  - task_22
  - task_23
  - task_24
---

# Explain required receipts in donor and admin interfaces

## Overview
Align the public form, receipt page, instructions email preview, and donor list with the required receipt for each monthly payment. Donors still register without a receipt and upload later through a signed link without logging in.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST state in the monthly form and success copy that each later monthly payment requires its own receipt through the emailed link, while asking for no receipt at registration.
- MUST show `Comprovante pendente` on the signed public page before upload and `Comprovante enviado – aguardando conferência` after upload; page copy requests the required receipt and keeps bank confirmation separate.
- MUST show the current monthly occurrence's receipt state in the admin donor list, with no private path, bearer ticket, or receipt URL in the projection.
- MUST show the required first-occurrence link and receipt explanation in the instructions template preview and token help; test links remain nonfunctional.
- MUST keep keyboard/mobile feedback, valid-link privacy behavior, and upload replacement flow from the completed receipt page.
- MUST allow a valid signed link to show/upload a still-missing receipt after bank confirmation, preserving the distinct bank-review state without disclosing bank details publicly.
</requirements>

## Subtasks
- [x] 25.1 Update the monthly form and success explanation without adding a registration upload.
- [x] 25.2 Update public receipt page labels, upload guidance, and success feedback.
- [x] 25.3 Show current occurrence receipt state in the donor list and instructions preview.
- [x] 25.4 Verify missing/sent states, privacy, and accessible feedback.

## Implementation Details
Follow TechSpec “Receipt-required amendment” and “Per-Occurrence Receipt Link and Upload.” Backend receipt state and reminder suppression come from task_24; this task addresses the public/admin presentation.

### Relevant Files
- `app/benfeitor/_components/donor-form.tsx` — monthly registration and success copy.
- `app/benfeitor/comprovante/` — signed public receipt page and upload component.
- `app/admin/_components/donor-card.tsx` — current occurrence receipt state.
- Monthly instructions admin client from task_22 — preview/token help.

### Dependent Files
- `__tests__/donor-form.test.tsx`, receipt-page UI tests, and donor-list tests — copy, privacy, and state feedback.

### Related ADRs
- [ADR-006: Use fixed public due-day choices and transactional instructions](adrs/adr-006.md)
- [ADR-007: Require a receipt for every monthly occurrence](adrs/adr-007.md)

## Deliverables
- Updated donor-facing and administrator-facing receipt requirement and state presentation.
- Unit tests with at least 80% coverage of new UI states and integration tests for signed-link upload flow.

## Tests
- Unit tests:
  - [x] Monthly registration asks for no receipt, but clearly says one is required after each monthly payment and provided through email.
  - [x] Signed receipt page starts with `Comprovante pendente`, then announces `Comprovante enviado – aguardando conferência` after a valid upload.
  - [x] Donor list shows current occurrence receipt state without exposing ticket or private path; one-time donor has no monthly receipt state.
  - [x] Instructions preview describes required receipt and uses a nonfunctional sample link.
- Integration tests:
  - [x] Both instructions and reminder signed links open the same occurrence's receipt page without login; upload changes only that occurrence's visible state.
  - [x] Invalid/expired links preserve the friendly no-detail state and do not expose donor identity or receipt path.
  - [x] A bank-confirmed occurrence with a valid link still accepts its missing receipt and retains the administrator's confirmed bank state.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Donors and administrators see the same required per-occurrence receipt rule.
