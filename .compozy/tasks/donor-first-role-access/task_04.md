---
status: pending
title: Apply the donor-first public experience
type: frontend
complexity: high
dependencies: []
---

# Task 4: Apply the donor-first public experience

## Overview

Transform the public experience into a coherent donor-first journey while keeping scholarship applications clearly available as the secondary action and preserving old links through permanent redirects. Correct the public identity, contact, and footer by adopting the approved shared web seal without changing favicon or PDF branding.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. `/seja-um-benfeitor` and `/solicitar-bolsa` MUST be the canonical implementations for donor enrollment and scholarship application.
2. `/benfeitor` and `/form` MUST return direct HTTP 308 redirects to their respective canonical paths without redirect chains.
3. The canonical scholarship page MUST preserve `force-dynamic` and active-school-year behavior.
4. Every institution-owned executable public link MUST use the canonical routes; old paths may remain only in redirect definitions and tests.
5. “Seja um benfeitor” MUST precede “Solicitar bolsa” in primary navigation and quick access.
6. The highlighted navigation CTA and hero primary CTA MUST say “Seja um benfeitor” and target `/seja-um-benfeitor`.
7. Scholarship application MUST remain visible as the secondary action and target `/solicitar-bolsa`.
8. The benefactor band MUST precede the scholarship band in document order.
9. Displayed contact text and `mailto` MUST be exactly `contato@arcaprovidencia.com.br`; the old address MUST disappear from executable public UI.
10. Public quick access MUST NOT contain an administrative-area link; the login route itself remains unchanged.
11. “Fraternidade Sacerdotal São Pio X” MUST remain complete and unclipped at 320, 768, 1024, and 1440 CSS pixels.
12. The approved master SVG MUST become the single web-page seal asset consumed by `SealLogo`.
13. `SealLogo` MUST support caller sizing/classes and both decorative and informative accessible semantics.
14. Landing, canonical public pages, login, and admin web surfaces MUST use the shared seal; duplicated executable inline seals MUST be removed.
15. `app/icon.svg` and `lib/pdf/seal-image.ts` MUST remain unchanged.
16. Copy MUST remain pt-BR, dignified, welcoming, and institutional, without artificial urgency, guilt, gamification, or commercial language.
17. Keyboard navigation, visible focus, text contrast, and reduced-motion behavior SHOULD preserve existing standards.
</requirements>

## Subtasks

- [ ] 4.1 Establish both canonical routes and exact permanent redirects from legacy URLs.
- [ ] 4.2 Update owned public links and metadata to canonical addresses.
- [ ] 4.3 Reorder navigation, hero, content bands, and quick access so benefactor is primary and scholarship secondary.
- [ ] 4.4 Replace the institutional email and remove the public administrative shortcut.
- [ ] 4.5 Publish the approved master seal and consolidate accessible web usage.
- [ ] 4.6 Correct responsive FSSPX footer layout at every supported width.
- [ ] 4.7 Cover routes, hierarchy, contact, footer, accessibility, and identity with automated and rendered verification.

## Implementation Details

Follow the TechSpec sections “Public Route Layer,” “Landing and Public Content,” and “Logo Consolidation.” Validate donor-first hierarchy through real DOM order, not visual positioning alone. Preserve the scholarship page's dynamic declaration at its canonical route.

Use the approved `docs/design/opendesign/assets/seal-arca-master.svg` without redrawing its geometry. `SealLogo` must distinguish decorative and informative instances to avoid duplicate accessible names. The footer acceptance requires rendered evidence because class inspection alone cannot prove the absence of clipping.

The user-approved five-task limit makes this a broad public-experience task. Keep it coherent by centralizing route redirects and the seal source rather than duplicating implementation across surfaces.

### Relevant Files

- `app/page.tsx` — Landing hierarchy, public links, contact, quick access, and FSSPX footer.
- `app/solicitar-bolsa/page.tsx` and layout — Canonical dynamic scholarship entry and metadata.
- `app/seja-um-benfeitor/page.tsx` — Canonical donor entry and metadata.
- `app/form/page.tsx` and `app/benfeitor/page.tsx`, or equivalent central route configuration — Permanent legacy redirects.
- `components/ui/seal-logo.tsx` — Shared web seal and accessibility contract.
- `public/seal-arca.svg` — Executable copy of the approved master.
- `__tests__/public-experience.test.tsx` — Consolidated route, landing, identity, and semantic coverage.

### Dependent Files

- `app/form/layout.tsx` — Current inline scholarship seal and layout reused by the canonical flow.
- `app/benfeitor/_components/donor-form.tsx` — Existing donor form reused by the canonical page.
- `app/form/_actions/form-actions.ts` — Active-school-year source for the canonical scholarship page.
- `app/login/login-form.tsx` — Existing `SealLogo` consumer that must remain correct.
- `app/admin/_components/topbar.tsx` and `app/admin/cabecalho/client.tsx` — Existing shared-seal consumers.
- `app/globals.css` — Executable design tokens and accessibility standards.
- `docs/design/opendesign/assets/seal-arca-master.svg` — Approved source asset.
- `app/icon.svg` and `lib/pdf/seal-image.ts` — Explicitly excluded from modification.

### Related ADRs

- [ADR-001: Adopt a donor-first experience with a safe route transition](adrs/adr-001.md) — Defines the integrated public hierarchy.
- [ADR-006: Make descriptive public routes canonical with permanent legacy redirects](adrs/adr-006.md) — Defines canonical URLs and HTTP 308 behavior.
- [ADR-008: Use one approved seal asset across web pages](adrs/adr-008.md) — Defines the shared master and favicon/PDF exclusion.

## Deliverables

- Canonical `/seja-um-benfeitor` and `/solicitar-bolsa` routes.
- Exact HTTP 308 redirects from both legacy routes.
- Donor-first navigation, hero, content order, and quick access with scholarship retained as secondary.
- Updated public email and removal of the administrative shortcut.
- FSSPX footer without clipping at all acceptance widths.
- Approved shared web seal with correct accessible semantics.
- Favicon and PDF seal preserved unchanged.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for canonical routes, redirects, hierarchy, and responsive branding **(REQUIRED)**.

## Tests

- Unit tests — routes and landing:
  - [ ] Canonical scholarship renders open and unavailable states and retains `force-dynamic`.
  - [ ] Canonical donor page renders institutional content and the donor form.
  - [ ] `/form` and `/benfeitor` return 308 with exact direct destinations and no loop.
  - [ ] Canonical metadata describes the correct flow.
  - [ ] Benefactor precedes scholarship in navigation, content bands, and quick access DOM order.
  - [ ] Navigation and hero primary CTAs target `/seja-um-benfeitor`; the visible secondary scholarship action targets `/solicitar-bolsa`.
  - [ ] No owned public link uses an old route or exposes `/admin` in quick access.
- Unit tests — contact, footer, and identity:
  - [ ] Contact text and `href` use `contato@arcaprovidencia.com.br`; the old email is absent.
  - [ ] The full FSSPX name is present without truncation-related styles.
  - [ ] `public/seal-arca.svg` matches the approved master.
  - [ ] `SealLogo` respects caller size/class and exposes correct informative or decorative semantics.
  - [ ] Executable public surfaces contain no obsolete inline seal.
  - [ ] `app/icon.svg` and `lib/pdf/seal-image.ts` remain outside the task diff.
- Integration tests:
  - [ ] Next runtime returns both exact 308 responses and canonical pages without intermediate hops.
  - [ ] Production build confirms the scholarship page remains dynamic.
  - [ ] Menu, hero, content bands, and quick access navigate only to canonical routes.
  - [ ] At 320, 768, 1024, and 1440 pixels, FSSPX text remains fully visible with no overlap or horizontal scroll.
  - [ ] At the same widths, primary and secondary CTAs remain ordered, legible, and keyboard-focusable.
  - [ ] Reduced-motion mode preserves visible content and disables non-essential choreography.
  - [ ] Landing, public flows, login, and admin display the same approved seal.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing.
- Test coverage >=80%.
- Every primary public CTA leads to `/seja-um-benfeitor`.
- Every scholarship action leads to `/solicitar-bolsa` and remains clear but secondary.
- Both legacy URLs return exact permanent redirects.
- No executable public reference uses the old email or public administrative shortcut.
- The full FSSPX name is visible at all required widths.
- Every web surface uses the approved shared seal with correct semantics.
- Favicon and PDF branding remain unchanged.
