---
status: completed
title: Persist reminder template and send records
type: backend
complexity: high
dependencies:
  - task_03
---

# Persist reminder template and send records

## Overview
Create the durable data and rendering contract for two reminder kinds per monthly payment. A default template must work before an administrator edits it, and saved content must remain safe when donor values are inserted.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add a singleton reminder template and unique `(pledge, competence, kind)` send record with sending/sent/failed/uncertain status, acceptance time, safe error, lease, and attempt metadata.
- MUST seed a default template only if absent; MUST preserve administrator edits across startup.
- MUST allow `{link_comprovante}` in the body and require it exactly once in every saved/default reminder; MUST reject it in the subject and reject unknown tokens.
- MUST escape resolved values in HTML while retaining plain text, rendering the link as a safe anchor and readable text URL; preview/test must use a clearly nonfunctional sample link.
- MUST support a frozen send payload and stable provider key for retries; MUST avoid personal data in logs.
</requirements>

## Subtasks
- [x] 4.1 Add schema, migration, constraints, and indexes for template and send records.
- [x] 4.2 Add idempotent default-template bootstrap.
- [x] 4.3 Add token validation and rendering with shared header/Pix values.
- [x] 4.4 Ensure every default and edited body retains the receipt-link token.
- [x] 4.5 Verify database uniqueness and template safety.

## Implementation Details
Follow TechSpec “Phase 2” and “Reminder Reservation and Send Flow.” Reuse the welcome-email singleton and header patterns without changing its behavior.

### Relevant Files
- `lib/db/schema.ts` — new table definitions.
- `scripts/bootstrap.ts` — idempotent singleton initialization.
- `lib/email/donor-welcome-template.ts` — HTML/header rendering pattern.

### Dependent Files
- `lib/email/send-donor-welcome.ts` — sender/header integration reference.
- `drizzle/` — additive migration.
- `__tests__/donor-welcome-email.test.ts` — template test pattern.

### Related ADRs
- [ADR-003: Use a daily opted-in email job with per-occurrence reservations](adrs/adr-003.md)
- [ADR-005: Attach reminder receipts to early occurrence records](adrs/adr-005.md)

## Deliverables
- Reminder schema/migration, default template, token renderer.
- Unit tests with at least 80% coverage of token/rendering logic.
- Integration tests for singleton and unique send keys.

## Tests
- Unit tests:
  - [x] `{nome}` containing `<` is escaped in HTML; `{valor}` and dates use pt-BR output.
  - [x] Unknown tokens and an empty or multiline subject are rejected before saving.
  - [x] A body missing or duplicating `{link_comprovante}` and a subject containing it are rejected.
  - [x] A default template renders one safe link in HTML/text with the document header; preview uses a nonfunctional URL.
- Integration tests:
  - [x] Two inserts for one pledge, competence, and `10d` cannot create two rows; `5d` remains distinct.
  - [x] Running bootstrap twice leaves an edited template unchanged.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- The schema can represent each reminder exactly once and render a safe, editable message.
