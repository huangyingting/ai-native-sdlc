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
    instruction: "Use fleet to invoke the built-in code-review agent and the repository's architecture-review custom agent concurrently. Give both reviewers the request. Reconcile duplicates and disagreements, discard speculative findings, and return a prioritized evidence-backed review.",
    orchestratorModel: "gpt-6-sol",
    subagentModel: "claude-sonnet-4.6",
    prompt: "Compare two services safely.",
    includeMessages: true,
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

  const rubberDuck = parseIssueRequest(`### Orchestration scenario

Rubber duck critique

### Orchestrator model

gpt-6-luna

### Subagent model

gpt-6-luna`);
  assert.equal(rubberDuck.scenario, "rubber-duck");
  assert.match(rubberDuck.instruction, /built-in rubber duck agent/);
});
