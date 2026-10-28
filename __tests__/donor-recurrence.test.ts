import { describe, expect, it } from "vitest";
import {
  nextOccurrence,
  occurrenceForMonth,
  saoPauloDate,
  scheduledReminder,
  type RecurrencePledge,
} from "@/lib/donor-recurrence";

function monthly(overrides: Partial<RecurrencePledge> = {}): RecurrencePledge {
  return {
    id: "pledge-1",
    created_at: "2026-10-26T12:00:00Z",
    frequencia: "mensal",
    duracao: "um_ano",
    dia_vencimento: 5,
    ...overrides,
  };
}

describe("donor recurrence in São Paulo calendar time", () => {
  it("uses the first selected day on or after registration", () => {
    const dayFive = monthly();
    expect(occurrenceForMonth(dayFive, "2026-10")).toBeNull();
    expect(nextOccurrence(dayFive, new Date("2026-10-26T12:00:00Z"))).toMatchObject({
      dueDate: "2026-11-05",
      competence: "2026-11",
      index: 0,
    });

    const dayTwentyEight = monthly({ dia_vencimento: 28 });
    expect(nextOccurrence(dayTwentyEight, new Date("2026-10-26T12:00:00Z"))).toMatchObject({
      dueDate: "2026-10-28",
      competence: "2026-10",
      index: 0,
    });
    expect(nextOccurrence(dayTwentyEight, new Date("2026-10-28T15:00:00Z"))?.index).toBe(0);
    expect(nextOccurrence(dayTwentyEight, new Date("2026-10-29T15:00:00Z"))?.dueDate).toBe("2026-11-28");
  });

  it("keeps exactly twelve due months for um_ano across February and leap years", () => {
    const pledge = monthly({
      created_at: "2027-12-31T12:00:00Z",
      dia_vencimento: 28,
    });
    const dates = Array.from({ length: 13 }, (_, index) => {
      const month = new Date(Date.UTC(2028, index, 1)).toISOString().slice(0, 7);
      return occurrenceForMonth(pledge, month);
    });
    expect(dates.slice(0, 12).map((item) => item?.dueDate)).toEqual([
      "2028-01-28", "2028-02-28", "2028-03-28", "2028-04-28",
      "2028-05-28", "2028-06-28", "2028-07-28", "2028-08-28",
      "2028-09-28", "2028-10-28", "2028-11-28", "2028-12-28",
    ]);
    expect(dates[11]?.index).toBe(11);
    expect(dates[12]).toBeNull();
    expect(nextOccurrence(pledge, new Date("2028-12-29T15:00:00Z"))).toBeNull();
  });

  it("clamps nominal days 30 and 31 to each calendar month's last day", () => {
    const dayThirty = monthly({ created_at: "2027-01-01T12:00:00Z", duracao: "indeterminado", dia_vencimento: 30 });
    expect(occurrenceForMonth(dayThirty, "2027-02")?.dueDate).toBe("2027-02-28");
    expect(occurrenceForMonth(dayThirty, "2028-02")?.dueDate).toBe("2028-02-29");
    expect(occurrenceForMonth(dayThirty, "2028-03")?.dueDate).toBe("2028-03-30");
    expect(occurrenceForMonth({ ...dayThirty, dia_vencimento: 31 }, "2028-04")?.dueDate).toBe("2028-04-30");
    expect(dayThirty.dia_vencimento).toBe(30);
  });

  it("starts on an adjusted due date, or in the next month after it", () => {
    const february = monthly({ created_at: "2027-02-27T12:00:00Z", dia_vencimento: 30 });
    expect(occurrenceForMonth(february, "2027-02")).toMatchObject({ dueDate: "2027-02-28", index: 0 });
    expect(nextOccurrence(february, new Date("2027-02-28T15:00:00Z"))?.dueDate).toBe("2027-02-28");
    const afterFebruary = monthly({ created_at: "2027-03-01T12:00:00Z", dia_vencimento: 30 });
    expect(occurrenceForMonth(afterFebruary, "2027-02")).toBeNull();
    expect(nextOccurrence(afterFebruary, new Date("2027-03-01T15:00:00Z"))?.dueDate).toBe("2027-03-30");
    const afterOctober = monthly({ created_at: "2026-10-31T12:00:00Z", dia_vencimento: 30 });
    expect(nextOccurrence(afterOctober, new Date("2026-10-31T15:00:00Z"))).toMatchObject({ dueDate: "2026-11-30", index: 0 });
  });

  it("keeps exactly twelve adjusted due dates for a day-30 annual plan", () => {
    const pledge = monthly({ created_at: "2027-12-31T12:00:00Z", dia_vencimento: 30 });
    const dates = Array.from({ length: 13 }, (_, index) =>
      occurrenceForMonth(pledge, new Date(Date.UTC(2028, index, 1)).toISOString().slice(0, 7))
    );
    expect(dates.slice(0, 12).map((item) => item?.dueDate)).toEqual([
      "2028-01-30", "2028-02-29", "2028-03-30", "2028-04-30",
      "2028-05-30", "2028-06-30", "2028-07-30", "2028-08-30",
      "2028-09-30", "2028-10-30", "2028-11-30", "2028-12-30",
    ]);
    expect(dates[11]?.index).toBe(11);
    expect(dates[12]).toBeNull();
  });

  it("converts UTC midnight boundaries using São Paulo, including PostgreSQL timestamps", () => {
    const created_at = "2026-10-27 01:30:00+00";
    expect(saoPauloDate(created_at)).toBe("2026-10-26");
    expect(saoPauloDate(new Date("2026-10-27T03:30:00Z"))).toBe("2026-10-27");
    expect(nextOccurrence(monthly({ created_at, dia_vencimento: 26 }), new Date("2026-10-27T01:30:00Z"))?.dueDate).toBe("2026-10-26");
    expect(() => saoPauloDate("invalid")).toThrow(RangeError);
    expect(() => saoPauloDate("2026-10-26T12:00:00")).toThrow(RangeError);
  });

  it("keeps the due month's competence when a reminder falls in the preceding month", () => {
    const first = occurrenceForMonth(monthly(), "2026-11")!;
    expect(scheduledReminder(first, "10d")?.scheduledDate).toBe("2026-10-26");
    expect(scheduledReminder(first, "5d")).toMatchObject({
      scheduledDate: "2026-10-31",
      occurrence: { competence: "2026-11", dueDate: "2026-11-05" },
    });
    const sameMonth = occurrenceForMonth(monthly({ dia_vencimento: 28 }), "2026-10")!;
    expect(scheduledReminder(sameMonth, "10d")).toBeNull();
    expect(scheduledReminder(sameMonth, "5d")).toBeNull();
    const second = occurrenceForMonth(monthly(), "2026-12")!;
    expect(scheduledReminder(second, "10d")?.scheduledDate).toBe("2026-11-25");
    expect(scheduledReminder(second, "5d")?.scheduledDate).toBe("2026-11-30");
  });

  it("rejects out-of-plan months and returns no occurrence for one-time or invalid days", () => {
    expect(occurrenceForMonth(monthly(), "2026-13")).toBeNull();
    expect(occurrenceForMonth(monthly({ frequencia: "unica", dia_vencimento: null }), "2026-11")).toBeNull();
    expect(nextOccurrence(monthly({ frequencia: "unica", dia_vencimento: null }), new Date())).toBeNull();
    expect(occurrenceForMonth(monthly({ dia_vencimento: 32 }), "2026-11")).toBeNull();
    expect(occurrenceForMonth(monthly({ dia_vencimento: 0 }), "2026-11")).toBeNull();
    expect(occurrenceForMonth(monthly({ dia_vencimento: null }), "2026-11")).toBeNull();
    expect(occurrenceForMonth(monthly({ duracao: null }), "2026-11")).toBeNull();
    expect(occurrenceForMonth(monthly({ duracao: "indeterminado" }), "2040-01")?.competence).toBe("2040-01");
  });
});
