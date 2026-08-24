---
name: workflow de revisão e deploy gates de deep-review
description: "sequence 590: o assistente registrou explicitamente os gates e o comportamento de bloqueio do Loop."
type: project
scope: workspace
provenance:
  source_sessions:
  - sess-038f412b5ae45e33
  source_actor: extractor
  confidence: candidate
  created_at: 2026-08-21T22:59:57.103074Z
  updated_at: 2026-08-21T22:59:57.103074Z
---

O fluxo de deploy exige uma revisão `deep-review` read-only invocada com `--worktree` e `--spec`; correções ocorrem fora da skill, seguidas por `cy-final-verify` e re-review incremental. O deploy só prossegue com veredito `SHIP`, `clean: true` e zero findings; se `deep-review` estiver indisponível, o fluxo bloqueia sem fallback genérico.
