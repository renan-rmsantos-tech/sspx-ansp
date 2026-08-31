# Brand Spec — Arca Nossa Senhora da Providência (ANSP)

Derivada da identidade visual do Colégio São José / FSSPX / ACIPEC.
A Arca é a mantenedora do colégio — mesma família visual, identidade própria.

## Palette (OKLch)

| Token       | Value                      | Usage                          |
|-------------|----------------------------|--------------------------------|
| `--bg`      | `oklch(97.5% 0.005 85)`   | Page background, warm paper    |
| `--surface` | `oklch(100% 0 0)`         | Cards, panels                  |
| `--fg`      | `oklch(22% 0.06 250)`     | Primary text — deep navy       |
| `--muted`   | `oklch(48% 0.03 250)`     | Secondary text                 |
| `--border`  | `oklch(90% 0.008 85)`     | Subtle dividers                |
| `--accent`  | `oklch(25% 0.06 250)`     | Navy accent (from logo circle) |
| `--gold`    | `oklch(72% 0.10 80)`      | Gold accent (from logo text)   |
| `--cream`   | `oklch(92% 0.03 85)`      | Warm highlight backgrounds     |
| `--success` | `oklch(52% 0.14 155)`     | Approved / positive            |
| `--warn`    | `oklch(68% 0.14 70)`      | Attention states               |
| `--danger`  | `oklch(52% 0.16 25)`      | Error / rejected               |

## Typography

- **Display:** `'Iowan Old Style', 'Charter', 'Palatino', Georgia, serif`
- **Body:** `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`
- **Mono:** `ui-monospace, 'SF Mono', Menlo, monospace`

## Logo

- **Estrutura:** Selo Simples — moldura circular navy com radialGradient, borda dourada
- **Imagem central:** Pintura clássica de Nossa Senhora da Providência com o Menino Jesus (`base1.png`), clipped em círculo
- **Tipografia em arco:** "ARCA" no arco superior (baseline `r=88`), "N. S. DA PROVIDÊNCIA" no arco inferior (baseline `r=90`, centro `110,118`) — serifada, dourada, bold, letter-spacing generoso
- **Folga do arco superior:** o topo das letras de "ARCA" nunca alcança o anel interno em `r=98`. Baseline acima de `r≈92` faz a linha fina cortar o texto.
- **Variações:** Fundo claro, fundo escuro (idêntico), monocromático (feColorMatrix saturate 0)

## Posture

- Serif display for institutional gravity, sans body for readability
- Generous whitespace — print-magazine feel
- No shadows on cards — borders + whitespace
- Rounded corners: 8px (subtle institutional warmth)
- Gold used sparingly: logo mark, section dividers, select CTAs
- Navy as dominant brand color (backgrounds, headers, primary actions)
