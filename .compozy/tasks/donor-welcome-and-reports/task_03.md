---
status: completed
title: Collect confirmed city and state in donor registration
type: frontend
complexity: high
dependencies:
  - task_01
---

# Task 3: Collect confirmed city and state in donor registration

## Overview
New donor registrations need explicit residence information for the state report. The existing CEP lookup should suggest values while leaving the registrant able to correct them and submit when the lookup is unavailable.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not HOW
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST collect a nonempty city and valid UF separately from free-text address and chapel selection.
- MUST allow the registrant to confirm or correct ViaCEP suggestions and continue when lookup fails.
- MUST validate the submitted city and UF on the server and persist them as confirmed residence.
- MUST preserve registration success when welcome email sending fails.
- SHOULD avoid overwriting a user correction when a late CEP lookup completes.
</requirements>

## Subtasks
- [x] 3.1 Extend donor form state and accessible labels for city and UF.
- [x] 3.2 Connect CEP suggestions without blocking manual correction.
- [x] 3.3 Extend server validation and persistence of confirmed residence.
- [x] 3.4 Cover lookup, correction, invalid input, and submit outcomes.

## Implementation Details
Follow TechSpec “Donor registration” and “Data Models.” Keep city and state distinct from `priorado_capela`, as required by PRD “Residence Information.”

### Relevant Files
- `app/benfeitor/_components/donor-form.tsx` — form state, lookup, and fields.
- `lib/cep/viacep.ts` — CEP lookup and returned city/UF.
- `lib/validations/donor-schema.ts` — server validation contract.
- `app/benfeitor/_actions/donor-actions.ts` — pledge persistence and post-save email attempt.

### Dependent Files
- `lib/db/schema.ts` — new residence columns from task 01.
- `__tests__/donor-form.test.tsx` — form behavior coverage.
- `__tests__/send-donor-welcome.test.ts` — registration/email failure boundary.

### Related ADRs
- [ADR-004: Confirmed residence fields and historical CEP enrichment](adrs/adr-004.md)

## Deliverables
- Confirmable city/UF fields and persisted residence provenance.
- Unit tests with at least 80% coverage of added validation and lookup state behavior.
- Integration tests for registration with lookup failure and Resend failure.

## Tests
- Unit tests:
  - [ ] ViaCEP returns São Paulo/SP; the form suggests both fields and accepts a user correction before submit.
  - [ ] A failed ViaCEP lookup leaves city/UF editable and shows no blocking lookup error.
  - [ ] Empty city or invalid UF returns field-specific validation errors.
- Integration tests:
  - [ ] Registering with manually entered Campinas/SP stores `confirmed` residence and succeeds when Resend fails after the insert.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every new successful registration has confirmed city and UF independent of chapel selection.
