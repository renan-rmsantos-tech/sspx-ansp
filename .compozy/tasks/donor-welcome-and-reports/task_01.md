---
status: completed
title: Add residence and email-reservation fields
type: backend
complexity: medium
dependencies: []
---

# Task 1: Add residence and email-reservation fields

## Overview
Extend donor registrations with structured residence, provenance, and a temporary welcome-email reservation. Nullable fields keep existing registrations readable while later tasks begin writing the new values.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add nullable city, UF, and provenance fields to donor pledges without changing existing residence or priory values.
- MUST add nullable reservation token and expiry fields while retaining `welcome_email_sent_at` as the Resend-acceptance record.
- MUST ensure the migration is compatible with existing rows and can be applied by the production migration command.
- SHOULD constrain or validate provenance and state values consistently with later application validation.
</requirements>

## Subtasks
- [x] 1.1 Add the donor pledge fields to the Drizzle schema.
- [x] 1.2 Generate and review a forward migration and its metadata.
- [x] 1.3 Confirm existing rows remain valid with null new fields.
- [x] 1.4 Add schema or migration tests for the new contract.

## Implementation Details
Follow TechSpec “Data Models” and “Development Sequencing.” This task provides only the storage contract; form, email, and reports behavior belong to dependent tasks.

### Relevant Files
- `lib/db/schema.ts` — donor pledge columns and indexes.
- `drizzle/meta/_journal.json` — migration ordering.
- `drizzle.config.ts` — migration configuration.

### Dependent Files
- `app/benfeitor/_actions/donor-actions.ts` — later writes confirmed residence.
- `lib/email/send-donor-welcome.ts` — later uses the reservation.
- `app/admin/_actions/admin-actions.ts` — reads extended pledge rows.

### Related ADRs
- [ADR-004: Confirmed residence fields and historical CEP enrichment](adrs/adr-004.md)
- [ADR-005: Database reservation for welcome email sends](adrs/adr-005.md)

## Deliverables
- Drizzle schema and migration for five nullable fields, including residence provenance.
- Unit tests with at least 80% coverage of any new validation helper.
- Integration test applying the migration to a database containing a legacy donor row.

## Tests
- Unit tests:
  - [ ] A new pledge without residence or reservation values remains parseable as a legacy row.
  - [ ] A pledge with confirmed residence and a reservation round-trips through the schema types.
- Integration tests:
  - [ ] Migrating a database with an existing pledge preserves its original address, CEP, chapel, and send timestamp.
  - [ ] The migrated table accepts null new values and accepts a populated reservation.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- The production migration command applies the new nullable columns without rewriting existing donor data.
