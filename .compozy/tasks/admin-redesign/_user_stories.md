# User Stories: Redesenho do painel administrativo

Catálogo canônico de comportamento do redesenho de `/admin`. Companheiro de `_spec.md`; consumido por `_spec.md` Parte II (mapeamento de componentes), `_uiux.md` (estados das superfícies) e `_tests.md` (matriz de cobertura).

## Personas

- **Administração** (papel `admin`, ex.: Pe. Coordenador) — decide solicitações, administra benfeitores, pagamentos, e-mails, modelos e configurações. Usa desktop na maior parte do tempo, celular ocasionalmente.
- **Secretaria** (papel `secretaria`) — acompanha solicitações e benfeitores sem decidir nem configurar. Vê apenas Início, Solicitações e Benfeitores.

## Story Index

| ID     | Feature Area   | Persona       | Story                                                                 |
| ------ | -------------- | ------------- | --------------------------------------------------------------------- |
| US-001 | Shell          | Ambas         | Navegar por um menu lateral de 3 grupos com contadores e papel aplicado |
| US-002 | Shell          | Ambas         | Usar o menu no celular a partir da barra superior                     |
| US-003 | Início         | Ambas         | Ver em `/admin` o que precisa de atenção e seguir para a tarefa       |
| US-004 | Início         | Administração | Ver o resumo numérico do momento                                      |
| US-005 | Solicitações   | Administração | Filtrar por situação, buscar e ordenar em um único trecho             |
| US-006 | Solicitações   | Administração | Abrir uma solicitação e navegar por Resumo / Documentos / Renda e despesas / Decisão |
| US-007 | Solicitações   | Administração | Aprovar ou rejeitar com confirmação no lugar                          |
| US-008 | Solicitações   | Secretaria    | Acompanhar solicitações sem decidir                                   |
| US-009 | Benfeitores    | Administração | Filtrar por frequência, priorado e boas-vindas pendentes              |
| US-010 | Benfeitores    | Administração | Ver detalhe em Contato / Contribuição / E-mails e comprovantes e agir no rodapé |
| US-011 | Benfeitores    | Administração | Excluir um cadastro com confirmação inline                            |
| US-012 | Benfeitores    | Secretaria    | Consultar cadastros operacionais                                      |
| US-013 | Pagamentos     | Administração | Ver os pagamentos mensais esperados em um mês e o estado do comprovante |
| US-014 | E-mails        | Administração | Editar boas-vindas, instruções e lembretes em uma página com abas     |
| US-015 | Modelos        | Administração | Editar cartas de decisão e contrato em uma página com abas            |
| US-016 | Configurações  | Administração | Administrar ano letivo em tabela, usuários e cabeçalho com prévia     |
| US-017 | Rotas          | Ambas         | Chegar pelas rotas antigas e ser redirecionado para as novas          |
| US-018 | Vocabulário    | Ambas         | Ler a mesma palavra para a mesma situação em lista, filtro e detalhe  |

## Shell

### US-001: Menu lateral com grupos, contadores e papel

**Como** membro da equipe, **quero** um menu lateral com os grupos Início / Bolsas / Benfeitores / Configurações, **para** achar cada tarefa sem decorar nomes de rota.

Acceptance criteria:

- AC-1: Dado um `admin`, quando a página carrega, então o menu mostra "Início"; grupo "Bolsas" com "Solicitações" e "Ano letivo"; grupo "Benfeitores" com "Benfeitores", "Pagamentos", "E-mails", "Relatórios"; grupo "Configurações" com "Modelos de documentos", "Cabeçalho e rodapé", "Usuários".
- AC-2: Dado um `secretaria`, então o menu mostra apenas "Início", "Solicitações" (Bolsas) e "Benfeitores" (Benfeitores); o grupo "Configurações" não aparece.
- AC-3: Dado que há N solicitações aguardando decisão, então o item "Solicitações" mostra o contador N; dado que há M benfeitores sem boas-vindas, "Benfeitores" mostra M (somente para `admin`). Contadores zero não aparecem.
- AC-4: O item da rota atual tem `aria-current="page"` e fundo navy com ícone dourado; `/admin/solicitacoes/...` ativa "Solicitações"; `/admin` ativa só "Início".
- AC-5: O item "Padrões visuais" do protótipo não existe em produção.

Edge cases:

- EC-1: Falha ao ler contadores (banco indisponível) → menu renderiza sem contadores, sem quebrar a página.
- EC-2: Rota desconhecida sob `/admin` → nenhum item ativo.

### US-002: Menu no celular pela barra superior

**Como** membro da equipe no celular, **quero** abrir o menu por um botão na barra superior, **para** não depender de um botão flutuante que cobre conteúdo.

Acceptance criteria:

- AC-1: Em viewport < 768px, a barra superior mostra um botão com `aria-label="Abrir menu"` e `aria-expanded=false`; ao clicar, o menu desliza da esquerda e o rótulo passa a "Fechar menu" com `aria-expanded=true`.
- AC-2: Com o menu aberto, Escape fecha e devolve o foco ao botão; clicar no fundo escurecido fecha; clicar em um item navega e fecha.
- AC-3: Com `prefers-reduced-motion`, a transição é suprimida.
- AC-4: A barra superior mostra o e-mail do usuário e o papel ("Administração" ou "Secretaria") e o botão "Sair".

Edge cases:

- EC-1: Logout em andamento → botão mostra "Saindo…" e fica desabilitado.

## Início

### US-003: Início em `/admin`

**Como** membro da equipe, **quero** que `/admin` mostre o que precisa de atenção, **para** começar o dia pela tarefa certa.

Acceptance criteria:

- AC-1: `/admin` renderiza a página "Início" com a descrição "Ano letivo {nome} em andamento…" quando há ano ativo, e "Nenhum ano letivo ativo…" caso contrário.
- AC-2: A seção "Precisa de atenção" lista cartões com contagem e botão: "solicitações aguardando decisão" → "Ver solicitações" (`/admin/solicitacoes?situacao=pendente`); "benfeitores sem e-mail de boas-vindas" → "Ver benfeitores" (`/admin/benfeitores?boas-vindas=pendentes`); "pagamentos aguardando conferência" → "Conferir pagamentos" (`/admin/pagamentos`).
- AC-3: Para `secretaria`, o cartão de pagamentos não aparece e o cartão de boas-vindas não aparece.
- AC-4: Singular e plural corretos ("1 solicitação aguardando decisão", "2 solicitações aguardando decisão").
- AC-5: Após login, o usuário é levado a `/admin`.

Edge cases:

- EC-1: Todas as contagens zero → cartões continuam visíveis com "0" e botão habilitado (não há estado vazio especial).
- EC-2: Erro na leitura do resumo → aviso `Notice` tom `danger` "Não foi possível carregar o resumo…" e menu permanece utilizável.

### US-004: Resumo numérico

**Como** Administração, **quero** quatro números do momento, **para** ter noção do ano sem abrir relatórios.

Acceptance criteria:

- AC-1: Quatro `StatTile`: "Solicitações no ano" (total, dica "X aprovadas · Y rejeitadas"), "Benfeitores" (total, dica "X mensais · Y doações únicas"), "Contribuição mensal" (soma dos compromissos mensais em R$), "Esperado em {mês}" (soma dos valores esperados no livro do mês corrente, dica "N com comprovante").
- AC-2: Valores monetários em `pt-BR`/BRL.
- AC-3: Para `secretaria`, a seção "Resumo" não aparece.

## Solicitações

### US-005: Um filtro por dimensão

**Como** Administração, **quero** um segmento de situação com contagens, uma busca e uma ordenação, **para** não ver o mesmo filtro em dois lugares.

Acceptance criteria:

- AC-1: Segmento `role="group"` "Filtrar por situação" com opções "Todas (N)", "Aguardando decisão (N)", "Aprovadas (N)", "Rejeitadas (N)"; opção ativa tem `aria-pressed=true`.
- AC-2: Busca com rótulo "Buscar solicitações" filtra por família (nomes de pai e mãe), aluno e escola, sem distinguir maiúsculas.
- AC-3: Ordenação "Mais recentes" (padrão), "Mais antigas", "Nome da família".
- AC-4: Linha de contagem `aria-live="polite"`: "N solicitação(ões) · {situação} · busca por “q”".
- AC-5: Os quatro cartões de estatística do topo (`stats-dashboard`) deixam de existir; a contagem vive no segmento.
- AC-6: Chegar com `?situacao=pendente` pré-seleciona "Aguardando decisão".

Edge cases:

- EC-1: Nenhum resultado → `EmptyState` "Nenhuma solicitação aqui" com botão "Limpar filtros" que volta para "Todas" e limpa a busca.
- EC-2: Lista vazia sem filtros → "Nenhuma solicitação recebida" sem botão.

### US-006: Linha enxuta e detalhe em abas

**Como** Administração, **quero** ver na linha apenas família, resumo e situação, **para** abrir só o que importa.

Acceptance criteria:

- AC-1: Cada linha mostra título "Família {sobrenome do pai}" (ou "{pai} e {mãe}" quando não há sobrenome comum), meta com escola, "N aluno(s)" e "Enviada em dd/mm/aaaa", e `StatusPill`.
- AC-2: A linha inteira é um botão com `aria-expanded`; ao abrir, aparecem abas "Resumo", "Documentos (N)", "Renda e despesas", "Decisão" (com ponto de atenção quando pendente).
- AC-3: Aba padrão: "Documentos" quando pendente e há documentos; senão "Resumo".
- AC-4: A barra de ações no rodapé do detalhe tem "Imprimir dados da solicitação" sempre; "Carta de decisão" quando decidida; "Contrato" quando aprovada; nota "Os PDFs são gerados com o cabeçalho e os modelos configurados.".
- AC-5: A primeira solicitação pendente da lista vem aberta por padrão.
- AC-6: Os PDFs continuam abrindo no `PdfPreviewModal` atual.

Edge cases:

- EC-1: Detalhe falha ao carregar → `Notice` tom `danger` "Erro ao carregar detalhes." dentro da linha.
- EC-2: Sem documentos → aba "Documentos (0)" com `EmptyState` compacto "Nenhum documento enviado".

### US-007: Decidir com confirmação no lugar

**Como** Administração, **quero** aprovar ou rejeitar na aba Decisão, **para** não perder o contexto em um modal.

Acceptance criteria:

- AC-1: Pendente: `DataGrid` com "Desconto solicitado", "Renda familiar", "Mensalidades"; aviso informativo; botões "Aprovar solicitação" (primário navy) e "Rejeitar" (`destructive`).
- AC-2: Ao clicar em "Aprovar solicitação", abre formulário inline com "Desconto concedido (%)" pré-preenchido com o solicitado, "Motivo (opcional)", botões "Confirmar aprovação" (primário) e "Voltar" (ghost).
- AC-3: Ao clicar em "Rejeitar", formulário inline com texto "Esta ação é definitiva e a família será informada.", "Motivo (opcional)", "Confirmar rejeição" (`destructive`) e "Voltar".
- AC-4: Desconto fora de 0–100 → erro "Desconto deve estar entre 0 e 100." sem chamar a action.
- AC-5: Após decidir, a aba Decisão mostra `Notice` de sucesso/danger "Aprovada com N% de desconto" / "Rejeitada" com data e motivo, e o `DataGrid` da decisão.

Edge cases:

- EC-1: Action retorna erro → `Notice` tom `danger` com a mensagem, formulário permanece.
- EC-2: Clique duplo em "Confirmar aprovação" → botão desabilitado enquanto pendente.

### US-008: Secretaria acompanha

**Como** Secretaria, **quero** acompanhar famílias, **para** registrar observações e baixar documentos finais.

Acceptance criteria:

- AC-1: Mesma lista, segmento e busca; a linha abre com abas "Resumo", "Documentos finais", "Observações".
- AC-2: Não existem botões de decisão nem de PDF administrativo; a aba Decisão mostra `Notice` "A decisão é registrada pela Administração…" apenas quando pendente — para a Secretaria a aba não existe.
- AC-3: "Registrar observação" continua funcionando com a mesma action.

## Benfeitores

### US-009: Toolbar nova

**Como** Administração, **quero** filtrar por frequência, priorado e boas-vindas pendentes, **para** achar quem precisa de ação.

Acceptance criteria:

- AC-1: Segmento "Filtrar por frequência" com "Todos (N)", "Mensais (N)", "Doação única (N)".
- AC-2: Busca "Buscar benfeitores" (nome, CPF, e-mail, telefone) e select "Priorado ou capela" com "Todos os priorados e capelas" e "Não informado".
- AC-3: Checkbox "Mostrar só quem ainda não recebeu boas-vindas (M)" visível apenas para `admin` quando M > 0; `?boas-vindas=pendentes` marca o checkbox.
- AC-4: Ordenação "Mais recentes" (padrão), "Mais antigos", "Nome", "Maior valor".
- AC-5: Contagem `aria-live` "N benfeitor(es)".
- AC-6: Os quatro cartões de estatística do topo deixam de existir.

Edge cases:

- EC-1: Nenhum resultado → `EmptyState` "Nenhum benfeitor com esses filtros".

### US-010: Detalhe em seções e ações no rodapé

**Como** Administração, **quero** ver contato, contribuição e e-mails/comprovantes de cada benfeitor, **para** agir sem sair da lista.

Acceptance criteria:

- AC-1: Linha: nome; meta "R$ X por mês" ou "R$ X", priorado, "Vence dia D" (mensal), "Cadastro em dd/mm/aaaa"; pílulas "Boas-vindas pendente" (warn, só `admin`), "Sem comprovante do mês" (neutral, só `admin`, só mensal com comprovante pendente), "Mensal" (accent) ou "Doação única" (neutral).
- AC-2: Seção "Contato": e-mail (link `mailto:`), telefone, CPF, priorado ou capela, observações.
- AC-3: Seção "Contribuição": valor, frequência ("Mensal, por tempo indeterminado" / "Mensal, por um ano" / "Doação única"), dia de vencimento, próximo vencimento, lembrete; `admin` pode "Alterar dia de vencimento" com formulário inline (1–31, dica "De 1 a 31. Em meses mais curtos, vale o último dia."), "Salvar" e "Cancelar".
- AC-4: Seção "E-mails e comprovantes" (`admin`): `Notice` success "Boas-vindas enviado" com data e ação "Desmarcar envio"; ou `Notice` warn "Boas-vindas ainda não enviado" com "Enviar agora" e "Marcar como enviado"; estado do comprovante do mês e controles de instruções mensais existentes (`DonorMonthlyInstructions`).
- AC-5: `ActionBar` (`admin`): "Imprimir ficha", "Ver recibo", "Excluir".

Edge cases:

- EC-1: Dia inválido → `role="alert"` "Informe um dia inteiro entre 1 e 31.".
- EC-2: Envio de boas-vindas falha → `role="alert"` com mensagem da action ("Tente novamente.").

### US-011: Excluir com confirmação inline

**Como** Administração, **quero** confirmar a exclusão no lugar, **para** não abrir modal.

Acceptance criteria:

- AC-1: "Excluir" (ghost vermelho) → aparece "Excluir este cadastro?" com "Sim, excluir" (`destructive`) e "Não" (ghost).
- AC-2: "Sim, excluir" chama a action e remove a linha; "Não" volta ao estado inicial.

Edge cases:

- EC-1: Action falha → `role="alert"` com o erro; linha permanece.

### US-012: Secretaria consulta cadastros

**Como** Secretaria, **quero** buscar benfeitores e ver contato, **para** atender ligações.

Acceptance criteria:

- AC-1: Mesma lista e toolbar sem checkbox de boas-vindas e sem pílulas administrativas; detalhe mostra apenas Contato e Contribuição; sem `ActionBar`.

## Pagamentos

### US-013: Pagamentos esperados no mês

**Como** Administração, **quero** ver os pagamentos mensais esperados de um mês e se há comprovante, **para** preparar a conferência bancária.

Acceptance criteria:

- AC-1: `/admin/pagamentos` exige `admin`; mostra campo "Mês" (`type=month`, padrão mês corrente em São Paulo) que recarrega a página via `?mes=AAAA-MM`.
- AC-2: `StatTile` "Esperado em {mês}" (soma), "Com comprovante" (soma dos itens com comprovante, tom success), "Sem comprovante" (soma, tom warn, dica "N pagamentos").
- AC-3: Lista de `RecordRow` ordenada: sem comprovante primeiro, depois por vencimento; título nome do benfeitor; meta valor, "Mensal", "Vencimento dd/mm/aaaa", "Comprovante disponível" ou "Sem comprovante"; `StatusPill` "Aguardando conferência" (warn) para todos.
- AC-4: Detalhe: `DataGrid` com valor esperado, vencimento, comprovante enviado em; botão "Ver comprovante" quando houver (abre via `getDocumentUrl`); `Notice` informativo "A confirmação do crédito no extrato ainda não está disponível neste painel.".
- AC-5: Nenhum botão "Confirmar crédito", "Não encontrei no extrato" ou "Baixar CSV" é renderizado (ausente, não desabilitado).

Edge cases:

- EC-1: Mês inválido na URL → usa o mês corrente e mostra `Notice` warn "Mês inválido; mostrando {mês}".
- EC-2: Sem pagamentos no mês → `EmptyState` "Nenhum pagamento mensal esperado em {mês}".
- EC-3: `secretaria` → `requireAdmin` lança como hoje.

## E-mails e Modelos

### US-014: E-mails em abas

**Como** Administração, **quero** editar boas-vindas, instruções e lembretes em `/admin/emails`, **para** não navegar entre três páginas.

Acceptance criteria:

- AC-1: Página "E-mails aos benfeitores" com abas "Boas-vindas", "Instruções de pagamento", "Lembretes de vencimento"; `?aba=instrucoes|lembretes` abre a aba correspondente; trocar aba atualiza a URL sem recarregar.
- AC-2: Cada aba renderiza o cliente existente (`DonorEmailClient`, `DonorMonthlyInstructionsClient`, `DonorReminderClient`) com as mesmas actions e textos funcionais; o `<h1>` de cada cliente é removido em favor do `PageHeader` único.
- AC-3: O link "Cabeçalho e rodapé" dentro dos clientes aponta para `/admin/cabecalho`.

### US-015: Modelos em abas

**Como** Administração, **quero** editar cartas e contrato em `/admin/modelos`, **para** ter um lugar só de modelos.

Acceptance criteria:

- AC-1: Página "Modelos de documentos" com abas "Carta de aprovação", "Carta de rejeição", "Contrato de concessão"; `?aba=rejeicao|contrato` abre a aba; aprovação/rejeição usam o `TemplateEditor` existente (uma aba por tipo), contrato usa o `ContractTemplateEditor`.
- AC-2: Salvar continua chamando `saveTemplate` / `saveContractTemplate` e mostra "Modelo salvo com sucesso." / "Modelo de contrato salvo com sucesso." em `Notice` success.

## Configurações

### US-016: Ano letivo, usuários e cabeçalho

**Como** Administração, **quero** as telas de configuração no mesmo padrão, **para** não reaprender cada uma.

Acceptance criteria:

- AC-1: Ano letivo: `PageHeader` com ação "Novo ano letivo" que revela o formulário em `Card`; tabela "Ano / Período / Situação / Ações" com `StatusPill` "Ativo"/"Encerrado"; "Desativar" para o ativo; "Tornar ativo" e "Excluir" para os demais; excluir pede confirmação inline "Excluir este ano letivo?" com "Sim, excluir"/"Não" (sem modal).
- AC-2: Usuários: seção "Novo acesso" (e-mail, senha inicial, "Criar acesso") e "Acessos existentes" com `StatusPill` "Ativo"/"Inativo", "Redefinir senha", "Desativar"/"Reativar"; `Notice` sobre inativos.
- AC-3: Cabeçalho e rodapé: `Card` de formulário à esquerda, prévia à direita com título "Como fica no documento"; textos e `data-testid` atuais preservados.
- AC-4: Relatórios: `PageHeader`, filtros em `Card`, séries em `Section` com tabela; mesmas actions e asserções de teste.

Edge cases:

- EC-1: Desativar o único ano ativo → confirmação inline "Desativar este ano letivo?".

## Rotas

### US-017: Redirects permanentes

**Como** membro da equipe com favoritos antigos, **quero** ser redirecionado, **para** não cair em 404.

Acceptance criteria:

- AC-1: `/admin/conferencia-pagamentos` → `/admin/pagamentos`; `/admin/email-benfeitores` → `/admin/emails`; `/admin/instrucoes-benfeitores` → `/admin/emails?aba=instrucoes`; `/admin/lembretes-benfeitores` → `/admin/emails?aba=lembretes`; `/admin/textos` → `/admin/modelos`; `/admin/contrato` → `/admin/modelos?aba=contrato`. Todos com status 308.
- AC-2: `/admin/relatorios`, `/admin/cabecalho`, `/admin/ano-letivo`, `/admin/usuarios`, `/admin/solicitacoes`, `/admin/benfeitores` permanecem.
- AC-3: O proxy continua exigindo sessão para todo `/admin/*`, inclusive as novas rotas.

## Vocabulário

### US-018: Uma palavra por situação

**Como** membro da equipe, **quero** ler sempre a mesma palavra, **para** não confundir estados.

Acceptance criteria:

- AC-1: Solicitações: "Aguardando decisão", "Aprovada", "Rejeitada" — nunca "Pendente".
- AC-2: Benfeitores: "Mensal", "Doação única", "Boas-vindas pendente", "Sem comprovante do mês".
- AC-3: Pagamentos: "Aguardando conferência" (e, quando a conferência existir, "Confirmado no extrato", "Não identificado").
- AC-4: Toda `StatusPill` tem texto; cor nunca é o único sinal (ponto + texto).
