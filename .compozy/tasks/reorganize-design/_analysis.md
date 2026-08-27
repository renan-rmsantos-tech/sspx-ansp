# Análise da feature `reorganize-design`

## Resumo executivo

O repositório já passou por uma reorganização documental parcial no commit `fce7fda`: os protótipos saíram de `design/` para `docs/design/opendesign/`, o antigo `PRODUCT.md` da raiz virou `docs/design/product.md`, `docs/design/brand-spec.md` virou a especificação visual local e `AGENT.md` foi criado como symlink para `CLAUDE.md`. A estrutura atual é melhor do que a anterior, mas ainda não corresponde ao padrão de responsabilidades do repositório de referência `compozy/compozy` nem ao modo como as ferramentas de design presentes no workspace descobrem contexto.

Os principais desalinhamentos verificados são:

1. O contexto de produto está escondido em `docs/design/product.md`; o upstream e a skill de design versionada no workspace procuram `PRODUCT.md` na raiz.
2. Não existe `DESIGN.md` na raiz; a gramática visual está reduzida e dispersa entre `docs/design/brand-spec.md`, `CLAUDE.md`, `app/globals.css`, componentes e protótipos.
3. Não existe `COPY.md`, embora o domínio tenha vocabulário sensível e superfícies com necessidades verbais distintas.
4. O arquivo de compatibilidade atual é `AGENT.md` no singular. O upstream usa `AGENTS.md` no plural como symlink para `CLAUDE.md`. No CompozyOS, `AGENT.md` no singular designa uma definição executável somente em diretórios como `.compozy/agents/<nome>/AGENT.md`; mantê-lo na raiz mistura dois contratos diferentes.
5. `docs/design/opendesign/` contém bons artefatos, mas seu catálogo não registra status, superfície, autoridade ou paridade. Os cinco HTMLs ficam planos e carregam snapshots de tokens que já divergem da produção.

A recomendação é executar uma migração estritamente documental e preservadora de histórico:

- restaurar `PRODUCT.md` na raiz;
- consolidar `docs/design/brand-spec.md` em `DESIGN.md` na raiz;
- criar `COPY.md` na raiz;
- manter `CLAUDE.md` como instrução canônica e enxuta, atuando como roteador para esses contratos;
- substituir o symlink raiz `AGENT.md` por `AGENTS.md -> CLAUDE.md`;
- transformar `docs/design/README.md` e `docs/design/opendesign/README.md` em catálogos de artefatos, sem competir com os contratos raiz;
- manter os HTMLs e assets nos caminhos atuais nesta feature, evitando ajustes de código ou referências relativas.

Não é recomendável criar agora o pacote importável completo do Open Design, mover os HTMLs para subpastas, sincronizar tokens por script ou alterar qualquer arquivo de produção. Essas ações exigem decisões técnicas e verificação próprias e devem ser tratadas em uma feature posterior.

## Objetivos

- Tornar produto, design visual e linguagem descobríveis imediatamente por pessoas e agentes.
- Adotar a arquitetura de conhecimento do `compozy/compozy` sem copiar sua estética, stack, dimensão ou regras específicas de produto.
- Eliminar fontes documentais concorrentes para produto e design.
- Diferenciar com precisão instrução de repositório (`CLAUDE.md`/`AGENTS.md`) de definição executável de agente Compozy (`.compozy/agents/<nome>/AGENT.md`).
- Preparar um contexto estável para o Open Design sem promover protótipos a fonte de verdade.
- Preservar a identidade ANSP existente e todas as decisões visuais já implementadas.
- Garantir que a reorganização não altere comportamento, aparência, conteúdo de produção, configuração, testes ou deploy.
- Preservar mudanças não relacionadas e o histórico de arquivos por meio de moves reconhecíveis pelo Git.

## Estado atual verificado

### Baseline do Git

- Baseline inspecionada: `74819baf35ad6bcaa5d11faf52ee70e22b6a8581`, em `main` e `origin/main` no momento da análise.
- O commit `fce7fda1b2234325f14412d600758b96e7fde8e9` realizou a reorganização documental mais recente.
- Existe um worktree `feature/reorder-design` apontando para a mesma baseline, além desta nova feature `reorganize-design`; uma implementação futura deve trabalhar somente no worktree dedicado que o Loop criar e não reutilizar implicitamente o anterior.
- O worktree principal já contém mudanças não relacionadas em `.compozy/memory/` e `.compozy/tasks/`; elas devem permanecer intactas.

### Instruções do repositório

- `CLAUDE.md` tem 7.125 bytes e é declarado como fonte única de orientação para agentes.
- `AGENT.md` é um symlink versionado para `CLAUDE.md`.
- Não existe `AGENTS.md` no plural.
- Não há outro `AGENTS.md`, `AGENT.md` ou `CLAUDE.md` aninhado no código da aplicação.
- `CLAUDE.md` mistura atualmente três responsabilidades: visão técnica do projeto, instruções operacionais e um resumo do sistema de design.
- A seção de UX/UI aponta primeiro para `docs/design/README.md`, acrescentando uma etapa de descoberta que o padrão do upstream evita com contratos na raiz.

### Documentação de produto e design

- `docs/design/product.md` contém registro, usuário principal, propósito, personalidade, anti-referências, princípios e acessibilidade.
- Esse arquivo deriva diretamente do antigo `PRODUCT.md` da raiz, removido por `fce7fda`; portanto, restaurá-lo na raiz é uma correção de arquitetura, não a criação de um produto novo.
- `docs/design/brand-spec.md` registra paleta, tipografia, selo, postura e acessibilidade, mas não cobre de forma suficiente layout, estados, responsividade, motion, componentes, conteúdo visual e diferenças entre superfícies.
- `docs/design/README.md` hoje declara a hierarquia produção → especificação → protótipos.
- Não existem `DESIGN.md` nem `COPY.md` na raiz.
- A crítica persistida em `.impeccable/critique/2026-06-17T17-55-26Z__app-admin.md` já apontava a ausência de `PRODUCT.md` e `DESIGN.md` na raiz.
- A implementação local da skill `impeccable`, registrada em `skills-lock.json`, procura `PRODUCT.md` e `DESIGN.md` primeiro no diretório raiz. Mesmo que essa skill não esteja ativa em toda sessão gerenciada, a topologia atual reduz a portabilidade do contexto.

### Open Design

- `docs/design/opendesign/` contém cinco entradas HTML: `index.html`, `formulario.html`, `admin.html`, `login.html` e `design-system.html`.
- A pasta contém também `base1.png`, `base2.png`, `mqjmgzod-logo.png` e `logo-gesso.jpg`.
- O README atual lista entradas e diz que os protótipos são referência, mas não informa status, superfície, última revisão, contrato aplicável ou deltas conhecidos.
- Os protótipos são autocontidos e usam assets por caminhos relativos simples. Reorganizá-los em subpastas exigiria editar essas referências ou duplicar assets.
- Os pares `base1.png`, `base2.png` e `mqjmgzod-logo.png` em `public/` e `docs/design/opendesign/` são byte a byte idênticos hoje. A duplicação atende a consumidores distintos — runtime e protótipo estático —, mas não possui política de ownership documentada.
- `admin.html`, `formulario.html` e `login.html` registram valores antigos para `fg`, `muted`, `success` e `warn`, diferentes de `app/globals.css`. Isso prova que o protótipo deve continuar sendo snapshot de referência, não fonte canônica.

### Fontes de verdade técnicas que não devem ser alteradas

- `app/globals.css` contém os tokens efetivamente usados pela aplicação.
- `components/ui/` contém o inventário local de primitivas reutilizáveis.
- `app/page.tsx` e `components/ui/seal-logo.tsx` ainda possuem valores visuais locais/hard-coded; são dívida técnica observada, não escopo desta reorganização.
- `__tests__/brand-tokens.test.ts` protege uma parte dos tokens de produção; ampliar ou mudar esse teste seria alteração de código e fica fora desta feature.
- `eslint.config.mjs` ignora `docs/design/opendesign/**`; como os HTMLs permanecerão no mesmo caminho, não precisa ser alterado.

## Padrão de referência verificado

### Repositório `compozy/compozy`

O branch `main` do upstream, revalidado em 2026-08-25, mantém responsabilidades separadas na raiz:

- `PRODUCT.md`: usuários, propósito, registros por superfície, personalidade, anti-referências e princípios.
- `DESIGN.md`: gramática visual e racional; aponta para tokens executáveis e contém projeções verificadas.
- `COPY.md`: autoridade verbal para voz, vocabulário, claims, CTAs, documentação pública e microcopy.
- `CLAUDE.md`: instruções operacionais do repositório e roteamento para contratos especializados.
- `AGENTS.md`: symlink de uma linha para `CLAUDE.md`, oferecendo compatibilidade sem duplicação.

O padrão útil para o ANSP é a separação de autoridade, não a quantidade de texto ou a topologia de monorepo. O ANSP não precisa reproduzir `packages/ui`, `web/`, agentes ou skills do upstream.

### Semântica de `AGENT.md` no CompozyOS

No CompozyOS, uma definição executável de agente usa frontmatter estrito e corpo Markdown e vive em:

- `$COMPOZY_HOME/agents/<nome>/AGENT.md`; ou
- `<workspace>/.compozy/agents/<nome>/AGENT.md`.

Um `AGENT.md` solto na raiz não é uma definição workspace-scoped válida e também não substitui o padrão de instruções `AGENTS.md`. Por isso, a migração recomendada é:

```text
CLAUDE.md              # instrução canônica do repositório
AGENTS.md -> CLAUDE.md # alias compatível, igual ao upstream
```

Se no futuro houver um agente especializado de System Design, ele deve ser criado separadamente em `.compozy/agents/<nome>/AGENT.md` por uma superfície pública do CompozyOS. Isso não pertence a esta feature.

### Open Design

O contrato atual do Open Design para um novo Design System Project usa, no mínimo:

```text
<pacote>/
├── manifest.json
├── DESIGN.md
└── tokens.css
```

Pastas apenas com `DESIGN.md` continuam aceitas como compatibilidade legada, não como formato recomendado para novos pacotes. Arquivos ricos como `USAGE.md`, `components.html`, previews e evidências são opcionais e, quando declarados, trazem novos gates de consistência.

Esse contrato não obriga esta reorganização documental a criar um pacote agora. O repositório já tem tokens executáveis próprios em `app/globals.css`; criar `tokens.css` manual introduziria uma segunda fonte de valores. A integração importável deve ser uma feature futura, com geração ou validação unidirecional claramente definida.

## Arquitetura documental recomendada

### Estrutura-alvo desta feature

```text
PRODUCT.md                         # produto, usuários e princípios de UX
DESIGN.md                          # gramática visual durável
COPY.md                            # voz, vocabulário e microcopy
CLAUDE.md                          # instruções operacionais e ordem de leitura
AGENTS.md -> CLAUDE.md             # compatibilidade entre agentes
README.md                          # visão humana e navegação geral
docs/
├── design/
│   ├── README.md                  # catálogo; não é fonte concorrente
│   └── opendesign/
│       ├── README.md              # catálogo de protótipos e status
│       ├── index.html
│       ├── formulario.html
│       ├── admin.html
│       ├── login.html
│       ├── design-system.html
│       └── assets existentes
├── examples/                      # documentos de referência do domínio
└── plano-deploy-droplet.md
```

Os HTMLs permanecem planos nesta etapa. A organização por superfície deve ser expressa primeiro pelo catálogo, sem alterar seus conteúdos ou caminhos relativos.

### Hierarquia de autoridade

1. Comportamento, conteúdo legal, dados e acessibilidade efetivamente implementados e testados.
2. Tokens e componentes de produção em `app/globals.css`, `components/ui/`, `app/` e `components/`.
3. Contratos duráveis `PRODUCT.md`, `DESIGN.md` e `COPY.md`.
4. Spec e decisões aprovadas da feature em `.compozy/tasks/<slug>/`.
5. Protótipos Open Design e seus snapshots.
6. Críticas, explorações e artefatos históricos.

Essa ordem deve aparecer de forma curta em `CLAUDE.md`, `DESIGN.md` e no catálogo do Open Design. Em caso de divergência, o protótipo não autoriza mudar regra de negócio, texto legal, identidade, dados ou componente existente.

### Matriz de migração de conteúdo

| Origem atual | Destino | Ação recomendada | Regra contra drift |
| --- | --- | --- | --- |
| `docs/design/product.md` | `PRODUCT.md` | Mover e completar somente lacunas verificadas | Não manter cópia integral no caminho antigo |
| `docs/design/brand-spec.md` | `DESIGN.md` | Mover, renomear e organizar a gramática existente | Valores executáveis continuam em `app/globals.css` |
| Regras verbais dispersas em `product.md`, `CLAUDE.md` e UI | `COPY.md` | Consolidar voz e vocabulário sem reescrever textos de produção | Templates legais e banco continuam soberanos |
| `CLAUDE.md` | `CLAUDE.md` | Enxugar duplicações e transformar em roteador | Referenciar contratos em vez de copiá-los |
| `AGENT.md` | `AGENTS.md` | Renomear o symlink, mantendo alvo `CLAUDE.md` | Não criar um segundo corpo de instruções |
| `docs/design/README.md` | mesmo caminho | Converter em índice dos contratos e artefatos | Não repetir seções completas dos contratos raiz |
| `docs/design/opendesign/README.md` | mesmo caminho | Criar catálogo por superfície/status/paridade | Protótipos permanecem explicitamente não canônicos |
| Links em `README.md` e Markdown | destinos novos | Atualizar de forma atômica | Nenhum link antigo deve sobreviver sem destino válido |

## Conteúdo mínimo de cada contrato

### `PRODUCT.md`

- Registro padrão por superfície: `brand` para landing institucional e `product` para formulário, login, benfeitor e admin.
- Usuários separados: família solicitante, visitante institucional, potencial benfeitor e equipe administrativa.
- Jobs, contexto emocional e resultados esperados de cada superfície.
- Personalidade devota, digna e providencial.
- Anti-referências já aprovadas.
- Princípios de confiança, clareza, dignidade, privacidade e acessibilidade.
- Limites: não inventar capacidades, regras, entidades, claims ou conteúdo legal.

### `DESIGN.md`

- Atmosfera e identidade visual existente, sem redesign.
- Papéis de cor e contraste, apontando para `app/globals.css` como fonte executável.
- Tipografia, escala, espaçamento, raios, layout e profundidade.
- Componentes e estados, apontando para `components/ui/` e para as superfícies reais.
- Motion e `prefers-reduced-motion`.
- Responsividade e requisitos de acessibilidade.
- Uso do selo, iconografia e imagens sacras.
- Diferenças autorizadas entre superfície institucional e superfícies operacionais.
- Anti-padrões.
- Hierarquia de autoridade e regra para deltas entre protótipo e runtime.

O documento pode registrar os valores atuais para leitura humana, mas não deve declarar uma tabela manual como fonte superior aos tokens de produção.

### `COPY.md`

- Voz: acolhedora, digna, direta e institucional, sem tom comercial.
- Vocabulário canônico: `solicitação`, `bolsa`, `responsável`, `aluno`, `benfeitor`, `aprovação`, `rejeição` e `percentual de desconto`.
- Padrões de títulos, CTAs, ajuda, validação, erro, vazio, confirmação e mensagens administrativas.
- Regras para documentos e dados sensíveis.
- Proibição de urgência artificial, culpa, pressão religiosa, paternalismo, emojis, claims não verificáveis e eufemismos que escondam consequências.
- Limite de autoridade: não substituir contratos, templates jurídicos, registros do banco ou conteúdo efetivamente aprovado.

### `CLAUDE.md`

- Visão curta do projeto, arquitetura e comandos essenciais.
- Regras de segurança e dados sensíveis.
- Ordem de leitura por tipo de trabalho.
- Para UX/UI ou copy: exigir `PRODUCT.md`, `DESIGN.md`, `COPY.md`, inventário de componentes, Spec/UIUX da feature e protótipo nomeado quando houver.
- Regra de preservação: Open Design é referência visual; produção e contratos aprovados vencem divergências.
- Não duplicar paleta, voz, princípios ou catálogo completo de telas.

### `docs/design/opendesign/README.md`

O catálogo deve incluir, para cada HTML:

- superfície;
- arquivo de entrada;
- propósito;
- status controlado, por exemplo `reference`, `active` ou `superseded`;
- contrato raiz aplicável;
- relação conhecida com a produção;
- assets necessários;
- aviso de que tokens embutidos são snapshots.

Não se deve marcar um protótipo como `active` ou `done` sem validação humana. A análise não possui evidência para inferir esse lifecycle.

## Escopo recomendado

### Incluído

- Moves e renomes de arquivos Markdown relacionados a produto, design e instruções.
- Criação de `COPY.md` por consolidação de regras já evidenciadas.
- Renome do alias raiz de `AGENT.md` para `AGENTS.md`.
- Edição de `CLAUDE.md`, `README.md`, `docs/design/README.md` e `docs/design/opendesign/README.md` para atualizar roteamento e autoridade.
- Atualização de links Markdown afetados.
- Registro documental de drift, ownership e status dos protótipos.
- Verificações somente de filesystem, Git, symlink, links e referências existentes.

### Fora de escopo

- Qualquer alteração em `app/`, `components/`, `lib/`, `drizzle/`, `scripts/`, testes, CSS de produção, configuração ou dependências.
- Alterar aparência, comportamento, conteúdo exibido ou fluxo da aplicação.
- Editar tokens, corrigir hard-coded visuals ou sincronizar `app/page.tsx`/`seal-logo.tsx`.
- Editar os HTMLs dos protótipos ou mover seus assets nesta etapa.
- Converter HTML do Open Design em React/Next.js.
- Criar `manifest.json`, `tokens.css`, `components.html`, geradores ou guards para um pacote Open Design.
- Criar ou modificar agentes em `.compozy/agents/`, skills, Loops ou configuração Compozy.
- Criar nova linguagem de marca ou reavaliar a identidade visual aprovada.
- Fazer commit, push ou deploy como parte da análise. O Loop poderá tratar commits depois de aprovação; deploy continua condicionado à decisão humana final.

## Dependências

### Humanas e de conteúdo

- Aprovação do responsável pelo produto sobre usuários, termos e diferenças entre ANSP, ACIPEC, Colégio São José e FSSPX.
- Aprovação do contrato verbal, principalmente mensagens de aprovação/rejeição e referências religiosas.
- Decisão sobre o status real de cada protótipo Open Design; a estrutura não deve inventar lifecycle.
- Confirmação de que `AGENTS.md` plural atende os clientes de agente usados pela equipe. O padrão coincide com o upstream, mas compatibilidade de checkout de symlinks em Windows deve ser avaliada se aplicável.

### Técnicas

- Git deve preservar renomes para manter a história do antigo `PRODUCT.md` e de `brand-spec.md`.
- Todos os consumidores de caminhos antigos em Markdown precisam ser atualizados no mesmo diff.
- `app/globals.css`, `components/ui/` e os protótipos precisam ser lidos como evidência, embora não sejam modificados.
- O pacote Open Design futuro dependerá do schema vigente de `manifest.json` e de uma estratégia de projeção dos tokens; isso não bloqueia a reorganização documental.

## Impactos esperados

### Positivos

- Redução do tempo de descoberta de contexto por agentes e pessoas.
- Compatibilidade com o roteamento documental observado no upstream do Compozy.
- Compatibilidade maior com ferramentas que procuram `PRODUCT.md` e `DESIGN.md` na raiz.
- Separação clara entre instrução, estratégia, visual, linguagem e artefatos.
- Menor risco de um protótipo antigo redefinir comportamento ou tokens.
- Menor risco de drift entre `CLAUDE.md` e aliases para outros agentes.
- Melhor preparação para um pacote Open Design posterior sem criar fonte concorrente agora.

### Neutros no runtime

- Nenhuma rota, bundle, schema, migration, API, componente ou estilo de produção deve mudar.
- Nenhuma dependência ou configuração precisa mudar.
- Não há impacto de deploy; a feature é editorial e estrutural.

### Custos

- Links e hábitos baseados em `docs/design/product.md`, `docs/design/brand-spec.md` e `AGENT.md` precisarão ser atualizados.
- `COPY.md` exige revisão humana cuidadosa para não competir com conteúdo legal.
- O catálogo do Open Design adiciona manutenção de status; seus campos precisam permanecer poucos e objetivos.
- Symlinks exigem atenção em ambientes que não os materializam corretamente.

## Riscos e mitigações

| Risco | Severidade | Mitigação |
| --- | --- | --- |
| Interpretar a feature como redesign e alterar UI | Alta | Whitelist de paths documentais e revisão explícita de `git diff --name-only`. |
| Manter `AGENT.md` singular como se fosse o alias padrão | Alta | Renomear para `AGENTS.md`, seguindo o upstream; reservar `AGENT.md` para `.compozy/agents/<nome>/`. |
| Duplicar conteúdo completo entre raiz e `docs/design/` | Alta | Usar moves; READMEs apenas apontam e catalogam. |
| Criar uma segunda fonte manual de tokens em `DESIGN.md` | Alta | Declarar `app/globals.css` como fonte executável e limitar o documento a contrato/racional. |
| Criar `tokens.css` manual para Open Design e introduzir drift | Alta | Adiar o pacote; em feature futura, gerar ou validar a projeção em uma única direção. |
| Quebrar links ao mover os contratos | Média | Inventariar referências com `rg` antes/depois e validar todos os destinos. |
| Quebrar protótipos ao reorganizar pastas | Média | Não mover nem editar HTML/assets nesta feature; organizar por catálogo. |
| Perder histórico Git por delete/recreate | Média | Aplicar moves pequenos e verificar detecção de rename em `git diff --summary`. |
| `CLAUDE.md` continuar monolítico e divergir | Média | Manter apenas regras operacionais e roteamento; mover decisões duráveis para os três contratos. |
| `COPY.md` conflitar com templates jurídicos e banco | Alta | Declarar limite de autoridade e exigir revisão de domínio. |
| Declarar status incorreto para protótipos | Média | Usar `reference` como estado conservador até decisão humana documentada. |
| Symlink falhar em checkout não Unix | Média | Validar o ambiente da equipe; se necessário, usar um arquivo curto de delegação em vez de duplicar instruções. |
| Copiar a estética ou topologia técnica do CompozyOS | Alta | Importar somente separação de responsabilidades; identidade e stack ANSP permanecem soberanas. |
| Alterações não relacionadas entrarem no diff | Alta | Trabalhar no worktree dedicado e conferir status/diff por path antes de concluir. |

## Sequência recomendada para implementação futura

1. Criar/reutilizar o worktree dedicado `reorganize-design` somente após aprovação desta análise.
2. Registrar a baseline e a whitelist de caminhos documentais.
3. Mover `docs/design/product.md` para `PRODUCT.md` com preservação de histórico.
4. Mover `docs/design/brand-spec.md` para `DESIGN.md` e reorganizar apenas o conteúdo documental comprovado.
5. Criar `COPY.md` a partir das regras duráveis existentes, marcando qualquer decisão institucional pendente.
6. Enxugar `CLAUDE.md` para operar como roteador e atualizar sua ordem de leitura.
7. Remover `AGENT.md` e criar `AGENTS.md -> CLAUDE.md`.
8. Atualizar `README.md`, `docs/design/README.md` e todos os links Markdown.
9. Enriquecer `docs/design/opendesign/README.md` com catálogo e status conservadores, sem tocar nos protótipos.
10. Verificar symlink, links, referências, histórico de renomes e whitelist do diff.
11. Registrar como follow-up separado o pacote importável do Open Design, a sincronização de tokens e qualquer reorganização física dos protótipos.

## Critérios de aceite sugeridos

- `PRODUCT.md`, `DESIGN.md` e `COPY.md` existem na raiz e têm autoridades não sobrepostas.
- `CLAUDE.md` continua sendo a única instrução canônica e referencia os contratos, sem repetir seu conteúdo integral.
- `AGENTS.md` existe e aponta para `CLAUDE.md`; `AGENT.md` não permanece solto na raiz.
- Não existe definição de agente Compozy fora de `.compozy/agents/<nome>/AGENT.md`.
- `docs/design/product.md` e `docs/design/brand-spec.md` deixam de existir como cópias concorrentes.
- `docs/design/README.md` funciona apenas como índice.
- `docs/design/opendesign/README.md` cataloga todas as cinco entradas, seus assets, status e autoridade.
- Os HTMLs e assets permanecem byte a byte inalterados e nos mesmos caminhos nesta feature.
- Todas as referências Markdown aos caminhos antigos são atualizadas e resolvem para arquivos existentes.
- `app/`, `components/`, `lib/`, `drizzle/`, `scripts/`, testes, configurações e dependências não aparecem no diff.
- `git diff --check` passa.
- `git diff --summary` demonstra moves/renomes quando aplicável.
- O diff final contém apenas documentação e aliases de instrução previstos.
- Não há commit, push ou deploy sem os gates posteriores e a decisão humana exigida pelo Loop.

## Recomendação final

Prosseguir com a reorganização, mas tratá-la como uma migração de contratos documentais, não como redesign nem como integração completa do Open Design.

A primeira entrega deve convergir para `PRODUCT.md`, `DESIGN.md`, `COPY.md`, `CLAUDE.md` e `AGENTS.md -> CLAUDE.md` na raiz, mantendo `docs/design/opendesign/` intacto e catalogado. Essa estrutura replica a separação de responsabilidades do `compozy/compozy`, corrige a ambiguidade do `AGENT.md` singular e atende ferramentas que descobrem contexto na raiz.

O pacote importável do Open Design deve ser deliberadamente adiado. Quando for priorizado, deverá usar o contrato então vigente (`manifest.json`, `DESIGN.md`, `tokens.css`) e uma projeção verificável de `app/globals.css`, sem edição manual concorrente. Da mesma forma, qualquer agente especializado, mudança no Loop, sincronização de tokens, movimento de protótipos ou correção de UI deve ser planejado em features separadas.

## Fontes consultadas

### Repositório local

- Baseline `74819baf35ad6bcaa5d11faf52ee70e22b6a8581`.
- Reorganização anterior `fce7fda1b2234325f14412d600758b96e7fde8e9`.
- `CLAUDE.md`, `AGENT.md`, `README.md`.
- `docs/design/README.md`, `docs/design/product.md`, `docs/design/brand-spec.md`.
- `docs/design/opendesign/README.md` e os cinco protótipos HTML.
- `app/globals.css`, `components/ui/seal-logo.tsx`, `app/page.tsx` e `__tests__/brand-tokens.test.ts` somente como evidência; nenhuma alteração proposta.
- `.impeccable/critique/2026-06-17T17-55-26Z__app-admin.md`, `skills-lock.json` e o roteamento local de contexto da skill versionada.

### Referências externas verificadas e revalidadas em 2026-08-25

- Compozy `PRODUCT.md`: <https://github.com/compozy/compozy/blob/main/PRODUCT.md>
- Compozy `DESIGN.md`: <https://github.com/compozy/compozy/blob/main/DESIGN.md>
- Compozy `COPY.md`: <https://github.com/compozy/compozy/blob/main/COPY.md>
- Compozy `CLAUDE.md`: <https://github.com/compozy/compozy/blob/main/CLAUDE.md>
- Compozy `AGENTS.md` como symlink: <https://github.com/compozy/compozy/blob/main/AGENTS.md>
- Definições `AGENT.md` do CompozyOS: <https://github.com/compozy/compozy/blob/main/packages/site/content/docs/configuration/agent-md.mdx>
- Open Design — authoring guide: <https://github.com/nexu-io/open-design/blob/main/docs/design-systems.md>
- Open Design — Design System Import Project: <https://github.com/nexu-io/open-design/blob/main/specs/current/design-system-import-project.md>
- Open Design — schema do manifest: <https://github.com/nexu-io/open-design/blob/main/design-systems/_schema/manifest.schema.ts>
