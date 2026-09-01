---
status: pending
title: Permanently enable scholarship uploads
type: refactor
complexity: high
dependencies: []
---

# Task 5: Permanently enable scholarship uploads

## Overview

Remove the provisional scholarship-upload-disabled mode and make required document submission one permanent rule in both client and server validation. Preserve HMAC tickets, the 10 MB limit, isolated pending paths, transactional application submission, post-commit movement, pending cleanup, and the independent donor receipt flow.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. `lib/form/scholarship-uploads.ts`, its imports, branches, messages, and test mocks MUST be removed; no replacement feature flag or disabled mode may remain.
2. The disabled-upload banner and every provisional disabled visual state MUST disappear.
3. Every document field required by the enabled flow MUST remain visible, enabled, and marked required.
4. Step validation MUST block progress when a required document is missing, uploading, or represented only by errored items.
5. `applicationSubmissionSchema` MUST enforce the same requirements as the UI so direct Server Action calls cannot bypass documents.
6. Server validation MUST distinguish each student's identity document from birth certificate rather than accepting any single aggregated student document.
7. Marriage-certificate requirements MUST be aligned between client and server.
8. Required categories MUST include vacancy declaration, father document, mother document, marriage certificate, address proof, each student's identity and birth certificate, income-tax statement, and bank statements.
9. `createUploadUrl` MUST permanently accept every legitimate scholarship category and `recibo_pagamento`.
10. Category input MUST be allowlisted against fixed categories and indexed student patterns; unknown, separator-containing, traversal, and non-numeric-index categories MUST fail before ticket creation.
11. Sanitized names MUST NOT create `.` or `..` segments, and every signed path MUST remain below `pending/{uuid}/...`.
12. Upload tickets MUST retain upload scope, the current 30-minute TTL, per-upload UUID isolation, and sanitized filenames.
13. The 10 MB limit MUST remain enforced client-side and by the endpoint against both declared and actual body size.
14. Empty files, invalid tickets, and failed PUT requests MUST continue to produce recoverable feedback.
15. Submission MUST accept only safe pending paths, store actual size and metadata inside the transaction, and move files only after commit.
16. Move failure SHOULD retain an accessible pending path as in current behavior.
17. File removal and concurrent upload completion MUST NOT resurrect removed items.
18. Donor receipt upload MUST remain behaviorally unchanged.
19. Tests MUST exercise production upload behavior without mocking the removed flag.
</requirements>

## Subtasks

- [ ] 5.1 Remove the flag, message, and every interface or validation branch tied to disabled uploads.
- [ ] 5.2 Make document presentation, required markers, and validation permanent across all form steps.
- [ ] 5.3 Align client payload and server schema with every required category, including two distinct documents per student.
- [ ] 5.4 Issue tickets only for legitimate scholarship and donor-receipt categories while preserving path isolation.
- [ ] 5.5 Preserve transactional persistence, metadata, post-commit movement, error, retry, and removal behavior.
- [ ] 5.6 Remove provisional mocks and expand coverage for validation, upload, and complete submission.

## Implementation Details

Follow the TechSpec sections “Scholarship Upload Flow,” “Scholarship Upload Removal,” “Server Action Surface,” and “Testing Approach — Uploads.” The user-approved five-task limit requires this task to span all current flag consumers; do not leave a partially supported disabled mode merely to reduce the file count.

`FileUpload` already supports progress, errors, removal, drag-and-drop, multiple files, empty-file rejection, and the local 10 MB limit. The upload endpoint rechecks declared and actual sizes. Preserve these behaviors while removing only provisional gating.

The current client requires marriage evidence and two distinct student documents, while the server schema is weaker and aggregates student documents under one category. Align the transport and persistence contract so server validation proves every required category independently.

### Relevant Files

- `lib/form/scholarship-uploads.ts` — Remove completely.
- `lib/validations/application-schema.ts` — Make all document requirements unconditional and category-specific.
- `app/form/_actions/form-actions.ts` — Remove the gate, allowlist categories, and persist the aligned contract.
- `app/form/layout.tsx` — Remove the disabled banner and provisional imports.
- `app/form/_components/scholarship-form.tsx` — Make step validation unconditional and build a faithful payload.
- `app/form/_components/step-1-applicant.tsx` — General and parent uploads always active and required.
- `app/form/_components/step-2-students.tsx` — Each student's identity and birth certificate always distinct and required.
- `app/form/_components/step-3-income.tsx` — Income-tax upload always active and required.
- `app/form/_components/step-4-expenses.tsx` — Bank statements always active and required.
- `app/form/_components/file-upload.tsx` — Remove unused disabled API while preserving operational states.

### Dependent Files

- `app/form/_components/form-types.ts` — May need distinct student-document transport fields.
- `app/api/uploads/route.ts` — Retains ticket verification and body-size enforcement.
- `lib/storage/index.ts` and `lib/storage/tickets.ts` — Retain safe root, size, movement, scopes, and signatures.
- `scripts/cleanup-pending.ts` — Continues abandoned-file cleanup.
- `app/benfeitor/_components/donor-form.tsx` — Continues using `createUploadUrl` for `recibo_pagamento`.
- `__tests__/application-schema.test.ts`, `form-actions.test.ts`, `submit-application.test.ts`, and `scholarship-form.test.tsx` — Server/client contract coverage.
- `__tests__/step-1-applicant.test.tsx`, `file-upload.test.tsx`, and `file-upload-flow.test.tsx` — Field and concurrency behavior.
- `__tests__/storage-tickets.test.ts` and `storage.test.ts` — Ticket scope and storage invariants.

### Related ADRs

- [ADR-007: Remove the temporary scholarship upload gate](adrs/adr-007.md) — Directly implemented by this task.

## Deliverables

- Complete removal of the provisional upload module and every consumer.
- Scholarship form without disabled banner or disabled document state.
- Every required document active and validated at the appropriate step.
- Client/server contract validating each required category independently.
- Secure ticket issuance for scholarship documents and donor receipts.
- Existing transactional persistence and movement preserved.
- Tests exercising real production behavior without flag mocks.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for ticket, PUT, and application-submission flows **(REQUIRED)**.

## Tests

- Unit tests — required behavior:
  - [ ] Search finds no executable or mocked `SCHOLARSHIP_UPLOADS_ENABLED`, disabled-message, disabled-banner, or temporary-test copy.
  - [ ] Schema accepts a submission containing every required document.
  - [ ] Schema rejects each empty general category independently, including marriage certificate, income-tax statement, and bank statements.
  - [ ] A student with identity but no birth certificate fails, and a student with birth certificate but no identity fails.
  - [ ] Non-pending or traversal-containing document paths fail.
  - [ ] Steps 1–4 block progression for their respective missing required documents.
  - [ ] Uploading or errored items do not satisfy a required field; completed safe paths do.
  - [ ] Every required field is active and marked required without conditional props.
- Unit tests — tickets and upload state:
  - [ ] `createUploadUrl` accepts every fixed scholarship category, indexed student identity/birth categories, and `recibo_pagamento`.
  - [ ] Unknown, traversal, separator-containing, and non-numeric student categories fail without ticket creation.
  - [ ] Sanitized filenames cannot create dot segments, and equal names receive different UUID directories.
  - [ ] Issued tickets validate only for upload scope.
  - [ ] Files above 10 MB fail before URL creation; empty file, ticket failure, and non-OK PUT remain removable/retryable errors.
  - [ ] Removing an item while another upload resolves does not reinsert the removed file.
- Integration tests:
  - [ ] A real ticket and PUT store one file beneath `pending/{uuid}/{category}` with actual size.
  - [ ] Endpoint returns 403 for invalid, expired, or download-scoped tickets; 400 for empty body; and 413 for declared or actual size above 10 MB.
  - [ ] Direct submission missing one required document fails before school-year lookup or writes.
  - [ ] Complete submission creates one metadata row for every required category.
  - [ ] Student identity and birth certificate retain distinct categories and the correct `student_id`.
  - [ ] Files remain pending until commit, move afterward, and do not move after transaction failure.
  - [ ] Move failure preserves metadata pointing to the pending path, and actual storage size is persisted.
  - [ ] Donor receipt upload and submission continue unchanged.
  - [ ] Complete form submission waits for pending uploads and succeeds after all finish.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing.
- Test coverage >=80%.
- No scholarship-upload-disabled mode remains.
- Client and server reject the same missing document categories.
- Every required field supports upload, progress, failure, removal, and retry.
- Every ticket resolves to an isolated `pending/{uuid}` path.
- The 10 MB limit and ticket-scope separation remain enforced.
- Valid submissions preserve transaction and post-commit movement behavior.
- Donor receipt upload has no regression.
