# Product Requirements Document: Public Project Explanation, Benefactor Welcome Email, and Geographic Reports

## Overview

Potential benefactors need a clear public explanation of why the Arca exists, how support reaches scholarship students, and what each participant is responsible for before deciding to help. ANSP also needs a complete operational view of welcome emails after benefactor enrollment and two distinct geographic views of its benefactor registrations. Enrollment must remain successful when the email service is temporarily unavailable.

## Goals

- Give visitors a trustworthy, readable explanation of the project's purpose, funding flow, and responsibilities, grounded in `docs/examples/presentation_ansp.pdf`.
- Lead an informed visitor from that explanation to the existing benefactor enrollment path without pressure or unsupported claims.
- Show a welcome email state for every benefactor registration.
- Let administrators find and act on every registration without the current 50-record pending-list limit.
- Show registration counts by state of residence and by selected priory or chapel as separate views.
- Distinguish acceptance by the sending service from confirmed inbox delivery.
- Keep full addresses, CPF numbers, and email addresses out of aggregate reports.

## User Stories

### Potential Benefactor

- As a potential benefactor, I want to understand why the Arca exists and how my support is organized so that I can decide whether to participate with confidence.
- As a potential benefactor, I want to know the distinct roles of the association, schools, and families so that the path from contribution to scholarship is clear.

### Administrator

- As an administrator, I want to see which benefactors have no recorded welcome email so that I can complete follow-up.
- As an administrator, I want to send a pending welcome email from the benefactor list and see the result so that failed attempts do not get lost.
- As an administrator, I want to compare registration counts by state of residence so that I can understand ANSP's geographic reach.
- As an administrator, I want to compare registration counts by selected priory or chapel so that I can understand the communities represented.

### Benefactor

- As a benefactor, I want my registration to succeed even if the welcome email cannot be sent immediately.
- As a benefactor, I want my residence information to be accurate even when an address suggestion is incomplete or unavailable.

## Core Features

### 1. Public Project Explanation

- Add a discoverable "Como funciona" item in the public site's main navigation leading to a coherent explanation on the main site, before the benefactor signup call to action.
- Use the presentation as the authority for the section's facts and copy: the association organizes resources to make scholarships more stable; benefactors support it; the association organizes and directs resources and commits to accountability; schools identify needs and follow students; families receive support and meet their commitments. Relevant source slides: 2, 4, 7–8, 10–14, and 17.
- Do not include income bands, scholarship percentages, family-order rules, or complementary eligibility conditions from slides 15–16 in this public explanation. The operator confirmed that affiliation with the FSSPX is not mandatory; do not present it as a requirement.
- Keep a clear path from the explanation to the existing benefactor signup form. The explanation must be readable on mobile and by keyboard, with meaningful heading structure.
- Do not publish the presentation's named staffing roster, undated statistics, or possible future outcomes as current facts without separate verification. Slides 3, 5–6, and 9 contain material that can become stale or be mistaken for a guarantee.

### 2. Welcome Email Status and Action

- Every registration in the benefactor list shows either its recorded send date or a clear not-sent state.
- Administrators can filter registrations by welcome email state.
- A manual send action is available only for registrations without a recorded send.
- The action shows progress and a clear success or failure result. A second simultaneous action for the same registration must not create an avoidable duplicate.
- The existing welcome-message editor and test-send flow remain available to administrators.

### 3. Residence Information

- New registrants provide or confirm their city and state of residence, including when an address suggestion is unavailable or inaccurate.
- Historical registrations with reliable residence information contribute to the residence report.
- Historical registrations without reliable residence information appear under "Local não identificado"; their location is never inferred from priory or chapel attendance.

### 4. Two Geographic Reports

- A new administrator-only Reports area shows registration counts by state of residence.
- The same area separately shows registration counts by selected priory or chapel.
- Both views include explicit unknown or none categories, a total for the selected population, readable counts, and an equivalent data table.
- Both views label the measure as benefactor registrations rather than unique people.

### 5. Shared Report Filters

- Period and contribution-frequency filters apply to both charts.
- The selected population and total remain visible when filters change.
- The default view includes all registrations.

## User Experience

1. A visitor finds "Como funciona" in the public navigation and reads, in order, the need for stable scholarships, the flow from benefactors through the association to schools and students, and the responsibilities of each participant.
2. The visitor can continue directly to "Seja um benfeitor" after understanding the project. The explanation does not interrupt or replace the existing enrollment route.
3. An administrator opens Benefactors, searches or filters registrations, and sees the welcome email state beside each registration.
4. For a pending message, the administrator chooses "Enviar e-mail" and sees progress followed by success or an actionable error.
5. The administrator opens Reports and sees two distinct questions under separate headings: where benefactors live and which priory or chapel they selected. Each view has readable category labels and counts plus an equivalent table.
6. Public and administrative copy remains in Brazilian Portuguese and follows ANSP's institutional tone.

## High-Level Technical Constraints

- The public explanation belongs to the main site, never to the administrative area, and must use the supplied presentation as its editorial source.
- The public explanation omits detailed scholarship eligibility rules and does not treat FSSPX affiliation as mandatory.
- Extend the existing benefactor enrollment and administrative experience.
- Welcome email status may only claim acceptance by the sending service; it does not prove inbox delivery.
- Residence and religious attendance must remain separate concepts.
- Aggregate views must protect personal information and work by keyboard and on mobile devices.
- Report access and manual welcome-email sending are limited to administrators.

## Non-Goals (Out of Scope)

- Publishing the presentation itself as the only explanation, reproducing all 18 slides verbatim, or publishing an unverified team roster.
- Publishing income thresholds, scholarship percentages, child-order rules, or complementary eligibility conditions as part of this feature.
- Promising lower tuition, a specific scholarship award, individual donation tracing, or a new public financial-report portal.
- Marketing campaigns, open or click tracking, delivery webhooks, or automated bulk resend.
- A map of individual addresses or a donor-level geographic export.
- Treating registrations as unique people or pledged amounts as received revenue.
- Inferring a benefactor's residence from their selected priory or chapel.
- Expanding Secretariat access to reports or manual welcome-email sending.

## Phased Rollout Plan

### Phase 1: Public Explanation

- Publish a public "Como funciona" entry and explanation based on the presentation, with a route to benefactor signup.
- Exit criterion: a visitor can explain why the Arca exists, how support flows, and the responsibilities of the association, school, and family without consulting the slide deck. The page does not publish detailed eligibility rules.

### Phase 2: Email Operations

- Complete status visibility and manual follow-up for all registrations.
- Exit criterion: every registration has a visible state and an administrator can handle any pending registration from the list.

### Phase 3: Residence Quality

- Collect clear residence locations for new registrations and identify historical registrations lacking a reliable location.
- Exit criterion: new registrations can be grouped by residence and unresolved historical records are visibly categorized.

### Phase 4: Geographic Reports

- Release both charts, their equivalent data tables, and shared filters to administrators.
- Exit criterion: both charts' category counts match the selected registration total, including unknown and none categories.

## Success Metrics

- The public explanation is reachable from the main navigation and leads to the existing benefactor signup path.
- Every substantive public claim about project operation maps to an identified presentation slide or an approved current institutional source.
- A content review confirms that the page omits detailed eligibility rules and does not promise lower tuition or individual donation tracing.
- 100% of registrations in the benefactor list display a welcome email state.
- Every registration without a recorded send can be found and acted on by an administrator.
- New registrations have a confirmed state of residence or a clear validation issue before submission.
- For any report filter, the categories in each chart sum to the displayed registration total.
- Aggregate charts and tables expose no individual CPF, full address, or email address.

## Risks and Mitigations

- **Presenting changing figures as permanent facts:** verify and date any published statistics; omit figures without current institutional confirmation.
- **Outdated eligibility claims in the presentation:** keep slides 15–16 outside this public explanation and honor the operator's clarification that FSSPX affiliation is not mandatory.
- **Misleading promises of accountability:** describe the association's responsibility to organize, direct, and account for resources without claiming a donor portal or individual allocation trace that does not exist.
- **Misreading send status as delivery:** use wording that reflects acceptance by the email service, not inbox delivery.
- **Incomplete historical residence information:** show the unclassified count rather than assign an inferred state.
- **Confusing two geographic concepts:** use distinct titles and explanations for residence and priory or chapel.
- **Pending messages being overlooked:** place status and action in the benefactor list administrators already use.

## Architecture Decision Records

- [ADR-001: Two complementary donor location reports](adrs/adr-001.md) — show residence and priory or chapel as separate registration-count views.
- [ADR-002: Administrator-only access to benefactor reports](adrs/adr-002.md) — limit report access to administrators and retain administrator ownership of manual email sends.
- [ADR-003: Public explanation sourced from the institutional presentation](adrs/adr-003.md) — provide a concise public explanation on the main site and preserve the presentation as its factual source.

## Open Questions

- Delivery confirmation, individual-address mapping, and Secretariat report access require separate product decisions if requested later.
