import {
  occurrenceForMonth,
  saoPauloDate,
  scheduledReminder,
  type DonorReminderSchedule,
  type RecurrencePledge,
  type ReminderKind,
} from "@/lib/donor-recurrence";

type ReminderPledge = RecurrencePledge & { lembrete_canal: string | null };

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

/** Only the two dates scheduled for today can enter the daily job. */
export function selectScheduledDonorReminders(
  pledge: ReminderPledge,
  now: Date,
  receiptUploaded: (competence: string) => boolean = () => false
): DonorReminderSchedule[] {
  if (pledge.frequencia !== "mensal" || pledge.lembrete_canal !== "email") return [];
  const today = saoPauloDate(now);
  return (["10d", "5d"] as const).flatMap((kind) => {
    const dueDate = addCalendarDays(today, kind === "10d" ? 10 : 5);
    const occurrence = occurrenceForMonth(pledge, dueDate.slice(0, 7));
    if (!occurrence || occurrence.dueDate !== dueDate || receiptUploaded(occurrence.competence)) return [];
    const schedule = scheduledReminder(occurrence, kind);
    return schedule?.scheduledDate === today ? [schedule] : [];
  });
}

/** A failed 10d can be retried before 5d; a failed 5d before due. */
export function canRetryDonorReminder(
  occurrence: NonNullable<ReturnType<typeof occurrenceForMonth>>,
  kind: ReminderKind,
  now: Date
): boolean {
  const scheduled = scheduledReminder(occurrence, kind);
  if (!scheduled) return false;
  const today = saoPauloDate(now);
  const end = addCalendarDays(occurrence.dueDate, kind === "10d" ? -5 : 0);
  return today >= scheduled.scheduledDate && today < end;
}

export type ProviderOutcome =
  | { status: "sent"; messageId: string }
  | { status: "failed" | "uncertain"; code: "provider_rejected" | "provider_timeout" | "provider_unavailable" | "unknown" };

/** Never retain a provider response body or a thrown error message. */
export function classifyReminderProviderOutcome(input:
  | { type: "response"; id?: string | null; error?: { statusCode?: number | null } | null }
  | { type: "exception"; name?: string }
): ProviderOutcome {
  if (input.type === "exception") {
    return {
      status: "uncertain",
      code: input.name === "TimeoutError" || input.name === "AbortError"
        ? "provider_timeout" : "provider_unavailable",
    };
  }
  if (input.error) {
    return input.error.statusCode && input.error.statusCode >= 500
      ? { status: "uncertain", code: "provider_unavailable" }
      : { status: "failed", code: "provider_rejected" };
  }
  return input.id
    ? { status: "sent", messageId: input.id }
    : { status: "uncertain", code: "unknown" };
}
