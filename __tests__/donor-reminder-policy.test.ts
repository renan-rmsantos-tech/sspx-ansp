// @vitest-environment node
import { describe, expect, it } from "vitest";
import { occurrenceForMonth } from "@/lib/donor-recurrence";
import {
  canRetryDonorReminder,
  classifyReminderProviderOutcome,
  selectScheduledDonorReminders,
} from "@/lib/email/donor-reminder-policy";

const at = (date: string) => new Date(`${date}T15:00:00Z`);
const monthly = {
  id: "11111111-1111-4111-8111-111111111111",
  created_at: "2026-10-01T15:00:00Z",
  frequencia: "mensal" as const,
  duracao: "indeterminado" as const,
  dia_vencimento: 20,
  lembrete_canal: "email",
};

describe("daily donor reminder selection", () => {
  it("selects only the exact 10d and 5d São Paulo dates", () => {
    expect(selectScheduledDonorReminders(monthly, at("2026-10-10")).map((row) => row.kind)).toEqual(["10d"]);
    expect(selectScheduledDonorReminders(monthly, at("2026-10-15")).map((row) => row.kind)).toEqual(["5d"]);
    expect(selectScheduledDonorReminders(monthly, at("2026-10-11"))).toEqual([]);
    expect(selectScheduledDonorReminders(monthly, new Date("2026-10-11T01:00:00Z")).map((row) => row.kind)).toEqual(["10d"]);
  });

  it("suppresses one uploaded competence at either offset without hiding the next month", () => {
    const uploaded = (competence: string) => competence === "2026-10";
    expect(selectScheduledDonorReminders(monthly, at("2026-10-10"), uploaded)).toEqual([]);
    expect(selectScheduledDonorReminders(monthly, at("2026-10-15"), uploaded)).toEqual([]);
    expect(selectScheduledDonorReminders(monthly, at("2026-11-10"), uploaded))
      .toMatchObject([{ kind: "10d", occurrence: { competence: "2026-11" } }]);
  });

  it("skips one-time, opted-out, pre-registration, and thirteenth occurrences", () => {
    expect(selectScheduledDonorReminders({ ...monthly, frequencia: "unica" }, at("2026-10-10"))).toEqual([]);
    expect(selectScheduledDonorReminders({ ...monthly, lembrete_canal: null }, at("2026-10-10"))).toEqual([]);
    expect(selectScheduledDonorReminders({ ...monthly, created_at: "2026-10-12T15:00:00Z" }, at("2026-10-10"))).toEqual([]);
    expect(selectScheduledDonorReminders({ ...monthly, duracao: "um_ano" }, at("2027-10-10"))).toEqual([]);
  });

  it("selects both offsets from adjusted February and April due dates", () => {
    const dayThirty = { ...monthly, created_at: "2027-01-01T15:00:00Z", dia_vencimento: 30 };
    for (const [pledge, dueDate, tenDays, fiveDays] of [
      [dayThirty, "2027-02-28", "2027-02-18", "2027-02-23"],
      [dayThirty, "2028-02-29", "2028-02-19", "2028-02-24"],
      [dayThirty, "2028-03-30", "2028-03-20", "2028-03-25"],
      [{ ...dayThirty, dia_vencimento: 31 }, "2028-04-30", "2028-04-20", "2028-04-25"],
    ] as const) {
      expect(selectScheduledDonorReminders(pledge, at(tenDays))).toMatchObject([
        { kind: "10d", scheduledDate: tenDays, occurrence: { competence: dueDate.slice(0, 7), dueDate } },
      ]);
      expect(selectScheduledDonorReminders(pledge, at(fiveDays))).toMatchObject([
        { kind: "5d", scheduledDate: fiveDays, occurrence: { competence: dueDate.slice(0, 7), dueDate } },
      ]);
    }
    expect(selectScheduledDonorReminders({ ...dayThirty, created_at: "2027-02-27T15:00:00Z" }, at("2027-02-23"))).toEqual([]);
  });

  it("bounds manual retries before the next reminder or due date", () => {
    const occurrence = occurrenceForMonth(monthly, "2026-10")!;
    expect(canRetryDonorReminder(occurrence, "10d", at("2026-10-10"))).toBe(true);
    expect(canRetryDonorReminder(occurrence, "10d", at("2026-10-14"))).toBe(true);
    expect(canRetryDonorReminder(occurrence, "10d", at("2026-10-15"))).toBe(false);
    expect(canRetryDonorReminder(occurrence, "5d", at("2026-10-14"))).toBe(false);
    expect(canRetryDonorReminder(occurrence, "5d", at("2026-10-19"))).toBe(true);
    expect(canRetryDonorReminder(occurrence, "5d", at("2026-10-20"))).toBe(false);
    expect(canRetryDonorReminder({ ...occurrence, registrationDate: "2026-10-18" }, "10d", at("2026-10-18"))).toBe(false);
  });
});

describe("provider outcome mapping", () => {
  it("separates API acceptance from definite rejection and uncertain outcomes", () => {
    expect(classifyReminderProviderOutcome({ type: "response", id: "msg_123" }))
      .toEqual({ status: "sent", messageId: "msg_123" });
    expect(classifyReminderProviderOutcome({ type: "response", error: { statusCode: 422 } }))
      .toEqual({ status: "failed", code: "provider_rejected" });
    expect(classifyReminderProviderOutcome({ type: "response", error: { statusCode: 503 } }))
      .toEqual({ status: "uncertain", code: "provider_unavailable" });
    expect(classifyReminderProviderOutcome({ type: "response" }))
      .toEqual({ status: "uncertain", code: "unknown" });
  });

  it("maps timeout and network exceptions without retaining contact data", () => {
    const timeout = classifyReminderProviderOutcome({ type: "exception", name: "TimeoutError" });
    expect(timeout).toEqual({ status: "uncertain", code: "provider_timeout" });
    expect(classifyReminderProviderOutcome({ type: "exception", name: "AbortError" }))
      .toEqual(timeout);
    expect(classifyReminderProviderOutcome({ type: "exception", name: "Error: person@example.test" }))
      .toEqual({ status: "uncertain", code: "provider_unavailable" });
    expect(JSON.stringify(timeout)).not.toContain("@example.test");
  });
});
