import { runDailyDonorReminders } from "../lib/email/send-donor-reminder";
import { saoPauloDate } from "../lib/donor-recurrence";

async function main() {
  try {
    const counts = await runDailyDonorReminders();
    console.log(`[donors:reminders] ${JSON.stringify(counts)}`);
    if (counts.failed || counts.uncertain) process.exitCode = 1;
  } catch {
    // Operational output contains counts/categories only, never donor or provider data.
    console.error(`[donors:reminders] ${JSON.stringify({
      date: saoPauloDate(new Date()), candidates: 0, sent: 0, already_sent: 0, failed: 1, uncertain: 0,
      in_progress: 0, expired: 0, skipped_paid: 0, skipped_receipt: 0,
      operational_failure: true,
    })}`);
    process.exitCode = 1;
  }
}

void main();
