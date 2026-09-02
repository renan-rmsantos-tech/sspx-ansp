# Deep Review — worktree:origin/main (round 1)

**Verdict: FIX_BEFORE_SHIP** — 0 Critical and 4 Major findings remain open; each names a bounded fix
**Defects: 6** (🔴 0 · 🟠 4 · 🟡 2) · advisories: 12 · duplicates: 0 · resolved since last round: 0 · merged duplicate reports: 1

<!-- deep-review:walkthrough -->

## Walkthrough

Review of the donor-first public routes, mandatory scholarship evidence, staff-role access controls, and persisted issued documents.

## Changes

Role-aware staff authorization, immutable issued-document records, canonical public URLs, and mandatory upload validation.

## Estimated code review effort

High: the change spans authorization, database migration, public submissions, and admin workflows.

## Review details

The review checks security, migrations, tests, consistency, and specification parity against the Compozy artifacts.

## Findings

### `app/admin/_actions/admin-actions.ts`

_⚠️ Potential issue_ | _🟠 Major_ | _⚡ Quick win_

**Falha ao registrar emissão final não é protegida pelos testes de exportação.**

Premise: app/admin/_actions/admin-actions.ts:551-555 e :806-810 devem transformar uma falha de persistIssuedDocument em erro sem devolver PDF. → Path: os cenários de sucesso em __tests__/admin-actions.test.ts:578-610 e :716-741 agora observam a inserção, mas não forçam a falha da escrita nem verificam que exportDecision/exportContract não retornam pdfBase64. → Verdict: remover o catch, devolver o PDF após erro de persistência ou deixar de propagar essa falha mantém a suíte verde, contrariando a garantia de que toda emissão final é auditável.

Certificate: Premise: app/admin/_actions/admin-actions.ts:551-555 e :806-810 só devem retornar PDF após persistIssuedDocument. → Path: __tests__/admin-actions.test.ts:578-632 e :716-753 não configuram falha de escrita para as actions. → Verdict: o contrato de retorno diante de persistência falha não é protegido.

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In app/admin/_actions/admin-actions.ts around lines 551-555, correct the failure mode described in the finding at the owning layer
Reference anchor: app/admin/_actions/admin-actions.ts:551; rules: review evidence.
```
</details>
<!-- deep-review:fp:bd1102fa8e96141b -->

### `app/admin/benfeitores/client.tsx`

_⚠️ Potential issue_ | _🟠 Major_

**Lista operacional de benfeitores da Secretaria não é testada.**

Premise: app/admin/benfeitores/client.tsx:93-100 introduz o único cliente de benfeitores para o papel Secretaria, incluindo a filtragem que delimita a operação sem CPF. → Path: nenhum arquivo em __tests__ importa ou renderiza SecretariatDonorsClient. → Verdict: quebrar a busca, a lista vazia ou a renderização dos dados operacionais mantém os  testes verdes e deixa o novo fluxo de trabalho indisponível ou incorreto.

Certificate: Premise: app/admin/benfeitores/client.tsx:93-100 contém busca e lista específicas para Secretaria. → Path: rg -n "SecretariatDonorsClient" __tests__ não encontra qualquer importação ou renderização. → Verdict: a lista operacional não tem proteção de regressão.

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In app/admin/benfeitores/client.tsx around lines 93-100, correct the failure mode described in the finding at the owning layer
Reference anchor: app/admin/benfeitores/client.tsx:93; rules: review evidence.
```
</details>
<!-- deep-review:fp:d0fee2c96c5c1cea -->

### `app/admin/solicitacoes/client.tsx`

_⚠️ Potential issue_ | _🟠 Major_

**Acompanhamento da Secretaria não testa carregamento nem download.**

Premise: app/admin/solicitacoes/client.tsx:91-124 carrega observações e documentos finais ao abrir o cartão e usa getIssuedDocumentUrl para baixar o documento. → Path: __tests__/solicitacoes-client.test.tsx:614-644 só abre o cartão e grava uma nota; o título "Documentos finais" é renderizado independentemente da Promise, e o teste não fornece documento, não observa getApplicationObservations/getCurrentIssuedDocuments nem aciona getIssuedDocumentUrl. → Verdict: remover o useEffect, a busca de documentos ou o download mantém a suíte verde e quebra o acompanhamento operacional da Secretaria.

Certificate: Premise: app/admin/solicitacoes/client.tsx:91-124 chama getApplicationObservations, getCurrentIssuedDocuments e getIssuedDocumentUrl. → Path: __tests__/solicitacoes-client.test.tsx:614-644 só verifica a nota, sem expectativa para essas chamadas ou download. → Verdict: a regressão permanece sem teste capaz de falhar.

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In app/admin/solicitacoes/client.tsx around lines 103-140, correct the failure mode described in the finding at the owning layer
Reference anchor: app/admin/solicitacoes/client.tsx:103; rules: review evidence.
```
</details>
<!-- deep-review:fp:97aedbdddf7c690c -->

### `lib/documents/issued-documents.ts`

_⚠️ Potential issue_ | _🟠 Major_ | _⚡ Quick win_

**Ordem do lock de versão ainda não é observável na suíte.**

Premise: lib/documents/issued-documents.ts:23-29 depende de FOR UPDATE ocorrer antes da leitura da versão mais recente para serializar reemissões concorrentes. → Path: __tests__/issued-documents.test.ts:15-22 só exige que transactionExecute tenha sido chamado uma vez; __tests__/helpers/fake-db.ts:123-125 não registra a ordem entre execute e query. → Verdict: mover o lock para depois de findFirst, ou consultar antes de bloquear, continua aprovando a suíte e permite versões duplicadas sob concorrência.

Certificate: Premise: lib/documents/issued-documents.ts:23-34 exige lock antes de findFirst para serializar versões. → Path: __tests__/issued-documents.test.ts:15-22 verifica somente a contagem de transactionExecute. → Verdict: a ordem que garante concorrência não é observada.

<details>
<summary>🤖 Prompt for AI Agents</summary>

```
Verify this finding against the current code and fix it only if still valid.
In lib/documents/issued-documents.ts around lines 23-29, correct the failure mode described in the finding at the owning layer
Reference anchor: lib/documents/issued-documents.ts:23; rules: review evidence.
```
</details>
<!-- deep-review:fp:36f76c5c004d58a8 -->

### `drizzle/0006_flimsy_spacker_dave.sql`

_⚠️ Potential issue_ | _🟡 Minor_ | _⚡ Quick win_

**Banco aceita metadados não-PDF para documento emitido.**

Premise: `issued_documents.mime_type` é uma coluna `text` sem restrição e a migração só limita `kind`, versão e tamanho nas linhas 20–22. → Path: uma inserção administrativa, script de manutenção ou futura alteração que grave `mime_type = 'text/html'` é aceita pelo PostgreSQL; a listagem e o download de documentos emitidos passam a tratar esse registro como um documento final válido. → Verdict: a invariante especificada de que cada documento emitido é `application/pdf` não é preservada pelo banco.

Certificate: Premise: drizzle/0006_flimsy_spacker_dave.sql:16-22 define mime_type como text NOT NULL DEFAULT 'application/pdf', mas não há CHECK para application/pdf → Path: INSERT explícito pode fornecer outro texto → Verdict: o banco aceita metadado inválido.
<!-- deep-review:fp:8090deae96fd7335 -->

_⚠️ Potential issue_ | _🟡 Minor_

**Migração em banco populado não tem cobertura no gate.**

Premise: `0006` modifica linhas existentes de `admin_users` ao adicionar role nula, preenchê-la e só depois impor constraints, porém a suíte não executa a migração a partir do esquema anterior. → Path: uma futura alteração na ordem do DDL, no backfill ou nas constraints pode deixar testes de actions com fake DB verdes e falhar ao atualizar a base implantada com usuários legados e referências `applications.decided_by`. → Verdict: a compatibilidade de rollout aditiva exigida pode regredir sem detecção antes do deploy.

Also applies to: drizzle/0006_flimsy_spacker_dave.sql:26-31

Certificate: Premise: drizzle/0006_flimsy_spacker_dave.sql:26-31 adiciona role nula, a preenche como admin, a restringe, torna-a NOT NULL e lhe dá default → Path: cada etapa depende da ordem correta contra linhas já existentes → Verdict: a sequência precisa ser exercitada contra uma base legada real para detectar regressões de rollout.
<!-- deep-review:fp:9361b5ccc14bd8d7 -->

## Outside diff range

None.

## Spec conformance

| Artifact | Assessment |
| --- | --- |
| `.compozy/tasks/donor-first-role-access/_prd.md` | conforms — no divergence found |
| `.compozy/tasks/donor-first-role-access/_techspec.md` | conforms — no divergence found |
| `.compozy/tasks/donor-first-role-access/_tasks.md` | conforms — no divergence found |

## Duplicates (unresolved from round 0)

None.

## Advisories

### `.compozy/tasks/donor-first-role-access/task_02.md`

_🛠️ Refactor suggestion_ | _🟡 Minor_ | _⚡ Quick win_

**Sincronizar o rastreamento das tarefas concluídas.**

As tarefas 02–05 ainda se declaram pendentes e mantêm todos os subtarefas desmarcados, embora as mudanças e testes correspondentes já estejam presentes no conjunto revisado. Isso torna o estado do fluxo e a próxima retomada imprecisos.

Also applies to: .compozy/tasks/donor-first-role-access/task_03.md:2, .compozy/tasks/donor-first-role-access/task_04.md:2, .compozy/tasks/donor-first-role-access/task_05.md:2

Certificate: Premise: .compozy/tasks/donor-first-role-access/task_02.md:2 declara status pending e as linhas 41-47 deixam todos os subtarefas abertos → Improvement: o rastreamento passa a comunicar com precisão o trabalho já entregue e evita reexecução ou retomada equivocada → Fix: após a verificação final, marcar os subtarefas atendidos e definir status: completed nas tarefas 02–05.
<!-- deep-review:fp:7664ad252528d6a9 -->

### `app/admin/benfeitores/client.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Formate o cliente operacional da Secretaria em blocos legíveis.**

O componente recém-adicionado concentra a filtragem, o campo de busca e todos os cartões em poucas linhas muito longas. Separar o predicado de filtro e os elementos JSX em blocos nomeados preserva o comportamento e torna futuras alterações no conjunto operacional de campos mais fáceis de revisar.

Certificate: Premise: app/admin/benfeitores/client.tsx:93-100 concentra toda a implementação de SecretariatDonorsClient, inclusive a árvore de cartões, em expressões de linha única → Improvement: revisões e mudanças no conjunto permitido de campos ficam localizáveis e menos sujeitas a omitir uma condição → Fix: extrair o predicado de busca e quebrar o JSX em elementos multilinha (ou um cartão local) sem alterar a projeção.
<!-- deep-review:fp:30449458e6fdaa3b -->

### `app/admin/solicitacoes/client.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Tipar os resultados das actions da Secretaria.**

Os casts de `history` e `current` para o tipo do estado escondem qualquer divergência entre as Server Actions e a UI. Exporte tipos de resultado das actions (ou derive o estado com `Awaited<ReturnType<...>>`) e elimine os casts para que mudanças de projeção sejam verificadas pelo TypeScript.

Certificate: Premise: app/admin/solicitacoes/client.tsx:103-110 declara estados locais e converte os retornos das actions com `as typeof notes/documents` → Improvement: mudanças no contrato das actions passam a falhar em compilação → Fix: compartilhar tipos de observação/documento emitido entre actions e componente.
<!-- deep-review:fp:861ac5da771614c0 -->

### `app/admin/solicitacoes/page.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Remover casts duplos na escolha do cliente.**

A página converte o mesmo retorno polimórfico de `getApplications` para duas formas incompatíveis, incluindo um cast via `unknown`. Separar as consultas por papel (ou retornar uma união discriminada) faz a projeção mínima da Secretaria continuar verificável quando os campos do painel administrativo evoluírem.

Certificate: Premise: app/admin/solicitacoes/page.tsx:20-22 força `applications` para `SecretariatApplicationSummary[]` e para `ApplicationSummary[]` via `unknown` → Improvement: o compilador preserva a separação de projeções por papel → Fix: retornar uma união discriminada ou expor actions tipadas por papel.
<!-- deep-review:fp:4a059648e9222801 -->

### `app/admin/usuarios/client.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Estruturar o cliente de usuários em blocos legíveis.**

As três mutations e toda a árvore JSX foram condensadas em quatro linhas. Extrair os handlers e formatar os blocos de formulário/lista reduz a área de conflito e torna revisão de estados de erro e mudanças de autorização viável sem alterar comportamento.

Certificate: Premise: app/admin/usuarios/client.tsx:13-16 contém handlers assíncronos e a renderização inteira em linhas únicas → Improvement: cada fluxo de criação, redefinição e ativação fica isolável em revisão e testes → Fix: expandir JSX e declarar handlers em blocos normais (opcionalmente extrair os cartões).
<!-- deep-review:fp:d6874b5a94525bec -->

### `app/form/_actions/form-actions.ts`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Centralizar o contrato das categorias de documentos.**

A validação aceita nomes de categoria em um `Set`/regex, enquanto a persistência mapeia os mesmos conceitos para categorias de banco em outro ponto. Um registro tipado único (categoria de upload, regra por aluno e categoria persistida) torna adições e renomeações auditáveis em uma só alteração.

Certificate: Premise: app/form/_actions/form-actions.ts:32-37 lista categorias permitidas e app/form/_actions/form-actions.ts:44-59 repete o vínculo campo/categoria → Improvement: evita manutenção paralela da política de upload e do mapeamento de documentos → Fix: definir um registro tipado usado por validação e por `collectDocumentRows`.
<!-- deep-review:fp:0b64b203989b8e78 -->

### `app/solicitar-bolsa/layout.tsx`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Extract the shared scholarship-form layout.**

The canonical route adds a byte-for-byte copy of the legacy form layout. Future wording, metadata, or accessibility changes can now drift between the two public URLs; keeping the markup in one shared layout component leaves the legacy route as a thin wrapper or redirect.

Also applies to: app/form/layout.tsx:1

Certificate: Premise: app/solicitar-bolsa/layout.tsx:1-104 duplicates app/form/layout.tsx:1-104 exactly → Improvement: one maintained source prevents public-route layout drift → Fix: move the shared shell to a component and import it from both routes, or make the legacy route redirect before rendering it.
<!-- deep-review:fp:82d194575505d659 -->

### `lib/documents/issued-documents.ts`

_🛠️ Refactor suggestion_ | _🟡 Minor_ | _⚡ Quick win_

**Trocar o cast da transação por consultas tipadas.**

O cast duplo apresenta a transação como o cliente raiz e mascara incompatibilidades futuras entre os dois tipos. Uma consulta `tx.select` limitada à versão e o `tx.insert` já tipado eliminam essa fuga de tipos, deixando a operação de serialização mais segura para manutenção.

Certificate: Premise: lib/documents/issued-documents.ts:20 converte `tx` por `unknown` para `typeof db` → Improvement: o compilador volta a validar a interface real da transação → Fix: substituir a leitura por `tx.select({ version: issuedDocuments.version }).from(issuedDocuments)...limit(1)` e usar `tx.insert` diretamente.
<!-- deep-review:fp:42aabfdd35cd3d8b -->

### `public/seal-arca.svg`

_🛠️ Refactor suggestion_ | _🟡 Minor_

**Otimizar o selo público antes de servi-lo em todas as páginas.**

O novo SVG contém uma imagem PNG base64 embutida e mede aproximadamente 1,88 MB. Como ele é o selo compartilhado da navegação e das páginas públicas, cada primeira visita transfere esse payload; extrair/otimizar a imagem raster e reduzir o SVG diminui significativamente o custo de carregamento sem mudar a identidade visual.

Certificate: Premise: public/seal-arca.svg:1-17 incorpora um PNG via data URI e o arquivo tem 1.880.568 bytes → Improvement: reduzir o payload crítico repetidamente solicitado → Fix: converter a imagem embutida a um asset raster otimizado ou substituir por arte vetorial compacta.
<!-- deep-review:fp:4d4689daec411a6e -->

### `.compozy/tasks/donor-first-role-access/_tasks.md`

_🧹 Nitpick_ | _🔵 Trivial_ | _⚡ Quick win_

**Atualize o status das tarefas concluídas.**

O quadro ainda marca as tarefas 02–05 como `pending`, embora a árvore já contenha suas implementações e testes. Sincronizar esses estados torna o artefato de acompanhamento confiável para a liberação e evita que uma retomada do fluxo replique trabalho já entregue.

Certificate: Premise: .compozy/tasks/donor-first-role-access/_tasks.md:8-11 marca as tarefas 02–05 como pending → Improvement: o quadro passa a refletir o progresso real de implementação → Fix: marque como completed as tarefas cujos critérios já foram concluídos e verificados.
<!-- deep-review:fp:9fa930abd434ed18 -->

### `app/form/_components/scholarship-form.tsx`

_🧹 Nitpick_ | _🔵 Trivial_ | _⚡ Quick win_

**Remover escopo autônomo da validação de documentos.**

O bloco nu não adiciona escopo útil nem condição após os uploads se tornarem obrigatórios. Deixar as validações diretamente no corpo de cada função preserva a leitura linear e evita sugerir uma condição que não existe.

Also applies to: app/form/_components/scholarship-form.tsx:new:102-102, app/form/_components/scholarship-form.tsx:new:127-127, app/form/_components/scholarship-form.tsx:new:137-138

Certificate: Premise: app/form/_components/scholarship-form.tsx:52-63 inicia um bloco `{}` sem controle de fluxo apenas para as validações obrigatórias → Improvement: a obrigatoriedade fica explícita e a estrutura dispensa um escopo enganoso → Fix: remover as chaves externas e manter as declarações no corpo de `validateStep1`.
<!-- deep-review:fp:ff77e80b415b6416 -->

### `app/seja-um-benfeitor/page.tsx`

_🛠️ Refactor suggestion_ | _🔵 Trivial_ | _⚡ Quick win_

**Format the donor page's JSX into readable blocks.**

The complete page tree, including the bank details, is a single source line. Splitting it into the project's normal JSX indentation makes later content and accessibility edits reviewable without changing behavior.

Certificate: Premise: app/seja-um-benfeitor/page.tsx:12 contains the full returned DOM tree on one line → Improvement: each semantic region and attribute becomes independently readable in diffs → Fix: format the returned JSX into nested multiline elements.
<!-- deep-review:fp:29cdb39b28355cc2 -->

## Review observability

- Candidates investigated: 56
- Reported before deduplication: 19
- Suppressed with recorded reason: 37
- Selected hunk lines covered by both lanes: 5501
