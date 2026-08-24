---
name: workflow de desenvolvimento e deploy sequência e política de gates
description: "sequence 198: o assistente descreveu o desenho final com três gates humanos, dois gates automáticos e bloqueio do deploy em caso de falha."
type: project
scope: workspace
provenance:
  source_sessions:
  - sess-038f412b5ae45e33
  source_actor: extractor
  confidence: candidate
  created_at: 2026-08-21T22:31:40.947655Z
  updated_at: 2026-08-21T22:31:40.947655Z
---

O workflow definido segue `feature_analyse → aprovação humana → create_worktree → create_specs → aprovação humana → create_tasks → aprovação humana → execute_tasks → validate_tasks → deep_review → deploy`. `validate_tasks` e `deep_review` são gates automáticos de qualidade; falhas geram uma nova geração de correção e impedem o deploy, que só ocorre após ambos passarem.
