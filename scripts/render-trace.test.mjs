import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { loadSpans, renderTrace, summarizeTrace } from "./render-trace.mjs";

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
  const id = (server, tool) => `${hash(server)}/${hash(tool).slice(0, 40)}`;
  const direct = (id, parent, name, start, end, attributes = {}) => JSON.stringify({
    type: "span", traceId: "direct-trace", spanId: id, parentSpanId: parent, name,
    kind: 0, startTime: [1700000000, start], endTime: [1700000000, end],
    attributes, status: { code: 1 },
  });
  const result = summarizeTrace(loadSpans([
    direct("web", "aws", `execute_tool ${id("github-mcp-server", "web_search")}`, 250000000, 350000000),
    direct("mcp", "azure", `execute_tool ${id("microsoft-learn", "microsoft_docs_search")}`, 260000000, 360000000,
      { "gen_ai.tool.name": id("microsoft-learn", "microsoft_docs_search") }),
    direct("azure", "root", "invoke_agent Azure", 200000000, 700000000),
    direct("aws", "root", "invoke_agent AWS", 100000000, 600000000),
    direct("root", "", "invoke_agent parent", 0, 900000000),
  ].join("\n")));
  assert.equal(result.complete, true);
  assert.match(result.summary, /Demo evidence: PASS.*distinct branches: yes/);
  assert.match(result.summary, /execute_tool github-mcp-server\/web_search/);
  assert.match(result.summary, /execute_tool microsoft-learn\/microsoft_docs_search/);
  assert.match(result.summary, /Peak concurrent subagents: 2/);
});

test("fails clearly on missing or malformed traces", () => {
  assert.throws(() => loadSpans(""), /Missing or empty/);
  assert.throws(() => loadSpans("{broken"), /Invalid JSON/);
  assert.throws(() => loadSpans("null"), /Invalid OTLP entry/);
  assert.throws(() => loadSpans(line()), /No trace spans/);
  assert.throws(() => renderTrace(loadSpans(line(span("x", "", "unrelated", 1, 2)))), /no invoke_agent/);
});
