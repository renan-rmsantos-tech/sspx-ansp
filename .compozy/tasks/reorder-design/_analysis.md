# Análise da feature `reorder-design`

## Resumo executivo

O repositório já possui os insumos certos — contexto de produto, especificação de marca, tokens em produção, protótipos HTML e assets —, mas eles estão distribuídos de uma forma que reduz sua descoberta por agentes e cria fontes concorrentes de verdade. A reorganização feita no commit `fce7fda` moveu o antigo `PRODUCT.md` da raiz para `docs/design/product.md`; isso diverge justamente do padrão atual do repositório de referência `compozy/compozy`, que mantém `PRODUCT.md`, `DESIGN.md` e `COPY.md` na raiz e reserva `docs/design/` para protótipos, handoffs e imagens de trabalho.

A recomendação é adotar esse padrão de responsabilidades, adaptado à escala do ANSP:

1. `PRODUCT.md` na raiz para usuários, propósito, registros por superfície, princípios e limites de produto.
2. `DESIGN.md` na raiz para a gramática visual durável, incluindo marca, tokens semânticos, tipografia, layout, componentes, estados, motion, acessibilidade, iconografia/imagens e anti-padrões.
3. `COPY.md` na raiz para voz, vocabulário, microcopy, CTAs, mensagens de erro e regras específicas de pt-BR e do domínio sensível de bolsas.
4. `app/globals.css` permanece a fonte executável canônica dos tokens usados pela aplicação; `DESIGN.md` explica o contrato e deve ser mantido sincronizado por uma verificação explícita, sem criar uma segunda folha de tokens manual na primeira etapa.
5. `docs/design/opendesign/` permanece como área de protótipos Open Design, organizada por superfície e ciclo de vida, com um README que declara entradas, status e hierarquia de verdade.
6. O prompt raiz (`CLAUDE.md`/`AGENT.md`) deve funcionar como roteador curto; o processo de System Design deve ficar em um agente/skill especializado e efetivamente registrado no workspace, não apenas presente como arquivo nem duplicado em cada prompt de workflow.
7. Spec, `_uiux.md` e tarefas de frontend devem carregar referências explícitas aos contratos raiz e aos artifacts Open Design aprovados, incluindo estados, viewports, deltas autorizados e evidência visual esperada. O contrato visual robusto já existente no `cy-create-tasks` efetivo deve ser preservado e adaptado, não recriado em paralelo.

Esta feature deve reorganizar e fortalecer os contratos de design; não deve redesenhar a interface, alterar regras de negócio nem tentar converter os HTMLs estáticos diretamente em componentes React.

## Objetivos

- Tornar os contratos de produto, design e linguagem imediatamente descobríveis na raiz do repositório.
- Seguir a separação de responsabilidades observada no `compozy/compozy`, sem importar a estética, a stack ou a complexidade daquele monorepo.
- Preparar o repositório para ser usado no Open Design com contexto estável, explícito e reutilizável.
- Eliminar ambiguidade sobre qual artefato vence em caso de conflito entre produção, especificação e protótipo.
- Preservar integralmente a identidade ANSP já adotada: navy, gold, warm paper, serif institucional, sans de sistema, selo circular e imaginário sacro.
- Tornar drift de tokens, assets, acessibilidade e referências detectável antes que um protótipo seja tratado como contrato de implementação.
- Manter os protótipos como evidência visual e de fluxo, sem promovê-los a código de produção.
- Fazer o planejamento de UX/UI sobreviver ao handoff entre análise, Spec, tarefas, implementação e revisão, sem depender da memória da sessão que operou o Open Design.
- Separar contexto durável do projeto, processo reutilizável de design e briefing específico de cada feature.

## Estado atual verificado

### Documentação e artefatos

- `docs/design/brand-spec.md` contém uma especificação curta de paleta, tipografia, logo e postura.
- `docs/design/product.md` contém usuários, personalidade, anti-referências e princípios estratégicos; seu conteúdo descende do antigo `PRODUCT.md` da raiz.
- `docs/design/README.md` define a hierarquia atual como produção → especificação → protótipos.
- `docs/design/opendesign/` contém cinco protótipos HTML (`index`, `formulario`, `admin`, `login`, `design-system`) e quatro assets de imagem relevantes.
- `app/globals.css` define os tokens Tailwind/shadcn usados pela maior parte da aplicação e é declarado pela documentação como fonte canônica de implementação.
- `__tests__/brand-tokens.test.ts` protege apenas parte da paleta, as stacks tipográficas e o raio médio; não verifica sincronização com documentação ou protótipos.

### Fontes concorrentes e drift já existente

- A landing em `app/page.tsx` replica paleta, tipografia, raios e grande quantidade de CSS dentro de uma string local, em vez de consumir apenas os tokens de `app/globals.css`.
- `components/ui/seal-logo.tsx` contém cores e tipografia da marca hard-coded.
- `admin.html`, `formulario.html` e `login.html` usam `--fg: oklch(25% 0.06 250)` e `--muted: oklch(50% 0.03 250)`, enquanto `app/globals.css`, `design-system.html` e `index.html` usam respectivamente `22%` e `48%`.
- Os mesmos protótipos usam `--success: oklch(48% 0.14 155)` e `--warn: oklch(62% 0.14 75)`, enquanto a fonte de produção usa `52%` e `68% 0.14 70`.
- Os assets `base1.png`, `base2.png` e `mqjmgzod-logo.png` existem tanto em `public/` quanto em `docs/design/opendesign/`; os pares são byte a byte idênticos hoje. Essa duplicação é funcionalmente justificável — runtime versus protótipo estático —, mas não tem política de origem/sincronização documentada.
- `docs/design/product.md` aponta para assets dentro de `opendesign/`, embora as superfícies de produção usem os equivalentes em `public/`.

### Descoberta por agentes

- `CLAUDE.md` direciona o agente para `docs/design/README.md`, mas não há `DESIGN.md`, `PRODUCT.md` ou `COPY.md` na raiz.
- O padrão local atual exige que o agente conheça uma convenção interna antes de encontrar o contexto visual e de produto.
- O commit recente que reorganizou a documentação tornou a pasta `docs/design/` mais limpa, mas afastou `PRODUCT.md` do padrão raiz usado no repositório de referência e esperado por fluxos orientados a `DESIGN.md`.

### Agentes, skills e prompts

- `AGENT.md` é um symlink para `CLAUDE.md` e funciona como instrução do repositório, não como uma definição de agente Compozy. Não existe no workspace uma definição versionada de agente `designer`/System Design nem um prompt dedicado de handoff visual.
- `CLAUDE.md` contém contexto correto do domínio e aponta genericamente para `docs/design/`, mas não define uma rota obrigatória para trabalho de UI nem diz quais artifacts uma Spec ou task deve consumir.
- A cópia versionada de `impeccable` procura primeiro `PRODUCT.md` e `DESIGN.md` na raiz. Como eles não existem, essa skill cairia em inicialização ou inferência, mesmo com contexto equivalente escondido em `docs/design/`. A crítica persistida em `.impeccable/critique/2026-06-17T17-55-26Z__app-admin.md` já registrou essa ausência.
- Contudo, presença no filesystem não equivale a disponibilidade: o catálogo efetivo consultado nesta execução não expõe `impeccable`, `eng-design`, `ui-craft` nem outro skill de design. Os agentes efetivos são somente `general`, `code_implementer`, `review_fixer` e `reviewer`, todos globais; não há `designer`. Portanto, uma reorganização apenas de `.agents/skills/` não garante que o Loop consiga selecionar a capacidade.
- O Loop atual exige `_uiux.md` quando aplicável, mas delega os detalhes à skill efetiva `cy-create-spec`. O template resolvido dessa skill já exige artboards em `docs/design/opendesign/<slug>/`, estados derivados das stories e mapeamento design → produção, porém está acoplado ao upstream: cita `web/`, `packages/ui/src/tokens.css`, `@compozy/ui`, `web/src/systems/<domain>/`, o agente `designer` e as skills `eng-design` + `ui-craft`. Esses caminhos e capacidades não existem no ANSP.
- A skill efetiva `cy-create-tasks` já é mais madura que os arquivos locais antigos: para UI visível, exige uma tabela `Visual Contract` por estado e viewport e um bundle durável com referência, implementação, lado a lado, diff, comparação e review. Esse comportamento deve ser retido; o problema principal está em fornecer a ela um `_uiux.md` e artifacts locais corretos.
- As skills versionadas em `.agents/skills/` ainda expõem o fluxo antigo `_prd.md` + `_techspec.md`, enquanto o Loop ativo resolve a extensão bundled `spec-cycle` e chama `cy-create-spec`. Essa coexistência entre arquivos legados e skill vencedora aumenta o risco de documentação enganosa, shadowing futuro e resultados diferentes fora do runtime gerenciado.
- Não há hoje um contrato ANSP compartilhado que diga ao System Design quais arquivos de produto/design/copy ler, como devolver o artifact do Open Design ao worktree, como registrar deltas e qual capacidade efetiva será responsável pelo design. A camada de tasks já sabe transportar um contrato visual quando ele existe.

### Diagnóstico de resolução efetiva

| Superfície | Presente no repositório | Efetiva nesta execução | Consequência |
| --- | --- | --- | --- |
| Instrução raiz | `AGENT.md` → `CLAUDE.md` | Sim, como orientação de repo | Deve apenas rotear para contratos e skills. |
| Skill de design | `.agents/skills/impeccable/` | Não apareceu no catálogo efetivo | Não pode ser requisito oculto do fluxo. |
| Criação de Spec | Skills locais antigas de PRD/TechSpec | `cy-create-spec` bundled venceu | O template efetivo precisa de adaptação workspace-scoped. |
| Criação de tasks | Skill local antiga | `cy-create-tasks` bundled venceu | Preservar seu `Visual Contract` e a atribuição exata de testes. |
| Agente System Design | Ausente | Ausente | Criar definição workspace-scoped e validar por catálogo, não por path. |
| Implementação/revisão | Não há arquivos locais de agente | Agentes globais `code_implementer` e `reviewer` | Seus prompts precisam receber referências por task/spec; não devem inferir o design. |

## Padrão de referência verificado

A inspeção tomou como referência a estrutura atual de `compozy/compozy` e conferiu seus contratos raiz em agosto de 2026. O commit citado nas fontes fixa a evidência usada na primeira inspeção; a consulta ao branch `main` confirmou que a separação de responsabilidades continua vigente.

- A raiz contém `PRODUCT.md`, `DESIGN.md` e `COPY.md`, cada um com autoridade distinta.
- `PRODUCT.md` define registro, usuários, propósito, personalidade, anti-referências, princípios e piso de acessibilidade.
- `DESIGN.md` explica a gramática visual e declara uma fonte executável de tokens; no upstream, `packages/ui/src/tokens.css` é canônico e partes de `DESIGN.md` são geradas/verificadas por script.
- `COPY.md` é o contraponto verbal de `DESIGN.md` e governa linguagem pública, nomenclatura, claims, CTAs, microcopy e mensagens de erro.
- `docs/design/opendesign/` é organizado por domínio/superfície, distingue trabalho ativo de `_done/`, aponta entradas primárias e declara a hierarquia `produção > design system > protótipos antigos`.
- `docs/design/generated/` separa imagens geradas dos contratos textuais e dos protótipos.
- O upstream também mantém inventário de primitivas e regras de reuso, mas o ANSP não precisa criar um pacote compartilhado apenas para imitar essa topologia; `components/ui/` já é o inventário adequado à escala atual.

O padrão a importar é a arquitetura de conhecimento — contratos duráveis, fonte executável, projections verificadas, artifacts e roteamento —, não os nomes internos do upstream. Em particular, `web/`, `packages/ui`, `@compozy/ui`, `eng-design` e `ui-craft` não podem vazar para a Spec do ANSP.

Open Design, por sua vez, trata `DESIGN.md` como o contrato central. Seu contrato atual para novos Design System Projects exige um pacote mínimo com `manifest.json`, `DESIGN.md` e `tokens.css`; `DESIGN.md` isolado continua somente como fallback legado. Como a intenção declarada desta feature é usar Open Design de forma recorrente, a Spec deve decidir explicitamente entre (a) importar um pacote mínimo versionado no repositório ou (b) usar apenas arquivos do projeto anexados manualmente. A recomendação é (a), desde que `tokens.css` e qualquer cópia de `DESIGN.md` sejam projeções geradas/validadas da fonte canônica, nunca uma segunda edição manual.

## Arquitetura de conhecimento e handoff recomendada

| Camada | Artefato | Autoridade | Consumidores |
| --- | --- | --- | --- |
| Estratégia e usuários | `PRODUCT.md` | Jobs, registros por superfície, princípios e acessibilidade | Open Design, Spec, UX planning |
| Gramática visual | `DESIGN.md` | Intenção visual, uso de tokens, componentes, estados e anti-padrões | Open Design, designer, implementador, reviewer |
| Linguagem | `COPY.md` | Voz, vocabulário, CTAs, erros e domínio sensível | Spec, protótipos, UI, PDFs quando aplicável |
| Tokens executáveis | `app/globals.css` | Valores usados pela aplicação | Componentes e projeções geradas |
| Pacote Open Design | diretório dedicado com `manifest.json`, `DESIGN.md`, `tokens.css` | Interface importável; dentro do pacote, `tokens.css` é canônico, mas é projeção verificada de `app/globals.css` no repositório | Open Design |
| Plano da feature | `.compozy/tasks/<slug>/_uiux.md` | Fluxos, estados, conteúdo, responsividade, acessibilidade e deltas aprovados | Criador de tasks e execução |
| Referência visual | `docs/design/opendesign/<feature-or-surface>/` | Artifact aprovado e metadados de versão/status | Spec, tasks, implementação, revisão visual |
| Runtime | `app/`, `components/`, testes | Comportamento, dados, segurança e acessibilidade reais | Usuários e verificação |

O handoff deve ser por referência, não por cópia: `_uiux.md` aponta para seções de `PRODUCT.md`/`DESIGN.md`/`COPY.md` e para o artifact aprovado; cada task herda apenas as referências e critérios que afetam seu escopo. Quando o protótipo divergir do runtime por dados, copy legal, componente existente ou restrição técnica, o delta precisa ser registrado em `_uiux.md` antes da implementação.

## Escopo recomendado

### 1. Contratos de raiz

#### `PRODUCT.md`

- Mover/consolidar o conteúdo de `docs/design/product.md` na raiz.
- Preservar o domínio e a linguagem em pt-BR.
- Explicitar que o registro padrão é `product` para formulário, benfeitor, login e admin, enquanto a landing é uma superfície `brand`.
- Separar usuários e jobs por superfície: família solicitante, potencial benfeitor, equipe administrativa e visitante institucional.
- Registrar que dados financeiros/documentais são sensíveis e que clareza, dignidade e ausência de exposição são requisitos de UX.

#### `DESIGN.md`

- Consolidar e expandir `docs/design/brand-spec.md` em um contrato de design raiz.
- Incluir pelo menos: atmosfera, papéis de cor, contraste, tipografia, espaçamento/layout, profundidade, componentes/estados, motion/reduced motion, iconografia e imagens sacras, responsividade, acessibilidade e anti-padrões.
- Referenciar `app/globals.css` como fonte executável canônica e `components/ui/` como inventário de primitivas reutilizáveis.
- Definir a hierarquia de verdade: comportamento e conteúdo reais da aplicação > tokens/componentes de produção > contratos raiz > protótipos Open Design.
- Documentar deltas autorizados entre superfícies `brand` e `product`, evitando que a linguagem editorial da landing seja aplicada indiscriminadamente ao admin ou aos formulários.

#### `COPY.md`

- Criar o contrato verbal, ausente hoje.
- Cobrir voz devota, digna, providencial e acolhedora sem tom comercial, culpa, pressão religiosa ou linguagem paternalista.
- Definir vocabulário canônico do domínio (`solicitação`, `bolsa`, `responsável`, `aluno`, `benfeitor`, `aprovação`, `rejeição`, `percentual de desconto`).
- Definir padrões de CTA, ajuda, validação, erro, estado vazio, confirmação, documentos sensíveis e comunicação administrativa.
- Proibir claims não verificáveis, exposição de dados pessoais, emojis, urgência artificial e eufemismos que escondam consequências.

### 2. Área Open Design

- Manter `docs/design/opendesign/`, mas organizar os protótipos por domínio, por exemplo `landing/`, `form/`, `admin/`, `login/` e `design-system/`.
- Usar um README de catálogo com: superfície, entrada principal, status (`active`, `reference`, `superseded`, `done`), contrato relacionado e observações de paridade.
- Introduzir `_done/` somente quando houver protótipos substituídos ou implementados; não mover tudo para arquivo por convenção vazia.
- Reservar `docs/design/generated/` para imagens geradas pelo Open Design ou por ferramentas de imagem, caso elas passem a existir.
- Manter HTMLs autocontidos quando isso for necessário para abri-los fora do Next.js, mas documentar que os tokens embutidos são snapshots derivados, não autoridade.
- Preservar `.artifact.json` ou metadados equivalentes quando o Open Design os gerar; não inventar arquivos de artifact manualmente.

### 3. Tokens e sincronização

- Manter `app/globals.css` como fonte executável nesta feature.
- Ampliar a verificação existente para comparar os valores duráveis documentados em `DESIGN.md` com a fonte canônica ou, preferencialmente, gerar a tabela de tokens do `DESIGN.md` a partir de `app/globals.css` entre marcadores protegidos.
- Não exigir que todo CSS específico da landing vire token global; somente valores realmente semânticos e reutilizados devem ser promovidos.
- Registrar os tokens específicos de marca ainda hard-coded (`navy-deep`, cores do selo, tons de texto sobre navy) como dívida a ser normalizada em tarefa de implementação separada.

### 4. Referências e instruções

- Atualizar `CLAUDE.md` para apontar diretamente aos três contratos raiz e ao inventário `components/ui/`.
- Atualizar `README.md` e links internos após os moves.
- Simplificar ou remover `docs/design/README.md` se ele se tornar apenas um redirecionador; se mantido, deve catalogar artefatos e não competir com os contratos raiz.
- Atualizar o ignore de lint somente se a reorganização mudar o caminho dos protótipos.

### 5. Agente e prompts de System Design

- Manter `CLAUDE.md`/`AGENT.md` como roteador: para qualquer mudança de UI, exigir leitura de `PRODUCT.md`, `DESIGN.md`, `COPY.md`, inventário de `components/ui/` e `_uiux.md`/artifact da feature quando existirem.
- Criar uma definição de agente de design no escopo do workspace, usando a superfície pública de agentes do Compozy, com responsabilidade limitada a descoberta, design no Open Design, crítica e handoff; não embutir todo o design system no prompt do agente. A implementação deve validar que o agente aparece no catálogo efetivo antes de conectá-lo ao Loop.
- Fazer o agente especializado carregar o processo via uma skill realmente resolvida (`impeccable` após instalação/ativação comprovada, ou uma skill workspace-scoped equivalente) e o contexto via arquivos do projeto. Skill contém método; `PRODUCT.md`/`DESIGN.md`/`COPY.md` contêm decisões duráveis; `_uiux.md` contém decisões da feature.
- Padronizar a saída de design por feature: objetivo, persona/contexto, jornada, arquitetura de informação, estados, copy, responsividade, acessibilidade, artifact(s), deltas autorizados e critérios de paridade.
- Adaptar workspace-scoped o template de `_uiux.md` da `cy-create-spec`: trocar as suposições do upstream por `app/`, `components/ui/`, `app/globals.css` e pelos contratos ANSP; manter inventário de superfícies, estados, stories, artboards e mapeamento para produção.
- Preservar o contrato já fornecido pela `cy-create-tasks`: cada task visual recebe linhas explícitas por estado/viewport e evidência durável. Alterar o gerador somente no necessário para apontar aos artifacts ANSP e ao mecanismo de captura realmente disponível.
- Atualizar os prompts de execução e review para ler o mesmo conjunto e avaliar os deltas autorizados, sem reabrir decisões aprovadas. A revisão visual deve ser um gate verificável quando houver UI, não uma frase genérica em um prompt.
- Evitar prompts monolíticos e específicos de provider. O prompt deve declarar responsabilidade, ordem de leitura, outputs e gates; detalhes operacionais reutilizáveis permanecem em skills/referências.

### 6. Pipeline de System Design proposta

1. A análise identifica se a feature é UI-bearing e quais contratos duráveis se aplicam.
2. A Spec produz `_uiux.md` já localizado para o ANSP, com superfícies, estados, viewports, copy e nomes esperados de artboard.
3. Um gate humano aprova o plano de UX/UI antes da produção visual, quando a feature exigir decisão de produto.
4. O agente workspace-scoped de System Design lê os contratos raiz e `_uiux.md`, trabalha no Open Design e devolve os artifacts ao diretório versionado da feature.
5. Um gate visual humano aprova os artifacts e registra deltas autorizados; paths e revisão ficam persistidos em `_uiux.md`, sem depender do histórico da conversa.
6. `cy-create-tasks` transforma cada estado/viewport aprovado em linhas de `Visual Contract` nas tasks relevantes.
7. Implementação gera os bundles de evidência; revisão compara referência, implementação e diferenças autorizadas.

O Loop não precisa duplicar o método da skill. Ele precisa apenas ordenar os papéis, exigir outputs tipados e bloquear avanço quando artifact, aprovação ou evidência obrigatória estiver ausente.

### 7. Pacote e artifacts Open Design

- Criar um pacote mínimo importável e versionado no repositório se o fluxo aprovado for importação local/GitHub: `manifest.json`, `DESIGN.md` e `tokens.css`, seguindo o schema vigente do Open Design.
- Escolher uma direção única de geração. Recomendação: `app/globals.css` fornece valores executáveis; um script gera a projeção normalizada `tokens.css` e as regiões de tokens de `DESIGN.md`; o restante da prosa continua revisável.
- Não usar symlinks como contrato de integração sem provar suporte no importador do Open Design. Preferir arquivos materiais gerados com check de drift.
- Persistir cada artifact aprovado dentro da pasta da feature/superfície, junto de metadados mínimos: origem, data/revisão, status, viewport(s), contratos usados e artifact substituído.
- Separar `active/` de `_done/` apenas quando houver lifecycle real; com cinco HTMLs, um catálogo simples e pastas por superfície são suficientes.

## Fora de escopo

- Alterar aparência, layout, conteúdo ou comportamento das telas em produção.
- Converter protótipos HTML em React/Next.js.
- Introduzir um monorepo, criar `packages/ui` ou replicar a arquitetura técnica do `compozy/compozy`.
- Adotar as cores, tipografia ou estética do CompozyOS.
- Trocar a identidade ANSP ou reavaliar os assets religiosos já aprovados.
- Resolver nesta feature todo hard-coded visual de `app/page.tsx` e `seal-logo.tsx`; esses pontos devem ser inventariados e encaminhados a uma etapa de implementação posterior.
- Criar o perfil rico opcional do Open Design (`components.html`, previews, source evidence) sem necessidade comprovada; o pacote mínimo recomendado permanece em escopo.
- Fazer deploy.
- Alterar agentes globais do operador; qualquer definição especializada desta feature deve ser workspace-scoped.

## Dependências

### Técnicas

- `app/globals.css` e o contrato Tailwind CSS 4/shadcn atualmente usado.
- `__tests__/brand-tokens.test.ts` como gate inicial a ser evoluído, não duplicado.
- `components/ui/` como inventário atual de primitivas.
- Caminhos de assets em `public/` e referências relativas dos HTMLs estáticos.
- `eslint.config.mjs`, que ignora `docs/design/opendesign/**`.
- Links em `CLAUDE.md`, `README.md` e nos próprios documentos de design.

### De produto e conteúdo

- Validação humana dos termos institucionais e religiosos.
- Validação de quem é a entidade exibida em cada superfície (ANSP, ACIPEC, Colégio São José e FSSPX), pois há nomes e CNPJs distintos no domínio.
- Decisão explícita sobre manter ou não um contrato verbal `COPY.md` abrangendo também textos legais/PDFs; a recomendação é que ele governe voz e nomenclatura, mas não substitua templates jurídicos ou registros do banco.

### De ferramenta

- Open Design para novos protótipos e artifacts.
- Para o pacote importável recomendado: `manifest.json`, `DESIGN.md` e `tokens.css` consistentes; `components.html`/previews ricos entram apenas quando agregarem valor e devem ser derivados/validados.
- Resolver no início da Spec como o Open Design devolverá os arquivos ao worktree (import local, GitHub ou export manual) e qual comando/check detectará drift.
- Catálogo efetivo de agentes/skills do Compozy no workspace, para evitar depender de nomes globais ou de uma versão shadowed da skill.
- Ferramenta de captura/comparação visual compatível com o ambiente efetivo. A `cy-create-tasks` cita `eng-ui-screenshot`; se ela não estiver disponível, a Spec deve escolher uma alternativa equivalente antes de gerar tasks, em vez de aceitar evidência informal.

## Impactos esperados

### Positivos

- Agentes e pessoas encontram produto, design e copy sem navegar por uma convenção específica do projeto.
- Open Design recebe um contrato visual mais completo e menos ambíguo.
- Diminui o risco de protótipos antigos redefinirem tokens ou regras de UX.
- Mudanças futuras de marca ganham um fluxo auditável entre CSS, documentação, protótipo e implementação.
- A separação entre landing institucional e superfícies operacionais fica explícita.
- Acessibilidade e tratamento digno de dados sensíveis passam de notas dispersas a requisitos verificáveis.

### Custos e migração

- Todos os links para `docs/design/product.md` e `docs/design/brand-spec.md` precisarão ser atualizados.
- A organização por subpastas muda caminhos relativos de imagens nos HTMLs; moves devem preservar sua execução local ou ajustar referências conjuntamente.
- Se os arquivos antigos forem mantidos como cópias, surgirá drift; a migração deve usar moves ou stubs mínimos temporários, nunca duplicação permanente.
- Uma verificação de sincronização exigirá manutenção quando novos tokens semânticos forem adicionados.
- O catálogo Open Design ganhará mais estrutura, o que precisa ser proporcional ao pequeno número atual de protótipos.

## Riscos e mitigações

| Risco | Severidade | Mitigação recomendada |
| --- | --- | --- |
| Copiar a estética/arquitetura do CompozyOS em vez do padrão documental | Alta | Declarar explicitamente que a referência é estrutural; a identidade ANSP continua soberana. |
| Criar duas fontes canônicas de tokens (`globals.css` e `tokens.css`) | Alta | Manter uma única fonte executável; gerar/validar qualquer projeção futura. |
| Tratar protótipo como especificação de comportamento ou conteúdo | Alta | Hierarquia explícita e deltas autorizados; produção e contratos do domínio vencem. |
| Quebrar assets relativos ao mover HTMLs | Média | Fazer inventário de referências e abrir cada entrada por servidor estático após os moves. |
| Perder histórico com delete/recreate | Média | Usar moves reconhecíveis pelo Git e alterações pequenas de conteúdo. |
| Introduzir `COPY.md` que conflita com textos jurídicos | Média | Limitar sua autoridade a voz/nomenclatura; contratos e templates legais permanecem fontes próprias. |
| Automatizar parsing frágil de CSS | Média | Usar marcadores claros ou parser apropriado; evitar regex ampla como fonte de geração silenciosa. |
| Expandir demais a taxonomia para cinco HTMLs | Média | Criar apenas diretórios por superfície que tenham entrada real; `_done/` e `generated/` entram quando usados. |
| Drift entre assets duplicados em `public/` e Open Design | Baixa/Média | Documentar ownership e adicionar verificação de hash se ambos precisarem permanecer idênticos. |
| Reorganização misturada com redesign visual | Alta | Dividir documentação/estrutura, normalização técnica e redesign em tarefas separadas. |
| Prompt raiz virar um manual monolítico e divergir das skills | Alta | Deixar no raiz somente roteamento, ordem de leitura e regras invariantes; método detalhado vive na skill especializada. |
| Spec mencionar UX/UI sem transportar artifact e estados para as tasks | Alta | Tornar referências e critérios visuais campos obrigatórios de `_uiux.md` e das tasks frontend. |
| Definição local de agente depender de agentes/skills globais invisíveis ao repositório | Média | Usar agente workspace-scoped e validar o catálogo efetivo/precedência no mesmo ambiente do Loop. |
| Template efetivo de `_uiux.md` carregar caminhos e agentes do upstream | Alta | Criar adaptação workspace-scoped e testar o arquivo gerado contra a topologia real do ANSP. |
| Arquivo de skill existir, mas não estar ativo/resolvido | Alta | Validar skill e agente via catálogo nativo; falhar cedo quando a capacidade requerida não estiver efetiva. |
| Perder o `Visual Contract` já oferecido pela skill bundled ao substituir a skill inteira | Alta | Preferir override mínimo/rebase rastreável e cobrir o schema das tasks com testes de contrato. |
| Tasks exigirem `eng-ui-screenshot` sem a ferramenta disponível | Alta | Resolver a capacidade antes da decomposição ou adaptar explicitamente o mecanismo de evidência. |
| Open Design sobrescrever valores canônicos ao reimportar/exportar | Alta | Fluxo unidirecional para tokens, arquivos gerados protegidos e check de drift antes de aceitar artifacts. |

## Sequência recomendada para a futura implementação

1. Criar os três contratos raiz consolidando o conteúdo existente sem mudar decisões visuais.
2. Fixar a hierarquia de verdade e o papel de `app/globals.css`, `components/ui/` e `docs/design/opendesign/`.
3. Adaptar o template efetivo de `_uiux.md` para a topologia ANSP e definir o contrato de handoff (`_uiux.md` + artifact + deltas + evidência).
4. Criar e validar no catálogo o agente e a skill workspace-scoped de System Design, mantendo o prompt raiz como roteador.
5. Criar a projeção mínima importável do Open Design, gerada a partir da fonte canônica, e provar o round-trip escolhido.
6. Conectar o agente ao Loop com gates distintos para plano UX/UI e artifact visual; preservar o `Visual Contract` das tasks.
7. Atualizar instruções e links do repositório.
8. Reorganizar protótipos por superfície com moves preservadores de histórico e README de catálogo.
9. Adicionar verificação de links, assets, schema Open Design e sincronização dos tokens duráveis.
10. Validar cada HTML por servidor estático e executar os gates normais do repositório.
11. Somente depois abrir tarefas separadas para remover duplicação de tokens da landing e hard-coded do selo, caso aprovadas no escopo técnico.

## Critérios de aceite sugeridos

- `PRODUCT.md`, `DESIGN.md` e `COPY.md` existem na raiz e não possuem cópias concorrentes integrais.
- `DESIGN.md` cobre todas as áreas mínimas necessárias ao Open Design e aponta para a fonte executável correta.
- `CLAUDE.md` e `README.md` refletem a nova arquitetura.
- O agente de System Design existe no catálogo efetivo do workspace, lê os contratos raiz e produz o handoff padronizado sem conter cópias integrais desses contratos em seu prompt.
- A skill de design requerida aparece ativa no catálogo efetivo; a pipeline falha cedo e de forma legível se ela ou a ferramenta de evidência visual estiver indisponível.
- `_uiux.md` não contém caminhos, packages, agentes ou tokens específicos do upstream; referencia artifacts Open Design, estados, viewports, requisitos de acessibilidade e deltas autorizados.
- Tasks frontend preservam essas referências em linhas explícitas de `Visual Contract` e exigem bundles de evidência reproduzíveis.
- O catálogo de `docs/design/opendesign/` identifica superfície, entrada, status e autoridade.
- O pacote Open Design mínimo valida no schema vigente e sua projeção de tokens não pode divergir silenciosamente de `app/globals.css`.
- Todos os HTMLs e seus assets continuam abrindo sem erro após os moves.
- Não há alteração visual ou comportamental na aplicação nesta feature.
- Os testes existentes continuam passando e há um gate proporcional contra drift de tokens/links.
- O diff preserva arquivos não relacionados e não inclui deploy.

## Recomendação final

Prosseguir com a reorganização, usando o `compozy/compozy` como referência de **arquitetura de conhecimento e roteamento de agentes**: contratos raiz para produto/design/copy, fonte executável separada, inventário de componentes, agente especializado e protótipos organizados como evidência. Não replicar a arquitetura de monorepo do upstream.

A decisão técnica mais importante é evitar uma nova fonte manual de tokens. Consolidar `PRODUCT.md`, `DESIGN.md` e `COPY.md`, manter `app/globals.css` canônico no repositório e gerar a projeção mínima exigida pelo Open Design (`manifest.json` + `DESIGN.md` + `tokens.css`) de forma determinística. Dentro do pacote importável, `tokens.css` satisfaz o contrato do Open Design; fora dele, não compete com a fonte de produção.

Em paralelo, tornar o handoff visual parte do contrato da pipeline: a Spec inventaria o trabalho em `_uiux.md`; o agente de System Design produz artifacts aprováveis; o gate humano registra aprovação e deltas; tasks, implementação e revisão consomem tudo por referência. A solução deve adaptar o fluxo efetivo já existente, eliminando suas suposições de topologia do upstream e preservando seu contrato visual mais forte.

## Fontes consultadas

- Repositório local no commit `74819baf35ad6bcaa5d11faf52ee70e22b6a8581`.
- `compozy/compozy` no commit de referência `a7a89709d749eb1c803135afb0c0cf81d3952575`, com reconfirmação no branch `main` em 2026-08-24:
  - <https://github.com/compozy/compozy/blob/a7a89709d749eb1c803135afb0c0cf81d3952575/PRODUCT.md>
  - <https://github.com/compozy/compozy/blob/a7a89709d749eb1c803135afb0c0cf81d3952575/DESIGN.md>
  - <https://github.com/compozy/compozy/blob/a7a89709d749eb1c803135afb0c0cf81d3952575/COPY.md>
  - <https://github.com/compozy/compozy/blob/a7a89709d749eb1c803135afb0c0cf81d3952575/CLAUDE.md>
  - <https://github.com/compozy/compozy/blob/a7a89709d749eb1c803135afb0c0cf81d3952575/docs/design/opendesign/README.md>
- Open Design:
  - <https://github.com/nexu-io/open-design/blob/main/docs/design-systems.md>
  - <https://github.com/nexu-io/open-design/blob/main/specs/current/design-system-import-project.md>
  - <https://github.com/nexu-io/open-design/blob/main/design-systems/_schema/manifest.schema.ts>
- Catálogo efetivo do runtime Compozy desta execução: agentes `general`, `code_implementer`, `review_fixer`, `reviewer`; skills bundled `cy-create-spec` e `cy-create-tasks`, incluindo `references/uiux-template.md` e `references/task-template.md`.
