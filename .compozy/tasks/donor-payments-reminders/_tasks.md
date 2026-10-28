# Donor Payment Journey, Reminders, and Reconciliation — Task List

## Tasks

| # | Title | Type | Status | Complexity | Dependencies |
|---|-------|------|--------|------------|--------------|
| 01 | Add due-day schema and recurrence rules | backend | completed | high | — |
| 02 | Reorder Pix and conditional donor submission | frontend | completed | high | task_01 |
| 03 | Edit monthly due day in donor administration | frontend | completed | medium | task_01, task_02 |
| 04 | Persist reminder template and send records | backend | completed | high | task_03 |
| 05 | Implement reserved reminder delivery and daily job | backend | completed | high | task_04, task_16 |
| 06 | Manage reminder template, preview, test, and failed retries | frontend | completed | high | task_05 |
| 07 | Show next due and last reminder in the donor list | frontend | completed | medium | task_05 |
| 08 | Document and schedule the daily reminder job | other | completed | medium | task_05, task_06, task_07, task_17 |
| 09 | Extend occurrence ledger for bank conference | backend | pending | high | task_08, task_15, task_18, task_19, task_20, task_21, task_22, task_23, task_24, task_25 |
| 10 | Implement bank conference actions and totals | backend | pending | high | task_09 |
| 11 | Build administrator payment conference screen | frontend | pending | high | task_10 |
| 12 | Export selected payment conference as CSV | backend | pending | medium | task_10, task_11 |
| 13 | Chart expected and received amounts by month | frontend | pending | medium | task_10, task_11 |
| 14 | Suppress reminders for bank-confirmed credits | backend | pending | medium | task_09, task_10, task_11, task_12, task_13 |
| 15 | Materialize minimal monthly payment occurrences for phase 2 | backend | completed | high | task_03 |
| 16 | Sign receipt links and attach monthly evidence | backend | completed | high | task_15 |
| 17 | Build the public monthly receipt page | frontend | completed | medium | task_16 |
| 18 | Support days through 31 and month-end recurrence | backend | completed | high | task_01, task_03, task_05, task_15 |
| 19 | Require five monthly due-day choices and explain emailed payment | frontend | completed | high | task_02, task_18 |
| 20 | Persist monthly instructions template and send history | backend | completed | high | task_04, task_16, task_18 |
| 21 | Send monthly instructions after successful registration | backend | completed | high | task_05, task_15, task_16, task_17, task_19, task_20, task_24 |
| 22 | Manage monthly instructions template in admin | frontend | completed | high | task_06, task_20, task_21 |
| 23 | Show monthly instructions status and manual send in donor list | frontend | completed | high | task_07, task_21, task_24 |
| 24 | Track required monthly receipts and skip remaining reminders | backend | completed | high | task_05, task_15, task_16, task_18 |
| 25 | Explain required receipts in donor and admin interfaces | frontend | completed | high | task_17, task_19, task_20, task_22, task_23, task_24 |

## Dependency Graph and Release Gates

```mermaid
graph TD
  T01[01 Due day and recurrence] --> T02[02 Public form]
  T01 --> T03[03 Admin day edit]
  T02 --> T03
  T03 --> G1[Completed phase 1 baseline]
  G1 --> T04[04 Reminder schema/template]
  G1 --> T15[15 Monthly occurrence ledger]
  T15 --> T16[16 Signed link/upload]
  T16 --> T17[17 Public receipt page]
  T04 --> T05[05 Sender/job with link]
  T16 --> T05
  T05 --> T06[06 Editor/retry]
  T05 --> T07[07 Donor status]
  T05 --> T08[08 Cron runbook]
  T06 --> T08
  T07 --> T08
  T17 --> T08
  T01 --> T18[18 Month-end recurrence]
  T03 --> T18
  T05 --> T18
  T15 --> T18
  T02 --> T19[19 Five public choices]
  T18 --> T19
  T04 --> T20[20 Instructions template/schema]
  T16 --> T20
  T18 --> T20
  T05 --> T21[21 Transactional sender]
  T15 --> T21
  T16 --> T21
  T17 --> T21
  T19 --> T21
  T20 --> T21
  T24 --> T21
  T06 --> T22[22 Instructions editor/test]
  T20 --> T22
  T21 --> T22
  T07 --> T23[23 Instructions list/send]
  T21 --> T23
  T05 --> T24[24 Required receipt and reminder skip]
  T15 --> T24
  T16 --> T24
  T18 --> T24
  T24 --> T23
  T17 --> T25[25 Required receipt UI/copy]
  T19 --> T25
  T20 --> T25
  T22 --> T25
  T23 --> T25
  T24 --> T25
  T08 --> G2[Joint phase 1 and 2 publication]
  T22 --> G2
  T25 --> G2
  G2 --> T09[09 Bank ledger extension]
  T15 --> T09
  T18 --> T09
  T19 --> T09
  T20 --> T09
  T21 --> T09
  T22 --> T09
  T23 --> T09
  T24 --> T09
  T25 --> T09
  T09 --> T10[10 Conference actions]
  T10 --> T11[11 Conference UI]
  T10 --> T12[12 CSV]
  T11 --> T12
  T10 --> T13[13 Chart/table]
  T11 --> T13
  T09 --> T14[14 Paid suppression]
  T10 --> T14
  T11 --> T14
  T12 --> T14
  T13 --> T14
  T14 --> G3[Phase 3 release]
```

Tasks 01–08 and 15–25 are completed baseline and phase-2 amendment work; task 09 waits for the joint phase-1/2 publication gate. Each task includes targeted tests. The joint gate's `npm test` and production build passed locally for task 25; install the cron line only after the image, required receipt-link upload check, and email tests succeed in the publication workflow. Phase 2 records each monthly receipt as pending until uploaded, without a bank-conference screen. Phase 3 adds that screen and bank-confirmation fields to the same occurrence rows.
