# Arca N. S. da Providência — Open Design Reference Package

A reusable design-system package extracted from the Open Design project **ASNP**
(`071550ea-25cd-4c86-aa7d-5461445b8494`). Everything here is read off the real
surfaces that project shipped — nothing was invented to fill a section.

Start with `preview/index.html`. This package is a visual reference and implementation handoff, not the runtime source of truth: production tokens and components remain in `app/globals.css`, `app/` and `components/`; the durable contracts are [`PRODUCT.md`](../../../PRODUCT.md), [`DESIGN.md`](../../../DESIGN.md) and [`COPY.md`](../../../COPY.md).

## Product Overview

Arca Nossa Senhora da Providência is a Catholic educational-assistance
association — the *mantenedora* behind Colégio São José and sister schools, tied
to the FSSPX apostolate. The product it ships is the scholarship pipeline, and
the ASNP project built all of it as plain HTML, CSS and vanilla JavaScript.

The application supports two audiences with one visual language. Families meet a
public marketing site and a six-step *bolsa de estudos* request form: household
and student data, document uploads, income and expense declarations, benefactor
referrals, and a sworn-declaration gate before submission. The scholarship
commission works an admin console that provides clickable status counters, live
search and filtering, expandable request records with four detail tabs, an
approve/reject decision flow with granted-discount capture, and template editors
that compose decision letters and concession contracts from tokens like
`{nome_pai}` and `{ano_letivo}`. A login card guards the console.

The system's personality does not change between those audiences — only its
density does.

## Source Context

- **Source project:** ASNP (`071550ea-25cd-4c86-aa7d-5461445b8494`), Open Design.
- **Evidence manifest:** `context/source-context.md` (copied by the intake step).
- **Provenance and gaps:** `context/provenance.md` — where each rule came from,
  and what could not be recovered.
- **Linked repository:** `/Users/renansantos/Projects/rmtech/sspx-ansp`
  (`github.com/renan-rmsantos-tech/sspx-ansp`, branch `main`) — the Next.js
  application. Its `app/globals.css` `@theme` block was cross-checked against
  this package: **all eleven palette values and all three font stacks match
  exactly**, and its radius scale matches the 4 / 8 / 12px steps. The extraction
  is confirmed against production, not only against the copied HTML.

Preserved source surfaces, at the project root, exactly as copied:

| File | Role |
| --- | --- |
| `index.html` | Public marketing site (current) |
| `arca-landing.html` | Earlier landing revision — same token block |
| `formulario.html` | Six-step scholarship request form |
| `admin.html` | Admin console (requests, benefactors, year, letter/contract editors) |
| `login.html` | Admin login card |
| `design-system.html` | The hand-written token/specimen/component reference |
| `brand-spec.md` | Palette, type stacks and posture rules written by the source project |
| `formulario_bolsa.pdf` | The paper form the digital wizard was modelled on |

## Package Contents

| Path | What it is |
| --- | --- |
| `DESIGN.md` | Exported design-system rules for this reference package |
| `README.md` | This guide |
| `SKILL.md` | Agent-facing instructions for building with the system |
| `colors_and_type.css` | Color and typography foundations — OKLch tokens, hex fallbacks, type ramp, tracking scale |
| `tokens.css` | Spacing ladder, radius, borders, elevation, containers, breakpoints, motion |
| `assets/` | Preserved brand assets: the three seal variants, the two devotional paintings, the plaster reference, the wordmark and the gold rule |
| `preview/` | Eleven focused review cards (see the manifest below) |
| `ui_kits/app/` | The applied console kit — `index.html` plus seven modular component files |
| `context/` | Source manifest and provenance notes |

Notes on preserved artifacts:

- **Brand files in `assets/` are source-backed, not redrawn.**
  `assets/base1.png`, `assets/base2.png` and `assets/logo-gesso.jpg` are
  byte-for-byte copies of the originals. `assets/seal-arca.svg`,
  `assets/seal-arca-on-navy.svg` and `assets/seal-arca-mono.svg` are the source
  project's inline seal markup extracted into standalone files, with the
  painting embedded as a data URI so the mark also renders inside `<img>`.
  `assets/wordmark-arca.svg` and `assets/gold-rule.svg` are built from
  documented tokens.
- **No `fonts/` directory.** The system uses platform font stacks only
  (`'Iowan Old Style' … serif` and `-apple-system … sans-serif`); no font files
  exist in the evidence, so there is nothing to keep or to bind in
  `colors_and_type.css`.
- **No `build/` directory.** The source project ships no app, installer or tray
  icons — it is a set of web pages, not a packaged runtime. The seal files in
  `assets/seal-arca.svg` and its variants are the closest runtime equivalent.

## Preview Manifest

Eleven cards, each loading `../colors_and_type.css` and `../tokens.css` so the
swatches and specimens are the real tokens, not screenshots of them.

| Card | Inspect |
| --- | --- |
| `preview/index.html` | Launcher — the recommended reading order |
| `preview/brand-assets.html` | **Start here.** Seal variants, sizes in use, clear space, and the preserved paintings from `assets/` |
| `preview/applied-surfaces.html` | **Then here.** The five preserved source files running live in iframes |
| `preview/colors-brand-core.html` | Surfaces, text, navy and gold, valid pairings, derivation rule |
| `preview/colors-status-semantics.html` | Pendente / aprovada / rejeitada, pills, stat cards, destructive form |
| `preview/typography-specimens.html` | Three stacks, thirteen roles, tracking and measure |
| `preview/spacing-tokens.html` | The nine-step ladder, applied paddings, container widths |
| `preview/radius-and-elevation.html` | Radius scale, control-inside-card nesting, focus rings, the one shadow |
| `preview/components-buttons.html` | Five variants, three sizes, states, decision actions, secondary controls |
| `preview/components-forms.html` | Step bar, sunk fields, inline errors, dashed uploads, repeatable rows, totals |
| `preview/components-records.html` | Toolbar, counted filter pills, expanded request card with four tabs, empty state |

## Review Workflow

1. Open `preview/index.html` and start with **brand assets**, then **applied
   surfaces** — those two prove the package is grounded in real files rather
   than a redraw.
2. Walk the foundation cards (color → typography → spacing → radius) to check
   the tokens against `colors_and_type.css` and `tokens.css`.
3. Walk the component cards to check behaviour and states.
4. Open `ui_kits/app/index.html` and actually use it: filter, search, expand a
   request, approve one, edit a decision-letter template.
5. Read `DESIGN.md` last — particularly the anti-patterns list, which is the
   part most likely to be violated by a future build.

To reuse the system in a new artifact: copy `colors_and_type.css`, `tokens.css`
and `assets/` into the project, load the two stylesheets in that order, then
compose from `ui_kits/app/components/` or follow the component specs in
`DESIGN.md`. Never introduce a new hex value — derive with `oklch()` or
`color-mix()` from the existing tokens.

## Known gaps

- **FSSPX logo — resolved.** `mqjmgzod-logo.png` was recovered byte-for-byte
  from the linked repository's `design/` folder. It now sits at the project root
  (where `index.html` resolves it) and in `assets/mqjmgzod-logo.png`. It is a
  white mark on transparency, so it only reads on navy — that is why the source
  uses it solely in the footer.
- **Two revisions of the source HTML — reconciled.** The five surfaces were
  compared against the repository's `design/` folder file by file. This package
  held the newer `admin.html`, `login.html` and `formulario.html`; the repository
  held the newer `design-system.html` (seal arc geometry), now merged in. The
  `obras` section that this revision of `index.html` had lost was restored
  alongside the `benfeitor` band. Full comparison table in
  `context/provenance.md`.
- Contact details on the public site are honest placeholders
  (`— a confirmar (canais oficiais)`), matching the source. They are not
  fabricated here and should not be fabricated later.
