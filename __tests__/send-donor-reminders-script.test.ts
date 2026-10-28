// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { runDailyDonorReminders } = vi.hoisted(() => ({ runDailyDonorReminders: vi.fn() }));
vi.mock("@/lib/email/send-donor-reminder", () => ({ runDailyDonorReminders }));

const success = {
  date: "2026-10-26", candidates: 2, sent: 1, already_sent: 1,
  failed: 0, uncertain: 0, in_progress: 0, expired: 0, skipped_paid: 0,
  skipped_receipt: 0,
};
const originalExitCode = process.exitCode;

beforeEach(() => { process.exitCode = 0; });

afterEach(() => {
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
  vi.resetModules();
  runDailyDonorReminders.mockReset();
});

async function runScript() {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  await import("@/scripts/send-donor-reminders");
  await vi.waitFor(() => expect(log.mock.calls.length + error.mock.calls.length).toBe(1));
  const line = String((log.mock.calls[0] ?? error.mock.calls[0])[0]);
  expect(line).toMatch(/^\[donors:reminders\] \{/);
  return { log, error, line, summary: JSON.parse(line.slice("[donors:reminders] ".length)) };
}

describe("daily reminder command output", () => {
  it("prints only the local date and count categories for a successful run", async () => {
    runDailyDonorReminders.mockResolvedValue(success);
    const result = await runScript();
    expect(result.log).toHaveBeenCalledTimes(1);
    expect(result.error).not.toHaveBeenCalled();
    expect(result.summary).toEqual(success);
    expect(result.line).not.toMatch(/@example|ticket=|donors\//);
    expect(process.exitCode).toBe(0);
  });

  it.each(["failed", "uncertain"])("exits nonzero when %s sends remain", async (category) => {
    runDailyDonorReminders.mockResolvedValue({ ...success, [category]: 1 });
    const result = await runScript();
    expect(result.summary[category]).toBe(1);
    expect(process.exitCode).toBe(1);
  });

  it("hides an operational exception and exits nonzero", async () => {
    runDailyDonorReminders.mockRejectedValue(new Error("secret@example.test ticket=private"));
    const result = await runScript();
    expect(result.log).not.toHaveBeenCalled();
    expect(result.error).toHaveBeenCalledTimes(1);
    expect(result.summary).toEqual({
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      candidates: 0, sent: 0, already_sent: 0, failed: 1, uncertain: 0,
      in_progress: 0, expired: 0, skipped_paid: 0, skipped_receipt: 0,
      operational_failure: true,
    });
    expect(result.line).not.toMatch(/secret@example|ticket=private/);
    expect(process.exitCode).toBe(1);
  });
});
