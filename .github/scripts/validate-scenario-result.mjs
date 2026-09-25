import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function validateScenarioResult(scenario, output) {
  const text = String(output ?? "");
  const required = scenario === "review"
    ? ["AGENT_TRACE_ARCHITECTURE_REVIEW_COMPLETE", "AGENT_TRACE_RELIABILITY_REVIEW_COMPLETE"]
    : scenario === "collaboration"
      ? ["AGENT_TRACE_SOLUTION_ARCHITECT_COMPLETE", "AGENT_TRACE_CRITICAL_REVIEW_COMPLETE"]
      : [];
  for (const marker of required) {
    if (!text.includes(marker)) throw new Error(`Scenario ${scenario} did not produce ${marker}`);
  }
  if (scenario === "collaboration" && text.indexOf(required[0]) >= text.indexOf(required[1])) {
    throw new Error("Collaboration scenario did not complete the solution architect before the critical reviewer");
  }
  return true;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  validateScenarioResult(
    process.env.TRACE_SCENARIO,
    readFileSync(process.env.TRACE_RESULT_PATH, "utf8"),
  );
}
