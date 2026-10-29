# Handoff — redesenho do painel administrativo

Aprovado em 2026-10-29. Protótipo: `app/prototipos/_designs/admin-redesign/`
(preview em `/prototipos/admin-redesign` com `npm run dev`). Tela `#/padroes`
documenta tokens, hierarquia de botões, vocabulário de situações e avisos.

## Regras de implementação

- Tokens e fontes continuam em `app/globals.css`; não criar novos valores de cor.
- Componentes faltantes entram em `components/ui` via `npx shadcn add`
  (input, textarea, select, tabs, badge, card, checkbox). Não copiar `ui.tsx`
  do protótipo; reimplementar os padrões com os componentes shadcn.
- Primitivas de página (PageHeader, Section, StatusPill, Notice, RecordRow,
  SegmentedFilter, DataGrid/DataItem, EmptyState, StatTile, ActionBar) viram
  componentes compartilhados em `app/admin/_components/` e substituem as
  classes inline espalhadas pelas páginas.
- Server actions, validações e regras de negócio não mudam. Só a camada de UI.
- Vocabulário: "Aguardando decisão" (não "Pendente"), "Doação única",
  "Confirmado no extrato", "Não identificado". Cor nunca é o único sinal.
- Aprovar/Salvar/Confirmar = botão primário navy. Rejeitar/Excluir =
  `variant="destructive"` (vermelho suave) com confirmação inline.
- `npm test` é o gate de deploy: atualizar os testes que dependem de
  `data-testid`, rótulos e estrutura antigos (ex.: `sidebar.test.tsx`,
  `benfeitores-client.test.tsx`, testes de application-card/stats-dashboard).

## Ordem sugerida (uma PR/tarefa por fase)

1. **Base**: shadcn add + primitivas compartilhadas + `Padrões` como referência.
2. **Shell**: `app/admin/layout.tsx`, topbar (menu mobile no topo, usuário +
   Sair), sidebar com 3 grupos e contadores; largura de conteúdo 1040px.
   Novas rotas: `/admin` vira Início; `/admin/pagamentos`
   (ex-conferencia-pagamentos); `/admin/emails` com abas (boas-vindas,
   instruções, lembretes); `/admin/modelos` com abas (aprovação, rejeição,
   contrato). Rotas antigas redirecionam.
3. **Solicitações**: segmento único de situação + busca/ordenação; linha
   enxuta; detalhe com abas Resumo / Documentos / Renda e despesas / Decisão;
   PDFs na barra de ações do detalhe.
4. **Benfeitores**: toolbar nova; linha enxuta com pílulas; detalhe em
   Contato / Contribuição / E-mails e comprovantes; ações no rodapé.
5. **Pagamentos, Relatórios, Configurações** (Ano letivo em tabela, Usuários,
   Cabeçalho com prévia).
6. Revisão (codex) e validação no droplet antes de commit/push/deploy, com
   aprovação do Renan em cada etapa.

## Decisões em aberto (confirmar com o Renan antes da fase correspondente)

- Manter a página Início como rota `/admin` (hoje redireciona para
  Solicitações).
- Texto do botão "Já enviei por fora" (registro manual de boas-vindas).
- Pílula "Sem comprovante do mês" na lista de benfeitores: manter ou deixar só
  no detalhe.
