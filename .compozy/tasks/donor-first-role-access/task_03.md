---
status: pending
title: Persist and expose issued final documents
type: backend
complexity: critical
dependencies:
  - task_01
  - task_02
---

# Task 3: Persist and expose issued final documents

## Overview

Persist every Administrator-issued decision and contract as an immutable, versioned PDF and expose only authorized issued artifacts to staff. This task replaces generation-only exports with auditable issuance while preserving existing renderers, storage tickets, applicant evidence, and the role boundaries established by Tasks 01 and 02.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. Decision issuance MUST require an approved or rejected application; pending issuance MUST fail without file or metadata writes.
2. Contract issuance MUST require an approved application; rejected and pending applications MUST fail without side effects.
3. Every successful issuance or reissuance MUST create a new immutable `issued_documents` row and uniquely named PDF in the issued-document namespace.
4. Version allocation MUST be serialized per application and protected by database uniqueness so concurrent issuance cannot duplicate application/kind/version.
5. Storage failure MUST create no metadata; database failure after storage succeeds MUST remove the newly written file.
6. Issued-document reads and downloads MUST accept a persisted issued-document ID, resolve its server-only path, and authorize the caller before creating a short-lived ticket.
7. Secretariat users MUST see only the current issued decision and, for approved applications, the current issued contract. They MUST NOT issue, reissue, mutate, delete, inspect history, submit paths, or access applicant evidence through this flow.
8. Administrators MUST be able to issue or reissue final documents and inspect every immutable version without changing earlier rows or files.
9. Existing React PDF renderers, templates, headers, HMAC tickets, and `/api/documents` delivery MUST remain authoritative; no public JSON endpoint SHOULD be added.
10. Historical generation-only exports MUST NOT be fabricated or backfilled as issued documents.
</requirements>

## Subtasks

- [ ] 3.1 Replace generation-only decision and contract exports with Administrator-authorized issuance that persists the exact rendered artifact.
- [ ] 3.2 Guarantee monotonic, concurrency-safe version allocation and immutable preservation of earlier versions.
- [ ] 3.3 Add compensation across the non-transactional storage and PostgreSQL boundary.
- [ ] 3.4 Provide Administrator history and role-aware current-document queries with outcome and kind eligibility.
- [ ] 3.5 Provide ID-based issued-document download authorization without client-provided paths.
- [ ] 3.6 Integrate issuance, current-document download, and Administrator history into application review.
- [ ] 3.7 Extend test infrastructure and cover issuance, concurrency, compensation, visibility, and download authorization.

## Implementation Details

Follow the TechSpec sections “Final Document Issuance,” “Final Document Download,” “Final Documents,” and “Issued Documents.” Extract persistence and versioning into a focused service rather than adding more unrelated responsibilities to `admin-actions.ts`.

The current `exportDecision` and `exportContract` actions render buffers and return base64 without persistence. Preserve template resolution and preview behavior, but make any successful output represent a persisted issuance. Keep existing path-based applicant-evidence download Administrator-only; final-document download uses a separate ID-based action.

The storage driver already provides `put`, `remove`, and `size`. Extend the fake transaction surface only if explicit locking/version serialization requires a Drizzle chain that is not currently represented.

### Relevant Files

- `lib/documents/issued-documents.ts` — New service for eligibility, persistence, version allocation, latest/history reads, and compensation.
- `app/admin/_actions/admin-actions.ts` — Administrator issuance and authorized current/history/download actions.
- `app/admin/_components/issued-documents.tsx` — Current documents, issuance controls, and Administrator history.
- `app/admin/_components/application-card.tsx` — Integrates issued documents into application review.
- `__tests__/helpers/fake-db.ts` — Adds transaction locking support only if required.
- `__tests__/issued-documents.test.ts` — Focused service, action, authorization, compensation, and UI coverage.

### Dependent Files

- `lib/db/schema.ts` — Supplies `issuedDocuments` and uniqueness constraints from Task 01.
- `lib/storage/index.ts` — Writes and compensates issued PDFs.
- `lib/storage/tickets.ts` — Creates short-lived download tickets.
- `app/api/documents/route.ts` — Existing ticket-validated delivery endpoint.
- `lib/pdf/decision-pdf.tsx` and `contract-pdf.tsx` — Existing authoritative renderers.
- `app/admin/_components/pdf-preview-modal.tsx` — Existing preview and download experience.
- `app/admin/_components/document-preview.tsx` — Separate Administrator-only applicant-evidence flow.

### Related ADRs

- [ADR-002: Separate Administrator and Secretariat capabilities by job responsibility](adrs/adr-002.md) — Restricts issuance/history while permitting current-document download.
- [ADR-003: Extend the existing staff account model and centralize authorization](adrs/adr-003.md) — Requires database-backed capability checks.
- [ADR-005: Persist immutable versions of issued final documents](adrs/adr-005.md) — Defines versioning, storage segregation, compensation, and ID authorization.

## Deliverables

- Immutable, versioned persistence for issued decisions and contracts.
- Concurrency-safe version allocation without mutation of earlier artifacts.
- Compensation preventing metadata without files and removing new files after metadata failure.
- Administrator issuance/reissuance controls and complete version history.
- Secretariat access to current eligible issued documents only.
- ID-based ticket generation without client-controlled storage paths.
- Existing PDF preview behavior preserved after successful issuance.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for issuance, persistence, role visibility, and ticketed download **(REQUIRED)**.

## Tests

- Unit tests — eligibility and versioning:
  - [ ] Approved and rejected applications issue decision version 1 with correct kind, size, issuer, and namespace.
  - [ ] Pending decision issuance performs no file or metadata write.
  - [ ] Approved applications issue contract version 1; pending or rejected applications create nothing.
  - [ ] Missing application, template, or header creates no issued artifact.
  - [ ] Reissuing one kind creates the next version with a distinct ID/path and does not update or delete the previous version.
  - [ ] Decision and contract sequences remain independent.
  - [ ] Two simulated concurrent issuances cannot persist the same version.
- Unit tests — compensation and authorization:
  - [ ] Rejected `storage.put` creates no metadata row.
  - [ ] Database failure after `storage.put` removes only the newly written path.
  - [ ] Cleanup failure does not report issuance success, and stored size matches the buffer length.
  - [ ] Administrator can issue, reissue, and list all versions; Secretariat is denied each direct issuance/history call.
  - [ ] Current-document lookup returns only the highest eligible version and never exposes `storage_path`.
  - [ ] Rejected applications never return a contract; pending applications return no current final document.
  - [ ] A valid issued-document ID creates a download ticket; unknown, old Secretariat, evidence, and missing-file IDs are denied.
  - [ ] Issued-document tickets validate for download scope and fail for upload scope.
- Integration tests:
  - [ ] Administrator issuance renders, stores, records, and returns the persisted artifact for preview.
  - [ ] Reissuance shows both versions to Administrator and only the latest to Secretariat.
  - [ ] Secretariat downloads the current issued decision through `/api/documents` using an action-generated ticket.
  - [ ] Secretariat downloads a contract only for an approved application with an issued contract.
  - [ ] Secretariat UI exposes download only; Administrator UI retains issue, reissue, preview, and history.
  - [ ] Existing Administrator evidence access remains separate and is never labeled as a final document.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing.
- Test coverage >=80%.
- Every successful issuance has exactly one immutable row and one stored PDF.
- Concurrent issuance cannot create duplicate versions.
- Failed cross-system writes leave no new orphaned metadata or file.
- Secretariat accesses only current, eligible, previously issued final documents.
- No issued-document action accepts or exposes a raw storage path.
- Earlier versions remain unchanged and available only to Administrators.
