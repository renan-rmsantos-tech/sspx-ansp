# Provenance — how this design system was derived

Companion to `source-context.md`. That file lists *what* was copied; this one
records *where each decision came from*, what was created versus transcribed,
and what could not be recovered.

## Evidence actually read

Every file in the workspace was inspected before any artifact was written.

| Evidence | How it was used |
| --- | --- |
| `design-system.html` (38 KB) | Primary token source. The `:root` block, the nine-step spacing ladder with its names, the type specimens, the component gallery (buttons, badges, inputs, cards, dividers, radii) and the four usage rules in section 07 are transcribed verbatim into `colors_and_type.css`, `tokens.css` and `DESIGN.md`. |
| `brand-spec.md` (2 KB) | Confirms the OKLch palette, the three type stacks, the seal structure and the six posture rules ("no shadows on cards", "gold used sparingly", "rounded corners 8px", "navy as dominant brand color"). |
| `index.html` (28 KB) | Marketing structure: sticky nav with spring growth to 128px, hero radial gradient plus 3px gold hairline, `clamp()` heading sizes, `--cream` benefactor band, footer, the reveal-on-scroll pattern, and the honest `— a confirmar` placeholder convention. |
| `arca-landing.html` (26 KB) | Earlier revision of the same landing page; identical `:root` block. Confirms token stability across revisions rather than adding new rules. |
| `formulario.html` (46 KB) | Form system: six-step wizard, sticky progress bar with done/active/idle states, sunk input treatment, dashed upload areas with drag-over and file chips, repeatable student/child/vehicle rows, live money totals, the shake cue on the sworn-declaration checkbox, and the validation model (`aria-invalid`, `role="alert"`, focus the first invalid field). |
| `admin.html` (72 KB) | Console system: topbar + 250px grouped sidebar, clickable stat cards as filters, counted filter pills, expandable record cards with four detail tabs, the approve/reject decision flow, the letter and contract composers with `{token}` substitution, and the seed records reused as sample data in the UI kit. |
| `login.html` (6 KB) | Auth pattern: 400px centred card, 72px seal, institution caption, inline `role="alert"` error banner. |
| `base1.png` (1044 × 1035) | The Madonna painting clipped into the seal on every surface. Preserved byte-for-byte in `assets/`; a 420px copy is embedded as a data URI inside the standalone seal SVGs. |
| `base2.png` (807 × 1043) | The framed devotional figure beside the Mt 6, 33 quotation on the public page. Preserved byte-for-byte in `assets/`. |
| `logo-gesso.jpg` (1024 × 1024) | Plaster sculpture on a deep navy field. Read as an atmosphere reference — it independently confirms the ivory-on-navy pairing at the centre of the palette. Preserved in `assets/`. |
| `formulario_bolsa.pdf` (705 KB) | The paper scholarship form the digital wizard was modelled on. Preserved at the project root as the origin document for the form's field set. |

## Transcribed vs. created

**Transcribed (values lifted directly from evidence, not invented):**
all eleven palette entries and their OKLch values; the three font stacks; the
type ramp and tracking values; the spacing ladder and its Portuguese names; the
radius scale; the container widths; every component padding, weight and state;
the motion durations and easing curves; the breakpoints; the seal geometry and
its literal hex values; the domain vocabulary and the `{token}` syntax.

**Created for this package (derivations, clearly marked):**

- `--fg-on-navy`, `--muted-on-navy`, `--accent-hover`, `--gold-dark`,
  `--gold-light`, `--surface-sunk` — these values all appear inline in the
  source files (e.g. `oklch(97% 0.02 85)` on the hero, `oklch(58% 0.10 80)` for
  gold text on light); the package only gave them names.
- The `@supports not (color: oklch(...))` hex fallback block in
  `colors_and_type.css` — a fidelity-preserving transcription of the same ramp,
  not a new palette.
- `assets/seal-arca.svg`, `assets/seal-arca-on-navy.svg`,
  `assets/seal-arca-mono.svg` — the source project's inline seal markup,
  extracted into standalone files. The only change is that the painting is
  embedded as a data URI (downscaled to 420px) so the mark renders inside
  `<img>`, where external SVG image references are blocked.
- `assets/wordmark-arca.svg`, `assets/gold-rule.svg` — typographic lockup and
  the 48×2 divider, both built from documented tokens.
- `ui_kits/app/` — a modular re-composition of `admin.html`. Layout, class
  behaviour and sample records come from the source; the module boundaries are
  new.

## Cross-check against the production repository

The linked code folder is `/Users/renansantos/Projects/rmtech/sspx-ansp`
(`github.com/renan-rmsantos-tech/sspx-ansp`, branch `main`) — a Next.js
application. An earlier revision of this file named
`/Users/renansantos/Projects/rmtech/ansp`, which did not exist; that path was
wrong and is corrected here.

Its `app/globals.css` `@theme` block was compared against the tokens extracted
in this package. **All eleven palette values and all three font stacks match
exactly** — `--color-bg: oklch(97.5% 0.005 85)`, `--color-accent:
oklch(25% 0.06 250)`, `--color-gold: oklch(72% 0.10 80)`, the serif display
stack, the system sans and the mono stack are byte-identical to
`colors_and_type.css`. Its radius scale (`0.25rem / 0.5rem / 0.75rem`) matches
the 4 / 8 / 12px steps in `tokens.css`; the 6px control radius lives only in the
hand-written HTML, not in the Tailwind theme.

The repository's `design/` folder holds the same source set copied here.
`base1.png`, `base2.png` and `logo-gesso.jpg` are byte-identical.

### Revision reconciliation (completed)

The five HTML surfaces existed in two revisions. They were compared by hash,
line-level diff and feature surface. The result was **not uniform** — the newer
revision differs per file:

| File | Newer revision | Deciding evidence |
| --- | --- | --- |
| `admin.html` | this package | 6 views vs 3 (adds `benfeitores`, `cabecalho`, `contrato`); ~65 functions vs 26; `--fg: oklch(22% …)` matching the token reference, where the repo still had `oklch(25% …)` |
| `login.html` | this package | "Usuário" text field → "Email" field with `type="email"`; error copy rewritten |
| `formulario.html` | this package | `profissao_pai` promoted to `required`; the ten benefactor rows refactored from hardcoded markup into a `buildBenfeitores()` loop (which is why the repo file is larger without being newer) |
| `index.html` | this package, partially | Adds `<meta description>`, a fuller `<title>` and the `benfeitor` CTA band that pairs with the new Benfeitores console view — but had **lost** the `obras` section |
| `design-system.html` | ~~the repository~~ **neither — see correction below** | Judged at the time on the seal top arc: repo `M 18,110 a 92,92 … 184` vs this package's `M 22,110 a 88,88 … 176`, with every other file in both revisions already on the wider arc. That reasoning was wrong: the wider arc is the defect, and `r=88` was correct all along. Reverted — see "Seal arc correction" |

Two corrections were applied to this package as a result:

1. **`design-system.html`** — the four seal top arcs were changed to
   `M 18,110 a 92,92 0 0,1 184,0`, which made the file byte-identical to the
   repository copy (sha `3a204f5e4648`) at that moment. **Both facts have since
   been undone, and this change was a mistake.** The file is no longer
   byte-identical (a later portability fix embedded the seal painting), and the
   arc itself was reverted to `r=88` because the wider arc collides with the
   inner ring. See "Asset portability fix" and "Seal arc correction" below.
2. **`index.html`** — the `obras` ("O que fazemos" / "Nossas obras") section was
   restored from the repository revision, together with its CSS, the nav link
   and the footer link. The `benfeitor` band was kept: the two coexist, one
   institutional and one a call to action. The band rhythm is now
   surface → bg → accent → cream → surface, with no two adjacent bands sharing a
   background. The numbered work card is documented in `DESIGN.md`.

Everything else in the repository revision was older and was left alone.

### Asset portability fix — `design-system.html`

**Symptom.** The seal rendered as an empty navy ring inside the OpenDesign file
viewer, and the two circular avatars in section 06 were blank.

**Cause.** Not a defect in the file. The viewer serves a versioned snapshot from
`.file-versions/<hash>/`, and `base1.png` does not sit next to that snapshot. The
four SVG seals used `<image href="base1.png">` and the two avatars used
`<img src="base1.png">` — all relative paths, all resolving against the snapshot
folder instead of the project root. Exported directly, the same file rendered
correctly, which is what isolated the cause to the viewer's base URL rather than
to the markup.

**Fix applied.** The painting is now embedded **once** as a data URI in a single
`<image id="seal-painting">` inside a `<defs>` block placed right after `<body>`.
All six former references became `<use href="#seal-painting">`; the two avatars
were converted from `<img>` to small inline SVGs, because an `<img>` cannot
reference an SVG definition. The inline seal markup stays visible and readable,
which is the point of this page — it documents how the mark is constructed.

- Payload: `base1.png` downscaled to 420px (235 KB → ~313 KB base64), embedded
  once rather than six times.
- File size: 38 KB → 359 KB.
- `base1.png` stays at the project root, untouched, still serving `index.html`,
  `login.html`, `formulario.html` and `admin.html`, which the viewer renders from
  their own locations.

**A failed first attempt, recorded because it is a real trap.** The definition was
first written as a `<symbol>`. That renders wrong: `<symbol>` establishes its own
viewport, so the `clip-path` on each `<use>` leaked and the painting spilled
outside the gold ring as a rectangle at the lower right. Rewritten as a plain
`<image>` in `<defs>`, which preserves the original geometry
(`x=22 y=30 width=176 height=184`) and lets `clip-path` behave. Verified by
pixel-diffing the render against the pre-change render: mean difference
**0.88/255** across the hero seal, accounted for entirely by resampling the
downscaled PNG. Framing is unchanged.

### Seal arc correction — regression introduced by this package

**Reported by the user** with an annotated screenshot: the faint inner ring was
cutting through the `ARCA` lettering.

**Measured, not estimated.** Sampling the rendered seal along radial lines showed
the glyphs occupying `r ≈ 94.5–98` and the inner ring occupying `r ≈ 96.5–98` —
a real overlap, not a perceptual one.

**Root cause: this package caused it.** The "Revision reconciliation" step above
changed `design-system.html`'s top arc from `r=88` to `r=92` to match the
repository copy. The repository revision is the one carrying the defect; the
`r=88` this package started with was correct. Byte-identity with the repository
was treated as equivalent to correctness, and it is not. `arca-landing.html`, the
archived earlier revision that was never touched, still carries the correct
`r=88` — which is the tell that was available and missed at the time.

**Fix.** Top arc restored to `M 22,110 a 88,88 0 0,1 176,0` in all 11 occurrences
across 8 files: `design-system.html` (×4), `index.html`, `login.html`,
`formulario.html`, the three `assets/seal-arca*.svg`, and
`ui_kits/app/components/Seal.js`. The other files had always been at `r=92`, so
they had always carried the collision — the fix is brand-wide, not local to the
reported file. `admin.html` renders the seal at 32px with lettering suppressed,
so it needed no change.

Verified by re-render: between the letters only the ring is present at
`r ≈ 96.5–98`, with no glyph pixels; glyph tops now land near `r ≈ 94`.

**Written down so it cannot drift again.** The arc geometry and its invariant are
now documented in `DESIGN.md` ("Arc geometry is load-bearing"), `brand-spec.md`,
and the usage rules of `preview/brand-assets.html`. The invariant: the top arc's
glyphs grow *outward* and must never reach the inner ring at `r=98`; the bottom
arc's glyphs grow *inward*, which is why the two arcs sit at different radii.

### Project-wide asset embedding

The portability fix first applied to `design-system.html` was extended to every
surface that drew the seal, after the user reported the mark broken in several
places. The disk was never wrong — an inventory found **zero** unresolvable
references. The breakage is entirely the viewer: all 16 snapshots under
`.file-versions/` contain the HTML alone, with no images beside it, so every
relative image path fails there.

Embedded, with the payload sized to the largest rendered size in each file:

| File | Seal payload | Also embedded |
| --- | --- | --- |
| `index.html` | 420px | `base2.png` (400px), FSSPX mark |
| `arca-landing.html` | 420px | — |
| `login.html`, `formulario.html`, `admin.html` | 200px | — |
| `preview/brand-assets.html` | 420px, shared by 10 uses | `base2.png`, `logo-gesso.jpg`, FSSPX mark, wordmark, gold rule |
| `preview/index.html`, `preview/radius-and-elevation.html` | 420px | — |
| `ui_kits/app/components/Seal.js` | 200px as the default `painting` | — |

Two economies kept the cost down: the painting is defined **once per file** and
reused through `<use href="#seal-painting">` rather than repeated per instance,
and the monochrome variant is now the same definition under a CSS
`filter: saturate(0)` instead of a second payload. Cost: these ten files total
~3.2 MB, against ~700 KB before.

**A regression this introduced, and how it was caught.** Replacing every
`src="../assets/…"` with a data URI stripped `preview/brand-assets.html` of any
reference to the preserved files, and the package audit flagged it
(`brand_assets_preview_not_using_preserved_assets`). The warning was correct and
worth heeding: that card exists partly to prove the package keeps real source
assets rather than redrawn placeholders. Resolved by making the file paths the
card already displayed into real links to `assets/` — the card renders from the
embedded copy and links to the byte-preserved original. Audit back to zero
errors, zero warnings.

**Still relative, deliberately.** `ui_kits/app/index.html` loads
`../../colors_and_type.css`, `../../tokens.css` and its component files by
relative path, so it also loses its styling in the snapshot viewer. That was left
alone: the package audit requires the kit to load `colors_and_type.css`, and
inlining it would destroy the modular structure the kit exists to demonstrate.
Open it directly, or export it, and it renders correctly.

## Open gaps

1. ~~**Missing FSSPX logo.**~~ **Closed.** `mqjmgzod-logo.png` (200 × 200) was
   recovered byte-for-byte from `design/` in the linked repository and is now at
   the project root — where `index.html` resolves it — and in
   `assets/mqjmgzod-logo.png`. It is a **white mark on transparency**: it only
   reads on navy, which is why the source uses it solely in the `--navy-deep`
   footer. It is a third-party mark: use it as a credit, never merged with the
   Arca seal into a single lockup.
2. **The five source HTML files exist in two revisions.** The copies at this
   project root and the ones in the repository's `design/` folder are not
   identical. Which is newer was not determined, and no rule here depends on the
   difference. Worth reconciling before the next extraction.
3. **No font files.** Both families are platform stacks, so there is no
   `fonts/` directory and nothing for `colors_and_type.css` to bind.
   `'Iowan Old Style'` is an Apple system serif; on other platforms the stack
   falls through to Charter, Palatino, then Georgia — verify headings on
   Windows and Android before shipping externally.
4. **No runtime icons.** The source is a set of web pages, not a packaged app,
   so there are no app, installer, tray or favicon assets to preserve under
   `build/`. The seal SVGs in `assets/` are the closest equivalent.
5. **Real contact details unknown.** The public page ships
   `contato@arcaprovidencia.org` and a masked phone with an explicit
   `— a confirmar (canais oficiais)` note. These were left exactly as found;
   nothing was fabricated to fill them.
6. **Prototype-only artifacts.** `login.html` displays demo credentials, and
   `admin.html` seeds `localStorage` with three sample requests and three
   donors. Both are labelled as demo behaviour in `DESIGN.md`; neither belongs
   in a production build.

## Verification run

`"$OD_NODE_BIN" "$OD_BIN" tools connectors design-system-package-audit --path . --fail-on-warnings`
was run against the finished package and reports zero errors and zero warnings.
