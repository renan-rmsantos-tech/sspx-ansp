# Product Requirements Document: Donor Payment Journey, Reminders, and Reconciliation

## Overview

Benefactors who choose a one-time contribution currently encounter a required receipt upload before they see the Pix payment instructions. Monthly benefactors need a clear explanation of how to pay after registration and what optional reminders will do. Administrators also lack a record of bank-confirmed contributions, so pledged and received amounts cannot be distinguished. This work fixes the public journey, sends monthly payment instructions, delivers opted-in reminders, and gives administrators a manual payment conference workflow.

## Goals

- Put the Pix key, QR code, bank, and beneficiary CNPJ where a benefactor chooses how to contribute, before a one-time receipt is requested.
- Let each new monthly benefactor choose a required payment day from 1, 10, 15, 20, or 30, and send payment instructions to every monthly registrant regardless of reminder preference.
- Send two email reminders per eligible monthly payment, 10 and 5 days before it is due, only after opting in.
- Require a Pix receipt for every monthly payment, uploaded through the signed link in the payment-instructions or reminder email without logging in.
- Make reminder content and failed-send recovery manageable by an administrator without claiming that provider acceptance proves inbox delivery.
- Let administrators compare expected contributions with credits verified against the bank statement, including one-time contributions and overdue monthly items.
- Complete the form changes and reminder workflow together before publication, then release reconciliation.

## User Stories

### Benefactor

- As a one-time benefactor, I want to see where to make the Pix before I am asked for its date and receipt so that I can finish the contribution in one visit.
- As a monthly benefactor, I want to choose one of five clear payment days and receive an explanatory email with the Pix details, first due date, and monthly schedule, without needing to pay or upload a receipt at registration.
- As a monthly benefactor, I want to choose whether to receive email reminders before each due date.
- As a monthly benefactor, I want the instructions or reminder email to take me to a simple page where I can submit the required Pix receipt for that month without creating an account.

### Administrator

- As an administrator, I want to correct a monthly benefactor's payment day and see the next due date, current occurrence's receipt state, and last reminder in the benefactor list.
- As an administrator, I want to edit and preview the reminder message, send a test, and retry a failed reminder without sending another copy of an accepted message.
- As an administrator, I want to edit, preview, and test the monthly payment-instructions email, see whether it was accepted or failed for each monthly benefactor, and send or resend it manually when needed.
- As an administrator, I want to record the amount and date found in the bank statement for each expected contribution and see who confirmed it.
- As an administrator, I want to distinguish a monthly receipt still pending from one uploaded and awaiting bank conference, and highlight overdue occurrences without a receipt.
- As an administrator, I want monthly expected, received, and outstanding totals, a list of items more than a month overdue, and a CSV export for conference.

## Core Features

### 1. Contribution Form and Payment Day

- For a one-time contribution, show the existing Pix details before payment date and required receipt, with copy equivalent to “Faça o Pix e anexe o comprovante.”
- For a monthly contribution, show duration, value, and five simple due-day choices: 1, 10, 15, 20, or 30. Require a deliberate choice with no preselection. Do not show a receipt field at registration. Explain clearly before submission that an email will provide Pix instructions, the chosen due day and first due date, a signed link for the required receipt of each monthly payment, and how optional reminders work. The Pix details block need not appear in this branch of the form.
- The monthly plan begins when the benefactor registers. Each month's actual due date is the chosen day or that month's last day, whichever comes first; day 30 is therefore 28 or 29 February. A one-year plan contains 12 monthly payments; an indefinite plan has no preset end. The first due date is the first such date on or after registration in São Paulo.
- Existing monthly registrations retain the initial payment day previously backfilled from their registration day, capped at 28. An administrator can change any monthly donor's stored day to 1–31 from the benefactor list; the same month-end rule applies.
- A one-time contribution still requires a valid payment date and receipt. A receipt supplied with a monthly registration has no effect.

### 2. Monthly Payment Instructions

- Automatically send a separate “Instruções do pagamento mensal” email after each successful monthly registration. This is a transactional message for every monthly benefactor, independent of the optional reminder checkbox and separate from the welcome email. Registration succeeds even if delivery fails.
- The message explains payment by Pix with the key, beneficiary, and CNPJ; amount, chosen due day, first due date, and 12-month or indefinite duration. For day 30 it explains the month-end adjustment. It states that a receipt is required for every monthly payment, includes a signed link for the first occurrence, and explains that uploading it does not confirm bank credit. It says opted-in reminders arrive 10 and 5 days before each actual, adjusted due date while that occurrence's receipt is pending and the scheduled dates are still ahead.
- Let an administrator edit this email's subject and body, preview it, send a test, and see its token list with the other email templates. Show its recorded send state in the donor list and allow a deliberate manual send or resend for monthly benefactors, including older records. Never automatically send it retroactively to older monthly benefactors.
- For later occurrences when a donor did not opt into reminders, let Administrador manually resend the instructions with a signed link scoped to the selected pending occurrence. This preserves the donor's reminder choice while leaving a path to submit each required receipt; an expired link can be renewed only by an authenticated administrator.
- A repeated automatic attempt must not send another accepted copy. Administrative resends are explicit and remain distinguishable from automatic delivery.

### 3. Opted-in Payment Reminders

- Send email reminders only for monthly registrations whose reminder preference is email. Send at most one 10-day and one 5-day message per monthly payment, before its actual due date and only while that occurrence's receipt is pending. An uploaded receipt suppresses the remaining reminder for that occurrence; later occurrences remain eligible.
- Use an administrator-editable subject and body with named values for benefactor name, amount, due date, reference month, Pix key, and `{link_comprovante}`. Every reminder includes a distinct link for its payment occurrence. The editor includes a preview and a test send using the institutional document header.
- The link opens a short public page showing only the benefactor's first name, reference month, and amount, plus a Pix receipt upload. Accepted files are images or PDFs up to 10 MB. A successful upload shows confirmation without claiming that the payment was received. An expired or invalid link shows a courteous message.
- A monthly receipt is required for each payment, although registration itself does not request one. Each occurrence begins as “Comprovante pendente” and becomes “Comprovante enviado – aguardando conferência” only after its own receipt is uploaded. While the link is valid, a new upload for the same payment replaces the previous active receipt; the page explains this before upload. A receipt may arrive after bank confirmation without changing that confirmation. If an administrator previously marked the payment “Não identificado,” new evidence returns it to awaiting conference.
- Run an automatic daily send process and retain each reminder's state, acceptance time, and safe error summary. Re-running it must not send a second message already recorded as accepted.
- Let an administrator retry a failed reminder only while its occurrence still lacks a receipt. Show the next due date, latest reminder state, and current occurrence's receipt state in the benefactor list.
- Once manual reconciliation is available, suppress reminders for payments with a bank-confirmed credit, including a confirmed partial or divergent credit.

### 4. Manual Payment Conference

- Show one expected item for each applicable monthly payment and one item for each one-time contribution. A one-time receipt is supporting evidence, not proof of bank credit; its initial display is “Aguardando conferência.”
- Show “Comprovante pendente” on monthly occurrences without a receipt and “Comprovante enviado – aguardando conferência” after upload while bank review is pending, with administrator-only access to the file. When bank review is complete, keep the receipt state visible beside “Confirmado no extrato,” “Divergente,” or “Não identificado.” An upload does not change a confirmed amount or mark the item paid.
- Let an administrator record the bank-confirmed amount and credit date, optionally add a note, and see who and when confirmed the item. A mismatch between expected and received amounts is visible as a divergence.
- Provide an explicit “Não identificado” state when an administrator checked but could not match a credit. Pending means that conference has not yet confirmed a credit.
- Filter the conference list by reference month. Show expected, received, and outstanding totals, and a separate list of open items more than one month past due. Clearly highlight overdue monthly occurrences without a receipt, without treating receipt absence alone as proof that no bank credit exists.
- Provide a CSV of the selected conference data with safe receipt and bank-state labels, and a month-by-month expected-versus-received chart with an equivalent table that distinguishes missing receipts. Personal identifiers beyond the benefactor name are excluded from charts and CSV.
- Keep payment conference and exports available only to Administrador. Secretaria has no access.

## User Experience

1. The benefactor chooses “Uma vez” or “Mensal.” The public language is Brazilian Portuguese, direct and respectful. The one-time branch shows Pix instructions before requesting payment evidence; the monthly branch promises a separate explanatory email and explains that each later monthly payment needs its own receipt.
2. A one-time benefactor makes the Pix, enters its date, uploads the required receipt, and submits. A monthly benefactor selects a duration and one of the five payment days, optionally checks email reminders, and submits without a receipt. The monthly success state asks the benefactor to check email for payment instructions without claiming delivery is guaranteed.
3. The administrator sees each monthly benefactor's payment day, next due date, current receipt state, and latest reminder in the existing list, and can correct the day with clear validation.
4. A monthly benefactor opens the first-payment link in the instructions email or a later reminder link without logging in, sees only first name, month, and amount, and submits or replaces that payment's required receipt. The page confirms the upload and explains that ANSP still checks the bank statement.
5. The administrator can edit, preview, and test the payment-instructions and reminder templates, inspect monthly instruction status per benefactor, deliberately send or resend instructions, and retry failed reminders.
6. In “Conferência de pagamentos,” the administrator chooses a month, distinguishes receipt pending/sent from bank-confirmed/divergent/not-identified states, checks the bank statement, records credit details, reviews totals and overdue items without receipts, and exports the selected data when needed.
7. Forms, lists, charts, and tables work by keyboard and on mobile, with readable states and exact values available without relying on color.

## High-Level Technical Constraints

- Use the existing Pix beneficiary details and existing institutional email header. Do not imply that uploading a receipt confirms receipt of funds.
- Respect the current opt-in preference; no WhatsApp reminders in this delivery.
- Treat monthly payment instructions as transactional, independent of reminder opt-in; the reminder checkbox controls only scheduled reminders.
- Treat the bank statement as the authority for received funds. No automatic bank data access is assumed.
- Protect donor and payment information: no CPF, full address, receipt URL, or email address in charts, CSV, or operational logs.
- Protect the instructions and reminder receipt links as private bearer links with a limited lifetime. Do not include CPF or email in the URL; limit automated requests and keep receipt files in private storage.
- Keep all public and administrative UI copy in pt-BR and preserve the established visual system.

## Non-Goals (Out of Scope)

- OFX or CSV bank-statement import, Pix API integration, automatic matching, or automatic debit.
- WhatsApp, SMS, marketing emails, and delivery/open tracking.
- Inferring historical bank receipts from a stored receipt image or from a pledged amount.
- A public donor portal, automatic receipt generation for each monthly payment, or Secretariat access to payment conference.

## Phased Rollout Plan

### Phase 1: Form Fix and Due Day (internal completion gate)

- The completed baseline corrected the one-time Pix and receipt order and introduced monthly due-day storage, legacy backfill, and administrator editing. Keep this as an internal completion gate; do not publish it separately.
- Its due-day input and 1–28 limit are superseded by the phase-2 amendment before publication.

### Phase 2: Instructions and Reminders (publication gate for phases 1–2)

- Replace the public day input with five required choices, extend administrator edits to 1–31, and calculate month-end due/reminder dates. Publish these changes and the phase-1 baseline together with the monthly payment-instructions email, editable email content, daily reminders, failed-send recovery, receipt-pending visibility, and per-payment required receipt links. The daily job can be activated after deployment.
- Exit criterion: every new monthly registration chooses one of the five days without preselection; one-time receipts remain required; monthly registration requests no receipt, but each occurrence starts with one pending; every new monthly registration attempts the separate transactional instructions regardless of opt-in; administrators can edit days and inspect/test/send/resend instructions; opted-in reminders run only while the occurrence's receipt is pending; and automatic reruns do not duplicate accepted sends.

### Phase 3: Reconciliation

- Extend the occurrence records with bank conference fields, then publish manual conference, separate receipt/bank states, suppression of reminders for bank-confirmed credits, totals, overdue missing-receipt list, CSV, chart, and equivalent table.
- Exit criterion: administrators can account for each applicable payment and distinguish “Comprovante pendente,” “Comprovante enviado – aguardando conferência,” “Confirmado no extrato,” “Divergente,” and “Não identificado” without treating a receipt as bank confirmation; expected, received, and outstanding figures reconcile to the displayed items.

## Success Metrics

- 100% of one-time submissions show Pix instructions before the required receipt control; 100% of monthly submissions require a choice from 1, 10, 15, 20, or 30, omit the receipt control, and explain the instructions email.
- 100% of new monthly registrations store only a permitted public choice; existing rows retain their capped backfill; administrator edits accept 1–31; month-end due dates and one-year plans yield exactly 12 occurrences.
- 100% of successful new monthly registrations have a recorded instructions-email outcome or active reservation, independent of reminder opt-in; automatic reruns never duplicate an accepted send. Manual sends remain available for older monthly registrations.
- 0 reminders for one-time, non-opted-in, expired, receipt-uploaded, or bank-confirmed occurrences; no duplicate accepted send for the same payment and reminder kind during normal reruns.
- 100% of reminder attempts have a visible outcome or active in-progress state; administrators can retry recorded failures.
- 100% of accepted instructions emails for new monthly donors contain the first-occurrence receipt link; 100% of accepted reminder emails contain the link for their own payment. A valid upload is visible on that payment alone, suppresses its remaining reminder, and never counts as a bank-confirmed credit.
- 100% of new monthly occurrences start with “Comprovante pendente”; overdue missing-receipt items are highlighted in the administrator conference and report.
- Conference totals equal the sum of displayed ledger items for the selected month, and the chart and table show the same values.
- Secretariat access attempts to payment conference and exports are denied.

## Risks and Mitigations

- A benefactor may assume a receipt guarantees bank credit. State that confirmation happens only after bank-statement review.
- A donor may miss a required receipt after the payment. State the requirement in the form, instructions, reminders, and receipt page; keep the current missing-receipt state visible to administrators.
- A forwarded or leaked link could expose payment context or invite abusive uploads. Limit validity and request rate, show minimal personal data, and restrict file size and type.
- Existing monthly benefactors did not choose their payment day. Initialize it from registration and let an administrator correct it before reminders are enabled.
- The first reminder window may already have passed when a monthly benefactor registers. The instructions email states the first due date and that reminders apply only when their scheduled dates remain ahead. Day 30 changes to February's last day; both reminder offsets follow that adjusted date.
- The instructions email may fail after registration. Keep the registration successful, record a safe failure state, and expose manual recovery in the donor list.
- Old payments may not have reliable conference history. Label unverified items honestly; do not present missing records as proof of nonpayment.
- A missed daily run can miss a reminder window. Make failures visible and document the daily schedule and recovery procedure.
- Manual conference can contain entry errors. Show who confirmed an item, require amount and date, and make corrections explicit.

## Architecture Decision Records

- [ADR-001: Stage the donor journey and due-day rule](adrs/adr-001.md) — Historical form sequence and legacy due-day backfill; see ADR-006 for new registrations.
- [ADR-002: Anchor monthly occurrences at registration](adrs/adr-002.md) — Keep the first due date on or after registration and exactly 12 dates for one-year plans; see ADR-006 for month-end due dates.
- [ADR-003: Use a daily opted-in email job with per-occurrence reservations](adrs/adr-003.md) — Keep automated sends recoverable and bounded by donor choice.
- [ADR-004: Reconcile manually against bank-confirmed credits](adrs/adr-004.md) — Separate expected amounts, actual credits, and receipt evidence.
- [ADR-005: Attach reminder receipts to early occurrence records](adrs/adr-005.md) — Materialize phase-2 receipt links and retain bank review as a separate step.
- [ADR-006: Use fixed public due-day choices and transactional instructions](adrs/adr-006.md) — Choose from five days, clamp to month-end, and add a separate recoverable monthly instructions email.
- [ADR-007: Require a receipt for every monthly occurrence](adrs/adr-007.md) — Keep registration receipt-free, require a per-occurrence upload, and suppress remaining reminders after upload.

## Open Questions

- None block this scope. Before enabling the production cron, operations must verify the approved Pix key and beneficiary details displayed by the existing page.
