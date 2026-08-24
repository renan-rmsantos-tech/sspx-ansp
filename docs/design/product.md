# Product — contexto de UX

## Register

**Brand.** A landing (`opendesign/index.html` → produção em `/`) é superfície institucional/marketing: comunica quem é a Arca e direciona famílias ao formulário de bolsa. Admin e formulário são superfícies de **produto**.

## Users & Purpose

- **Visitante principal:** pai ou mãe católico(a) em Itatiba-SP considerando matricular um filho no Colégio São José, muitas vezes por necessidade de bolsa.
- **Contexto:** provavelmente no celular, possivelmente ansioso(a) com custos, buscando confiança e um próximo passo claro.
- **Job to be done:** entender que a Arca é uma instituição séria e alinhada à fé, e iniciar a solicitação de bolsa.
- **Emoções a evocar:** gravidade institucional com calor — confiança, dignidade, acolhimento. Nunca slick ou comercial; é uma mantenedora sem fins lucrativos, enraizada na fé e na caridade.

## Brand & Personality

Três palavras: **devoto · digno · providencial.**

- Mantenedora do Colégio São José, sob orientação espiritual da FSSPX.
- Católico-tradicional. Tradição latina. A linguagem visual é mais próxima de um missal ou pedra de igreja do que de um site SaaS.
- O calor vem da tipografia, da iconografia sagrada (Nossa Senhora e o Menino) e do texto — não de brincadeira ou tom leve.

## Anti-references

- Sem gloss de startup/SaaS: sem gradient-mesh, hero com métricas, emoji, neon.
- Não é template genérico de "site de igreja" (cruzes clip-art, fotos stock de família sorridente).
- Não é afetação editorial por si só; a serif é institucional, não moda.

## Strategic design principles

- **Identidade já commitada** (ver `brand-spec.md`): navy + gold + warm paper, Iowan Old Style, sans system, selo circular ARCA. Preservar — variantes não reavaliam a identidade em produção.
- **Imagery sagrada é obrigatória**, não opcional. Página institucional católica sem imagem parece incompleta. Usar os assets reais: `opendesign/logo-gesso.jpg`, `opendesign/base1.png`, `opendesign/base2.png`.
- **Um caminho de conversão claro:** "Faça sua solicitação de bolsa" → `/form`.
- **Acessibilidade:** pt-BR, contraste de corpo ≥4.5:1, respeita `prefers-reduced-motion`, navegável por teclado.

## Reference

- Especificação visual: [`brand-spec.md`](brand-spec.md)
- Formulário em papel: [`docs/examples/formulario_bolsa.pdf`](../examples/formulario_bolsa.pdf)
- Protótipos Open Design: [`opendesign/`](opendesign/)
