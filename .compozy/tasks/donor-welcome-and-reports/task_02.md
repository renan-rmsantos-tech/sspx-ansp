---
status: completed
title: Publish the public Como funciona explanation
type: frontend
complexity: medium
dependencies: []
---

# Task 2: Publish the public Como funciona explanation

## Overview
Give visitors a readable explanation of the Arca before they decide to become benefactors. The public content must follow the approved presentation and lead to the existing signup path.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST expose a discoverable “Como funciona” item in the public main navigation, including a usable mobile path.
- MUST explain funding flow and participant responsibilities using `docs/examples/presentation_ansp.pdf` slides 2, 4, 7–8, 10–14, and 17 as the factual source.
- MUST link clearly to the existing `/seja-um-benfeitor` route.
- MUST omit eligibility details from slides 15–16, mandatory FSSPX affiliation, unverified staffing, statistics, and promises.
- MUST use pt-BR copy, semantic headings, visible focus, and readable mobile layout.
</requirements>

## Subtasks
- [x] 2.1 Trace proposed claims to permitted presentation slides.
- [x] 2.2 Add the public explanation and navigation entry.
- [x] 2.3 Preserve the existing signup journey and mobile navigation access.
- [x] 2.4 Verify forbidden claims are absent and accessibility checks pass.

## Implementation Details
Follow TechSpec “Public explanation” and PRD “Public Project Explanation.” Read `PRODUCT.md`, `DESIGN.md`, and `COPY.md`; the runtime landing component is the implementation authority.

### Relevant Files
- `app/page.tsx` — landing navigation, sections, and public links.
- `docs/examples/presentation_ansp.pdf` — editorial source.
- `PRODUCT.md`, `DESIGN.md`, `COPY.md` — product and copy rules.

### Dependent Files
- `app/seja-um-benfeitor/page.tsx` — destination of the signup link.
- `__tests__/layout.test.tsx` — existing public layout testing pattern.

### Related ADRs
- [ADR-003: Public explanation sourced from the institutional presentation](adrs/adr-003.md)

### Source review
- Purpose and Catholic formation: slides 2 and 17.
- Need for stable scholarships: slides 4 and 7–8.
- Flow from benefactors through the association to schools and students: slides 10–11.
- Responsibilities of schools, association, students, and families: slides 12–14.
- Slides 15–16 eligibility conditions, FSSPX affiliation as a requirement, staffing, undated statistics, and promises are excluded.

## Deliverables
- Public navigation item and explanation with a benefactor signup link.
- Claim-to-slide review notes in the task handoff or test fixtures.
- Unit tests with at least 80% coverage of new interactive behavior.
- Integration test covering navigation from explanation to signup.

## Tests
- Unit tests:
  - [ ] The public navigation contains “Como funciona” and its destination exists.
  - [ ] The explanation contains association, schools, families, and benefactor responsibilities, and omits scholarship percentages and mandatory affiliation.
- Integration tests:
  - [ ] A keyboard user can reach the explanation and continue to `/seja-um-benfeitor` on desktop and mobile layouts.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Visitors can understand the project and reach signup without opening the presentation.
