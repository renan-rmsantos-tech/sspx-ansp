---
status: completed
title: Document and schedule the daily reminder job
type: other
complexity: medium
dependencies:
  - task_05
  - task_06
  - task_07
  - task_17
---

# Document and schedule the daily reminder job

## Overview
Make phase 2 operable on the existing droplet without adding a service. The runbook must tell the operator when to install cron, how to check a run, and how to recover safely after a failed run.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST define `npm run donors:reminders` for execution inside the current application container.
- MUST document the daily UTC crontab line next to existing cleanup and weekly backup lines, with São Paulo date semantics.
- MUST document Resend prerequisites, safe test-send, job counts, failure exit, same-day rerun, and manual failed retry.
- MUST avoid secrets and donor PII in example commands and log output.
- MUST verify the public receipt page and upload before cron activation and document that bearer tickets, URLs, receipt paths, and filenames must be redacted from request/proxy logs.
</requirements>

## Subtasks
- [x] 8.1 Add and verify the npm script entry point.
- [x] 8.2 Update the droplet runbook with install/verify/recovery steps.
- [x] 8.3 Check that cron output contains counts only and that phase-2 deploy passes its gate.
- [x] 8.4 Check the phase-2 receipt link end to end with a monthly upload and no bank-paid claim; task_24 adds the required per-occurrence rule.

## Implementation Details
Follow TechSpec “Integration Points” and “Monitoring and Observability.” This task prepares the exact crontab line; deployment to the droplet is an operator action after a reviewed phase-2 release.

### Relevant Files
- `package.json` — executable npm scripts.
- `docs/plano-deploy-droplet.md` — installed cron examples and runbook.
- `scripts/backup.sh` — existing operational cron context.

### Dependent Files
- `scripts/` — task-05 reminder entry point.
- `compose.traefik.yaml` — application container name/environment.

### Related ADRs
- [ADR-003: Use a daily opted-in email job with per-occurrence reservations](adrs/adr-003.md)
- [ADR-005: Attach reminder receipts to early occurrence records](adrs/adr-005.md)

## Deliverables
- Npm script and updated droplet runbook with exact crontab line.
- Unit/smoke tests with at least 80% coverage of any new script wrapper logic.
- Integration check of the script against a configured test environment and phase-2 `npm test`/build gate.

## Tests
- Unit tests:
  - [x] The script reports only date/count/status categories and exits nonzero when sender processing fails.
  - [x] The runbook cron invokes the same npm script and names the existing container.
- Integration tests:
  - [x] Run the command twice on one seeded scheduled day; the second run sends no additional accepted email.
  - [x] A seeded reminder's link opens the public page and its upload attaches only to the target occurrence.
  - [x] `npm test` and `npm run build` pass for the phase-2 image before cron activation.
- Test coverage target: >=80% for new executable logic
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80% for new executable logic
- Phase 2 can ship independently, and operations can install and monitor the daily job from the runbook.
