# Design

Este diretório guarda artefatos de referência; os contratos duráveis ficam na raiz.

| Fonte | Responsabilidade |
| --- | --- |
| [`PRODUCT.md`](../../PRODUCT.md) | Usuários, propósito e princípios de UX |
| [`DESIGN.md`](../../DESIGN.md) | Gramática visual e autoridade de tokens |
| [`COPY.md`](../../COPY.md) | Voz e vocabulário |
| [`opendesign/`](opendesign/) | Referência visual extraída (Open Design), assets e handoff |
| [`prototyping.md`](prototyping.md) | Ambiente de protótipos com os componentes reais (`/prototipos/{slug}` em dev) |
| `<slug>/index.html` | Evidência renderizada de cada protótipo (ex.: [`admin-redesign/`](admin-redesign/)) |

Em conflitos, o código de produção e seus testes prevalecem; os protótipos não autorizam mudanças de regras de negócio, conteúdo legal ou tokens executáveis.
