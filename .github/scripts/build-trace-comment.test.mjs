import { test } from "node:test";
import { strict as assert } from "node:assert";
import { buildTraceComment } from "./build-trace-comment.mjs";

test("builds an issue comment with comparison, diagnostics, and a dependency graph", () => {
  const comment = buildTraceComment({
    orchestratorModel: "gpt-6-luna",
    subagentModel: "claude-sonnet-4.6",
    scenarioLabel: "Review panel",
    comparison: "S3 and Blob Storage differ in lifecycle semantics.",
    runUrl: "https://github.com/example/repo/actions/runs/1",
    report: {
      durationText: "12.30 s",
      costText: "$0.123000",
      counts: { events: 8, errors: 1, peak: 2, inputTokens: 100, outputTokens: 20, costedCalls: 2, chats: 2 },
      signals: {
        errors: [{ id: "error", name: "web_fetch", duration: "500 ms" }],
        slow: [{ id: "slow", name: "aws-storage", duration: "8,000 ms" }],
      },
      dependencies: [
        { id: "root", owner: null, kind: "invoke_agent", name: "orchestrator", calls: 1, failed: false },
        { id: "child", owner: "root", kind: "invoke_agent", name: "aws-storage", calls: 1, failed: false },
        { id: "tool", owner: "child", kind: "execute_tool", name: "web_fetch", calls: 2, failed: true },
      ],
    },
  });
  assert.match(comment, /### Comparison[\s\S]*S3 and Blob Storage/);
  assert.match(comment, /orchestrator `gpt-6-luna` · subagents `claude-sonnet-4.6`/);
  assert.match(comment, /\*\*Scenario:\*\* Review panel/);
  assert.match(comment, /\*\*Error:\*\* `web_fetch`/);
  assert.match(comment, /```mermaid[\s\S]*flowchart LR/);
  assert.match(comment, /orchestrator[\s\S]*aws-storage[\s\S]*web_fetch/);
  assert.match(comment, /class n2 failed/);
  assert.match(comment, /Download interactive Agent Trace report/);
});

test("uses a GitHub-hosted dependency image when one is available", () => {
  const comment = buildTraceComment({
    orchestratorModel: "gpt-6-luna",
    subagentModel: "gpt-6-luna",
    scenarioLabel: "Concurrent research",
    comparison: "Comparison",
    runUrl: "https://github.com/example/repo/actions/runs/1",
    mediaUrl: "https://github.com/user-attachments/assets/dependency-map",
    report: {
      durationText: "1.00 s",
      costText: "$0.001000",
      counts: { events: 2, errors: 0, peak: 1, inputTokens: 10, outputTokens: 2, costedCalls: 1, chats: 1 },
      signals: { errors: [], slow: [] },
      dependencies: [],
    },
  });
  assert.match(comment, /!\[Agent Trace dependency map\]\(https:\/\/github.com\/user-attachments\/assets\/dependency-map\)/);
  assert.doesNotMatch(comment, /```mermaid/);
});
