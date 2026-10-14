import { and, asc, eq, isNotNull, isNull, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { donorPledges } from "@/lib/db/schema";
import { lookupCep } from "@/lib/cep/viacep";
import { classifyHistoricalResidence } from "@/lib/donor-residence-enrichment";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const options = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=")];
  })
);
const requestedLimit = Number(options.get("limit") ?? DEFAULT_LIMIT);
const limit = Number.isInteger(requestedLimit)
  ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
  : DEFAULT_LIMIT;
const after = options.get("after");

if (after && !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(after)) {
  console.error("Parâmetro --after inválido; informe um UUID.");
  process.exitCode = 1;
} else {
  void run();
}

async function run() {
  let processed = 0;
  let classified = 0;
  let skipped = 0;
  let failed = 0;
  let nextAfter: string | null = null;

  try {
    const predicates = [
      isNotNull(donorPledges.cep),
      isNull(donorPledges.residence_city),
      isNull(donorPledges.residence_state),
      isNull(donorPledges.residence_source),
    ];
    if (after) predicates.push(gt(donorPledges.id, after));

    const candidates = await db
      .select({ id: donorPledges.id, cep: donorPledges.cep })
      .from(donorPledges)
      .where(and(...predicates))
      .orderBy(asc(donorPledges.id))
      .limit(limit);

    for (const candidate of candidates) {
      processed += 1;
      nextAfter = candidate.id;
      const initial = classifyHistoricalResidence(candidate.cep);
      if (initial.kind === "invalid_cep") {
        skipped += 1;
        continue;
      }

      const result = await lookupCep(candidate.cep ?? "");
      const classification = classifyHistoricalResidence(candidate.cep, result);
      if (classification.kind === "lookup_failed") {
        failed += 1;
        continue;
      }
      if (classification.kind !== "eligible") {
        skipped += 1;
        continue;
      }

      const updated = await db
        .update(donorPledges)
        .set({
          residence_city: classification.city,
          residence_state: classification.state,
          residence_source: "cep_lookup",
        })
        .where(
          and(
            eq(donorPledges.id, candidate.id),
            isNull(donorPledges.residence_city),
            isNull(donorPledges.residence_state),
            isNull(donorPledges.residence_source)
          )
        )
        .returning({ id: donorPledges.id });

      if (updated.length) classified += 1;
      else skipped += 1;
    }

    console.log(JSON.stringify({
      processed,
      classified,
      skipped,
      failed,
      next_after: nextAfter,
      limit,
    }));
  } catch (error) {
    console.error("Falha no enriquecimento de residências.");
    process.exitCode = 1;
  } finally {
    await db.$client.end();
  }
}
