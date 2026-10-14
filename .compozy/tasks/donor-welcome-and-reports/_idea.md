# Benfeitores: apresentação pública do projeto, e-mail de boas-vindas e relatórios

Status: PRD aprovado para o escopo inicial e ampliado a pedido do operador; TechSpec e tarefas formais ainda pendentes.

## Objetivo

Explicar no site público como funciona a Arca, usando `docs/examples/presentation_ansp.pdf` como fonte de conteúdo, para dar clareza a possíveis benfeitores. Permitir também que a equipe acompanhe o envio do e-mail de boas-vindas de cada cadastro, envie manualmente os pendentes e consulte dois gráficos: cadastros por UF de residência e por priorado/capela frequentado.

## Situação atual

- `registerDonorPledge` salva o cadastro e tenta enviar o e-mail pela API do Resend em seguida. Uma falha no envio não desfaz o cadastro.
- `welcome_email_sent_at` registra quando a API do Resend aceitou a mensagem; não comprova entrega à caixa de entrada.
- `/admin/email-benfeitores` permite editar o modelo, enviar teste e tentar novamente, mas lista somente os 50 pendentes mais recentes.
- `/admin/benfeitores` lista os cadastros sem destacar o status do e-mail.
- O formulário guarda `cep` e `endereco` livre, sem cidade/UF estruturadas. `priorado_capela` já é uma escolha estruturada.

## Plano de execução

### 1. Explicação pública do projeto

- Adicionar "Como funciona" à navegação do site principal, com uma explicação sobre a necessidade de bolsas estáveis, o caminho dos recursos e os papéis de benfeitores, associação, escolas e famílias.
- Basear o conteúdo institucional nos slides 2, 4, 7–8, 10–14 e 17 da apresentação, com chamada para o cadastro de benfeitor.
- Não mencionar faixas de renda, percentuais, regras por número de filhos ou condições complementares de elegibilidade dos slides 15–16. O operador confirmou que o vínculo com a FSSPX não é obrigatório; não apresentá-lo como requisito.
- Evitar usar como fatos atuais a equipe nominal, os números sem data e os resultados possíveis dos slides 3, 5–6 e 9 sem validação institucional.

### 2. Acompanhamento e envio de e-mail

- Exibir na listagem completa de benfeitores o status "Enviado em [data]" ou "Não enviado", com filtro de status.
- Exibir botão "Enviar e-mail" somente nos cadastros sem envio registrado, com estado de carregamento e retorno de sucesso/erro.
- Manter edição do modelo e envio de teste na página atual de configurações.
- Proteger a ação no servidor com autorização, nova leitura do estado e controle de tentativas simultâneas para evitar duplicidade.
- Revalidar a listagem e a página de configuração após o envio. Não registrar endereço de e-mail, mensagem ou credenciais em logs de erro.

### 3. Dados de residência

- Criar campos próprios para cidade e UF de residência em `donor_pledges`.
- Preencher esses campos a partir da consulta de CEP no formulário, permitindo correção pelo benfeitor quando a consulta falhar ou retornar dados inadequados.
- Validar os campos no servidor e persistir cidade/UF no cadastro.
- Fazer atualização única dos cadastros anteriores usando CEPs válidos; classificar resultados ausentes ou ambíguos como "Local não identificado" até correção. Não inferir residência a partir do priorado/capela.
- Não consultar serviços externos dentro da migração de produção; tratar a atualização de registros anteriores como operação separada e verificável.

### 4. Relatórios no admin

- Adicionar item "Relatórios" ao menu apenas para administradores e proteger também a leitura dos dados do relatório. O operador confirmou esse limite de acesso.
- Gráfico 1: quantidade de cadastros por **UF de residência**, incluindo "Local não identificado".
- Gráfico 2: quantidade de cadastros por **priorado/capela escolhido**, incluindo "Nenhuma" e "Não informado".
- Usar os mesmos filtros de período e frequência nos dois gráficos, com total de cadastros do recorte.
- Ordenar barras por quantidade e oferecer tabela equivalente, valores visíveis, navegação por teclado e layout responsivo.
- Nomear a métrica "cadastros de benfeitores": o banco não impõe unicidade de pessoa/CPF.

### 5. Verificação

- Cobrir cadastro novo com e sem retorno da consulta de CEP; classificação dos registros antigos; agrupamentos e filtros dos dois gráficos.
- Cobrir envio automático, falha do Resend, envio manual, permissões e tentativas simultâneas.
- Executar `npm test` e `npm run build` antes da entrega. Conferir visualmente a listagem e os relatórios em desktop e celular.

## Critérios de aceite

1. O visitante encontra "Como funciona" no site público, entende o fluxo do projeto e pode seguir para o cadastro de benfeitor; o texto não promete concessão automática de bolsa ou rastreamento individual de doações.
2. Todo cadastro aparece na listagem com status de e-mail compreensível; qualquer cadastro não enviado pode ser localizado e enviado por um administrador.
3. O sucesso do cadastro não depende do sucesso do Resend; falhas de envio permanecem recuperáveis.
4. Os relatórios mostram dois gráficos distintos, sem tratar o local do priorado como residência.
5. O total de cada gráfico corresponde ao mesmo conjunto de cadastros filtrados, inclusive categorias sem local definido.
6. Não há exposição de CPF, endereço completo ou e-mail nos gráficos.

## Próximo passo no fluxo Compozy

O PRD aprovado está em `_prd.md`. Gerar TechSpec e tarefas com as skills correspondentes antes da implementação.
