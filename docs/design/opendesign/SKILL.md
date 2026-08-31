---
name: arca-nsp-design-system
description: Institutional Catholic design system extracted from the ASNP project — warm-paper canvas, dominant navy, rationed gold, serif display over system sans, border-led surfaces with no shadows. Use when building marketing pages, multi-step forms, admin consoles or printed documents for Arca N. S. da Providência and its schools.
user-invocable: true
---

# Arca N. S. da Providência — Design System Skill

Build anything for the Arca — a public page, a request form, an admin console, a
PDF header — and it should look like it came from the same house. This skill
carries the tokens, the components and the rules that make that true.

## What's inside

- `colors_and_type.css` — color and typography foundations: OKLch tokens with a
  hex fallback block, the display/body/mono stacks, a thirteen-role type ramp,
  and the tracking scale.
- `tokens.css` — the nine-step spacing ladder, radius scale, border weights,
  focus rings, container widths, breakpoints and motion durations.
- `assets/` — the three sanctioned seal variants, the two devotional paintings,
  the plaster reference image, the wordmark and the gold rule.
- `preview/` — eleven focused review cards, each running the real tokens.
- `ui_kits/app/` — a working console assembled from seven modular components
  (`App.js`, `Sidebar.js`, `StatBoard.js`, `RequestCard.js`, `DecisionPanel.js`,
  `Composer.js`, `Seal.js`).
- `DESIGN.md` — the full rules, ending in a fifteen-item anti-pattern list.

## Source context

Extracted from the Open Design project **ASNP**
(`071550ea-25cd-4c86-aa7d-5461445b8494`). The evidence is five real HTML
surfaces (`index.html`, `formulario.html`, `admin.html`, `login.html`,
`design-system.html`), a `brand-spec.md`, the original paper form as PDF, and
four brand images. All of them are preserved in this package. The tokens were
then cross-checked against the production Next.js application at
`github.com/renan-rmsantos-tech/sspx-ansp`: its `app/globals.css` `@theme` block
carries the same eleven palette values and the same three font stacks, so this
system matches what ships. See `context/provenance.md` for the full trail and
the remaining open items.

## When to use this skill

Use it when building or reviewing any artifact for the Arca or its schools:
public marketing pages, the scholarship request flow, the commission's admin
interfaces, login and account surfaces, printed or PDF documents (decision
letters, concession contracts, document headers), and internal prototypes that
should read as production.

Do **not** reach for a generic web aesthetic here. The institutional serif, the
warm paper canvas and the shadowless border-led surfaces are the identity; a
default SaaS card with a drop shadow and a purple gradient is a defect.

## How to use

1. Paste the contents of `colors_and_type.css` into the first `<style>` block
   (or link it), then `tokens.css`. Load them in that order.
2. Read the relevant section of `DESIGN.md` before writing markup — the
   component specs are precise (paddings, radii, weights, states).
3. Copy component shapes from `ui_kits/app/components/` rather than reinventing
   them. Open `ui_kits/app/index.html` to see them composed and working.
4. Pull brand marks from `assets/` — never redraw the seal. Use
   `seal-arca.svg` on light, `seal-arca-on-navy.svg` on navy,
   `seal-arca-mono.svg` for single-colour output.
5. Check the result against `preview/` — the cards are the acceptance criteria
   for color, type, spacing and component fidelity.
6. Finish by re-reading the anti-patterns section of `DESIGN.md`.

There is no `fonts/` directory and no `build/` directory: the type stacks are
platform fonts, and the source project ships no runtime icons.

## Design system highlights

- **Color.** Warm-paper `--bg` `oklch(97.5% 0.005 85)`, white `--surface`, deep
  navy `--accent` `oklch(25% 0.06 250)` as the *dominant* brand colour, and a
  single gold `--gold` `oklch(72% 0.10 80)` limited to two appearances per
  screen. Gold as text on light surfaces must use `--gold-dark`. Status colours
  are semantic only: warn = pendente, success = aprovada, danger = rejeitada.
- **Typography.** Serif display (`'Iowan Old Style', 'Charter', 'Palatino',
  Georgia, serif`) for every heading, stat value and document title; system sans
  for all product text; mono for IDs, money masks and `{tokens}`. Weight 550 is
  load-bearing for labels; ALL CAPS never below `0.06em` tracking.
- **Spacing and layout.** `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 80`, nothing
  between. Containers: 1120 marketing / 940 console / 720 form / 400 login /
  250 sidebar. Real re-layouts at 860px, 880px and 560px — never a squeezed
  desktop grid.
- **Radius and shadows.** 4 chips → 6 controls → 8 cards → 12 editorial → pill.
  Controls are always one step tighter than their card. **Cards get no shadow**;
  the only `drop-shadow` in the system lifts the seal off the navy hero.
- **Icons and interaction.** Line icons at 1.6–2 stroke in `currentColor`, never
  emoji. Hover 0.15s, `:active` nudges 1px, focus is a visible gold ring,
  `prefers-reduced-motion` is honoured in every file, and errors are announced
  with `aria-invalid` plus `role="alert"`, not just coloured.
