---
target: library
host: vite-app # galeria @compozy/proto ao lado do app Next, com vite.config.ts próprio
prototypes: ["app/**/*.proto.tsx", "components/**/*.proto.tsx", "drafts/**/*.proto.tsx"]
entry: "drafts/{slug}/index.proto.tsx"
providers: proto.canvas.tsx
dev: npm run proto dev
preview: "http://127.0.0.1:4401/__proto/render/{slug}?chrome=0"
evidence: "npm run proto -- evidence {slug} --state <id>"
output: "docs/design/{slug}/"
---

# Protótipos

A galeria `@compozy/proto` renderiza as views reais do app com fixtures, um estado
por vez, e guarda os comentários de revisão em `proto/review/`. As skills `proto` e
`proto-apply-comments` (`.agents/skills/`) descrevem autoria e revisão.

```bash
npm run proto dev            # galeria em http://127.0.0.1:4400 (render em :4401)
npm run proto check          # valida meta, guards e compilação; rode antes da revisão
npm run proto -- screenshot admin-home --state erro --role secretaria
```

## Onde ficam

- **Protótipo de componente**: `<view>.proto.tsx` ao lado da view, com fixtures em
  `<view>.fixtures.ts`. Só compõe a view; sem markup próprio. Exemplo:
  `app/admin/_components/admin-home.proto.tsx`.
- **Draft**: `drafts/<slug>/index.proto.tsx`, exploração com markup livre antes de a
  view existir. Exemplo: `drafts/admin-redesign/`.
- **Canvas e Frame**: `proto.canvas.tsx` carrega `app/globals.css` e envolve os
  protótipos de componente com o `AdminShell` real (use `standalone: true` no `meta`
  para telas públicas sem o painel). O papel escolhido na galeria (`admin` ou
  `secretaria`) chega ao `Frame` e ao protótipo.

## Next.js dentro do Vite

O app é Next; a galeria compila com `vite.config.ts`, que o `next build` e o Vitest
não leem. `next/link`, `next/image` e `next/navigation` são trocados pelas versões de
`proto/next/`: links não navegam e `usePathname()` devolve o `meta.route` do
protótipo. Componentes de servidor (`async`, `next/headers`) e server actions não
rodam na galeria: a página busca os dados e passa por props para a view, e callbacks
como `onLogout` chegam por prop.

`guards.forbidRuntimeImports` em `proto.config.ts` faz `proto check` falhar com
`network_import` quando um protótipo alcança banco, sessão, armazenamento, e-mail ou
`app/**/_actions/**`. A correção é tirar o acesso da view, nunca afrouxar o guard.
