import { describe, expect, it } from "vitest";
import { formatDonorDate } from "@/lib/donor-date";

describe("formatDonorDate", () => {
  it("formats the PostgreSQL timestamp used by donor registrations", () => {
    expect(formatDonorDate("2026-09-28 17:51:39.639965+00")).toBe(
      "28/09/2026"
    );
  });

  it("shows registration timestamps in São Paulo's calendar day", () => {
    expect(formatDonorDate("2026-09-29 01:30:00+00")).toBe("28/09/2026");
    expect(formatDonorDate("2026-09-28T17:51:39.639Z")).toBe("28/09/2026");
  });

  it("preserves the day of a payment date without a time zone", () => {
    expect(formatDonorDate("2026-09-29")).toBe("29/09/2026");
    expect(formatDonorDate(null)).toBe("—");
  });
});
