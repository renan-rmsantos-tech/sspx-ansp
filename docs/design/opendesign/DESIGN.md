# Arca N. S. da Providência — Design System

> Category: Project Design System · Surface: web
> Generated from Open Design project **ASNP** (`071550ea-25cd-4c86-aa7d-5461445b8494`).

Institutional, print-adjacent, border-led. Navy carries the brand, gold is
rationed, the serif carries authority and the system sans carries the work.

Derived from the ASNP surfaces: a public marketing site, a six-step scholarship
application, an admin console, a login card, and a hand-written design-system
page — all plain HTML/CSS/vanilla JS, all sharing one `:root` token block.

---

## Product Context

**Arca Nossa Senhora da Providência** is a Catholic educational-assistance
association (the *mantenedora* behind Colégio São José and sister schools, tied
to the FSSPX apostolate). The product it ships is the scholarship pipeline:
families ask for a *bolsa de estudos*, a commission reviews the household's
finances and documents, and the association issues a decision letter and a
concession contract.

Five real surfaces make up the system, and every rule below is read off them:

| Surface | Source file | What it establishes |
| --- | --- | --- |
| Public site | `index.html`, `arca-landing.html` | Navy hero band, 300px seal, gold kickers, editorial pull-quotes, CTA bands, footer with FSSPX credit |
| Application | `formulario.html` | Six-step wizard, sticky progress bar, dashed upload areas, repeatable child/student/vehicle rows, live money totals, sworn-declaration gate |
| Admin console | `admin.html` | Topbar + 250px sidebar, clickable stat cards, filter pills, expandable request cards with four detail tabs, approve/reject decision forms, letter and contract composers |
| Auth | `login.html` | 400px centred card, seal + institution caption, inline error banner |
| Token reference | `design-system.html` | The canonical palette, type specimens, spacing ladder, component gallery and usage rules |

Two audiences, one visual language: **families** meet the marketing and form
surfaces on phones and need warmth, legibility and reassurance; the
**commission** works the console on desktop and needs density, status clarity
and irreversible-action safety. The system does not change personality between
them — it changes density.

**Domain vocabulary to preserve.** *solicitação*, *benfeitor*, *ano letivo*,
*bolsa*, *desconto solicitado* vs *desconto concedido*, *comissão avaliadora*;
statuses `pendente` / `aprovada` / `rejeitada`; donation frequencies `mensal` /
`unica`; and the `{nome_pai}` `{nome_mae}` `{escola}` `{aluno}` `{desconto}`
`{data}` `{motivo}` `{ano_letivo}` `{responsavel}` token syntax used by the
decision-letter and contract composers.

---

## Color

A warm-paper canvas, a single deep navy, a single gold. Full values live in
`colors_and_type.css`; the semantics live here.

### Surfaces
| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `oklch(97.5% 0.005 85)` | Page background. Warm, never pure white, never beige. Also the *input* background — fields sit **into** the page. |
| `--surface` | `oklch(100% 0 0)` | Cards, panels, topbar, sidebar. Pure white only on top of `--bg`. |
| `--cream` | `oklch(92% 0.03 85)` | Warm highlight blocks: pull-quotes, benefactor band, token cheat-sheets, decision forms, preview boxes. |
| `--border` | `oklch(90% 0.008 85)` | Every divider, every card edge. One weight, one value. |

### Text
`--fg` `oklch(22% 0.06 250)` for primary copy — a navy-tinted near-black, never
neutral grey. `--muted` `oklch(48% 0.03 250)` for labels, meta rows and
secondary copy. On navy bands step up to `--fg-on-navy` `oklch(97% 0.02 85)` for
headlines and `--muted-on-navy` `oklch(84% 0.025 250)` for body.

### Brand
- `--accent` `oklch(25% 0.06 250)` — **navy is the dominant brand colour**, not
  an accent in the usual sense. It fills the hero, the CTA band, the footer,
  primary buttons, active nav pills and the seal's ring.
- `--gold` `oklch(72% 0.10 80)` — rationed. Permitted uses: the seal, the 48×2
  gold divider, section kickers, gold CTAs, focus outlines, and the hairline
  under the sticky nav. **Maximum two gold moments per screen.**
- `--gold-dark` `oklch(58% 0.10 80)` is the gold for *text on light surfaces*;
  raw `--gold` fails contrast there and must not be used for copy.

### Status
`--success` (aprovada), `--warn` (pendente), `--danger` (rejeitada), each with a
`-light` companion for pill fills. Pills use light fill + saturated text; solid
status fills are reserved for confirm buttons inside a decision form.

### Seal literals
The circular mark is SVG and must keep its exact hex: ring gradient
`#1e2a4a → #0f1729`, gold `#c9a84c`, mono ring `#1a1a2e`. These are the only
hard-coded colours allowed outside the token block.

### Derivation rule
Need a shade that is not in the table? Derive it — `oklch()` at the same hue, or
`color-mix(in oklch, var(--accent) 40%, var(--border))` as `admin.html` does for
stat-card hover. Never introduce a new hue, never paste a new hex.

---

## Typography

Two families, deliberately split by job. A single family is not an option here:
the serif *is* the institutional signal.

- **Display — `'Iowan Old Style', 'Charter', 'Palatino', Georgia, serif`.**
  Headlines, section titles, card titles, stat values, document headers. Never
  body copy, never UI labels.
- **Body — `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`.**
  All product text, form fields, buttons, tables, meta rows.
- **Mono — `ui-monospace, 'SF Mono', Menlo, monospace`.** IDs, CPF masks, token
  names (`{ano_letivo}`), spacing labels, step numerals in the CTA band.

No webfonts ship with this system — both families are platform stacks, which is
why there is no `fonts/` directory to bind.

### Scale
| Role | Spec | Where it appears |
| --- | --- | --- |
| Display 48 | `600 48px/1.1`, tracking `-0.02em` | Specimen sheet, oversized statements |
| H1 36 | `600 36px/1.15`, `-0.01em` | Page titles; marketing hero uses `clamp(40px, 6vw, 64px)` |
| H2 28 | `600 28px/1.2`, `-0.01em` | Section heads; marketing uses `clamp(28px, 4vw, 40px)` |
| H3 22 | `600 22px/1.25` | Sub-sections, console view titles |
| H4 / card 18 | `600 18px/1.3` | Card titles |
| Stat 26 | `600 26px/1.1`, `-0.02em`, tabular | Console stat values |
| Lede 19 | `400 19px/1.65` | Opening paragraph; pull-quotes are the same size, italic, display face |
| Body 16 | `400 16px/1.55`, max 65ch | Marketing and long-form copy |
| UI 15 | `400 15px/1.5` | Inputs, console body |
| UI-sm 14 | `400 14px/1.5` | Tables, meta rows, detail fields |
| Label 13 | `550 13px/1`, `+0.02em` | Field labels, button text |
| Caption 11 | `550 11px/1`, `+0.06em`, UPPERCASE | Status labels, sidebar group headers |
| Kicker 11 | `550 11px/1`, `+0.14em`, UPPERCASE, gold | Section kickers on marketing bands |

**Hard rules.** Weight `550` is a real, load-bearing weight here — labels and
captions use it, `600` belongs to the serif. ALL CAPS never ships below `0.06em`
tracking. Headlines carry `text-wrap: balance`, long paragraphs `text-wrap: pretty`.
Money and counts are always `font-variant-numeric: tabular-nums`.

---

## Spacing & Layout

### Ladder
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 80` — named micro / tight / compact /
default / comfortable / spacious / section / region / landmark in `tokens.css`.
Nothing between the steps.

### Radius
`4px` chips → `6px` **controls** (buttons, inputs, selects) → `8px` **house**
(cards, panels) → `12px` editorial cards → `999px` pills. The 6px/8px split is
deliberate and consistent across all surfaces: controls are always one step
tighter than the card they sit in.

### Containers
`1120px` marketing shell · `720px` form column · `940px` console content ·
`400px` login card · `250px` console sidebar · `53px` topbar · `72px` nav.

### Structure per surface
- **Marketing** — sticky navy nav (72px, springing to 128px when the brand
  lockup is hovered), full-bleed navy hero with a radial gradient and a 3px gold
  gradient hairline at its base, then alternating bands at `96px` vertical
  padding — `--surface` (missão) → `--bg` (obras) → `--accent` (solicitar) →
  `--cream` (benfeitor) → `--surface` (contato) — then a `--navy-deep` footer.
  No two adjacent bands share a background.
- **Form** — single 720px column, sticky step navigation with a six-segment
  progress bar, one `--surface` card per logical group, actions row at the foot
  of each step (`Voltar` left, `Próximo` right).
- **Console** — sticky topbar, then `grid-template-columns: 250px 1fr`. The
  sidebar is grouped under uppercase section labels (`Dados`, `Configurações`).
  Content is a 940px column: title → stat row → toolbar → filter pills → result
  count → card list.
- **Editor views** — `editor-grid` splits into two columns above 1024px: fields
  left, a live `--cream` preview box right.

### Responsive behaviour
Real re-layouts, not squeezes. At **860px** the console sidebar becomes a
horizontal wrapping rail and stat cards go 2-up. At **880px** every marketing
band collapses to one column and the hero seal moves *above* the copy
(`order: -1`). At **560px** two-column form rows stack, action buttons go
full-width, vehicle rows re-flow. Nothing scrolls horizontally.

---

## Components

### Buttons
Five variants, one geometry (`6px` radius, `550` weight, `+0.02em` tracking):
`primary` navy/white · `gold` gold/navy-deep · `outline` 1.5px navy · `ghost`
transparent → cream on hover · `danger` solid. Sizes `sm 7×14` / `default 11×24`
/ `lg 14×32`. Every button nudges `translateY(1px)` on `:active` and shows a
**gold** focus ring at `2px` offset `2px`. Loading keeps the label, adds a
spinning stroke-dash SVG, and sets `aria-busy` + `disabled`.

### Inputs
Background `--bg` (sunk), `1px --border`, `6px` radius, `15px/1.5` body font.
Focus: `border-color: var(--accent)` **plus** a `3px --accent-light` ring.
Error: `--danger` border, red-tinted ring, and a 12px `--danger` message
revealed by the `.error` class on the control itself. Hints sit at 12px `--muted`
under the field. Required markers are a red `*` after the label.

### Upload areas
`1.5px dashed --border`, centred 13px prompt with a `--gold-dark` bold verb
("**Clique ou arraste**"), a transparent full-bleed file input, a drag-over state
switching to `--gold` border + `--gold-light` fill, and selected files rendered
as `4px` chips on `--accent-light` with an inline remove button.

### Cards
`--surface`, `1px --border`, `8px` radius, `24px` padding, **no shadow**. The
signature detail is the 48×2 gold divider between title and body. Record cards
in the console add a header row (name + status pill + action buttons + chevron),
an `.open` class that reveals a border-topped detail region, and four tabs
inside: Resumo · Documentos · Financeiro · Decisão.

### Numbered work cards
The "Nossas obras" grid is the one card in the system that lifts on hover, and
it earns it by being a 2-up editorial grid rather than a dense list: `--surface`
on the `--bg` band, `12px` radius, `36px 34px` padding, a `44px` navy circle
carrying a **gold Roman numeral** in the display serif, then a 20px serif title
and 15px muted body. Hover moves the border toward
`color-mix(in oklch, var(--gold) 50%, var(--border))` and nudges
`translateY(-2px)` — still no shadow. Collapses to one column at 760px.

### Status pills & badges
`999px` radius, `500–550` weight, 11–12px, light fill + saturated text.
`pendente` warn · `aprovada` success · `rejeitada` danger · `mensal` success ·
`unica` accent · neutral `--cream`/`--muted`.

### Stat cards
Clickable filter controls, not decoration: label 12px `--muted`, value in the
display serif at 26px with tabular numerals, colour-coded by status, `.active`
switching to `--accent` border + `--accent-light` fill. Clicking one sets the
list filter and the filter pills follow.

### Filter pills & toolbar
Search input (max 320px) + sort select on one row above wrapping filter pills
carrying live counts (`Pendente (2)`), then a result-count line that echoes the
query back to the user.

### Tables & detail fields
Header row `500 12px` `--muted` with a bottom border; cells 14px on a 60%-alpha
border; money tabular. Key/value detail fields use a two-column grid with
`4px 24px` gaps, `--muted` key, `--fg` value, `—` for empty.

### Decision flow
Idle → two buttons (`Aprovar` success, `Rejeitar` danger) under a one-line
instruction. Chosen → a `--cream` decision form with a discount number field
pre-filled from the requested percentage, an optional reason textarea, a confirm
button in the decision's colour, and a cancel. Rejection shows an explicit
"esta ação é definitiva" warning first. Decided → a read-only summary (status,
granted discount, reason, date). Destructive list actions (`Excluir benfeitor`,
`Excluir ano letivo`) always `confirm()` first.

### Template composers
Token cheat-sheet in a `--cream` block, tabbed editors (Aprovação / Rejeição),
textareas in the mono face, and a live preview panel substituting sample data.
Contract clauses are reorderable rows with ↑ ↓ and Remove.

### The seal
Navy radial-gradient disc, `3px` gold ring at `r=106`, a faint inner ring at
`r=98` (35% opacity), a Murillo-style Madonna clipped to a circle, and serif gold
text on arcs — `ARCA` above at `0.18em`, `N. S. DA PROVIDÊNCIA` below at
`0.14em`. Three sanctioned variants (light background, navy background,
monochrome via `feColorMatrix saturate 0`) live in `assets/`. Clear space: 50% of
the seal diameter on all sides. Never rotate, distort or recolour it.

**Arc geometry is load-bearing — do not "round" it.** The two arcs sit at
different radii on purpose, because glyphs grow in opposite directions on them:

| Arc | Path | Baseline | Glyphs grow | Result |
| --- | --- | --- | --- | --- |
| Top (`ARCA`) | `M 22,110 a 88,88 0 0,1 176,0` | `r=88` | **outward** | tops land at `r≈94` |
| Bottom (`N. S. DA PROVIDÊNCIA`) | `M 20,118 a 90,90 0 0,0 180,0` | `r=90`, centred at `(110,118)` | **inward** | baseline is tangent to `r=98` |

The invariant: **the top arc's glyphs must never reach the inner ring at
`r=98`.** At `font-size: 12.5` the measured cap height is ~6 units, so a baseline
above `r≈92` pushes the letters into the ring and the hairline visibly cuts
through `ARCA`. `r=88` leaves roughly 2.5 units of clearance. If the type size or
family ever changes, re-measure and re-derive — do not keep the number by faith.

---

## Motion & Interaction

Motion is functional and short. `0.15s` for hover, border and background;
`0.1s` for the `:active` nudge; `0.3s` for the progress bar and the nav's spring
growth (`cubic-bezier(.34, 1.4, .64, 1)`); `0.7s` `cubic-bezier(.22, 1, .36, 1)`
for the scroll reveal, staggered `70ms` per item.

Rules that matter:
- **Reveal-on-scroll enhances an already-visible default.** The
  `IntersectionObserver` adds `.in`; without JS or observer support every
  element is shown. Content is never gated on animation.
- **`prefers-reduced-motion: reduce` is mandatory** in every file — durations
  collapse to `0.01ms` and reveal transforms reset to none.
- **Focus is always visible**: gold on navy surfaces, navy on light ones.
- **Errors are announced, not just coloured**: `aria-invalid` on the control,
  `role="alert"` on the message, and focus moved to the first invalid field.
- The consent checkbox uses a 0.4s shake plus a red label as an *attention* cue
  and clears itself after 2s — it never blocks with a modal.
- Every page ships a skip link that slides in on focus.
- No `scrollIntoView`; the form scrolls the window to top between steps.
- Print styles exist: colour-adjust forced for swatches and the navy seal card.

---

## Voice & Brand

Brazilian Portuguese, formal but warm. The association addresses families as
*Prezado(a) Sr(a).*, signs as *Comissão de Bolsas*, and speaks of *confiança na
Providência* without slipping into marketing gloss.

- **Sentence case in product UI** (`Solicitar bolsa`, `Exportar Decisão`); Title
  Case for institutional document titles (`CONTRATO DE CONCESSÃO DE BOLSA DE
  ESTUDOS` is the one all-caps exception).
- **Kickers name the section, headlines make the claim**: `Quem somos` →
  *"Educando para a Eternidade, sob o Manto da Providência Divina"*.
- **Scripture and magisterial quotations are pull-quotes**, set in the display
  serif, italic, with a `--gold-dark` uppercase citation beneath.
- **Never invent numbers.** Where a real value is unknown the source ships an
  honest placeholder with a mono `— a confirmar (canais oficiais)` note. Do the
  same; fabricated statistics are a defect, not filler.
- Empty states speak plainly and distinguish "nothing yet" from "nothing matches
  your search".
- Demo credentials, seeded records and mock export handlers are labelled as
  such. Ship them only in prototypes.

---

## Anti-patterns

Things this system explicitly does **not** do:

1. **No shadows on cards.** Depth comes from borders and whitespace. The only
   `drop-shadow` in the system lifts the seal off the navy hero.
2. **No decorative gradients.** Two gradients exist and both are structural: the
   hero's navy radial and the seal's ring. No purple washes, no gradient text.
3. **No third accent.** Navy and gold. Status colours are semantic, never brand.
4. **Gold is not a text colour on light surfaces** — use `--gold-dark`. Gold
   never exceeds two appearances per screen.
5. **No serif body copy and no sans headlines.** The split is the identity.
6. **No emoji icons.** Line icons only, `1.6–2` stroke, `currentColor`.
7. **No new hex values.** Derive with `oklch()` / `color-mix()` from the tokens.
8. **No beige or cream page backgrounds.** `--cream` is a highlight block, never
   the canvas.
9. **No raw white pages.** `--surface` needs `--bg` around it to read correctly.
10. **No fabricated metrics, fake testimonials or filler copy.**
11. **No modal for validation.** Inline errors, focus management, the shake cue.
12. **No horizontal scroll and no shrunken desktop layouts on mobile** —
    re-lay-out at the documented breakpoints.
13. **No seal alterations**: no rotation, no distortion, no recolour outside the
    three variants in `assets/`, no clear space below 50% of the diameter.
14. **No `scrollIntoView`** — it breaks embedded preview panes.
15. **No demo/designer controls inside a production surface** (the login page's
    credentials hint is prototype-only).
