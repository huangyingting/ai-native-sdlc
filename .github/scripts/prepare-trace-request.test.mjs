import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parseIssueRequest } from "./prepare-trace-request.mjs";

test("parses an Agent Trace issue form", () => {
  const request = parseIssueRequest(`### Orchestrator model

gpt-6-sol

### Subagent model

claude-sonnet-4.6

### Comparison task

Compare two services safely.

### Trace content

- [x] Include redacted request and response payloads in the HTML trace artifact`);
  assert.deepEqual(request, {
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
