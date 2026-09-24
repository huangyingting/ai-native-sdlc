import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
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
  assert.match(result, /execute_tool view/);
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
    }),
    direct("azure-chat", "azure", "chat gpt-6-luna", 410000000, 460000000),
    direct("root-chat", "root", "chat gpt-6-luna", 750000000, 800000000),
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
  assert.match(renderTrace(loadSpans(line(span("x", "", "execute_tool microsoft-learn-microsoft_docs_search", 1, 2)))),
    /execute_tool microsoft-learn\/microsoft_docs_search/);
  assert.match(result.summary, /Peak concurrent subagents: 2/);
  assert.match(result.summary, /Required: gpt-6-luna \(PASS\)/);
  const graph = renderGraph(result.events);
  assert.match(graph, /aria-label="Observed agent to model and tool invocation graph"/);
  assert.match(graph, /microsoft-learn\/microsoft_docs_search/);
  assert.ok((graph.match(/<path /g) ?? []).length >= 4);
  const html = renderHtml(result);
  assert.match(html, /scoutTheme/);
  assert.match(html, /--cp-bg: #f7f4ef/);
  assert.match(html, /microsoft-learn\/microsoft_docs_search/);
  assert.match(html, /S3 versioning &lt;verified&gt;/);
  assert.match(html, /\[REDACTED TOKEN\]/);
  assert.doesNotMatch(html, /ghs_12345678901234567890|internal instructions/);
  assert.doesNotMatch(html, /private prompt must never be rendered/);
  assert.equal(summarizeTrace(spans, { expectedModel: "gpt-5" }).modelMatches, false);
  assert.doesNotMatch(renderHtml(summarizeTrace(spans)), /S3 versioning &lt;verified&gt;/);
});

test("fails clearly on missing or malformed traces", () => {
  assert.throws(() => loadSpans(""), /Missing or empty/);
  assert.throws(() => loadSpans("{broken"), /Invalid JSON/);
  assert.throws(() => loadSpans("null"), /Invalid OTLP entry/);
  assert.throws(() => loadSpans(line()), /No trace spans/);
  assert.throws(() => renderTrace(loadSpans(line(span("x", "", "unrelated", 1, 2)))), /no invoke_agent/);
});
