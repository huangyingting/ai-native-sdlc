import { test } from "node:test";
import { strict as assert } from "node:assert";
import { buildTraceComment } from "./build-trace-comment.mjs";

test("builds an issue comment with comparison, diagnostics, and media", () => {
  const comment = buildTraceComment({
    orchestratorModel: "gpt-6-luna",
    subagentModel: "claude-sonnet-4.6",
    comparison: "S3 and Blob Storage differ in lifecycle semantics.",
    runUrl: "https://github.com/example/repo/actions/runs/1",
    mediaUrl: "https://github.com/user-attachments/assets/map",
    report: {
      durationText: "12.30 s",
      costText: "$0.123000",
      counts: { events: 8, errors: 1, peak: 2, inputTokens: 100, outputTokens: 20, costedCalls: 2, chats: 2 },
      signals: {
        errors: [{ id: "error", name: "web_fetch", duration: "500 ms" }],
        slow: [{ id: "slow", name: "aws-storage", duration: "8,000 ms" }],
      },
    },
  });
  assert.match(comment, /### Comparison[\s\S]*S3 and Blob Storage/);
  assert.match(comment, /orchestrator `gpt-6-luna` · subagents `claude-sonnet-4.6`/);
  assert.match(comment, /\*\*Error:\*\* `web_fetch`/);
  assert.match(comment, /!\[Agent Trace dependency map\]\(https:\/\/github.com\/user-attachments/);
  assert.match(comment, /Download interactive Agent Trace report/);
});
