import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function clean(text, limit) {
  const normalized = String(text ?? "")
    .replace(/\u001b\[[0-9;]*m/g, "")
    .trim();
  return normalized.length > limit
    ? `${normalized.slice(0, limit)}\n\n> Output truncated in this comment. Download the artifact for the complete result.`
    : normalized;
}

export function buildTraceComment({
  report,
  comparison,
  orchestratorModel,
  subagentModel,
  runUrl,
  mediaUrl,
}) {
  const result = clean(comparison, 24_000) || "_The orchestrator did not produce a comparison result._";
  const errors = report?.signals?.errors ?? [];
  const slow = report?.signals?.slow ?? [];
  const media = mediaUrl
    ? `![Agent Trace dependency map](${mediaUrl})`
    : "> The dependency-map image could not be attached. It remains available in the workflow artifact.";
  const diagnosticRows = report ? [
    `| Duration | ${report.durationText} |`,
    `| Spans | ${report.counts.events} |`,
    `| Errors | ${report.counts.errors} |`,
    `| Peak parallel subagents | ${report.counts.peak} |`,
    `| Tokens | ${report.counts.inputTokens.toLocaleString()} in / ${report.counts.outputTokens.toLocaleString()} out |`,
    `| Model cost | ${report.costText} (${report.counts.costedCalls}/${report.counts.chats} model calls priced) |`,
  ].join("\n") : "| Trace report | Rendering did not complete |";
  const signals = [
    ...errors.map((event) => `- **Error:** \`${event.name}\` · ${event.duration}`),
    ...slow.filter((event) => !errors.some((error) => error.id === event.id))
      .map((event) => `- **Slow span:** \`${event.name}\` · ${event.duration}`),
  ];
  return `<!-- agent-trace-result -->
## Agent Trace result

**Models:** orchestrator \`${orchestratorModel}\` · subagents \`${subagentModel}\`

### Comparison

${result}

<details>
<summary>Trace diagnostics</summary>

| Metric | Value |
|---|---:|
${diagnosticRows}

${signals.length ? signals.join("\n") : "- No errors were recorded in the trace."}

</details>

${media}

[Open workflow run](${runUrl}) · [Download interactive Agent Trace report](${runUrl}#artifacts)
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const rawReport = read(process.env.TRACE_DATA_PATH);
  writeFileSync(process.env.COMMENT_PATH, buildTraceComment({
    report: rawReport ? JSON.parse(rawReport) : null,
    comparison: read(process.env.TRACE_RESULT_PATH),
    orchestratorModel: process.env.ORCHESTRATOR_MODEL,
    subagentModel: process.env.SUBAGENT_MODEL,
    runUrl: process.env.RUN_URL,
    mediaUrl: process.env.MEDIA_URL,
  }));
}
