# TechSpec: Public Project Explanation, Benefactor Welcome Email, and Geographic Reports

## Executive Summary

Extend the existing Next.js application in four areas: a public “Como funciona” explanation, confirmed residence fields, reliable welcome email operations, and administrator-only geographic reports. Reuse the current donor form, server actions, Postgres/Drizzle models, and admin layout; the welcome email provider is Resend.

Historical residence enrichment will consult ViaCEP for valid stored CEPs. Welcome email sends will use Resend and a temporary database reservation. Postgres will aggregate report counts, and a React chart library will render them alongside equivalent HTML tables. The main trade-offs are an added chart dependency, reliance on ViaCEP for historical enrichment, and the small duplicate-send window between provider acceptance and recording that acceptance in Postgres.

## System Architecture

### Component Overview

- **Public explanation:** Add “Como funciona” to the main-site navigation and present concise content sourced from the institutional presentation, with a link to the existing benefactor signup route.
- **Donor registration:** Keep the existing form and server action. Add editable city and UF fields, pre-filled by the current ViaCEP lookup when available and confirmed by the registrant.
- **Historical residence enrichment:** Run a bounded, resumable script outside migrations and startup. It processes existing eight-digit CEPs and records valid ViaCEP city/UF results with their provenance.
- **Welcome email service:** Both registration and administrator retry call one sending path. A conditional database update reserves the donor row before calling the Resend API; the owner records provider acceptance or releases the reservation.
- **Admin donor list:** Show send date or a pending state for every registration. Administrators can filter pending records and send individually from the list; the existing editor and test-send flow remain.
- **Reports:** An administrator-only server action applies shared period and contribution-frequency filters, then asks Postgres for separate residence and priory/chapel counts. The page receives aggregate data only.

## Implementation Design

### Core Interfaces

The application will implement these contracts in TypeScript. This small struct expresses the report filter contract for design review; it does not add Go code to the project.

```go
type DonorReportFilters struct {
    From      *string // inclusive YYYY-MM-DD
    To        *string // inclusive YYYY-MM-DD
    Frequency *string // "mensal" or "unica"; nil means all
}
```

The report result contains `total`, `residenceByState[]`, and `prioryOrChapel[]`. Each series entry contains a stable category key, a Portuguese label, and a count. The email send result distinguishes `sent`, `already_sent`, `in_progress`, and `failed`; the UI presents a specific message for each.

### Data Models

Add nullable `residence_city`, `residence_state`, and a provenance value such as `confirmed` or `cep_lookup` to `donor_pledges`. New registrations require a valid Brazilian UF and nonempty city; historical rows may remain null. Retain the existing `endereco`, `cep`, and `priorado_capela` fields for their separate purposes.

Add a nullable reservation token and expiry timestamp for welcome email sending. Retain `welcome_email_sent_at` as the recorded Resend API acceptance time. A reservation token identifies the caller allowed to clear the reservation or record success.

A migration adds the nullable columns without rewriting existing records. The historical enrichment script runs separately, never overwrites confirmed residence, skips invalid or ambiguous ViaCEP results, and can resume safely.

### API Endpoints

Use existing server actions rather than adding public HTTP endpoints:

- `registerDonorPledge`: validate and persist confirmed city/UF with the registration; a later Resend failure does not undo the saved registration.
- `retryDonorWelcomeEmail(id)`: require administrator access and return a typed outcome for a single donor.
- `getDonorReports(filters)`: require administrator access, validate period and frequency, and return aggregate counts only.
- `getDonorPledges`: continue serving the role-appropriate admin list and include welcome status in the administrator projection.

The admin report route also calls `requireAdmin()` before reading data. Navigation visibility is supplementary to server-side authorization.

## Integration Points

**ViaCEP:** The existing lookup supplies suggestions for new registrations. Historical enrichment calls it with valid CEPs in bounded batches and records only complete, valid city/UF pairs. Timeouts and failed lookups leave residence unknown; the script reports counts without logging donor addresses or CPF values.

**Resend:** Use the official Node SDK with `RESEND_API_KEY` and a verified-domain `RESEND_FROM`. Send the rendered HTML and plain-text bodies, including the institutional seal as an inline CID attachment when available. Record acceptance only after the API returns an email ID; describe the status as accepted for sending, without claiming inbox delivery. A failed or timed-out call releases its reservation. Expiry permits recovery after a process crash.

## Impact Analysis

| Component | Impact | Required action |
|---|---|---|
| `donor_pledges` schema and migration | Modified; data compatibility | Add nullable residence and send-reservation fields |
| Donor form, validation, registration action | Modified; submission behavior | Confirm city/UF and preserve successful registration on email failure |
| Welcome email service and admin action | Modified; concurrency | Share atomic reservation and typed outcomes |
| Admin donor list and card | Modified; operational UX | Show status, filter, progress, and manual send |
| Public landing site | Modified; institutional content | Add navigation and sourced explanation |
| Admin reports route and sidebar | New; access boundary | Restrict reads and navigation to administrators |
| Report aggregation and charts | New; privacy and accessibility | Return counts only; render charts and equivalent tables |

## Testing Approach

### Unit Tests

Test residence validation, including corrected ViaCEP suggestions and lookup failure. Test historical enrichment classification for invalid CEPs, incomplete results, and confirmed values that must remain untouched. Test email outcome mapping and chart/table rendering from the same aggregate series.

### Integration Tests

Use Postgres-backed tests for competing email reservations and for report aggregation. Verify that simultaneous sends cannot both acquire an active reservation, that failure releases it, and that expiry allows recovery. For each filter combination, verify that both geographic series sum to the displayed registration total, including unknown and “Nenhuma” categories. Verify that Secretariat users cannot read reports or trigger a manual send. Keep `npm test` as the deployment gate and add page/form accessibility checks for mobile and keyboard use.

## Development Sequencing

### Build Order

1. Add the residence and email-reservation schema migration; no feature dependency.
2. Add confirmed residence collection and historical enrichment; depends on step 1.
3. Unify automatic and manual email sending behind the reservation; depends on step 1.
4. Add welcome status, filtering, and action to the admin donor list; depends on step 3.
5. Add SQL aggregation and administrator-only report reads; depends on step 2.
6. Add the report page, chart library, tables, and navigation; depends on step 5.
7. Add the public explanation and navigation; depends on the existing landing page only.
8. Run the full test suite and build; depends on steps 2–7.

### Technical Dependencies

Postgres is required for migration and aggregation verification. ViaCEP access is required only for enrichment attempts; its outage must not block registration. Resend API configuration is required to verify a real send, while automated tests mock the provider.

## Monitoring and Observability

Track counts of accepted, failed, already-sent, and in-progress welcome email attempts without logging message content or recipient addresses. The historical enrichment script reports processed, classified, skipped, and failed counts. Report queries should be timed so unexpectedly slow aggregations can be investigated. Logs must omit CPF, full address, and email.

## Technical Considerations

### Key Decisions

- Residence is a confirmed field for new records; historical CEP enrichment carries separate provenance.
- A database reservation coordinates concurrent sends without holding a transaction open across the Resend API request.
- Postgres produces aggregate report data; personal rows never reach report charts.
- A React chart library provides the two visualizations; semantic tables remain the accessible source of exact values.

### Known Risks

Resend acceptance and the database update cannot be atomic; a crash between them may allow a later duplicate. The UI and operational status must describe the recorded state accurately. ViaCEP may be unavailable or return an incomplete result; affected historical registrations remain “Local não identificado.” The chart library adds bundle weight; load it only in the administrator report area.

## Architecture Decision Records

- [ADR-001: Two complementary donor location reports](adrs/adr-001.md) — Residence and priory/chapel are separate registration-count views.
- [ADR-002: Administrator-only access to benefactor reports](adrs/adr-002.md) — Report reads and manual sends require administrator access.
- [ADR-003: Public explanation sourced from the institutional presentation](adrs/adr-003.md) — Public copy is traceable to the presentation and excludes unverified claims.
- [ADR-004: Confirmed residence fields and historical CEP enrichment](adrs/adr-004.md) — New locations are confirmed; valid historical CEPs may be enriched.
- [ADR-005: Database reservation for welcome email sends](adrs/adr-005.md) — A temporary reservation prevents concurrent sends.
- [ADR-006: Database aggregation for geographic reports](adrs/adr-006.md) — Postgres returns counts after shared filters.
- [ADR-007: Chart library with equivalent data tables](adrs/adr-007.md) — Both charts have tables with the same values.
- [ADR-008: Resend API for welcome emails](adrs/adr-008.md) — Welcome email delivery uses Resend instead of self-hosted SMTP.
