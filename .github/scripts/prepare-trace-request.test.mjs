import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { parseIssueRequest, supportedPatterns } from "./prepare-trace-request.mjs";

test("parses a Copilot CLI agent demo issue form", () => {
  const request = parseIssueRequest(`### Orchestration pattern

Parallel delegation

### Orchestrator model

gpt-6-sol

### Subagent model

claude-sonnet-4.6

### Task or question

Compare two services safely.

### Agent instructions

Focus one reviewer on API compatibility.

### Trace content

- [x] Include redacted request and response payloads in the HTML trace artifact`);
  assert.deepEqual(request, {
    scenario: "parallel-delegation",
    scenarioLabel: "Parallel delegation",
    execution: "fleet",
    instruction: "Dynamically create at least two read-only subagents and run them concurrently. Give each an independent subtask or perspective, wait for all branches, then synthesize their results and reconcile conflicts. Focus one reviewer on API compatibility. Every dynamically created subagent must use the claude-sonnet-4.6 model.",
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

test("defaults older issue forms to parallel delegation", () => {
  const request = parseIssueRequest(`### Orchestrator model

gpt-6-luna

### Subagent model

gpt-6-luna

### Comparison task

Compare services.`);
  assert.equal(request.scenario, "parallel-delegation");
  assert.equal(request.scenarioLabel, "Parallel delegation");
  assert.equal(request.prompt, "Compare services.");
});

test("rejects unsupported orchestration patterns", () => {
  assert.throws(() => parseIssueRequest(`### Orchestration pattern

Untrusted workflow

### Orchestrator model

gpt-6-luna

### Subagent model

gpt-6-luna`), /Unsupported orchestration pattern/);
});

test("prepares direct and critique demos", () => {
  const single = parseIssueRequest(`### Orchestration pattern

Direct execution

### Orchestrator model

gpt-6-luna

### Subagent model

gpt-6-luna`);
  assert.equal(single.scenario, "direct-execution");
  assert.match(single.instruction, /without invoking any subagents/);
  assert.equal(single.requiredModels, "gpt-6-luna");

  const rubberDuck = parseIssueRequest(`### Orchestration pattern

Critic-reviser loop

### Orchestrator model

gpt-6-luna

### Subagent model

gpt-6-luna`);
  assert.equal(rubberDuck.scenario, "critic-reviser-loop");
  assert.match(rubberDuck.instruction, /dynamically create one read-only subagent/);
  assert.match(rubberDuck.instruction, /gpt-6-luna model/);
});

test("provides a runnable default for every orchestration pattern", () => {
  for (const { id, label, defaultPrompt, defaultGuidance } of supportedPatterns) {
    const request = parseIssueRequest(`### Orchestration pattern

${label}

### Orchestrator model

gpt-6-luna

### Subagent model

gpt-6-luna`);
    assert.equal(request.scenario, id);
    assert.equal(request.prompt, defaultPrompt);
    assert.ok(request.instruction.length > 20);
    if (defaultGuidance) assert.match(request.instruction, new RegExp(defaultGuidance.slice(0, 20)));
  }
});

test("keeps orchestration pattern labels synchronized", () => {
  for (const path of [".github/workflows/copilot-trace.yml", ".github/ISSUE_TEMPLATE/agent-trace.yml"]) {
    const source = readFileSync(path, "utf8");
    for (const { label } of supportedPatterns) {
      assert.match(source, new RegExp(`- ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
  }
});
