# Redesenho do painel administrativo — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Base: componentes shadcn, primitivos compartilhados e ajustes de tooling | completed | high | — |
| 02 | Shell, Início em /admin, páginas com abas e redirects | completed | critical | task_01 |
| 03 | Solicitações: filtro único, linha enxuta e detalhe em abas | pending | high | task_02 |
| 04 | Benfeitores: toolbar, detalhe em seções e exclusão inline | pending | high | task_02 |
| 05 | Pagamentos: leitura do livro mensal | pending | medium | task_02 |
| 06 | Relatórios e Configurações no novo padrão | pending | high | task_02 |

## Graph

```yaml
graph:
  edges:
    - [task_01, task_02]
    - [task_02, task_03]
    - [task_02, task_04]
    - [task_02, task_05]
    - [task_02, task_06]
```

Ordem de execução: 01 → 02 → 03 → 04 → 05 → 06 (um worker por tarefa; um commit por tarefa).
