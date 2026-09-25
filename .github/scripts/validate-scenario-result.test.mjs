import { test } from "node:test";
import { strict as assert } from "node:assert";
import { validateScenarioResult } from "./validate-scenario-result.mjs";

test("accepts both review agent markers in either completion order", () => {
  assert.equal(validateScenarioResult("review",
    "AGENT_TRACE_RELIABILITY_REVIEW_COMPLETE\nAGENT_TRACE_ARCHITECTURE_REVIEW_COMPLETE"), true);
});

test("requires sequential collaboration markers in order", () => {
  assert.equal(validateScenarioResult("collaboration",
    "AGENT_TRACE_SOLUTION_ARCHITECT_COMPLETE\nAGENT_TRACE_CRITICAL_REVIEW_COMPLETE"), true);
  assert.throws(() => validateScenarioResult("collaboration",
    "AGENT_TRACE_CRITICAL_REVIEW_COMPLETE\nAGENT_TRACE_SOLUTION_ARCHITECT_COMPLETE"), /did not complete/);
});

test("does not impose output markers on concurrent research", () => {
  assert.equal(validateScenarioResult("concurrent", "comparison complete"), true);
});
