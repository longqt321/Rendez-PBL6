# Redesign Rules (Master Context)

These rules apply to all 10 stages. No AI components. Research before implementation. Preserve repo, no dependency changes without research, one commit per stage, report at end. See AGENTS.md for full operating contract.

## No-AI
No pretrained models, inference, embeddings, vector search, AI frameworks, AI placeholders, AI-specific DB columns/tables.

## Research Record required for major decisions
Problem, date, sources/URLs, solutions found, options, chosen, rejected, repo impact, verification.

## Git
No reset --hard/clean. One commit per stage after checks. No push/deploy.

## Reporting
Each prompt: goals/results, checklist, files changed, Research Record, tests run/unrun, risks, time, commit hash.
