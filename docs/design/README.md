# Design — UX/UI da aplicação

Documentação de experiência, identidade visual e referências de interface do sistema ANSP.

## Estrutura

| Arquivo / pasta | Conteúdo |
|-----------------|----------|
| [`brand-spec.md`](brand-spec.md) | Tokens de cor, tipografia, logo e postura visual. Implementação canônica em `app/globals.css`. |
| [`product.md`](product.md) | Contexto de produto: usuários, personalidade da marca, anti-referências e princípios estratégicos de UX. |
| [`opendesign/`](opendesign/) | Protótipos HTML e assets exportados do **Open Design** — referência visual, não código de produção. |

## Referências externas ao design

- Formulário em papel original: [`docs/examples/formulario_bolsa.pdf`](../examples/formulario_bolsa.pdf)
- Modelo de contrato: [`docs/examples/contrato_adesao.docx`](../examples/contrato_adesao.docx)

## Hierarquia de fontes

1. **Código de produção** — `app/globals.css` e componentes em `app/` e `components/`
2. **Especificação** — `brand-spec.md` e `product.md` nesta pasta
3. **Protótipos Open Design** — `opendesign/*.html` (referência; podem estar desatualizados em relação ao app)

Ao implementar ou revisar UI, preserve a identidade já commitada (navy + gold + warm paper, serif institucional). Variantes não devem second-guess a identidade em produção.
