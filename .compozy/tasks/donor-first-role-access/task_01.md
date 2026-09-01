---
status: completed
title: Create the data, identity, and authorization foundation
type: backend
complexity: critical
dependencies: []
---

# Task 1: Create the data, identity, and authorization foundation

## Overview

Establish the persistent data and authorization foundation for Administrator and Secretariat profiles. This task extends existing accounts without invalidating users or decisions, adds the relational models required by later tasks, and creates a central boundary that revalidates role and activity for every protected operation.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. The migration MUST preserve every existing user ID, email, password hash, and `applications.decided_by` reference.
2. Every existing account MUST become `role = 'admin'` and `ativo = true` before role constraints become effective.
3. `admin_users.role` MUST accept only `admin` or `secretaria`; `ativo` MUST be required and default to `true` for new records.
4. `application_observations` MUST be append-only and identify its application, author, body, and creation time.
5. `issued_documents` MUST store immutable metadata, accept only `decision` or `contract`, require positive version and size values, enforce uniqueness per application/kind/version, and support latest-version reads.
6. Session data MUST remain identity-only; current email, role, and activity MUST be loaded from `admin_users` for every authorization decision.
7. Missing or inactive accounts MUST lose protected access immediately, and unspecified capabilities MUST be denied by default.
8. The development bypass MUST resolve as an active Administrator only outside production and MUST NOT require a database row.
9. Inactive-account login MUST use the existing generic invalid-credentials response and MUST NOT save a session.
10. Bootstrap MUST create a new active Administrator explicitly and MUST NOT overwrite any existing password, role, or activity state.
11. `proxy.ts` MUST remain a coarse authentication redirect rather than the authorization boundary.
12. Schema exports and relation names MUST preserve the repository's `snake_case` row contract.
</requirements>

## Subtasks

- [x] 1.1 Extend staff accounts with role and active state while preserving every existing identity and reference.
- [x] 1.2 Add observation and issued-document models, constraints, indexes, and relations.
- [x] 1.3 Produce an additive migration and Drizzle metadata that are safe for populated databases.
- [x] 1.4 Create the central staff identity and capability boundary with database revalidation and deny-by-default behavior.
- [x] 1.5 Reject inactive login and represent the development bypass as an active Administrator.
- [x] 1.6 Keep bootstrap idempotent and cover migration, authentication, revocation, and capability behavior with tests.

## Implementation Details

Follow the TechSpec sections “Staff Identity and Authorization,” “Core Interfaces,” “Capability Matrix,” “Data Models,” and “Authentication and Account Management.” This task delivers the schema exports and authorization helpers consumed by Tasks 02 and 03; replacing every call site in `admin-actions.ts` belongs to Task 02.

Review generated migration SQL before accepting it. The required order is nullable role addition, legacy-user backfill, role check, and final non-null enforcement. Do not reuse migration number `0005`; the next migration is `0006_*` even though `0005_donor_priorado_capela.sql` is empty.

Keep `getSessionUser()` free of a `try/catch` around `cookies()`. The development bypass uses a facade UUID that does not exist in `admin_users`, so the central identity resolver must handle that path explicitly without weakening production checks.

### Relevant Files

- `lib/db/schema.ts` — Staff fields, new tables, constraints, indexes, and relations.
- `drizzle/0006_*.sql` — Additive migration and ordered legacy backfill.
- `drizzle/meta/0006_snapshot.json` — Generated snapshot for the resulting schema.
- `drizzle/meta/_journal.json` — Sequential migration registration.
- `lib/auth/authorization.ts` — New staff identity and capability boundary.
- `app/login/_actions/auth-actions.ts` — Inactive-account login rejection.
- `scripts/bootstrap.ts` — Explicit active-Administrator creation without overwrites.

### Dependent Files

- `lib/auth/session.ts` — Session remains minimal and preserves dynamic `cookies()` signaling.
- `lib/auth/bypass.ts` — Supplies the development-only facade identity.
- `app/admin/_actions/admin-actions.ts` — Will consume the central helpers in Task 02.
- `app/admin/layout.tsx` — Will resolve active staff identity in Task 02.
- `proxy.ts` — Remains intentionally coarse-grained.
- `__tests__/auth-actions.test.ts` — Requires active/inactive fixtures and generic-error assertions.
- `__tests__/authorization.test.ts` — New capability, revocation, missing-account, and bypass coverage.
- `__tests__/helpers/fake-db.ts` — Extend only if the selected Drizzle chains are not already represented.

### Related ADRs

- [ADR-002: Separate Administrator and Secretariat capabilities by job responsibility](adrs/adr-002.md) — Defines least privilege and deny-by-default behavior.
- [ADR-003: Extend the existing staff account model and centralize authorization](adrs/adr-003.md) — Primary account and authorization decision.
- [ADR-004: Store Secretariat observations as append-only records](adrs/adr-004.md) — Defines the observation persistence model used by Task 02.
- [ADR-005: Persist immutable versions of issued final documents](adrs/adr-005.md) — Defines the issued-document persistence model used by Task 03.

## Deliverables

- Additive, reproducible migration safe for a populated database.
- Typed schema for staff roles, activity, observations, and issued documents.
- Central staff identity and capability helpers with deny-by-default behavior.
- Immediate revocation for missing or inactive accounts without authoritative role state in the cookie.
- Login and bootstrap compatible with the expanded staff model.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for authentication and migration of existing data **(REQUIRED)**.

## Tests

- Unit tests:
  - [x] An active Administrator session resolves email, role, and activity from the database rather than the cookie.
  - [x] An active Secretariat account receives only the capabilities listed in the TechSpec matrix.
  - [x] An Administrator receives every declared capability, while an unknown capability is denied.
  - [x] `requireAdmin()` accepts active Administrators and rejects active Secretariat users.
  - [x] A session without `userId` is rejected without querying `admin_users`.
  - [x] A missing database account and an inactive account are both rejected despite a previously valid cookie.
  - [x] The development bypass resolves as Administrator without a database query outside production and grants nothing in production.
  - [x] Active login stores only `userId` and `email`; inactive login returns the generic invalid-credentials message and never saves the session.
  - [x] Bootstrap creates a new active Administrator but preserves every field of an existing account.
- Integration tests:
  - [x] Applying the migration to a database with a legacy staff user and referenced decision preserves IDs, hash, email, and `decided_by`, and backfills Administrator/active values.
  - [x] The migrated database rejects null or unsupported roles.
  - [x] Observation foreign keys, application cascade, author restriction, and application/time index behave as specified.
  - [x] Issued-document constraints reject invalid kinds, non-positive version/size, and duplicate application/kind/version rows.
  - [x] Deactivating an account after login denies the next protected request without waiting for cookie expiry.
  - [x] The migration applies additively from snapshot `0005` without recreating `applications` or `admin_users`.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing.
- Test coverage >=80%.
- Every legacy account becomes an active Administrator without identity, credential, or decision-reference changes.
- Invalid roles and issued-document metadata are rejected by the database.
- An inactive account loses access on the next protected operation.
- Secretariat receives no capability outside the explicit matrix.
- No role or active state is trusted from the session cookie.
- Bootstrap remains idempotent and Tasks 02 and 03 require no additional foundation work.
