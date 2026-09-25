import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { demoCatalog, loadDemoCatalog } from "./demo-catalog.mjs";
import { parseIssueRequest } from "./prepare-trace-request.mjs";

test("parses a Copilot CLI agent demo issue form", () => {
  const request = parseIssueRequest(`### Orchestration demo

Parallel review

### Orchestrator model

gpt-6-sol

### Subagent model

claude-sonnet-4.6

### Task or question

Compare two services safely.

### Trace content

- [x] Include redacted request and response payloads in the HTML trace artifact`);
  assert.deepEqual(request, {
    scenario: "parallel-review",
    scenarioLabel: "Parallel review",
    execution: "fleet",
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

test("defaults older issue forms to parallel research", () => {
  const request = parseIssueRequest(`### Orchestrator model

gpt-6-luna

### Subagent model

gpt-6-luna

### Comparison task

Compare services.`);
  assert.equal(request.scenario, "parallel-research");
  assert.equal(request.scenarioLabel, "Parallel research");
  assert.equal(request.prompt, "Compare services.");
});

test("rejects unsupported orchestration demos", () => {
  assert.throws(() => parseIssueRequest(`### Orchestration demo

Untrusted workflow

### Orchestrator model

gpt-6-luna

### Subagent model

gpt-6-luna`), /Unsupported demo/);
});

test("prepares direct and critique demos", () => {
  const single = parseIssueRequest(`### Orchestration demo

Single-agent baseline

### Orchestrator model

gpt-6-luna

### Subagent model

gpt-6-luna`);
  assert.equal(single.scenario, "single-agent-baseline");
  assert.match(single.instruction, /without invoking any subagents/);
  assert.equal(single.requiredModels, "gpt-6-luna");

  const rubberDuck = parseIssueRequest(`### Orchestration demo

Critique and revision

### Orchestrator model

gpt-6-luna

### Subagent model

gpt-6-luna`);
  assert.equal(rubberDuck.scenario, "critique-and-revision");
  assert.match(rubberDuck.instruction, /dynamically create one read-only subagent/);
  assert.match(rubberDuck.instruction, /gpt-6-luna model/);
});

test("keeps demo labels synchronized with workflow choices", () => {
  const labels = demoCatalog.map((demo) => demo.label);
  for (const path of [".github/workflows/copilot-trace.yml", ".github/ISSUE_TEMPLATE/agent-trace.yml"]) {
    const source = readFileSync(path, "utf8");
    for (const label of labels) assert.match(source, new RegExp(`- ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  }
  assert.equal(loadDemoCatalog().length, 5);
});
