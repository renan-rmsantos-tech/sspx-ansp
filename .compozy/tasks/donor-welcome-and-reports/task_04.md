---
status: completed
title: Enrich historical residence from valid CEPs
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 4: Enrich historical residence from valid CEPs

## Overview
Historical registrations can contribute to the residence report when their stored CEP resolves reliably. A separate bounded script keeps network lookups out of migrations and startup while leaving uncertain records unclassified.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not HOW
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST process only historical rows without confirmed residence and with an exact eight-digit CEP.
- MUST persist only complete, valid city/UF responses and mark their provenance as `cep_lookup`.
- MUST leave failed, incomplete, or ambiguous lookups null for “Local não identificado.”
- MUST be bounded and safely resumable without overwriting later confirmed values.
- MUST log only aggregate progress and errors, without CPF, email, or full address.
</requirements>

## Subtasks
- [x] 4.1 Add a bounded enrichment command for eligible records.
- [x] 4.2 Validate ViaCEP results and preserve provenance.
- [x] 4.3 Support safe reruns and interruption recovery.
- [x] 4.4 Report aggregate processed, classified, skipped, and failed counts.

## Implementation Details
Follow TechSpec “Historical residence enrichment.” Use the existing ViaCEP client where appropriate; avoid API calls in the migration or bootstrap path.

### Relevant Files
- `scripts/bootstrap.ts` — startup pattern to avoid for network enrichment.
- `lib/cep/viacep.ts` — existing lookup contract.
- `lib/db/schema.ts` — residence and provenance columns.

### Dependent Files
- `package.json` — optional explicit script entry.
- `app/admin/_actions/donor-report-actions.ts` — later uses classified/unknown state counts.

### Related ADRs
- [ADR-004: Confirmed residence fields and historical CEP enrichment](adrs/adr-004.md)

## Deliverables
- Bounded, resumable historical enrichment command with aggregate output.
- Unit tests with at least 80% coverage of result classification.
- Integration test proving reruns do not overwrite confirmed residence.

## Tests
- Unit tests:
  - [ ] A CEP with seven digits is skipped without a lookup.
  - [ ] A complete ViaCEP response persists city, UF, and `cep_lookup`; an empty city or invalid UF does not.
  - [ ] Lookup timeout increments failure count without logging donor identifiers.
- Integration tests:
  - [ ] Two runs over the same legacy rows do not change confirmed residence or duplicate work after the first classification.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Historical records with unresolved CEPs remain explicitly unclassified.
