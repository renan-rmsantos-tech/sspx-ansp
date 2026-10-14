import { getTableConfig } from "drizzle-orm/pg-core";
import { donorPledges } from "@/lib/db/schema";
import { describe, expect, it } from "vitest";

describe("donor pledge schema", () => {
  it("keeps residence and welcome reservation fields nullable for existing pledges", () => {
    const config = getTableConfig(donorPledges);
    const nullableColumns = [
      "residence_city",
      "residence_state",
      "residence_source",
      "welcome_email_reservation_token",
      "welcome_email_reservation_expires_at",
    ];

    for (const name of nullableColumns) {
      const column = config.columns.find((candidate) => candidate.name === name);
      expect(column, `${name} is declared`).toBeDefined();
      expect(column?.notNull, `${name} remains nullable`).toBe(false);
    }

    expect(config.checks.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "donor_pledges_residence_state_check",
        "donor_pledges_residence_source_check",
      ])
    );
  });
});
