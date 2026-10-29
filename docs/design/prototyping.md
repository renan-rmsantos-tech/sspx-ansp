---
target: library # alvo padrão para novos pedidos: library ou html
library: ["@/components/ui"] # únicos caminhos de UI que um protótipo pode importar
catalog:
  - components/ui # componentes shadcn (base-nova) já adicionados: button, seal-logo
  - components.json # aliases e estilo shadcn; novos componentes via `npx shadcn add <nome>`
  - app/globals.css # tokens executáveis (@theme): cores, fontes, raios
  - docs/design/opendesign/DESIGN.md # gramática visual de referência (não é runtime)
authority: [DESIGN.md, PRODUCT.md, COPY.md]
host: next-playground # rota dev-only dentro do próprio app Next (sem app separado)
prototypes: app/prototipos/_designs # fontes dos protótipos, uma pasta por slug
entry: "{slug}/index.tsx" # registrado em app/prototipos/_designs/registry.ts
providers: app/layout.tsx # layout raiz aplica globals.css; nenhum provider extra é necessário
dev: npm run dev # porta 3000; roda migrate/bootstrap/seed antes (precisa do Postgres em `npm run db:start`)
preview: "http://localhost:3000/prototipos/{slug}"
typecheck: npm run typecheck
evidence: snapshot # DOM capturado com agent-browser e salvo em docs/design/{slug}/index.html
verified: 2026-10-29
---

## Como funciona

- As rotas `app/prototipos/page.proto.tsx` e `app/prototipos/[slug]/page.proto.tsx`
  usam a extensão `proto.tsx`, reconhecida pelo `pageExtensions` do
  `next.config.ts` apenas fora de produção. `next build` (Dockerfile) ignora
  esses arquivos, então nada de protótipo entra na imagem nem exige login.
- `app/prototipos/_designs/` é pasta privada do App Router (prefixo `_`), por
  isso não gera rotas. Cada protótipo exporta um componente default em
  `{slug}/index.tsx` e entra no mapa de `registry.ts` (uma linha).
- Protótipos são componentes client com estado local e fixtures; nunca chamam
  server actions, banco ou APIs. Importam UI só de `@/components/ui`, ícones de
  `lucide-react` e classes Tailwind com os tokens de `app/globals.css`.
- O `tsconfig.json` já inclui a pasta, então `npm run typecheck` cobre os
  protótipos; o ESLint também. O Vitest não coleta nada fora de `__tests__/`
  e a cobertura exclui `app/prototipos/**`.

## Evidência renderizada

Com o servidor de desenvolvimento no ar, abra a URL de preview com o
`agent-browser` numa sessão própria, espere renderizar e salve o DOM sem
scripts em `docs/design/{slug}/index.html` (receita "snapshot" do
`open-design-setup`). Esse HTML serve ao lint e à revisão; não é entregável
autônomo, pois os estilos vêm das tags `<style>` injetadas pelo dev server.

## Armadilhas

- Pastas com `_` ou `__` em `app/` são privadas: a rota precisa ficar em
  `app/prototipos/`, não em `app/_prototipos/`.
- `npm run dev` dispara `predev` (migrate, bootstrap, seed). Sem Postgres ele
  apenas avisa e segue, mas os protótipos em si não dependem do banco.
- O botão flutuante do Next DevTools aparece nas screenshots em dev; ignore.
- Não copie nem restilize componentes de `components/ui` dentro do protótipo.
  Faltando um componente (input, select, tabs, badge, card, etc.), registre a
  lacuna no protótipo e peça aprovação para `npx shadcn add`.
