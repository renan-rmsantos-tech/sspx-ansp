# Technical Specification: Donor-First Experience and Staff Access Roles

## Executive Summary

This change extends the existing staff-account model with Administrator and Secretariat roles, centralizes authorization around explicit capabilities, and ensures restricted queries never return prohibited fields. It adds append-only application observations and immutable issued-document versions so Secretariat users can access only documents previously issued by an Administrator.

The public implementation will move to canonical descriptive routes with permanent legacy redirects, remove the temporary scholarship-upload gate, adopt one approved logo asset across web pages, and update the landing hierarchy and institutional details.

The primary trade-off is additional database reads and PDF storage. Revalidating account status on every protected operation and preserving every issued-document version costs more than trusting session claims or regenerating PDFs, but it provides immediate access revocation, data minimization, and exact issued-document traceability.

## System Architecture

### Component Overview

#### Staff Identity and Authorization

A new `lib/auth/authorization.ts` module becomes the authorization boundary.

Responsibilities:

- Resolve the current session identity.
- Load the corresponding `admin_users` row.
- Reject missing or inactive accounts.
- Resolve the role and allowed capabilities.
- Provide `requireStaff()`, `requireAdmin()`, and `requireCapability()` helpers.
- Treat the development bypass as an active Administrator outside production.
- Never trust a role stored only in the session.

`proxy.ts` remains a coarse authentication redirect for `/admin`. Every protected Server Component and Server Action performs its own authorization check.

#### Staff Account Management

A new Administrator-only area at `/admin/usuarios` manages Secretariat accounts.

Supported operations:

- List Secretariat accounts.
- Create an individual Secretariat account.
- Deactivate an account.
- Reactivate an account.
- Reset its password.

Accounts are never deleted. The interface cannot create or modify Administrator accounts.

#### Role-Aware Administrative Experience

The `/admin` namespace remains shared by both roles.

Administrators retain the current complete interface. Secretariat users receive:

- Restricted solicitation list and detail views.
- Read-only benefactor enrollment access.
- Application observation creation and history.
- Download access to current issued final documents.

The server selects different projections by capability. Client-side hiding is supplemental and never the security boundary.

#### Application Observation Store

`application_observations` stores one immutable row per Secretariat note.

The observation flow:

1. Resolve and authorize the active staff account.
2. Validate the application ID and note body.
3. Insert the observation with the authenticated author.
4. Return the saved row with author identity and timestamp.
5. Refresh the chronological history.

No update or delete operation exists.

#### Final Document Issuance

`issued_documents` records every Administrator-issued decision or contract.

The issuance flow:

1. Require Administrator capability.
2. Validate application status and document kind.
3. Load the applicable template and application data.
4. Render the PDF buffer using existing renderers.
5. Store the buffer under a dedicated issued-document namespace.
6. Allocate the next version while serializing issuance for the application.
7. Insert immutable metadata referencing the stored file.
8. Return the issued-document ID, filename, and preview payload.

If the database operation fails after storage succeeds, remove the newly written file.

#### Final Document Download

The Secretariat never submits storage paths.

The download flow:

1. Receive an issued-document ID.
2. Resolve the active staff account and required capability.
3. Load the persisted document metadata.
4. Confirm that the document is visible to the caller.
5. Generate a short-lived download ticket for the stored path.
6. Let the existing document endpoint serve the file.

Applicant-uploaded evidence remains in the current `documents` table and is excluded from Secretariat projections.

#### Public Route Layer

Canonical implementations move to:

- `/seja-um-benfeitor`
- `/solicitar-bolsa`

Legacy routes contain only permanent redirects:

- `/benfeitor` → `/seja-um-benfeitor`
- `/form` → `/solicitar-bolsa`

The scholarship page preserves `force-dynamic` because it reads the active school year.

#### Scholarship Upload Flow

The enabled upload path becomes the only supported behavior.

Preserved behavior:

- Application-generated `pending/{uuid}/...` paths.
- Upload-scoped HMAC tickets.
- 10 MB maximum file size.
- Path validation and storage outside the web root.
- Required client and server validation.
- File movement after successful transactional submission.
- Cleanup of abandoned pending files.
- Independent donor receipt uploads.

#### Shared Web Logo

The approved Open Design master is copied to a single executable web asset, such as `public/seal-arca.svg`.

`SealLogo` renders this asset and supports:

- Caller-controlled dimensions.
- Decorative mode with hidden semantics.
- Informative mode with an accessible label.

Landing, scholarship, benefactor, login, and admin pages consume this component. Favicon and PDF assets remain unchanged.

## Implementation Design

### Core Interfaces

```ts
export type StaffRole = "admin" | "secretaria";

export type Capability =
  | "applications:read-full"
  | "applications:read-operational"
  | "applications:decide"
  | "observations:read"
  | "observations:create"
  | "donors:read-operational"
  | "donors:manage"
  | "issued-documents:read"
  | "issued-documents:issue"
  | "settings:manage"
  | "staff:manage";
```

```ts
export interface StaffIdentity {
  id: string;
  email: string;
  role: StaffRole;
  ativo: boolean;
}

export function requireStaff(): Promise<StaffIdentity>;
export function requireAdmin(): Promise<StaffIdentity>;
export function requireCapability(
  capability: Capability
): Promise<StaffIdentity>;
```

```ts
export interface SecretariatApplicationSummary {
  id: string;
  status: "pendente" | "aprovada" | "rejeitada";
  escola: string;
  pai_nome: string;
  mae_nome: string;
  telefone: string;
  email: string | null;
  students: Array<{ id: string; nome: string }>;
  data_decisao: string | null;
}
```

```ts
export interface IssuedDocumentResult {
  id: string;
  application_id: string;
  kind: "decision" | "contract";
  version: number;
  filename: string;
  issued_at: string;
  issued_by: string;
}
```

For workflow-template compliance, this documentation-only Go struct mirrors the authorization contract. It does not introduce a Go runtime component:

```go
type CapabilityContext struct {
	UserID string
	Email  string
	Role   string
	Active bool
}
```

### Capability Matrix

| Capability | Administrator | Secretariat |
|---|---:|---:|
| Read complete applications | Yes | No |
| Read operational application projection | Yes | Yes |
| Read financial declarations | Yes | No |
| Read applicant-uploaded evidence | Yes | No |
| Read decision rationale and percentages | Yes | No |
| Approve or reject | Yes | No |
| Read observations | Yes | Yes |
| Add observations | No | Yes |
| Read operational donor projection | Yes | Yes |
| Export, delete, or inspect donor receipts | Yes | No |
| Issue or reissue final documents | Yes | No |
| Download current issued documents | Yes | Yes |
| Read issued-document history | Yes | No |
| Manage settings and templates | Yes | No |
| Manage Secretariat accounts | Yes | No |

Any capability not explicitly granted to the Secretariat is denied.

### Data Models

#### `admin_users` Additions

| Field | Type | Constraints |
|---|---|---|
| `role` | text | Required; `admin` or `secretaria` |
| `ativo` | boolean | Required; defaults to `true` |

Migration sequence:

1. Add nullable `role` and required `ativo` with default `true`.
2. Backfill all existing users with `role = 'admin'`.
3. Add the role check constraint.
4. Make `role` required.
5. Preserve every existing ID, password hash, and decision reference.

The bootstrap-created account always receives the Administrator role. Existing accounts are never downgraded.

#### `application_observations`

| Field | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key; generated |
| `application_id` | UUID | Required FK to `applications`; cascade with application |
| `author_user_id` | UUID | Required FK to `admin_users`; account deletion restricted |
| `body` | text | Required; trimmed; 1–2,000 characters |
| `created_at` | timestamp with timezone | Required; defaults to current time |

Indexes:

- `(application_id, created_at)`
- `author_user_id`

No update or delete interface is created.

#### `issued_documents`

| Field | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key; generated |
| `application_id` | UUID | Required FK to `applications` |
| `kind` | text | Required; `decision` or `contract` |
| `version` | integer | Required; greater than zero |
| `storage_path` | text | Required |
| `filename` | text | Required |
| `mime_type` | text | Required; `application/pdf` |
| `size_bytes` | integer | Required; greater than zero |
| `issued_by` | UUID | Required FK to `admin_users` |
| `issued_at` | timestamp with timezone | Required; defaults to current time |

Constraints and indexes:

- Unique `(application_id, kind, version)`.
- Index `(application_id, kind, version DESC)`.
- Index `issued_by`.
- Earlier versions remain immutable.

No historical rows can be inferred from current exports because issuance was not previously recorded. Administrators must issue or reissue documents that should become available to the Secretariat after release.

#### Storage Layout

Applicant uploads remain unchanged:

```text
applications/{applicationId}/...
```

Final documents use a distinct namespace:

```text
applications/{applicationId}/issued/{kind}/{uuid}.pdf
```

The persisted issued-document ID is the authorization handle. `storage_path` remains server-only.

### Server Action Surface

#### Authentication and Account Management

| Action | Authorization | Behavior |
|---|---|---|
| `getCurrentStaff` | Active staff | Returns current identity and role |
| `listSecretariatUsers` | Administrator | Lists only Secretariat accounts |
| `createSecretariatUser` | Administrator | Creates active Secretariat account with scrypt hash |
| `setSecretariatUserActive` | Administrator | Activates or deactivates one Secretariat account |
| `resetSecretariatPassword` | Administrator | Replaces password hash for one Secretariat account |

Account-management invariants:

- Email remains globally unique.
- The server always assigns `secretaria`; role is not accepted from the client.
- Account creation and reset enforce one shared password policy.
- Passwords and hashes never enter logs.
- No account deletion action is provided.

#### Applications

| Action | Authorization | Behavior |
|---|---|---|
| `getApplications` | Active staff | Dispatches to full or operational projection by role |
| `getApplicationDetail` | Administrator | Returns existing complete detail |
| `getOperationalApplicationDetail` | Operational read | Returns only approved Secretariat fields |
| `approveApplication` | Administrator | Preserves current conditional pending-state update |
| `rejectApplication` | Administrator | Preserves current conditional pending-state update |
| `exportApplication` | Administrator | Remains Administrator-only |

The Secretariat projection includes:

- Application ID and status.
- School.
- Parent names.
- Telephone and email.
- Student IDs and names.
- Decision date when present.
- Observation history.
- Current issued-document metadata.

It never selects or returns:

- Income or expense columns.
- Requested or granted discount.
- Decision rationale.
- Vehicles, collaboration, or suggested benefactors.
- Applicant documents.
- Decision author.

Pending applications remain visible with the status “Aguardando decisão”. No final document is available until issuance.

#### Observations

| Action | Authorization | Behavior |
|---|---|---|
| `getApplicationObservations` | Observation read | Returns chronological history |
| `addApplicationObservation` | Secretariat | Validates and appends one immutable row |

Observation inputs contain only `applicationId` and `body`. Author and timestamp always come from server context.

#### Benefactors

`getDonorPledges` reads only public donor enrollments from `donor_pledges` and returns a role-specific projection. Benefactors suggested through scholarship applications remain in the application domain and are never included in the Secretariat donor view.

Secretariat fields:

- Name.
- Email and telephone.
- Frequency and duration.
- Amount.
- Payment method and payment date.
- Reminder channel.
- Priory or chapel.
- Donor-provided observations.
- Enrollment date.

Secretariat exclusions:

- CPF.
- Full address and CEP.
- Receipt storage path and receipt download.
- Delete and export controls.

Administrator behavior remains unchanged.

#### Final Documents

| Action | Authorization | Behavior |
|---|---|---|
| `issueDecision` | Administrator | Renders, stores, versions, and records a decision |
| `issueContract` | Administrator | Renders, stores, versions, and records a contract |
| `listIssuedDocumentHistory` | Administrator | Lists all versions |
| `getCurrentIssuedDocuments` | Operational read | Returns current permitted versions |
| `getIssuedDocumentUrl` | Issued-document read | Resolves ID and returns temporary URL |

Issuance rules:

- Decisions require an approved or rejected application.
- Contracts require an approved application.
- Version allocation occurs while the application row is locked.
- Reissuance never mutates an earlier row or file.
- A failed metadata transaction removes the new file.
- A failed file write creates no database row.
- The existing PDF renderers and templates remain authoritative.

### HTTP Endpoints and Routes

No new JSON API is introduced.

| Method | Path | Change |
|---|---|---|
| `PUT` | `/api/uploads` | Existing behavior retained; scholarship tickets permanently enabled |
| `GET` | `/api/documents` | Existing ticket delivery retained |
| `GET` | `/seja-um-benfeitor` | New canonical benefactor page |
| `GET` | `/solicitar-bolsa` | New canonical dynamic scholarship page |
| `GET` | `/benfeitor` | Permanent 308 redirect |
| `GET` | `/form` | Permanent 308 redirect |
| `GET` | `/admin/usuarios` | New Administrator-only account page |

The document endpoint continues to validate only its signed, short-lived ticket. Authorization occurs before ticket issuance.

### Landing and Public Content

`app/page.tsx` changes as one coordinated unit:

- Navigation order becomes benefactor then scholarship.
- The prominent navigation CTA becomes “Seja um benfeitor”.
- The hero primary CTA becomes “Seja um benfeitor”.
- The hero secondary path retains scholarship discoverability.
- The benefactor band renders before the scholarship band.
- Quick access lists benefactor before scholarship.
- The administrative shortcut is removed.
- All owned links use canonical routes.
- Contact display and `mailto` use `contato@arcaprovidencia.com.br`.
- Footer layout allows the complete FSSPX name to wrap without clipping.
- Responsive acceptance covers 320, 768, 1024, and 1440 CSS-pixel widths.

### Scholarship Upload Removal

Remove:

- `lib/form/scholarship-uploads.ts`.
- Disabled upload banner.
- Disabled field branches.
- Conditional required marks.
- Server rejection tied to the old flag.
- Test mocks that force the flag to enabled.

Retain:

- File-field requirements in `application-schema.ts`.
- Client validation that blocks incomplete or in-progress uploads.
- Existing ticket creation and validation.
- Existing file-category rules.
- Current transaction and pending-file cleanup behavior.

### Logo Consolidation

- Copy the approved `seal-arca-master.svg` into the executable public assets.
- Update `components/ui/seal-logo.tsx` to consume it.
- Replace inline seals in the landing, scholarship, and benefactor pages.
- Keep login and admin consumers on `SealLogo`.
- Do not modify `app/icon.svg`.
- Do not modify `lib/pdf/seal-image.ts`.
- Add semantic checks for decorative and informative uses.

## Integration Points

No new external service or package is required.

Existing boundaries remain:

- PostgreSQL through Drizzle for staff, notes, and issued-document metadata.
- Iron Session for cookie-backed identity.
- Filesystem storage driver for applicant uploads and issued PDFs.
- HMAC tickets for short-lived uploads and downloads.
- React PDF renderers for decisions and contracts.
- Open Design master asset as the approved logo source.

Operational dependencies:

- The production storage volume must remain persistent across deployment.
- `contato@arcaprovidencia.com.br` must be able to receive mail before publication.
- The migration must run before application instances serving the new authorization code.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|---|---|---|---|
| `drizzle/0006_*.sql` | New | Additive staff, observation, and issued-document migration | Backfill before constraints |
| `lib/db/schema.ts` | Modified | Adds fields, tables, relations, and indexes | Preserve snake_case contracts |
| `lib/auth/authorization.ts` | New | Central role and capability boundary | Deny unknown capabilities |
| `lib/auth/session.ts` | Modified | Identity remains minimal; inactive sessions are invalidated | Do not trust cookie role |
| Login actions | Modified | Reject inactive accounts | Preserve throttling and generic errors |
| `scripts/bootstrap.ts` | Modified | Bootstrap user must be Administrator | Never overwrite existing users |
| `proxy.ts` | Reviewed | Remains authentication-only | Do not treat as authorization |
| Admin layout and navigation | Modified | Role-aware visible sections | Resolve role server-side |
| `/admin/usuarios` | New | Secretariat account lifecycle | Administrator-only page and actions |
| Application actions | Modified | Full and restricted projections | Never return prohibited fields |
| Decision actions | Modified | Administrator-only checks | Preserve concurrent decision guard |
| Observation actions and UI | New | Append-only internal history | No edit or delete path |
| Donor actions and UI | Modified | Secretariat read-only projection | Exclude CPF, address, receipt, destructive controls |
| PDF export actions | Modified | Persist immutable issuance versions | Compensate file-write failures |
| Storage namespace | Modified | Adds issued PDFs | Keep separate from applicant evidence |
| Document ticket action | Modified | Authorize by persisted ID | Never accept arbitrary final-document path |
| Public route directories | Modified | Canonical route relocation and redirects | Preserve dynamic scholarship rendering |
| `app/page.tsx` | Modified | Donor-first order, email, links, footer | Validate desktop and mobile |
| Scholarship upload consumers | Modified or removed | Eliminate test-only branches | Keep client/server requirements aligned |
| `SealLogo` and public asset | Modified or new | One approved web source | Leave favicon and PDF assets unchanged |
| Vitest suites and fake DB | Modified | New tables and capability cases | Extend only if new chains require it |

## Testing Approach

### Unit Tests

#### Authorization

- Existing users migrate as active Administrators.
- Active Administrator receives every capability.
- Active Secretariat receives only the approved subset.
- Inactive accounts fail even with a valid session cookie.
- Missing database account invalidates the session.
- Development bypass resolves as Administrator only outside production.
- Every restricted Server Action rejects Secretariat callers.
- Unknown capabilities are denied.

#### Data Projections

- Operational application results contain only approved keys.
- Projections never contain income, expenses, requested or granted discount, rationale, applicant documents, vehicles, collaboration, or suggested benefactors.
- Secretariat donor results exclude CPF, address, CEP, receipt path, and destructive capabilities.
- Administrator queries preserve current complete behavior.

#### Observations

- Empty and oversized bodies fail validation.
- Inserted author always comes from authenticated context.
- Entries return in chronological order.
- No update or delete action exists.
- PDF render inputs never include observations.

#### Issued Documents

- Decision issuance rejects pending applications.
- Contract issuance rejects non-approved applications.
- First issuance creates version 1.
- Reissuance creates the next version without mutation.
- Concurrent issuance cannot duplicate versions.
- Storage failure creates no row.
- Database failure removes the new file.
- Secretariat sees only the latest eligible version.
- Download authorization uses document ID and rejects applicant evidence.
- Older versions remain Administrator-only.

#### Public Routes and Content

- Canonical routes render the expected flows.
- Legacy routes return permanent redirects to exact destinations.
- Owned landing links use canonical paths.
- Benefactor CTA ordering and labels match the PRD.
- Administrative quick access is absent.
- Contact text and `mailto` use the new email.
- The FSSPX name remains present and untruncated in rendered markup.

#### Uploads

- Scholarship document requirements apply without mocks.
- Ticket creation accepts required scholarship categories.
- In-progress, failed, or missing required uploads block submission.
- Completed documents persist through the existing transaction.
- Donor receipt behavior remains unchanged.
- No disabled-test warning remains.

#### Logo

- All user-facing web surfaces use `SealLogo` or the approved asset.
- Decorative instances are hidden from assistive technology.
- Informative instances provide an accessible name.
- No outdated inline web seal remains.

### Integration Tests

- Run the additive migration against a database containing an existing Administrator and application decisions.
- Confirm IDs, hashes, and `decided_by` references remain intact.
- Exercise login, account deactivation, and a subsequent protected request with the previous cookie.
- Exercise Administrator decision issuance through storage and metadata persistence.
- Exercise Secretariat document listing and ticketed download.
- Exercise a complete scholarship submission with required attachments.
- Verify old and canonical routes through the Next.js runtime.
- Verify role-aware rendering of `/admin/solicitacoes`, `/admin/benfeitores`, and `/admin/usuarios`.

Use the existing fake DB for Server Action tests. Extend it only for newly used Drizzle operations such as explicit row locking or specialized ordering.

Required gates:

- `npm test`
- `npm run build`

No implementation completion claim is valid without fresh output from both gates.

## Development Sequencing

### Build Order

1. Add characterization tests for current authentication, decisions, uploads, public routes, and logo consumers — no dependencies.
2. Add migration and schema models — depends on step 1.
3. Add centralized staff authorization and inactive-account enforcement — depends on step 2.
4. Add Administrator-managed Secretariat accounts — depends on steps 2 and 3.
5. Add append-only observations — depends on steps 2 and 3.
6. Add immutable issued-document storage and download authorization — depends on steps 2 and 3.
7. Add role-aware application, donor, navigation, and account-management interfaces — depends on steps 3 through 6.
8. Move public flows to canonical routes and add permanent redirects — depends on step 1.
9. Apply donor-first landing, contact, quick-access, and footer changes — depends on step 8.
10. Remove the upload gate and make requirements permanent — depends on step 1.
11. Consolidate the approved web logo — depends on step 1 and precedes final visual verification.
12. Complete cross-role, migration, storage, responsive, test, and build verification — depends on steps 2 through 11.

### Technical Dependencies

- Approved Open Design master logo.
- Existing PostgreSQL migration runner.
- Existing persistent storage volume.
- Existing HMAC ticket and storage driver.
- Existing PDF templates and renderers.
- Operational readiness of the new contact mailbox.

No new npm dependency, external service, queue, or background worker is required.

## Monitoring and Observability

Record only operational metadata. Do not log applicant financial data, document paths, note bodies, passwords, CPF, or contact details.

Recommended structured events:

- Staff login failure category without credential values.
- Inactive-account access denial.
- Capability denial with role, capability, and route or action name.
- Secretariat account creation, activation, deactivation, and password reset with actor and target IDs.
- Final-document issuance with application ID, kind, version, issuer ID, and outcome.
- Final-document download authorization failure with document ID and role.
- Upload failure category and file size without filename or family identity.
- Issued-file cleanup failure.

Operational checks:

- Alert on repeated capability denials for one authenticated account.
- Alert on issued-document metadata pointing to a missing file.
- Alert on repeated upload or storage failures.
- Include storage growth from immutable PDF versions in existing backup-capacity reviews.
- Confirm issued PDFs remain covered by the existing storage backup.

## Technical Considerations

### Key Decisions

- **One staff table:** preserves account and decision references while supporting both profiles.
- **Database-backed access checks:** provide immediate role and activity changes at the cost of protected-request reads.
- **Shared `/admin` namespace:** avoids duplicate authenticated applications while retaining server-side profile boundaries.
- **Server projections:** prevent sensitive fields from reaching Secretariat clients.
- **Append-only observations:** preserve authorship and chronology without edit complexity.
- **Immutable issued PDFs:** preserve exact artifacts at the cost of additional storage.
- **Authorization by issued-document ID:** prevents arbitrary-path access.
- **Permanent canonical redirects:** preserve old links without duplicate page implementations.
- **No upload flag:** removes an unsupported test-only product mode.
- **One approved web logo asset:** eliminates page-level geometry drift while preserving independent favicon and PDF scope.

### Known Risks

- **Migration ordering:** applying role constraints before backfill can fail or lock users out. Keep the migration additive and ordered.
- **Stale sessions:** checking only the cookie would allow deactivated users to continue. Resolve the account on every protected request.
- **Projection regression:** reusing the full application query can leak sensitive fields. Test returned object keys explicitly.
- **Action omission:** one existing action may retain binary authentication. Maintain and test the capability matrix against every exported action.
- **File and metadata inconsistency:** storage and PostgreSQL cannot share one transaction. Use unique paths and compensation cleanup.
- **Concurrent issuance:** simultaneous reissues can allocate the same version. Serialize per application and enforce uniqueness.
- **Historical exports:** previous PDF downloads cannot be proven as issued. Do not fabricate history; require new issuance.
- **Route relocation:** moving the scholarship page can lose dynamic rendering or imports. Preserve `force-dynamic` and verify production build.
- **Upload activation:** incomplete removal of the flag can split client and server rules. Search every current consumer and test real enabled behavior.
- **Responsive footer regression:** validate intermediate widths as well as mobile and desktop extremes.
- **Global logo regression:** one incorrect shared asset affects every page. Compare the executable asset to the approved master before adoption.

## Architecture Decision Records

- [ADR-001: Adopt a donor-first experience with a safe route transition](adrs/adr-001.md) — Establishes the coordinated public hierarchy and route continuity.
- [ADR-002: Separate Administrator and Secretariat capabilities by job responsibility](adrs/adr-002.md) — Defines the product-level staff boundaries.
- [ADR-003: Extend the existing staff account model and centralize authorization](adrs/adr-003.md) — Adds role and active state while enforcing server-side capabilities.
- [ADR-004: Store Secretariat observations as append-only records](adrs/adr-004.md) — Preserves immutable authored operational history.
- [ADR-005: Persist immutable versions of issued final documents](adrs/adr-005.md) — Records exact issued artifacts and preserves every version.
- [ADR-006: Make descriptive public routes canonical with permanent legacy redirects](adrs/adr-006.md) — Uses canonical implementations and HTTP 308 compatibility.
- [ADR-007: Remove the temporary scholarship upload gate](adrs/adr-007.md) — Makes document upload requirements permanent.
- [ADR-008: Use one approved seal asset across web pages](adrs/adr-008.md) — Consolidates corrected web branding while excluding favicon and PDF assets.
