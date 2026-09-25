import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSpans, renderTrace, renderGraph, renderHtml, summarizeTrace } from "./render-trace.mjs";

const attr = (key, stringValue) => ({ key, value: { stringValue } });
const span = (spanId, parentSpanId, name, start, end, attributes = [], traceId = "trace-a") => ({
  traceId, spanId, parentSpanId, name,
  startTimeUnixNano: `${start}000000`,
  endTimeUnixNano: `${end}000000`,
  attributes,
});
const line = (...spans) => JSON.stringify({ resourceSpans: [{ scopeSpans: [{ spans }] }] });

test("reconstructs shuffled spans, nested agents, tools, models and real overlap", () => {
  const jsonl = [
    line({ ...span("tool", "left", "execute_tool web_search", 1300, 1400), status: { code: 1 } }),
    line(span("right", "root", "invoke_agent research-b", 1200, 1700)),
    line(span("chat", "left", "chat gpt-5", 1450, 1500, [attr("gen_ai.usage.input_tokens", "12"), attr("gen_ai.usage.output_tokens", "4")])),
    line(span("root", "", "invoke_agent parent", 1000, 2000)),
    line(span("left", "root", "invoke_agent research-a", 1100, 1600)),
  ].join("\n");
  const result = renderTrace(loadSpans(jsonl));
  assert.match(result, /Subagents: 2 \| Peak concurrent subagents: 2/);
  assert.match(result, /Tool calls: 1 .* Tokens: 12\/4/);
  assert.match(result, /invoke_agent parent[\s\S]*  invoke_agent research-a[\s\S]*    execute_tool web_search .* status=ok[\s\S]*    chat gpt-5[\s\S]*  invoke_agent research-b/);
});

test("reports no invented subagents and isolates parent identifiers by trace", () => {
  const result = renderTrace(loadSpans([
    line(span("same", "", "invoke_agent parent", 1000, 2000)),
    line(span("other", "same", "execute_tool view", 1100, 1200, [], "trace-b")),
  ].join("\n")));
  assert.match(result, /Subagents: 0 \| Peak concurrent subagents: 0/);
  assert.match(result, /No subagents observed/);
  assert.match(result, /execute_tool view .* status=ok/);
  assert.doesNotMatch(result, /status=unknown/);
});

test("accepts the CLI's direct JSONL span records with hrtime and attribute objects", () => {
  const hash = (name) => createHash("sha256").update(name).digest("hex");
  const id = (server, tool) => `${hash(server)}/${hash(tool).slice(0, 35)}`;
  assert.equal(id("microsoft-learn", "microsoft_docs_search"),
    "13b8ca8a502562dbd2771a98ddffb2928c5f332b9613385401698065fc630761/9eda69db084fe3d07903b420273b6010da2");
  const direct = (id, parent, name, start, end, attributes = {}) => JSON.stringify({
    type: "span", traceId: "direct-trace", spanId: id, parentSpanId: parent, name,
    kind: 0, startTime: [1700000000, start], endTime: [1700000000, end],
    attributes, status: { code: 1 },
  });
  const spans = loadSpans([
    direct("web", "aws", "execute_tool web_fetch", 250000000, 350000000),
    direct("mcp", "azure", `execute_tool ${id("microsoft-learn", "microsoft_docs_search")}`, 260000000, 360000000,
      { "gen_ai.tool.name": `${id("microsoft-learn", "microsoft_docs_search")}\u200b` }),
    direct("aws-chat", "aws", "chat gpt-6-luna", 400000000, 450000000, {
      "gen_ai.input.messages": JSON.stringify([{ role: "system", content: "internal instructions" },
        { role: "user", content: "Fetch public S3 docs using ghs_12345678901234567890" }]),
      "gen_ai.output.messages": JSON.stringify([{ role: "assistant", content: "S3 versioning <verified>" }]),
      "gen_ai.usage.input_tokens": 120,
      "gen_ai.usage.output_tokens": 30,
      "gen_ai.usage.cost": 0.003,
    }),
    direct("azure-chat", "azure", "chat gpt-6-luna", 410000000, 460000000),
    direct("root-chat", "root", "chat gpt-6-luna", 750000000, 800000000, { "gen_ai.usage.cost": 0.02 }),
    direct("azure", "root", "invoke_agent Azure", 200000000, 700000000),
    direct("aws", "root", "invoke_agent AWS", 100000000, 600000000),
    direct("root", "", "invoke_agent parent", 0, 900000000, { "gen_ai.input.messages": "private prompt must never be rendered" }),
  ].join("\n"));
  const result = summarizeTrace(spans, { includeMessages: true, expectedModel: "gpt-6-luna" });
  assert.equal(result.complete, true);
  assert.equal(result.modelMatches, true);
  assert.match(result.summary, /Demo evidence: PASS.*distinct branches: yes/);
  assert.match(result.summary, /execute_tool web_fetch/);
  assert.match(result.summary, /execute_tool microsoft-learn\/microsoft_docs_search/);
  assert.doesNotMatch(result.summary, /status=unknown/);
  assert.match(renderTrace(loadSpans(line(span("x", "", "execute_tool microsoft-learn-microsoft_docs_search", 1, 2)))),
    /execute_tool microsoft-learn\/microsoft_docs_search/);
  assert.match(result.summary, /Peak concurrent subagents: 2/);
  assert.match(result.summary, /Required: gpt-6-luna \(PASS\)/);
  const graph = renderGraph(result.events);
  assert.match(graph, /aria-label="Agent, model, and tool dependency map"/);
  assert.match(graph, /microsoft-learn\/microsoft_docs_search/);
  assert.ok((graph.match(/<path /g) ?? []).length >= 4);
  const html = renderHtml(result);
  assert.match(html, /scoutTheme/);
  assert.match(html, /Agent Trace/);
  assert.match(html, /data-mode="trace"/);
  assert.match(html, /data-mode="dependencies"/);
  assert.match(html, /id="span-search"/);
  assert.match(html, /class="inspector-panel"/);
  assert.match(html, /class="svg-icon/);
  assert.match(html, /aria-label="Download PNG"/);
  assert.doesNotMatch(html, /Signals/);
  assert.match(html, />Dependencies</);
  assert.match(html, /reported cost/i);
  assert.match(html, /\$0\.0230/);
  assert.match(html, /Cost allocation/);
  assert.match(html, /By agent branch/);
  assert.equal(result.costBreakdown.byModel.length, 1);
  assert.equal(result.costBreakdown.byAgent.length, 3);
  assert.match(html, /id="download-png"/);
  assert.match(html, /microsoft-learn\/microsoft_docs_search/);
  assert.match(html, /S3 versioning &lt;verified&gt;/);
  assert.match(html, /\[REDACTED TOKEN\]/);
  assert.doesNotMatch(html, /ghs_12345678901234567890|internal instructions/);
  assert.doesNotMatch(html, /private prompt must never be rendered/);
  assert.equal(summarizeTrace(spans, { expectedModel: "gpt-5" }).modelMatches, false);
  assert.equal(summarizeTrace(spans, { expectedModel: "gpt-6-luna,gpt-5" }).modelMatches, false);
  assert.doesNotMatch(renderHtml(summarizeTrace(spans)), /S3 versioning &lt;verified&gt;/);
});

test("validates parent and subagent model selections as an observed set", () => {
  const spans = loadSpans(line(
    span("parent", "", "chat github-copilot/gpt-6-luna-2026-09-01", 1, 2),
    span("child", "", "chat claude-sonnet-4.6", 3, 4),
  ));
  assert.equal(summarizeTrace(spans, { expectedModel: "gpt-6-luna,claude-sonnet-4.6" }).modelMatches, true);
  assert.equal(summarizeTrace(spans, { expectedModel: "gpt-6-luna,gpt-6-sol" }).modelMatches, false);
  assert.equal(summarizeTrace(loadSpans(line(
    span("mini", "", "chat gpt-5.4-mini", 1, 2),
  )), { expectedModel: "gpt-5.4" }).modelMatches, false);
});

test("does not accept a failed Microsoft Learn call as concurrent evidence", () => {
  const spans = loadSpans(line(
    span("root", "", "invoke_agent", 0, 100),
    span("aws", "root", "invoke_agent aws-storage", 10, 80),
    span("azure", "root", "invoke_agent azure-storage", 20, 90),
    span("web", "aws", "execute_tool web_fetch", 30, 40),
    { ...span("mcp", "azure", "execute_tool microsoft-learn-microsoft_docs_search", 30, 40), status: { code: 2 } },
  ));
  assert.equal(summarizeTrace(spans, { scenario: "concurrent" }).complete, false);
});

test("validates review and sequential collaboration scenario evidence", () => {
  const review = loadSpans(line(
    span("root", "", "invoke_agent", 0, 100),
    span("left", "root", "invoke_agent architecture-review", 10, 70),
    span("right", "root", "invoke_agent reliability-review", 20, 80),
  ));
  assert.equal(summarizeTrace(review, { scenario: "review" }).complete, true);
  assert.equal(summarizeTrace(review, { scenario: "collaboration" }).complete, false);

  const collaboration = loadSpans(line(
    span("root", "", "invoke_agent", 0, 100),
    span("architect", "root", "invoke_agent solution-architect", 10, 40),
    span("reviewer", "root", "invoke_agent critical-reviewer", 50, 90),
  ));
  const result = summarizeTrace(collaboration, { scenario: "collaboration" });
  assert.equal(result.complete, true);
  assert.match(result.summary, /sequential execution: yes/);
  assert.equal(summarizeTrace(collaboration, { scenario: "review" }).complete, false);
  assert.equal(summarizeTrace(collaboration, { scenario: "rubber-duck" }).complete, true);
});

test("validates a single-agent baseline without delegated agents", () => {
  const baseline = loadSpans(line(
    span("root", "", "invoke_agent", 0, 100),
    span("chat", "root", "chat gpt-6-luna", 10, 90),
  ));
  assert.equal(summarizeTrace(baseline, { scenario: "single" }).complete, true);
  assert.equal(summarizeTrace(baseline, { scenario: "rubber-duck" }).complete, false);
});

test("hydrates file-backed tool output before redaction and rendering", () => {
  const directory = mkdtempSync(join(tmpdir(), "trace-viewer-test-"));
  const outputPath = join(directory, "123-copilot-tool-output-result.txt");
  const fullOutput = `{"results":[{"title":"Complete result","content":"${"useful ".repeat(400)}END-OF-FILE"}]}`;
  writeFileSync(outputPath, fullOutput);
  try {
    const trace = line(span("tool", "", "execute_tool microsoft_docs_search", 1, 2, [
      attr("gen_ai.tool.call.result", `Output too large to read at once (4 KB). Saved to: ${outputPath}\n\nPreview (first 500 chars): partial only`),
    ]));
    const model = summarizeTrace(loadSpans(trace), { includeMessages: true });
    assert.equal(model.events[0].response, fullOutput);
    const html = renderHtml(model);
    assert.match(html, /END-OF-FILE/);
    assert.doesNotMatch(html, /\[truncated\]|Saved to:|trace-viewer-test-/);
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("estimates mixed-model cost from the model pricing catalog", () => {
  const gpt = span("gpt", "", "chat github-copilot/gpt-6-luna-2026-09-01", 1, 2, [
    attr("gen_ai.usage.input_tokens", "1000000"),
    attr("gen_ai.usage.output_tokens", "2000000"),
  ]);
  const claude = span("claude", "", "chat anthropic/claude-sonnet-4.6", 3, 4, [
    attr("gen_ai.usage.input_tokens", "1000000"),
    attr("gen_ai.usage.output_tokens", "2000000"),
  ]);
  const unknownSpan = span("unknown", "", "chat private-model", 5, 6, [
    attr("gen_ai.usage.input_tokens", "1000000"),
    attr("gen_ai.usage.output_tokens", "2000000"),
  ]);
  const model = summarizeTrace(loadSpans(line(gpt, claude, unknownSpan)));
  assert.equal(model.events[0].cost, 1.7);
  assert.equal(model.events[0].pricedModel, "gpt-6-luna");
  assert.equal(model.events[1].cost, 33);
  assert.equal(model.events[1].pricedModel, "claude-sonnet-4.6");
  assert.equal(model.events[2].cost, null);
  assert.equal(model.counts.totalCost, 34.7);
  assert.equal(model.counts.costedCalls, 2);
  assert.equal(model.counts.costMode, "estimated");
  assert.equal(model.costBreakdown.byModel.length, 3);
  assert.equal(model.costBreakdown.byModel.find((group) => group.label === "private-model").cost, null);
  assert.match(renderHtml(model), /estimated cost/i);
  assert.match(renderHtml(model), /\$34\.7000/);
  const unknown = summarizeTrace(loadSpans(line(span("unknown", "", "chat private-model", 1, 2))));
  assert.equal(unknown.events[0].cost, null);
  assert.equal(unknown.counts.totalCost, null);
});

test("fails clearly on missing or malformed traces", () => {
  assert.throws(() => loadSpans(""), /Missing or empty/);
  assert.throws(() => loadSpans("{broken"), /Invalid JSON/);
  assert.throws(() => loadSpans("null"), /Invalid OTLP entry/);
  assert.throws(() => loadSpans(line()), /No trace spans/);
  assert.throws(() => renderTrace(loadSpans(line(span("x", "", "unrelated", 1, 2)))), /no invoke_agent/);
});
