import type { DonorReceiptView } from "./receipt-shell";

const validLink = {
  state: "valid",
  ticket: "ticket-de-exemplo",
  firstName: "Maria",
  competencia: "2026-11",
  expectedValue: "200.00",
} as const;

export const receiptPending: DonorReceiptView = { ...validLink, hasReceipt: false };

export const receiptAlreadySent: DonorReceiptView = { ...validLink, hasReceipt: true };

export const receiptRateLimited: DonorReceiptView = { state: "rate_limited" };

export const receiptUnavailable: DonorReceiptView = { state: "invalid" };
