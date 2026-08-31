# Applied UI kit — Arca N. S. da Providência console

A working scholarship-review console assembled from modular components, not a
static screenshot. Open `index.html` and you can switch sidebar views, click a
stat card to filter, search by family or school, expand a request into its four
detail tabs, approve or reject a request (counts and pills update immediately),
and edit a decision-letter template with live token substitution.

Everything is plain browser JavaScript — no build step, no bundler, no JSX
transform. Each component file assigns one global and exposes a `markup()`
and/or `mount()` function.

## Structure

```
ui_kits/app/
├── index.html                  entry point — loads the tokens, then the components, then mounts App
├── README.md                   this file
└── components/
    ├── App.js                  console shell: topbar + sidebar + 940px content column; composes the rest
    ├── Sidebar.js              grouped navigation ("Dados" / "Configurações") with active state
    ├── StatBoard.js            four clickable status counters that drive the list filter
    ├── RequestCard.js          expandable request record with Resumo · Documentos · Financeiro · Decisão
    ├── DecisionPanel.js        idle → form → decided flow for approving or rejecting a request
    ├── Composer.js             decision-letter template editor with token cheat-sheet and live preview
    ├── Seal.js                 the circular Arca mark, rendered from one place at any size
    └── kit.css                 component styles; consumes tokens only, defines none
```

`index.html` loads `../../colors_and_type.css` and `../../tokens.css` first, then
`components/kit.css`, then the seven scripts, then calls
`App.mount(document.getElementById('kit-root'))`.

## Usage

To reuse the kit in a new surface:

1. Copy `ui_kits/app/` next to your page, plus `colors_and_type.css`,
   `tokens.css` and `assets/` from the package root.
2. Link the two token files **before** `components/kit.css`. Nothing in the kit
   defines a colour, radius or space of its own — remove the tokens and it
   renders unstyled, by design.
3. Load only the components you need. `Seal.js`, `Sidebar.js`, `StatBoard.js`
   and `Composer.js` stand alone. `RequestCard.js` expects `DecisionPanel.js`
   to be loaded first, because it embeds the decision panel in its fourth tab.
4. Build your own shell, or `App.mount(el)` and replace
   `App.SAMPLE_REQUESTS` with real data. Every component takes plain objects
   with the source field names (`nome_pai`, `escola`, `alunos[]`,
   `desconto_solicitado`, `status`), so wiring a real API is a data swap.

To create a new component, follow the same shape: an IIFE that takes the global
object, a `markup(data)` string builder, an optional `mount(el, options)` that
binds delegated listeners, and one assignment to `global.<Name>`.

## Design Notes

Layout and behaviour are read directly from the source console, `admin.html`:

- **Shell** — sticky 53px topbar, `grid-template-columns: 250px 1fr`, content
  capped at 940px. Below 860px the sidebar becomes a horizontal wrapping rail
  and the stat row goes 2-up.
- **Colors and typography** come entirely from the package tokens: navy
  `--accent` for chrome and primary actions, `--gold` reserved for focus rings
  and the seal, the display serif for titles and stat values, the system sans
  for all product text.
- **Cards carry no shadow** — 1px `--border` and whitespace only. Controls use
  `--radius-ctl` (6px) inside cards at `--radius` (8px).
- **Status is semantic**: light-fill pills in lists, solid fills only on the
  confirm button inside a decision form.
- **Honest empty states.** The Benfeitores view ships empty on purpose — the
  source project had no real donor records beyond seed data, and inventing
  numbers is an anti-pattern in this system.
- **Export actions report instead of downloading.** The source console writes a
  `.txt` file; the kit keeps the review surface side-effect free and announces
  the action in the live-region count line instead.

Full rules live in `../../DESIGN.md`; token definitions live in
`../../colors_and_type.css` and `../../tokens.css`.
