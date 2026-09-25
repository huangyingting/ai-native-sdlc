import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function validateScenarioResult(scenario, output) {
  const text = String(output ?? "");
  const required = scenario === "review"
    ? [/Code-review \(model:/i, /Architecture-review \(model:/i]
    : scenario === "collaboration"
      ? [/Solution-architect \(model:/i, /Critical-reviewer \(model:/i]
      : scenario === "rubber-duck"
        ? [/Rubber-duck \(model:/i]
        : [];
  for (const pattern of required) {
    if (!pattern.test(text)) throw new Error(`Scenario ${scenario} did not invoke the required agent matching ${pattern}`);
  }
  if (scenario === "collaboration" && text.search(required[0]) >= text.search(required[1])) {
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
