// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createSeedRows, reminderDueDay, seedDev, seedGuard } from "@/scripts/seed-dev";
import { selectScheduledDonorReminders } from "@/lib/email/donor-reminder-policy";

describe("local donor seed", () => {
  it("refuses production and remote or missing databases before any writes", async () => {
    expect(seedGuard({ NODE_ENV: "production", DATABASE_URL: "postgres://localhost/a" })).toContain("production");
    for (const url of [undefined, "postgres://db.example.com/a", "postgres://localhost.evil.test/a", "postgres://[2001:db8::1]/a", "postgres://localhost/a?host=remote.example.test", "file:///tmp/a"]) {
      expect(seedGuard({ DATABASE_URL: url })).not.toBeNull();
    }
    for (const url of ["postgres://localhost/a", "postgresql://127.0.0.1:5432/a", "postgres://[::1]/a"]) {
      expect(seedGuard({ DATABASE_URL: url })).toBeNull();
    }

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      vi.stubEnv("NODE_ENV", "production");
      await seedDev(true);
      vi.stubEnv("NODE_ENV", "test");
      vi.stubEnv("DATABASE_URL", "postgres://remote.example.test/a");
      await seedDev(true);
      expect(log).toHaveBeenCalledTimes(2);
    } finally {
      log.mockRestore();
      vi.unstubAllEnvs();
    }
  });

  it("creates relative dates and a reminder candidate when an allowed due day exists", () => {
    const now = new Date("2026-10-27T15:00:00Z");
    const rows = createSeedRows(now);
    expect(rows).toHaveLength(7);
    expect(rows[0].dia_vencimento).toBe(1);
    expect(rows.filter((row) => row.frequencia === "mensal").map((row) => row.dia_vencimento))
      .toEqual(expect.arrayContaining([1, 10, 15, 20, 30]));
    expect(rows[3].created_at).toMatch(/^2025-08-/);
    expect(rows.slice(4, 6).map((row) => row.data_pagamento)).toEqual(["2026-10-21", "2026-10-26"]);
    const first = rows[0];
    expect(selectScheduledDonorReminders({
      id: first.id!, created_at: first.created_at!, frequencia: first.frequencia,
      duracao: first.duracao ?? null, dia_vencimento: first.dia_vencimento ?? null,
      lembrete_canal: first.lembrete_canal ?? null,
    }, now).map((item) => item.kind)).toEqual(["5d"]);
    expect(reminderDueDay("2026-01-19")).toEqual({ day: 1, kind: null });
    expect(reminderDueDay("2026-01-25")).toEqual({ day: 30, kind: "5d" });
    expect(reminderDueDay("2027-02-18")).toEqual({ day: 30, kind: "10d" });
  });

  it("does not import an email sender or the reminder job", () => {
    const source = readFileSync(new URL("../scripts/seed-dev.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/(?:from\s+["']|import\(["'])[^"']*(?:send-donor|resend|send-donor-reminders)/);
  });
});
