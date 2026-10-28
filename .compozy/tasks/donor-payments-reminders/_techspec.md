# TechSpec: Donor Payment Journey, Reminders, and Reconciliation

## Executive Summary

Extend the existing donor form and Drizzle model with five public monthly due-day choices and month-end recurrence, then add a separate transactional payment-instructions email, required per-occurrence receipt workflow, and daily container job for opted-in Resend reminders and signed receipt links, then add administrator-only bank conference and reports. Phase 1 is an internal completion gate; phases 1 and 2 publish together. Phase 2 creates a minimal occurrence ledger so receipt uploads have a durable home; phase 3 adds bank-confirmation fields and paid-occurrence suppression. Use the current Resend sender, email header, storage driver, ticket signing pattern, server-action authorization, report components, and droplet cron pattern.

The main trade-off is a small operational cron and database send records instead of a new queue service. Provider acceptance and database commit remain separate operations; reservations and stable Resend idempotency keys reduce duplicate risk but cannot establish inbox delivery. Manual bank confirmation is the only source of received amounts.

## System Architecture

### Component Overview

| Component | Responsibility | Boundary |
|---|---|---|
| Donor form and validation | Show Pix before one-time evidence; explain monthly email; require one of five monthly due-day choices | Public route; server validates the submitted choice independently |
| Recurrence helper | Compute local registration date, first due date, 12-date or indefinite series, competence and reminder dates | Pure date logic shared by form/admin/job/ledger |
| Reminder template and sender | Resolve allowed tokens, render institutional header, send only while receipt pending, record outcome | Admin editor and daily script call one send service |
| Monthly instructions template and sender | Explain Pix, amount, schedule, required first receipt link; reserve and record post-registration delivery | Transactional for all monthly pledges, regardless of reminder opt-in |
| Daily reminder script | Evaluate scheduled dates and process one eligible row per pledge/competence/kind | Runs in existing container via host cron; no public endpoint |
| Receipt link and public upload | Sign one pledge/competence, show minimal context, validate and attach the required receipt for that occurrence | No login; link is a scoped, expiring bearer capability, never a download capability |
| Donor list | Correct due day, show next due, current receipt state, and last reminder | Administrator write; Secretaria keeps its limited projection |
| Payment ledger | Materialize expected occurrences in phase 2; add bank-confirmed credits in phase 3 | One row per pledge/competence; receipt is evidence only |
| Conference and report | Admin month filter, totals, overdue list, CSV, monthly chart/table | No CPF, address, email, or receipt URL in aggregates/export |

### Phase Boundaries

1. **Form baseline (internal gate):** The completed baseline added `dia_vencimento`, Pix placement, and admin edit. It is not published alone.
2. **Form amendment, instructions, reminders, and receipt intake (joint publication gate):** Replace the free numeric public day with five unselected choices, support month-end due dates, extend admin edits to 1–31, and keep the one-time payment sequence. Keep the existing reminder tables and minimal `donor_payment_ledger` occurrences, signed public receipt upload, daily script, admin editor/retry, and donor-list status. Add a separate monthly instructions template, send history/reservation, admin editor/test, and list send/resend control. Each monthly occurrence starts with its receipt pending; the first row supplies a required receipt link to the instructions email. Later reminders run only while that occurrence's receipt is pending. Publish phases 1–2 together, without the conference UI.
3. **Reconciliation:** Extend the existing ledger with bank-confirmation columns, backfill one-time pledges, add admin conference and reports, then make the reminder selector consult confirmed ledger credits. No earlier migration depends on later tables.

## Implementation Design

### Core Interfaces

The project remains TypeScript. The following documentation-only struct records the stable occurrence contract in the format required by the spec template; implementation uses an equivalent TypeScript type.

```go
type DonorOccurrence struct {
    PledgeID   string // UUID
    Competence string // YYYY-MM in America/Sao_Paulo
    DueDate    string // YYYY-MM-DD in America/Sao_Paulo
    Index      int    // zero based; 0..11 for um_ano
}
```

The TypeScript service should expose `occurrenceForMonth(pledge, month)`, `nextOccurrence(pledge, today)`, and `scheduledReminder(occurrence, kind)` as pure functions. Inputs are validated strings and `Date` instants; due dates and competences are local calendar strings. Return `null` when the requested month is outside the plan. The reminder sender returns `sent`, `already_sent`, `in_progress`, `skipped_receipt`, `skipped_paid`, `expired`, `uncertain`, or `failed`, with a sanitized reason for UI/logging.

### Date and Recurrence Contract

- Interpret `donor_pledges.created_at` in `America/Sao_Paulo` for registration date and legacy backfill. Do not use server timezone or `toISOString().slice(0, 10)` as a local date substitute.
- `dia_vencimento` is an integer 1–31 for `mensal` and null for `unica`. New public registrations must provide exactly one of 1, 10, 15, 20, or 30; no default is selected. The server rejects omitted, fractional, out-of-range, or other values such as 28 or 31 from the public action. The admin edit accepts any integer 1–31. Existing backfilled rows keep their stored day (registration day previously capped at 28).
- For month `YYYY-MM`, compute the actual due date as `min(dia_vencimento, last day of month)` without changing the stored day. Day 30 is due 28 February in a common year and 29 February in a leap year; an admin-selected day 31 clamps in shorter months. The first occurrence is the first adjusted due date on or after the São Paulo registration date. Examples: register 27 February and choose 30 → first due 28 February; register 28 February and choose 30 in a common year → first due that day; register 29 October and choose 30 → first due 30 October; register 31 October and choose 30 → first due 30 November.
- `um_ano` contains exactly occurrence indexes 0–11, counted from that first due date. `indeterminado` continues while the pledge exists. A 10-day or 5-day reminder is eligible only when its scheduled date is on or after registration and today equals that date in São Paulo. No late or retroactive sends.
- The unique occurrence competence is the due-date month (`YYYY-MM`). Each month still has one well-defined adjusted due date. Compute 10-day and 5-day reminder dates from that adjusted due date, not the nominal stored day. A reminder can fall in the previous calendar month while retaining the due month's competence. Do not send a reminder scheduled before registration.
- An admin day edit immediately changes the next uncredited occurrence and future schedule; it never modifies confirmed history or reissues a reminder kind already accepted for the same competence. From phase 2, open future ledger due-date snapshots are brought into line; rows with receipt evidence or past-due dates retain their snapshot and require explicit administrator review before correction.

### Data Models and Migrations

**Phase 2 amendment to the phase-1 form:** Keep the existing legacy backfill untouched. Add a migration relaxing `donor_pledges_dia_vencimento_check` from monthly 1–28 to monthly 1–31 while retaining null for one-time. Replace the public numeric input with five accessible choices and no preselection. `donorPledgeSchema` and `registerDonorPledge` must require and validate one of those five values independently of the UI; a forged public value such as 31 fails, even though the database and admin action allow it. The admin due-day action validates integer 1–31. Update `occurrenceForMonth`, `nextOccurrence`, `firstMonthlyOccurrence`, reminder selection, due-snapshot synchronization, and their call sites to use adjusted month-end dates; preserve one occurrence per competence and exactly 12 for `um_ano`. One-time still requires a real ISO payment date and both receipt fields; monthly receipt fields are ignored. Keep existing pending-file move/rollback for one-time receipts.

**Phase 2:** Add `donor_reminder_templates` as a singleton with `assunto`, `corpo`, `updated_at`, matching `donor_welcome_templates`. Bootstrap a default only when absent. Add `donor_reminder_sends` with `id`, `pledge_id` FK, `competencia` (text `YYYY-MM` with a format check), `kind` (`10d`/`5d`), `due_date`, `status` (`sending`/`sent`/`failed`/`uncertain`), `sent_at`, `error_code` or short sanitized error, `attempt_count`, `reservation_token`, `reservation_expires_at`, provider message ID, `provider_call_started_at`, and created/updated timestamps. A unique index on `(pledge_id, competencia, kind)` is the idempotency boundary. Freeze `recipient`, `sender`, `subject`, rendered `text`, rendered `html`, and `include_seal` on the row at first claim; the seal asset itself is the existing static CID attachment. Retries send those fields unchanged with one provider idempotency key. Never log them. The subject allows `{nome}`, `{valor}`, `{data_vencimento}`, `{mes_referencia}`, `{chave_pix}`; the body allows those plus `{link_comprovante}` and must contain that link token exactly once. Reject unknown tokens at save and test. Escape inserted values for HTML and keep a readable plain-text part; render the link as a readable URL in text and a safely escaped anchor in HTML. Preview and test sends use a clearly labeled nonfunctional example URL. The default template includes `{link_comprovante}` even before the editor is opened.

**Receipt-required amendment:** Revise the default reminder copy to request the mandatory receipt for that specific monthly payment and explain that uploading it does not confirm a bank credit. Keep `{link_comprovante}` mandatory in every reminder body. Migrate the exact saved legacy default and normalize its known “O comprovante é opcional” sentence in saved custom bodies before preview, test, or real send; reject new edits that explicitly call the receipt optional. The renderer also appends a fixed required-receipt sentence so older saved copy cannot silently reintroduce the optional policy. Preserve administrator edits outside that conflicting sentence. A receipt uploaded before the 10-day or 5-day send removes that occurrence from reminder eligibility; the next competence remains independent.

Also in phase 2, create the **minimal** `donor_payment_ledger` with `id`, `pledge_id` FK, `competencia` (`YYYY-MM`), `due_date`, `expected_value numeric(12,2)`, nullable `receipt_path`, `receipt_name`, `receipt_uploaded_at`, and created/updated timestamps; enforce unique `(pledge_id, competencia)` and valid positive snapshots. Store the São Paulo launch competence in a singleton ledger-settings row. Backfill eligible existing monthly pledges for that competence only, materialize the current and next competences for **all** active monthly pledges before daily reminder selection, and create the first occurrence with each new monthly pledge in one transaction. A bounded month materializer later serves admin conference queries. Materialization is idempotent, never invents earlier monthly balances, and keeps existing expected-value snapshots on conflict. The public receipt route accepts only an existing signed pledge/competence row; it never creates an arbitrary occurrence from client input. Phase 2 has no received-value or bank-confirmation claims. Derive the receipt state from the nullable receipt metadata: every new monthly occurrence starts as `comprovante pendente` and changes to `comprovante enviado – aguardando conferência` after a valid upload; do not conflate this with bank status.

**Phase 3:** Extend `donor_payment_ledger` with `received_value numeric(12,2)` default 0, `credit_date`, `status` (`pendente`, `confirmado`, `divergente`, `nao_identificado`), `confirmed_by` FK to `admin_users`, `confirmed_at`, and `note`. Add check constraints for nonnegative amounts, valid statuses, and required amount/date/confirmer for confirmed or divergent rows. Existing phase-2 monthly rows become `pendente` without changing receipt evidence. A one-time row uses `data_pagamento` month and date, or the local registration date only for an anomalous legacy null; its existing receipt remains linked through the pledge. UI calls pending one-time rows “Aguardando conferência.” An administrator who finds no bank credit can mark `nao_identificado` with a note; that state is still outstanding.

The phase-3 migration backfills every existing one-time pledge as pending and preserves the phase-2 monthly coverage marker. The bounded admin-only month query fills eligible monthly rows at or after that marker idempotently. Do not invent historical receipts or a past-due balance from monthly months before ledger coverage. Disclose the legacy one-time backlog. From phase 3, new one-time pledges also create their initial ledger row in the donor transaction. Expected value and due date remain snapshots. Existing open future rows without receipt evidence may update when the pledge day changes; confirmed rows never do. A correction to pledge value affects newly materialized occurrences only. Deleting a pledge with a bank-confirmed ledger row is rejected; deleting an unconfirmed pledge handles dependent rows and private receipt files without leaving public access in a transaction/compensating cleanup.

### Transactional Monthly Payment Instructions

- Add a singleton `donor_monthly_instruction_templates` with `assunto`, `corpo`, and `updated_at`, bootstrapped only when absent. Keep it independent of `donor_welcome_templates` and `donor_reminder_templates`. The default pt-BR subject identifies the message as “Instruções do pagamento mensal.” The default body explains Pix payment, the due schedule, optional reminders, and the required first-occurrence receipt upload. Reuse `PIX_DETAILS` from `lib/data/pix-details.ts`, `renderInstitutionalEmail`, the document header, seal attachment, Resend configuration, text/HTML escaping, and the existing admin authorization pattern.
- Allow subject/body tokens `{nome}`, `{valor}`, `{dia_vencimento}`, `{data_primeiro_vencimento}`, `{duracao}`, `{chave_pix}`, `{beneficiario_pix}`, `{cnpj_pix}`, and body-only `{link_comprovante}`. Require the body to include `{valor}`, `{dia_vencimento}`, `{data_primeiro_vencimento}`, `{duracao}`, `{chave_pix}`, `{beneficiario_pix}`, `{cnpj_pix}`, and `{link_comprovante}` so edits cannot omit payment facts or the required receipt link. Reject unknown or misplaced tokens and enforce subject/body length limits. Resolve the link to the first ledger occurrence created in the registration transaction for the automatic send, or to the authenticated administrator's selected pending occurrence for a manual send. Explain that the link is for the required receipt for its labeled payment month and does not prove bank credit. A preview and test use a labeled nonfunctional sample link, never a live donor capability. Document every token and required-field rule in the admin editor. The renderer appends a fixed pt-BR policy note: a receipt is required for every monthly payment and upload does not confirm bank credit; if day 30 is selected, its due date moves to the last day of a shorter month; 10-day and 5-day reminders are sent only to opted-in donors while that occurrence's receipt is pending and are calculated from the actual due date when scheduled after registration. This keeps the required policy true even after an administrator edits the template.
- Add `donor_monthly_instruction_sends` as a send-attempt history with `pledge_id` FK, positive `generation`, targeted receipt competence, status (`pending`, `sending`, `sent`, `failed`, `uncertain`), acceptance time, safe error category, attempt count, reservation token/expiry, provider-call start, provider message ID, stable provider idempotency key, and frozen recipient/sender/subject/text/html/header-seal choice. Unique `(pledge_id, generation)` and provider-key constraints coordinate attempts. Create generation 1 as `pending` in the same transaction as each new monthly pledge and its first occurrence, so even an email service failure leaves a visible state. After commit, the sender atomically reserves the pending row. A definite failed attempt can be retried using its frozen payload and key; a timeout or crash after the provider call is uncertain and requires admin review before any retry. An explicit admin resend after an accepted send creates a new generation and key, preserving earlier accepted history. The donor list displays the latest attempt state and acceptance time, or “não enviado” for older monthly rows without an attempt. Provider acceptance means accepted by Resend, not delivered to the inbox.
- After a successful monthly pledge and first-occurrence transaction commits, call this sender regardless of `lembrete_canal` and separately from `sendDonorWelcomeEmail`. A failure or uncertainty must leave the pledge and occurrence intact and return registration success. No automatic process sweeps historical monthly rows; older pledges have no instructions attempt until an administrator deliberately sends one. A manual first send or explicit resend may target one selected receipt-pending monthly competence, including an overdue occurrence or a donor who declined reminders; freeze that target competence on the attempt row and clearly label the linked month in the rendered message. For a historical pledge, default to its earliest current/future pending occurrence but allow an administrator to select an overdue pending occurrence within ledger coverage. When no eligible pending occurrence exists, disable the receipt-link send and show a safe “sem ocorrência ativa” state. Keep `{data_primeiro_vencimento}` as the original first due date. Server actions for manual send/resend must call `requireAdmin()`, validate monthly frequency, target competence, and receipt-pending state, then use the same reservation/state machine. A repeated automatic call must return `already_sent` or `in_progress` without a second provider request; an explicit resend is a distinct audited generation. Never log CPF, donor contact data, message content, bearer link, or raw provider response.
- The admin email/templates navigation exposes the instructions template with edit, preview, and test send. The donor list shows per-monthly-pledge status and a manual send/retry/resend control with a clear distinction between a first send, a definite failure retry, and a deliberate new send after acceptance. Test sends do not create donor send rows. Keep the welcome email behavior and optional reminder channel independent. `scripts/seed-dev.ts` continues inserting fictional rows directly and must never call any email sender; seeded monthly rows may display “não enviado.”
- For donor-list receipt status, use the current São Paulo competence when the plan has an occurrence for it; otherwise show the first future occurrence, or an explicit “sem ocorrência ativa” state when the plan has ended. Resolve the ledger row server-side and expose only its derived receipt label, not the private path or signed ticket. The status is independent of instructions-email and bank-credit state.

### Per-Occurrence Receipt Link and Upload

- Generate an HTTPS link for every 10-day and 5-day reminder using a signed payload containing only `pledge_id` (UUID), `competencia` (`YYYY-MM`), a dedicated `donor_receipt` scope, and an absolute expiry at 23:59:59 São Paulo time 45 days after that occurrence's due date. Use HMAC-SHA256, base64url, a key derived from `SESSION_SECRET` with `ticket:donor_receipt`, and constant-time signature comparison, following `lib/storage/tickets.ts`. The key is distinct from upload/download ticket keys; a receipt link never authorizes an arbitrary storage path or document download. The 10-day and 5-day messages for one occurrence may resolve to the same capability and expiry. Do not put CPF, email, first name, receipt path, or amount in the URL. Freeze the generated link in the first send payload so retries remain byte-identical.
- For an authenticated administrator's manual instructions send to a receipt-pending occurrence whose standard due-date-based link has expired, mint a fresh link with the same pledge/competence/scope and an expiry 14 days after that manual issue. Never let a public caller choose the expiry or target. Freeze the renewed link in that manual send generation. This gives non-opted-in and overdue donors a path to submit a required receipt without enabling automatic reminders or an indefinite bearer token.
- Add a dynamic public page such as `/benfeitor/comprovante?ticket=...`. On GET, verify signature/expiry and load the existing monthly ledger row matching both pledge and competence. GET never writes or uploads, including when an email security scanner opens the link. Render only first name (first nonempty name part), competence formatted in pt-BR, expected amount, one upload control, and clear copy that the receipt is required for this monthly payment while bank credit is checked separately. Show `Comprovante pendente` before upload and `Comprovante enviado – aguardando conferência` after upload while bank review is pending; allow replacement while the link remains valid, including after a bank credit was confirmed, without exposing the bank-review result on the public page. Invalid, expired, deleted, or unmatched capabilities receive the same friendly no-detail state. Keep the page within `app/globals.css` and `components/ui/` conventions, with labeled input, keyboard focus, error and success announcement, and mobile layout. Use `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`, and `X-Robots-Tag: noindex, nofollow`; avoid third-party assets on this page and redact ticket query strings from application/proxy logs.
- Use a dedicated public POST surface for this receipt, with the bearer token in the request body and authorization by the same signed link and matching ledger row. Never reuse the generic upload ticket as proof of pledge ownership. Require same-origin browser `Origin`, validate the token again at write time, reject missing/empty/oversized files from both declared and actual bytes, and accept only supported image formats (JPEG, PNG, WebP, GIF) or PDF after MIME signature/content checks. Limit each file to `MAX_UPLOAD_BYTES` (10 MB) and sanitize the displayed filename. The server creates `pending/{uuid}/recibo_mensal/{safe_filename}`, then moves the validated file to a unique private `donors/{pledge_id}/payments/{competencia}/{uuid}/{safe_filename}` path and atomically updates that row's receipt metadata. No client-supplied path is trusted. Clean up staged files on failure and the superseded private file only after a successful metadata update; use conditional update to prevent concurrent uploads from orphaning an active receipt. Retain one active receipt per occurrence; a later valid upload replaces it. A valid upload after phase-3 status `confirmado` or `divergente` changes only receipt metadata and preserves the bank credit/status/confirmer. A valid upload to a `nao_identificado` row changes it to `pendente`, clears credit/confirmer fields, and retains the previous bank-check note for administrator context; the new receipt awaits conference. A successful upload shows “Comprovante enviado. A confirmação do pagamento depende da conferência bancária.”
- Apply bounded request throttling before expensive parsing: per source IP for invalid-link GET/POST attempts and per hashed ticket for valid POST attempts (for example 30 GET/10 minutes/IP, 20 POST/hour/IP, 5 POST/hour/ticket), returning 429 with `Retry-After`. The single-container deployment may use a bounded in-memory window like `lib/auth/throttle.ts`, with expiry/eviction; move to a shared store before scaling to multiple replicas. Trust forwarded client IP only from configured Traefik, never arbitrary request headers. Reject oversized bodies early, cap concurrent uploads, and keep raw IP, ticket, URL, filename, and file content out of operational logs. The link is a bearer secret: avoid analytics, request-body logging, and public download URLs.
- Administrador opens a receipt only through an authenticated server action that resolves the ledger row by ID and issues the existing short-lived `download` ticket for its server-stored path. Never expose the storage path to the public page. A monthly row with a receipt and pending bank status shows “Comprovante enviado – aguardando conferência” while `received_value` stays zero. Receipt absence never blocks bank conference, but keeps an opted-in occurrence eligible for its remaining scheduled reminders. Receipt presence suppresses those remaining reminders. A later occurrence has its own independent receipt requirement.

### Reminder Reservation and Send Flow

1. Daily script `donors:reminders` computes today's date in `America/Sao_Paulo`, materializes current and next eligible monthly occurrences for all pledges, finds monthly pledges with `lembrete_canal='email'`, and derives occurrences exactly 10 or 5 calendar days ahead from the month-end-adjusted due date. It skips occurrences whose receipt is already uploaded, a first scheduled date before registration, expired `um_ano` plans, and (after phase 3) occurrences with confirmed or divergent bank credit. Before claiming a send, ensure its occurrence row exists and generate that row's receipt capability for `{link_comprovante}`.
2. Insert the unique reminder row if absent, then atomically claim it by token and short expiry only when it is failed/unclaimed or its lease expired. A sent row returns `already_sent`; an active lease returns `in_progress`. Recheck opt-in, occurrence due date, receipt absence, and bank credit immediately before the provider call, including manual retries. If a receipt arrives after a 10-day send, skip the 5-day send; if it arrives before both, skip both. Do not hold a transaction open while calling Resend. If a lease expires after `provider_call_started_at` and acceptance was not recorded, classify it `uncertain` rather than automatically resending after the provider's idempotency window.
3. Render and freeze the message, including the signed receipt link, on the first claim. Use a deterministic provider idempotency key derived from pledge, competence, and kind, with the same frozen payload on retry. Resend currently retains keys for 24 hours; the database row is the durable guard beyond that period. Treat provider API acceptance as `sent`, save `sent_at` and message ID, and clear the lease only for its owner.
4. On a definite provider rejection, save `failed` with a short classified error and clear the lease. A timeout with unknown provider outcome becomes `uncertain`. A process crash leaves an expiring lease. An administrator can review an uncertain row against the Resend dashboard and mark it accepted or explicitly failed; only a failed row can be retried. Manual retry rechecks opt-in, receipt absence, and paid status, then allows a failed `10d` from its scheduled date until the day before the `5d` date, or a failed `5d` until the day before due. It reports `sent`, `in_progress`, `skipped_receipt`, `skipped_paid`, `expired`, or `failed`. A test send uses sample values and a `[TESTE]` subject without creating a send row.
5. Repeated runs on the scheduled day may retry failed sends, but must never send a recorded `sent` row. The job exits nonzero on operational failure so cron logs and monitoring reveal it; it logs counts and IDs only, without donor contact data or message content.

### Conference, Totals, and Export Contract

- `getDonorPaymentConference(month)` and mutation actions call `requireAdmin()` independently. `month` is a valid `YYYY-MM`; a bounded query materializes eligible monthly rows for that month before reading. The page route also calls `requireAdmin()`. The Secretariat sidebar does not expose the route, but server-side checks are authoritative.
- `confirmDonorPayment(id, amount, creditDate, note)` requires a positive, cent-precise amount and real ISO credit date. It sets confirmer/time and chooses `confirmado` when amount equals expected, else `divergente`. Admin corrections replace amount/date/note and refresh confirmer/time. A reset to `pendente` clears credit and confirmer metadata. `nao_identificado` requires an explicit note and zero received value.
- Conference rows expose a separate receipt state for monthly occurrences: `Comprovante pendente` when `receipt_path` is null, or `Comprovante enviado – aguardando conferência` while the bank status is pending and evidence exists. Bank-review labels are `Confirmado no extrato`, `Divergente`, and `Não identificado`; retain and show the separate receipt state even when a bank label is primary. Opening a monthly file resolves the row server-side and issues a five-minute admin-only download ticket; the receipt capability from the email cannot download it. Receipt absence does not prove bank nonpayment.
- For a selected month: **expected** is the sum of `expected_value`; **received** is the sum of bank-confirmed `received_value` in `confirmado` or `divergente`; **outstanding** is the sum of `max(expected_value - received_value, 0)` per row. Overpayments remain visible as divergences but do not make outstanding negative. Values are computed in decimal/cents, not JS floats.
- The overdue list contains open balances whose `due_date` is earlier than the São Paulo calendar date one month before today. Include pending, not-identified, and underpaid divergent rows; exclude confirmed and fully covered overpayments. Independently highlight any overdue monthly occurrence with `receipt_path` null, even if a bank credit was confirmed, because the mandatory receipt is still missing; distinguish this from outstanding funds. Label coverage start and legacy one-time rows to avoid claiming historical nonpayment.
- CSV exports the selected month with safe headers (competence, donor name, frequency, due date, expected, received, outstanding, receipt state, bank state, credit date, confirmation time, and confirmer ID) and a UTF-8 BOM for spreadsheet compatibility. Exclude CPF, address, email, phone, note, receipt path/URL, and raw provider errors. Quote fields correctly, guard against spreadsheet formula injection in donor names, and never expose receipts as public links.
- The report uses a bounded rolling 12-month window ending at the selected month, clipping monthly series to the phase-2 coverage start. It shows expected versus received per month using the existing Recharts style and an equivalent semantic table; the table also shows a count of monthly occurrences with receipts pending and sent, without equating either count with bank-confirmed amounts. Empty months show zero. The same aggregate result feeds chart and table; no personal rows reach chart props.

### API Endpoints

The receipt page and upload require one public route pair; existing server actions and internal scripts remain the other surfaces:

| Surface | Inputs and result | Authorization |
|---|---|---|
| `registerDonorPledge` | Validated pledge; requires one of five monthly days and attempts transactional instructions after commit | Public, server validated |
| `updateDonorDueDay` | UUID + integer 1–31; success/error | `requireAdmin()` |
| Monthly instructions template read/save, preview/test | Subject/body tokens and test recipient; safe result | `requireAdmin()` |
| Monthly instructions manual send/retry/resend | Monthly pledge UUID, selected receipt-pending competence, explicit resend intent; recorded state | `requireAdmin()` |
| Reminder template read/save, preview/test | Subject/body and test recipient; sanitized result | `requireAdmin()` |
| `GET /benfeitor/comprovante?ticket=...` | Minimal first name, month, amount, upload form or friendly invalid state | Valid `donor_receipt` capability; no login |
| `POST /api/donor-receipts` | Ticket + one image/PDF (up to 10 MB); success/error | Revalidate capability and occurrence; same-origin browser request; throttled |
| `retryFailedDonorReminder` | Send-row UUID; typed send result | `requireAdmin()` |
| `getDonorPaymentConference`, confirm/reset/mark-not-identified | Month or row data; typed result | `requireAdmin()` |
| `getMonthlyDonorReceiptUrl` | Ledger-row UUID; short-lived private download URL or safe error | `requireAdmin()` and server-side row/path lookup |
| `exportDonorPaymentConference` | Month; CSV download response or signed server action result | `requireAdmin()` |
| `donors:reminders` npm script | No public input; exit code and counts | Host cron inside configured container |

## Integration Points

**Resend:** Use existing `RESEND_API_KEY` and `RESEND_FROM`, the shared document header, seal attachment, 15-second timeout, and HTML/plain-text rendering patterns in `lib/email/`. A provider ID confirms API acceptance only. Keep each reminder or instructions attempt's idempotency key and payload stable across retries; a deliberate instructions resend uses a new generation/key. Store errors as safe categories; no provider response body in logs.

**Pix and bank statement:** The one-time form branch and both email renderers use the existing ACIPEC Pix data in `lib/data/pix-details.ts`. The bank statement remains a human-reviewed source outside the app. No OFX/CSV import or bank API is called.

**Droplet cron:** Add `donors:reminders` to `package.json` using the installed `tsx` pattern. Document this crontab line alongside the existing backup and cleanup entries (host schedule is UTC; the job itself calculates São Paulo dates):

```cron
0 12 * * * docker exec sspx-ansp-ansp-1 npm run donors:reminders >> /home/renan/ansp-reminders.log 2>&1
```

The host operator installs the line only after phase 2 is deployed and Resend is configured. The runbook records one dry-run/test-send procedure, expected count summary, and retry/alert steps. The cron does not migrate or bootstrap the app.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|---|---|---|---|
| Drizzle schema/migrations | Modified/new | Due-day backfill, unique reminder keys, early occurrence/receipt storage, bank fields | Additive migrations in phase order; phase-2 occurrence rows survive phase-3 extension |
| Donor form and action | Modified | Payment sequence and conditional evidence | Shared Pix block, validation, monthly discard rule |
| Donor list/card | Modified | New edit and status fields | Admin-only controls; limited Secretariat projection |
| Email service/editor | Modified/new | Template tokens and send state | Reuse Resend/header; add safe retry |
| Public receipt page/upload | New | Scoped bearer-link intake of private monthly evidence | HMAC scope, content checks, throttling, pending-to-donors move |
| Scripts/deploy docs | Modified | Daily scheduled job | npm script, cron line, operations guidance |
| Ledger/conference | New | Financial source of truth and access boundary | Server actions, admin route, month materialization |
| Reports | Modified/new | Expected-versus-received chart, table, CSV | Aggregate query and safe export |

## Testing Approach

### Unit Tests

- Test first due date at same-day, earlier-day, February 28/29, a 30-day month, an admin-selected 31, and São Paulo/UTC boundary; test exactly 12 occurrences and no past-registration reminder. Verify both reminder offsets from each adjusted due date.
- Test public Zod validation of no day, each of 1/10/15/20/30, and forged 0/28/29/31/fractional values; test admin validation of 1/31 and rejection of 0/32; verify one-time date and receipt remain required.
- Test the monthly instructions template token allowlist, HTML escaping, mandatory first-occurrence receipt link, day-30 explanation, opt-in wording, preview/test placeholder, and send state under concurrent claims, failed retries, uncertain outcomes, explicit resend, and pre-existing monthly donors.
- Test token allowlist, mandatory `{link_comprovante}`, escaping, preview/test substitution, signed-link tampering/expiry/scope separation, and cent-accurate totals including underpayment and overpayment.
- Test CSV quoting and formula-injection protection, separate receipt and bank labels, and chart/table equality with empty months and missing-receipt counts.

### Integration Tests

- Use `__tests__/helpers/fake-db.ts` for server-action authorization, valid writes, and response states. Add Postgres-backed tests where unique indexes, migration backfill, conditional reservation, and concurrent claims cannot be represented by the fake DB.
- Run the daily job twice for one scheduled date and assert one accepted send per `(pledge, competence, kind)`; test failed-send retry, expired lease, opt-out, first/last occurrence, receipt-uploaded suppression, and confirmed-credit suppression.
- Register monthly donors with reminders opted in and out, assert each gets one instructions attempt after commit, and assert email failure leaves registration intact. Verify two concurrent attempts do not duplicate an accepted send, manual sending works for a pre-existing monthly donor, explicit resend creates a new recorded generation, and seed-dev never calls the sender.
- Open the instructions and both reminder links for the same occurrence, upload and replace its required receipt, and assert only that occurrence's ledger row changes and its remaining reminder is skipped. Cover invalid/expired/cross-scope links, another competence, bank-confirmed rows, `nao_identificado` reopening, MIME disguise, zero and >10 MB files, throttling, concurrent replacements, and stage/commit failure cleanup. Verify GET does not mutate data or expose CPF/email/paths.
- Verify Secretariat cannot read, mutate, or export the ledger; direct action calls must fail even if navigation is hidden.
- Verify one-time receipt remains unconfirmed until a bank credit is entered; monthly receipt-pending/sent and bank-confirmed/divergent/not-identified states remain distinct, overdue missing receipts are highlighted, and totals reconcile to the report and CSV.
- Keep `npm test` as the deployment gate and run the production build for each releasable phase.

## Development Sequencing

### Build Order

1. Add and backfill monthly due day plus recurrence helper; no prior step.
2. Correct public Pix/form submission and conditional validation; depends on step 1.
3. Add administrator due-day edit and donor-list display; depends on steps 1–2. **Completed phase-1 baseline, internal only.**
4. Add reminder schema, default template, and renderer with mandatory `{link_comprovante}`; depends on step 3.
5. Add minimal occurrence ledger, coverage marker, and monthly materialization; depends on step 3.
6. Add signed receipt capability, public page, protected upload, and replacement rules; depends on steps 4–5.
7. Add reserved Resend sender and daily script that inserts a signed link for each occurrence; depends on steps 4–6.
8. Add reminder editor, retry UI, donor-list status, and cron runbook; depends on step 7. **Completed phase-2 baseline, not yet published.**
9. Replace the public numeric day with five unselected choices, expand the database/admin range, and use month-end recurrence for ledger and reminders; depends on steps 1–2, 5, and 8.
10. Add the transactional instructions template and attempt history; depends on steps 4, 6, and 9.
11. Add required receipt state, receipt-aware reminder selection, pre-provider checks, required-receipt default/rendered copy, and an admin-only recovery ticket helper; depends on steps 5–6 and 9.
12. Add the post-commit instructions sender and targeted manual-send capability; depends on steps 9–11 and the signed receipt capability from step 6.
13. Add admin instructions editor, preview, test, and navigation; depends on steps 10 and 12 and the existing reminder editor in step 8.
14. Add donor-list instructions status, current receipt state, and manual send/retry/resend for a selected pending occurrence; depends on steps 11–12 and the existing donor list in step 8.
15. Update the public receipt page, form, and admin preview to explain required per-occurrence evidence; depends on steps 9–14. **Joint phase-1/2 publication gate after steps 9–15.**
16. Extend the ledger with bank fields and legacy one-time rows; depends on steps 8–15.
17. Add administrator conference mutations and month/overdue queries with separate receipt/bank states; depends on step 16.
18. Add conference UI, CSV, chart/table, overdue missing-receipt emphasis, and donor deletion guard; depends on step 17.
19. Wire the sender's bank-confirmed suppression without undoing receipt-based suppression and verify phase 3 end to end; depends on steps 16–18. **Phase 3 release gate.**

### Technical Dependencies

Postgres is required for migration and uniqueness verification. A configured Resend domain/key is needed for a real test send, while automated tests mock the provider. The cron is an operator deployment step after the joint phase-1/2 image passes `npm test` and health checks. No new package or service is required.

## Monitoring and Observability

- Daily job logs date, candidates, accepted, already sent, failed, skipped receipt, skipped paid, and in-progress counts. It exits nonzero on failure. No CPF, donor email, address, message body, receipt path, bearer link, or bank note appears in logs.
- Public receipt intake logs only aggregate success, rejection, size/type, and throttle categories; no raw ticket, URL, IP, filename, or file content. Monitor persistent 429s and upload failures without exposing donor identity.
- Admin screens surface last reminder result and a short failure category; the stored provider ID and acceptance time support investigation without claiming delivery.
- The donor list surfaces monthly instructions as pending, sending, accepted by Resend, failed, uncertain, or not sent for older rows; it never claims inbox delivery. Log only attempt IDs and safe categories.
- Monitor a missing daily cron log or nonzero exit and a growing failed count. Rerun the same day after fixing configuration; later failed items use admin retry only if still eligible and unpaid.
- Conference screens show ledger coverage start, separate receipt/bank states, overdue missing-receipt emphasis, and the confirmer/time of the latest bank entry. Backups already capture Postgres and receipts together; repeat the documented restore check after schema changes.

## Technical Considerations

### Key Decisions

- Use a local-calendar recurrence and due month key, not fixed-duration timestamp arithmetic.
- Keep the stored chosen day unchanged and clamp only each occurrence's actual due date to that month's last day; compute reminder offsets from that actual date.
- Use Postgres unique keys and short leases for reminders, with stable provider idempotency as a second guard.
- Create phase-2 occurrence rows before sending so a scoped signed link can attach the required receipt to one pledge/competence.
- Use bank-confirmed ledger values for receipts and reports; the uploaded one-time file remains supporting evidence.
- Keep access checks in each action and page, consistent with application-level authorization.

### Known Risks

- A process can crash after Resend accepts a message and before Postgres records it. The frozen payload and Resend key narrow retries within 24 hours; uncertain attempts require administrator review rather than automatic resend.
- A day edit after a 10-day send changes the 5-day schedule; the existing 10-day row remains the only send for that competence, and the UI reflects the new due date.
- Existing contributions before the phase-2 ledger launch cannot be classified as paid or unpaid without bank review. Monthly reporting starts at that launch competence and labels its coverage; old one-time rows remain explicitly unverified.
- A forwarded receipt link is a bearer capability until expiry; minimal page data, no-referrer/no-store headers, scoped signing, content checks, and throttling limit its exposure and abuse.
- Historical donor rows could violate assumed date/receipt invariants. Migration and backfill must classify anomalies without discarding pledge or receipt data.

## Architecture Decision Records

- [ADR-001: Stage the donor journey and due-day rule](adrs/adr-001.md) — Correct the one-time sequence and preserve the legacy backfill; see ADR-006 for the new public choices.
- [ADR-002: Anchor monthly occurrences at registration](adrs/adr-002.md) — Define first due and 12-date duration in São Paulo calendar time; see ADR-006 for month-end dates.
- [ADR-003: Use a daily opted-in email job with per-occurrence reservations](adrs/adr-003.md) — Reuse cron and Resend with a durable send key.
- [ADR-004: Reconcile manually against bank-confirmed credits](adrs/adr-004.md) — Keep expected, actual, and receipt evidence distinct.
- [ADR-005: Attach reminder receipts to early occurrence records](adrs/adr-005.md) — Materialize monthly occurrences in phase 2 for signed upload links, then extend the rows for phase-3 bank conference.
- [ADR-006: Use fixed public due-day choices and transactional instructions](adrs/adr-006.md) — Require one of five public days, clamp occurrence dates at month-end, and send a separate recoverable monthly instructions email.
- [ADR-007: Require a receipt for every monthly occurrence](adrs/adr-007.md) — Show receipt pending/sent separately from bank review and suppress remaining reminders after upload.
