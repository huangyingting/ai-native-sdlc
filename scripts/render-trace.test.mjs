import { test } from "node:test";
import { strict as assert } from "node:assert";
import { loadSpans, renderTrace } from "./render-trace.mjs";

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

test("fails clearly on missing or malformed traces", () => {
  assert.throws(() => loadSpans(""), /Missing or empty/);
  assert.throws(() => loadSpans("{broken"), /Invalid JSON/);
  assert.throws(() => loadSpans("null"), /Invalid OTLP entry/);
  assert.throws(() => loadSpans(line()), /No OTLP/);
  assert.throws(() => renderTrace(loadSpans(line(span("x", "", "unrelated", 1, 2)))), /no invoke_agent/);
});
