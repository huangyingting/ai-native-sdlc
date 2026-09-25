import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function validateScenarioResult(scenario, output) {
  const text = String(output ?? "");
  const required = scenario === "review"
    ? ["Code-review (model:", "Architecture-review (model:"]
    : scenario === "collaboration"
      ? ["Solution-architect (model:", "Critical-reviewer (model:"]
      : [];
  for (const marker of required) {
    if (!text.includes(marker)) throw new Error(`Scenario ${scenario} did not invoke ${marker.split(" (")[0]}`);
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
