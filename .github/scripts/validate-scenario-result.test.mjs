import { test } from "node:test";
import { strict as assert } from "node:assert";
import { validateScenarioResult } from "./validate-scenario-result.mjs";

test("accepts both review agent markers in either completion order", () => {
  assert.equal(validateScenarioResult("review",
    "Code-review (model: gpt-6-luna)\nArchitecture-review (model: gpt-6-luna)"), true);
});

test("requires sequential collaboration markers in order", () => {
  assert.equal(validateScenarioResult("collaboration",
    "Solution-architect (model: gpt-6-luna)\nCritical-reviewer (model: gpt-6-luna)"), true);
  assert.throws(() => validateScenarioResult("collaboration",
    "Critical-reviewer (model: gpt-6-luna)\nSolution-architect (model: gpt-6-luna)"), /did not complete/);
});

test("does not impose output markers on concurrent research", () => {
  assert.equal(validateScenarioResult("concurrent", "comparison complete"), true);
  assert.equal(validateScenarioResult("single", "baseline complete"), true);
});

test("requires the built-in rubber duck in its dedicated scenario", () => {
  assert.equal(validateScenarioResult("rubber-duck", "● Rubber-duck agent — challenge assumptions"), true);
  assert.throws(() => validateScenarioResult("rubber-duck", "No critic was used"), /required agent/);
});
