import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parseIssueRequest } from "./prepare-trace-request.mjs";

test("parses an Agent Trace issue form", () => {
  const request = parseIssueRequest(`### Orchestration scenario

Review panel

### Orchestrator model

gpt-6-sol

### Subagent model

claude-sonnet-4.6

### Task or question

Compare two services safely.

### Trace content

- [x] Include redacted request and response payloads in the HTML trace artifact`);
  assert.deepEqual(request, {
    scenario: "review",
    scenarioLabel: "Review panel",
    instruction: "Dynamically create exactly two read-only review subagents and run them concurrently. Give one a code-correctness and reliability focus and the other an architecture and maintainability focus. Give both the request, then reconcile duplicates and disagreements, discard speculative findings, and return a prioritized evidence-backed review. Every dynamically created subagent must use the claude-sonnet-4.6 model.",
    orchestratorModel: "gpt-6-sol",
    subagentModel: "claude-sonnet-4.6",
    prompt: "Compare two services safely.",
    includeMessages: true,
    requiredModels: "gpt-6-sol,claude-sonnet-4.6",
  });
});

test("rejects edited issue forms with unsupported models", () => {
  assert.throws(() => parseIssueRequest(`### Orchestrator model

untrusted-model

### Subagent model

gpt-6-luna

### Comparison task

Compare services.`), /Unsupported orchestrator model/);
});

test("defaults older issue forms to concurrent research", () => {
  const request = parseIssueRequest(`### Orchestrator model

gpt-6-luna

### Subagent model

gpt-6-luna

### Comparison task

Compare services.`);
  assert.equal(request.scenario, "concurrent");
  assert.equal(request.prompt, "Compare services.");
});

test("rejects unsupported orchestration scenarios", () => {
  assert.throws(() => parseIssueRequest(`### Orchestration scenario

Untrusted workflow

### Orchestrator model

gpt-6-luna

### Subagent model

gpt-6-luna`), /Unsupported scenario/);
});

test("prepares single-agent and rubber-duck scenarios", () => {
  const single = parseIssueRequest(`### Orchestration scenario

Single agent baseline

### Orchestrator model

gpt-6-luna

### Subagent model

gpt-6-luna`);
  assert.equal(single.scenario, "single");
  assert.match(single.instruction, /without invoking any subagents/);
  assert.equal(single.requiredModels, "gpt-6-luna");

  const rubberDuck = parseIssueRequest(`### Orchestration scenario

Rubber duck critique

### Orchestrator model

gpt-6-luna

### Subagent model

gpt-6-luna`);
  assert.equal(rubberDuck.scenario, "rubber-duck");
  assert.match(rubberDuck.instruction, /dynamically create one read-only subagent/);
  assert.match(rubberDuck.instruction, /gpt-6-luna model/);
});
