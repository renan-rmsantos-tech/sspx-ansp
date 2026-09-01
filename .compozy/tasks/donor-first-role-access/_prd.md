# Product Requirements Document: Donor-First Experience and Staff Access Roles

## Overview

The ANSP Scholarship System currently prioritizes scholarship applications throughout its public landing page and provides a single unrestricted authenticated staff profile.

This initiative will make benefactor enrollment the primary public action while keeping scholarship applications clearly accessible as a secondary action. It will also introduce distinct Administrator and Secretariat profiles, restore scholarship document uploads, adopt clearer public URLs, and correct institutional identity and contact details.

The changes serve potential benefactors, applicant families, Administrators, and Secretariat staff. They improve public communication, preserve sensitive family data, and separate decision authority from operational follow-up.

## Goals

- Make “Seja um benfeitor” the unmistakable primary action throughout the landing page.
- Keep scholarship applications visible and easy to find as the secondary public action.
- Introduce `/seja-um-benfeitor` and `/solicitar-bolsa` without breaking previously distributed public links.
- Enable applicants to upload all required scholarship documents.
- Give Administrators access to every administrative capability.
- Give Secretariat staff only the information and actions required for operational follow-up.
- Ensure only Administrators can approve or reject applications.
- Let Administrators create, deactivate, and restore access for individual Secretariat accounts.
- Align user-facing pages with the approved institutional logo.
- Replace the public contact email with `contato@arcaprovidencia.com.br`.
- Remove the administrative-area shortcut from the public landing page.
- Ensure the full “Fraternidade Sacerdotal São Pio X” name remains visible at every supported viewport.
- Deliver all changes as one coordinated release after role, privacy, public-navigation, and upload acceptance criteria pass.

## User Stories

### Potential Benefactor

- As a potential benefactor, I want the primary public journey to explain and lead me toward becoming a benefactor so that I can support the institution without searching for the correct action.
- As a returning visitor, I want an old benefactor link to continue taking me to the correct destination so that saved or shared links remain useful.

### Scholarship Applicant

- As a family seeking a scholarship, I want the scholarship path to remain clearly visible even when it is secondary so that I can find the application without confusion.
- As an applicant, I want to upload the requested documents during the application so that I can submit a complete request.
- As a returning applicant, I want an old scholarship-form link to continue taking me to the correct destination.

### Administrator

- As an Administrator, I want access to all existing and new administrative capabilities so that I can manage the complete scholarship process.
- As an Administrator, I want exclusive control over approval and rejection so that decision authority remains explicit.
- As an Administrator, I want to issue final decisions and contracts so that only reviewed documents become available for family follow-up.
- As an Administrator, I want to create, deactivate, and restore Secretariat accounts so that access follows current staffing needs.
- As an Administrator, I want to read Secretariat notes so that operational follow-up remains visible to decision-makers.

### Secretariat

- As a Secretariat user, I want to see applicant and student names, school, and parent contact details so that I can perform family follow-up.
- As a Secretariat user, I want to see only the final approved or rejected result so that I can communicate outcomes without participating in the decision.
- As a Secretariat user, I want to add dated internal observations so that operational context is preserved.
- As a Secretariat user, I want to consult benefactor enrollments submitted through the public donor form so that I can support donor administration.
- As a Secretariat user, I want to download final decisions and approved-applicant contracts already issued by an Administrator so that I can send them to families.
- As a Secretariat user, I must not see financial declarations, applicant evidence, decision rationale, awarded percentages, or decision controls.

## Core Features

### 1. Donor-First Public Hierarchy

The landing page must consistently treat benefactor enrollment as its primary action.

- “Seja um benfeitor” appears before “Solicitar bolsa” in the main navigation.
- The prominent navigation action leads to benefactor enrollment.
- The hero primary action is labeled “Seja um benfeitor” and leads to benefactor enrollment.
- The benefactor content band appears before the scholarship application band.
- Public quick-access links list benefactor enrollment before scholarship applications.
- Scholarship applications remain clearly visible as the secondary action.
- Copy must remain dignified, institutional, and non-commercial.

### 2. Clear Public Addresses

- Benefactor enrollment uses `/seja-um-benfeitor`.
- Scholarship applications use `/solicitar-bolsa`.
- Visitors using `/benfeitor` continue to reach benefactor enrollment.
- Visitors using `/form` continue to reach the scholarship application.
- All institution-owned public links use the new addresses.

### 3. Scholarship Document Uploads

- Test-phase upload warnings and disabled states are removed.
- Every required scholarship document field is available.
- Required documents must be successfully uploaded before the corresponding application can be submitted.
- Applicants receive clear progress, success, removal, validation, and failure feedback.
- Existing upload size and accepted-document constraints remain in effect unless separately approved.
- Donor receipt uploads continue to work without regression.

### 4. Institutional Identity and Contact Corrections

- User-facing pages use the corrected ANSP logo approved in the Open Design references.
- The contact section displays and links to `contato@arcaprovidencia.com.br`.
- The old institutional contact email no longer appears in the executable public experience.
- The public quick-access area no longer contains an administrative-area link.
- The complete “Fraternidade Sacerdotal São Pio X” name remains visible without clipping, overlap, or truncation on desktop and mobile.
- Favicon and generated PDF branding remain unchanged and are outside this initiative.

### 5. Explicit Staff Profiles

The authenticated product supports two profiles.

#### Administrator

Administrators retain access to every existing feature and receive access to:

- Secretariat account creation.
- Secretariat account deactivation.
- Secretariat access restoration or credential reset.
- Secretariat observation history.

Administrators remain the only profile allowed to:

- Approve applications.
- Reject applications.
- Define or change decision details.
- Issue or reissue final decisions.
- Issue or reissue contracts.
- Manage school years, document headers, decision text, and contract templates.
- Access applicant financial declarations and submitted evidence.

#### Secretariat

Secretariat access is limited to explicitly allowed operational capabilities. Any capability not listed as allowed is unavailable.

### 6. Secretariat Operational Application View

For each application, Secretariat users can see:

- Applicant parent or guardian names.
- Student names.
- School.
- Parent telephone and email.
- Final result as approved or rejected.
- Secretariat observation history.
- Final documents already issued by an Administrator.

Secretariat users cannot see:

- Declared income.
- Declared expenses.
- Applicant-uploaded evidence.
- Decision rationale.
- Requested or awarded scholarship percentages.
- Approval or rejection controls.
- Administrative configuration areas.

### 7. Secretariat Observations

- Secretariat observations form a chronological internal history.
- Each entry identifies its author and date.
- Secretariat users can add entries.
- Administrators can read the complete history.
- Observations never appear in applicant-facing pages, decision documents, contracts, or other family communications.
- The interface tells staff to record only concise operational information.

### 8. Secretariat Benefactor View

- Secretariat users can consult benefactor enrollments submitted through “Seja um benfeitor”.
- People merely suggested as potential benefactors inside scholarship applications are excluded.
- The view contains the existing operational donor details required for follow-up.
- Destructive donor management or unrelated administrative capabilities are unavailable unless explicitly approved later.

### 9. Final Document Access

- A final decision becomes available to the Secretariat only after an Administrator issues it.
- A contract becomes available only for an approved application and only after an Administrator issues it.
- Secretariat users can consult and download these documents.
- Secretariat users cannot generate, regenerate, modify, or delete them.
- Applicant-uploaded evidence is never presented as a final document.

## User Experience

### Public Journey

1. A visitor reaches the landing page and sees benefactor enrollment as the primary action.
2. The visitor can understand the institution’s mission and how becoming a benefactor supports it.
3. The visitor can open “Seja um benfeitor” through the primary navigation, hero, benefactor section, or quick access.
4. A family can still find “Solicitar bolsa” as the secondary action.
5. Old saved links continue to lead visitors to the corresponding public flow.

### Secretariat Journey

1. A Secretariat user signs in with an individual account.
2. The user sees only operational sections available to the Secretariat profile.
3. The user locates an application and reviews identity, school, contact, final result, notes, and issued final documents.
4. The user adds a dated internal observation when follow-up occurs.
5. The user downloads an issued decision or contract for family communication.
6. The user cannot reach restricted data or actions through navigation or direct access.

### Administrator Journey

1. An Administrator signs in and retains the complete panel.
2. The Administrator reviews all application evidence and makes the decision.
3. The Administrator issues the relevant final documents.
4. The Administrator can review Secretariat notes.
5. The Administrator manages individual Secretariat accounts.

### UX Requirements

- All interface language remains Brazilian Portuguese.
- Public and staff interfaces work on supported mobile and desktop sizes.
- Keyboard navigation and visible focus remain available.
- Body text maintains accessible contrast.
- Motion respects reduced-motion preferences.
- Role boundaries are communicated through available tasks, not through alarming or accusatory messages.
- Empty, loading, success, and access-denied states provide a clear next action.
- Sensitive information is not used as decorative summary content.
- The corrected logo remains legible and consistent across user-facing pages.
- Footer content wraps naturally without clipping.

## High-Level Technical Constraints

- The product continues using its existing authentication, document-storage, PDF, and public-form capabilities.
- Authorization must follow least privilege and deny access when a capability is not explicitly granted.
- Restrictions apply to every way of accessing a protected capability, not only visible navigation.
- Sensitive family data must follow purpose limitation and data minimization.
- Existing upload size and document-safety boundaries remain mandatory.
- Final issued documents and applicant-submitted evidence must remain distinct categories.
- Existing application statuses remain pending, approved, and rejected.
- Existing legal text and scholarship decision criteria remain authoritative.
- Any page displaying protected information requires an authenticated, authorized user.
- The implementation must preserve existing applicant and donor records.

## Non-Goals

- Changing scholarship eligibility or decision criteria.
- Allowing Secretariat staff to approve or reject applications.
- Giving Secretariat staff access to applicant financial declarations or submitted evidence.
- Giving Secretariat staff access to decision rationale or scholarship percentages.
- Allowing Secretariat staff to issue or edit final documents.
- Sending emails or messages to families directly from the system.
- Adding donor payment processing.
- Adding workflow queues, assignments, notifications, or advanced Secretariat dashboards.
- Redesigning the ANSP brand beyond adopting the corrected approved logo.
- Rewriting legal decision or contract content.
- Changing PDF branding unless it is proven to use the same incorrect shared logo asset.
- Reworking historical Open Design prototypes as production surfaces.
- Removing the administrative login route itself.
- Implementing analytics or conversion experiments.

## Phased Rollout Plan

### MVP — Phase 1: Staff Access Foundation

Included:

- Administrator and Secretariat profiles.
- Individual Secretariat account lifecycle managed by Administrators.
- Explicit capability boundaries.
- Restricted navigation and protected access behavior.

Exit criteria:

- Administrators retain every existing administrative capability.
- Secretariat users cannot access any restricted application data, document category, configuration, or decision action.
- Account creation, deactivation, and access restoration work for Administrators.

### Phase 2: Public Experience and Application Readiness

Included:

- Donor-first landing hierarchy.
- New public addresses and old-link continuity.
- Active scholarship document uploads.
- Corrected logo across user-facing pages.
- New contact email.
- Removal of the public administrative shortcut.
- Responsive FSSPX footer correction.

Exit criteria:

- Every owned public CTA follows the approved hierarchy.
- Both new and old public addresses lead to the expected journeys.
- A complete scholarship application can upload and submit all required documents.
- Brand, contact, and footer acceptance criteria pass on mobile and desktop.

### Phase 3: Secretariat Operational Workflow

Included:

- Restricted application summary.
- Internal observation history.
- Public donor-enrollment view.
- Access to Administrator-issued final decisions and contracts.

Exit criteria:

- Secretariat staff can complete the agreed follow-up journey without exposure to restricted information.
- Administrators can read Secretariat observations.
- Final-document availability follows application outcome and Administrator issuance.
- Role acceptance and privacy review pass before production release.

## Success Metrics

- 100% of primary landing-page actions lead to `/seja-um-benfeitor`.
- 100% of scholarship actions remain visible as secondary actions and lead to `/solicitar-bolsa`.
- 100% of owned public links use the new addresses.
- Both old public addresses continue to reach the corresponding journey.
- 100% of required scholarship document categories can be uploaded and validated.
- No test-phase upload warning appears to applicants.
- 100% of attempts by Secretariat users to access restricted data or actions are denied.
- Zero financial declarations, applicant evidence, decision rationale, or scholarship percentages appear in the Secretariat experience.
- 100% of issued decisions and eligible issued contracts are available for Secretariat download.
- Zero unissued documents are presented as final documents.
- 100% of Secretariat observations include author and date.
- Zero Secretariat observations appear in family-facing documents.
- Zero public executable references use the old institutional email.
- Zero public quick-access links expose the administrative area.
- The full FSSPX name is visible at every supported viewport.
- All user-facing web pages display the approved ANSP logo.
- Administrators can create, deactivate, and restore individual Secretariat access without affecting Administrator accounts.

## Risks and Mitigations

- **Donor emphasis may appear to reduce scholarship availability:** retain a clear secondary scholarship action and preserve the mission explanation.
- **Staff may misunderstand profile boundaries:** use role-specific navigation and concise capability descriptions.
- **Operational notes may accumulate unnecessary sensitive details:** identify notes as internal operational records and provide focused writing guidance.
- **Applicants may need support when uploads become mandatory:** provide specific validation, progress, failure, and retry feedback.
- **Old links may remain in external materials:** preserve visitor continuity and update all institution-owned links.
- **The new mailbox may not be operational at release:** confirm that it can receive messages before publishing the new contact.
- **Logo replacement may be inconsistent between surfaces:** review every user-facing page against the approved source.
- **Footer defects may recur at intermediate widths:** include narrow, intermediate, and wide responsive acceptance checks.

## Architecture Decision Records

- [ADR-001: Adopt a donor-first experience with a safe route transition](adrs/adr-001.md) — Establishes the public hierarchy, new addresses, and coordinated public corrections.
- [ADR-002: Separate Administrator and Secretariat capabilities by job responsibility](adrs/adr-002.md) — Defines the two staff profiles and the Secretariat’s restricted operational scope.

## Open Questions

- Confirm before release that `contato@arcaprovidencia.com.br` can receive institutional messages.
