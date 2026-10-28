---
status: completed
title: Sign receipt links and attach monthly evidence
type: backend
complexity: high
dependencies:
  - task_15
---

# Sign receipt links and attach monthly evidence

**Later amendment:** This completed task records the original closed-bank-state behavior. Pending task_24 supersedes that rule so a valid receipt may arrive after bank confirmation without changing the bank record; task_25 updates the public presentation. The completion status of this task is unchanged.

## Overview
Provide a scoped receipt capability for one pledge and competence and a public upload operation that attaches one Pix receipt to that row. Repeated valid uploads replace the active file until bank credit is confirmed; neither a link nor a file is proof of bank credit. Task_24 adds required-receipt state and reminder suppression to this completed upload baseline.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST sign and verify `pledge_id` plus `competencia` with an HMAC key derived separately from upload/download tickets, scoped to `donor_receipt`, expiring 45 days after the due date; URLs MUST contain no CPF/email/amount/file path.
- MUST revalidate the ticket and matching monthly ledger row on every upload; MUST reject expired, tampered, wrong-scope, wrong-competence, deleted, and phase-3 bank-confirmed occurrences.
- MUST accept only a nonempty supported image (JPEG, PNG, WebP, GIF) or PDF of at most 10 MB, verified server-side by MIME/content, with no client-controlled storage path; MUST stage under `pending/{uuid}/...` and commit under private `donors/{pledge_id}/payments/{competencia}/...`.
- MUST keep one active receipt per occurrence, replace it safely under concurrent writes, and clean staged/superseded files without losing the active file on failure.
- MUST reopen a `nao_identificado` occurrence as `pendente` when a new receipt arrives, retaining the prior bank-check note for administrator context; receipt upload MUST NOT set a received amount.
- MUST enforce same-origin browser POST, bounded IP/ticket throttling and concurrent upload limits, safe errors, and no logging of raw ticket, URL, IP, path, filename, or content.
</requirements>

## Subtasks
- [x] 16.1 Add scoped link creation/verification and expiration tests.
- [x] 16.2 Add the public receipt upload handler with content, origin, and occurrence checks.
- [x] 16.3 Add stage/move/conditional-replace/cleanup behavior for private files.
- [x] 16.4 Add bounded request throttling and safe response/log handling.
- [x] 16.5 Verify cross-occurrence isolation, concurrent replacement, and failure recovery.

## Implementation Details
Follow TechSpec “Per-Occurrence Receipt Link and Upload” and the existing storage/ticket patterns. Task 17 builds the page; this task provides its read/submit service contract. The public upload does not issue a generic upload or download ticket.

### Relevant Files
- `lib/storage/tickets.ts` — HMAC and key separation pattern.
- `lib/storage/index.ts` — private storage driver, 10 MB constant, and MIME mapping (including GIF if accepted).
- `app/api/uploads/route.ts` — existing file-size boundary.
- `lib/auth/throttle.ts` — bounded single-instance throttle precedent.

### Dependent Files
- `app/api/donor-receipts/route.ts` — dedicated public upload surface.
- `lib/db/schema.ts` — task-15 row's receipt metadata.
- `__tests__/` — signature, validation, concurrency, and route tests.

### Related ADRs
- [ADR-005: Attach reminder receipts to early occurrence records](adrs/adr-005.md)

## Deliverables
- Signed-link service and dedicated receipt upload route with safe replacement.
- Unit tests with at least 80% coverage of link, validation, and throttle logic.
- Integration tests for row isolation, concurrent uploads, and storage/DB failure cleanup.

## Tests
- Unit tests:
  - [x] Tampering with pledge, competence, scope, signature, or expiry rejects the link; a generic upload/download ticket cannot authorize receipt intake.
  - [x] Empty, disguised MIME, and 10 MB plus one byte files are rejected; valid image/PDF at the limit is accepted.
  - [x] Throttle returns 429/`Retry-After` after the configured IP or hashed-ticket threshold.
- Integration tests:
  - [x] Upload for pledge A/2026-11 changes only that row; later upload replaces its active receipt, and competing uploads leave one active file.
  - [x] Invalid/expired/bank-confirmed links write no file or metadata; a new receipt for `nao_identificado` resets the bank state to `pendente`; GET-style verification does not mutate a row.
  - [x] Failed move or database update preserves the prior active receipt and cleans the new staged file.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- One valid bearer link can attach or replace only its own monthly receipt until bank credit is confirmed.
