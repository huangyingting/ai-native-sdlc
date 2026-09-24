import { readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const configured = JSON.parse(readFileSync(new URL("../.github/mcp.json", import.meta.url), "utf8")).mcpServers;
const hash = (name) => createHash("sha256").update(name).digest("hex");
const mcpNames = new Map(Object.entries(configured).flatMap(([server, config]) =>
  config.tools.flatMap((tool) => [
    [`${hash(server)}/${hash(tool).slice(0, 35)}`, `${server}/${tool}`],
    [`${server}-${tool}`, `${server}/${tool}`],
  ])));

function value(attribute) {
  const data = attribute?.value;
  return data?.stringValue ?? data?.intValue ?? data?.doubleValue ?? data?.boolValue;
}

function attributes(span) {
  if (!Array.isArray(span.attributes)) return span.attributes ?? {};
  return Object.fromEntries(span.attributes.map((item) => [item.key, value(item)]));
}

function safe(text, limit = 100) {
  return String(text).replace(/[^a-zA-Z0-9 _,./:+;=-]/g, "").slice(0, limit);
}

function nano(time) {
  if (Array.isArray(time) && time.length === 2) {
    return (BigInt(time[0]) * 1_000_000_000n + BigInt(time[1])).toString();
  }
  return time?.toString();
}

function operation(span, attrs) {
  return attrs["gen_ai.operation.name"] ?? /^(invoke_agent|execute_tool|chat)(?: |$)/.exec(span.name)?.[1];
}

function toolName(span, attrs) {
  const observed = [attrs["gen_ai.tool.name"], span.name.replace(/^execute_tool ?/, "")];
  for (const candidate of observed) {
    if (mcpNames.has(candidate)) return mcpNames.get(candidate);
    const digest = String(candidate ?? "").match(/[a-f0-9]{64}\/[a-f0-9]{35}/)?.[0];
    if (digest && mcpNames.has(digest)) return mcpNames.get(digest);
  }
  return String(observed[0] ?? observed[1]);
}

function timestamp(nanos) {
  return new Date(Number(BigInt(nanos) / 1_000_000n)).toISOString();
}

function elapsed(span) {
  return `${(Number(BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano)) / 1e6).toFixed(0)}ms`;
}

function messagePreview(content) {
  if (content == null) return null;
  let parsed = content;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  const messages = Array.isArray(parsed) ? parsed : parsed?.messages;
  if (!Array.isArray(messages)) return null;
  const text = messages.filter((message) => ["user", "assistant", "tool"].includes(message.role)).map((message) =>
    `${message.role}: ${typeof message.content === "string" ? message.content : JSON.stringify(message.content ?? "")}`).join("\n");
  return publicPreview(text);
}

function publicPreview(content) {
  if (content == null) return null;
  const text = typeof content === "string" ? content : JSON.stringify(content);
  if (!text) return null;
  const redacted = text
    .replace(/(?:gh[pousr]_|github_pat_)[\w-]{12,}/gi, "[REDACTED TOKEN]")
    .replace(/Bearer\s+[\w.-]{12,}/gi, "Bearer [REDACTED]")
    .replace(/((?:access[_-]?token|api[_-]?key|password|secret|authorization)\s*["']?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,}]+)/gi, "$1[REDACTED]");
  return redacted.length > 1200 ? `${redacted.slice(0, 1200)}... [truncated]` : redacted;
}

function capturedMessages(span, attrs, kind) {
  const eventFields = Object.fromEntries((span.events ?? []).flatMap((event) =>
    Object.entries(attributes(event)).filter(([key]) => /gen_ai\.(?:input|output)\.messages|gen_ai\.tool\.call\.(?:arguments|result)/.test(key))));
  const fields = { ...eventFields, ...attrs };
  return kind === "chat" ? {
    request: messagePreview(fields["gen_ai.input.messages"]),
    response: messagePreview(fields["gen_ai.output.messages"]),
  } : kind === "execute_tool" ? {
    request: publicPreview(fields["gen_ai.tool.call.arguments"]),
    response: publicPreview(fields["gen_ai.tool.call.result"]),
  } : { request: null, response: null };
}

export function loadSpans(jsonl) {
  if (!jsonl?.trim()) throw new Error("Missing or empty OTLP JSONL trace");
  const spans = [];
  let firstKeys = "";
  let nestedKeys = "";
  for (const [index, line] of jsonl.trim().split(/\r?\n/).entries()) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      throw new Error(`Invalid JSON on trace line ${index + 1}`);
    }
    if (!entry || typeof entry !== "object") {
      throw new Error(`Invalid OTLP entry on trace line ${index + 1}`);
    }
    if (!firstKeys) {
      firstKeys = Object.keys(entry).map(safe).join(",");
      const nested = entry.data ?? entry.payload ?? entry;
      nestedKeys = Object.keys(nested).map(safe).join(",");
    }
    const candidates = entry.type === "span" ? [entry] :
      (entry.resourceSpans ?? []).flatMap((resource) =>
        (resource.scopeSpans ?? []).flatMap((scope) => scope.spans ?? []));
    for (const span of candidates) {
      const normalized = {
        ...span,
        startTimeUnixNano: nano(span.startTimeUnixNano ?? span.startTime),
        endTimeUnixNano: nano(span.endTimeUnixNano ?? span.endTime),
      };
      if (!normalized.traceId || !normalized.spanId || !normalized.startTimeUnixNano || !normalized.endTimeUnixNano) {
        throw new Error(`Incomplete span on trace line ${index + 1}; record keys: ${firstKeys}`);
      }
      spans.push(normalized);
    }
  }
  if (!spans.length) {
    throw new Error(`No trace spans found (record keys: ${firstKeys}; nested keys: ${nestedKeys})`);
  }
  return spans;
}

export function summarizeTrace(spans, { includeMessages = false, expectedModel = null } = {}) {
  const nodes = new Map();
  for (const span of spans) {
    const key = `${span.traceId}:${span.spanId}`;
    if (nodes.has(key)) throw new Error(`Duplicate span ID in trace: ${key}`);
    nodes.set(key, { span, attrs: attributes(span), children: [] });
  }
  const roots = [];
  for (const node of nodes.values()) {
    const parent = nodes.get(`${node.span.traceId}:${node.span.parentSpanId}`);
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (a, b) =>
    BigInt(a.span.startTimeUnixNano) < BigInt(b.span.startTimeUnixNano) ? -1 :
    BigInt(a.span.startTimeUnixNano) > BigInt(b.span.startTimeUnixNano) ? 1 : 0;
  const agents = [];
  const tools = [];
  const chats = [];
  const lines = [];
  const events = [];
  function visit(node, depth, insideAgent, branch, owner) {
    const { span, attrs } = node;
    const kind = operation(span, attrs);
    const isAgent = kind === "invoke_agent";
    const id = `${span.traceId}:${span.spanId}`;
    const currentBranch = isAgent && insideAgent ? span.spanId : branch;
    if (isAgent) {
      agents.push({ span, subagent: insideAgent });
    }
    if (kind === "execute_tool") tools.push({ ...node, branch: currentBranch });
    if (kind === "chat") chats.push(node);
    if (["invoke_agent", "execute_tool", "chat"].includes(kind)) {
      const detail = kind === "invoke_agent"
        ? attrs["gen_ai.agent.name"] ?? span.name.replace(/^invoke_agent ?/, "")
        : kind === "execute_tool"
          ? toolName(span, attrs)
          : attrs["gen_ai.response.model"] ?? attrs["gen_ai.request.model"] ?? span.name.replace(/^chat ?/, "");
      const mcp = kind === "execute_tool" && (attrs["mcp.server.name"] ?? attrs["github.copilot.mcp.server.name"]);
      const label = mcp && !String(detail).startsWith(`${mcp}/`) ? `${mcp}/${detail}` : detail;
      const status = kind === "execute_tool"
        ? ` status=${Number(span.status?.code) === 2 || attrs["error.type"] ? "error" : Number(span.status?.code) === 1 ? "ok" : "unknown"}`
        : Number(span.status?.code) === 2 || attrs["error.type"] ? " ERROR" : "";
      const tokens = kind === "chat" && (attrs["gen_ai.usage.input_tokens"] != null || attrs["gen_ai.usage.output_tokens"] != null)
        ? ` tokens=${attrs["gen_ai.usage.input_tokens"] ?? "?"}/${attrs["gen_ai.usage.output_tokens"] ?? "?"} in/out`
        : "";
      const cost = kind === "chat" && attrs["gen_ai.usage.cost"] != null
        ? ` cost=${safe(attrs["gen_ai.usage.cost"])}` : "";
      const text = `${kind} ${safe(label || "(unnamed)")} @ ${timestamp(span.startTimeUnixNano)} (${elapsed(span)})${tokens}${cost}${status}`;
      lines.push(`${"  ".repeat(depth)}${text}`);
      events.push({
        id, owner, kind, depth, text, name: safe(label || "(unnamed)"),
        start: Number(BigInt(span.startTimeUnixNano) / 1_000_000n),
        end: Number(BigInt(span.endTimeUnixNano) / 1_000_000n),
        ...(includeMessages ? capturedMessages(span, attrs, kind) : {}),
      });
    }
    for (const child of node.children.sort(sort)) {
      visit(child, depth + (kind && ["invoke_agent", "execute_tool", "chat"].includes(kind) ? 1 : 0), insideAgent || isAgent, currentBranch, isAgent ? id : owner);
    }
  }
  for (const root of roots.sort(sort)) visit(root, 0, false, undefined, undefined);
  if (!agents.length && !tools.length && !chats.length) {
    throw new Error("Trace has no invoke_agent, execute_tool, or chat spans");
  }
  const subagents = agents.filter((agent) => agent.subagent);
  let concurrent = 0;
  let peak = 0;
  const edges = subagents.flatMap(({ span }) => [
    { time: BigInt(span.startTimeUnixNano), delta: 1 },
    { time: BigInt(span.endTimeUnixNano), delta: -1 },
  ]).sort((a, b) => a.time < b.time ? -1 : a.time > b.time ? 1 : a.delta - b.delta);
  for (const edge of edges) {
    concurrent += edge.delta;
    peak = Math.max(peak, concurrent);
  }
  const input = chats.reduce((sum, { attrs }) => sum + Number(attrs["gen_ai.usage.input_tokens"] ?? 0), 0);
  const output = chats.reduce((sum, { attrs }) => sum + Number(attrs["gen_ai.usage.output_tokens"] ?? 0), 0);
  const tokenInfo = chats.some(({ attrs }) => attrs["gen_ai.usage.input_tokens"] != null)
    ? `${input}/${output} in/out (reported chat spans)` : "unavailable";
  const models = chats.map(({ span, attrs }) =>
    String(attrs["gen_ai.response.model"] ?? attrs["gen_ai.request.model"] ?? span.name.replace(/^chat ?/, "")));
  const modelMatches = !expectedModel || (models.length > 0 && models.every((model) => model === expectedModel));
  const web = tools.find(({ span, attrs, branch }) =>
    branch && toolName(span, attrs) === "web_fetch" && Number(span.status?.code) !== 2 && !attrs["error.type"]);
  const mcp = tools.find(({ span, attrs, branch }) =>
    branch && toolName(span, attrs) === "microsoft-learn/microsoft_docs_search");
  const complete = peak >= 2 && web && mcp && web.branch !== mcp.branch;
  const messageCount = events.filter((event) => event.request || event.response).length;
  const contentKeys = includeMessages && !messageCount
    ? [...new Set([...nodes.values()].flatMap((node) => Object.keys(node.attrs)).filter((key) => /message|content|argument|result/i.test(key)))].slice(0, 20)
    : [];
  const summary = [
    "## Copilot CLI invocation chain",
    "",
    `Agent spans: ${agents.length} | Subagents: ${subagents.length} | Peak concurrent subagents: ${peak}`,
    `Tool calls: ${tools.length} | Failed tool calls: ${tools.filter(({ span, attrs }) => Number(span.status?.code) === 2 || attrs["error.type"]).length} | Chat calls: ${chats.length} | Tokens: ${tokenInfo}`,
    `Models: ${[...new Set(models)].map((model) => safe(model)).join(", ") || "unavailable"}${expectedModel ? ` | Required: ${expectedModel} (${modelMatches ? "PASS" : "MISMATCH"})` : ""}`,
    `Demo evidence: ${complete ? "PASS" : "MISSING"} | overlapping subagents: ${peak >= 2 ? "yes" : "no"} | AWS web_fetch: ${web ? "observed" : "not observed"} | Azure microsoft-learn/microsoft_docs_search: ${mcp ? "observed" : "not observed"} | distinct branches: ${web && mcp && web.branch !== mcp.branch ? "yes" : "no"}`,
    "AWS uses web_fetch on docs.aws.amazon.com; built-in web_search was unavailable with this Actions token.",
    ...(includeMessages ? [`Message excerpts: ${messageCount} spans${contentKeys.length ? ` | available attribute names: ${contentKeys.map((key) => safe(key)).join(", ")}` : ""}`] : ["Message content capture: off (enable include_messages when dispatching to see excerpts)."]),
    ...(subagents.length ? [] : ["No subagents observed in this trace; --fleet does not guarantee delegation."]),
    "",
    "Times are UTC; durations and overlap derive from span timestamps, not JSONL file order.",
    "",
    "```text",
    ...lines,
    "```",
    "",
  ];
  return {
    summary: summary.join("\n"), complete: Boolean(complete), modelMatches, events, includeMessages, messageCount,
    counts: { agents: agents.length, subagents: subagents.length, peak, tools: tools.length, chats: chats.length },
  };
}

export function renderTrace(spans) {
  return summarizeTrace(spans).summary;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export function renderGraph(events) {
  const nodes = new Map();
  for (const event of events) {
    const id = event.kind === "invoke_agent"
      ? event.id : `${event.owner ?? "root"}:${event.kind}:${event.name}`;
    if (nodes.has(id)) {
      nodes.get(id).count++;
    } else {
      nodes.set(id, { id, owner: event.owner, kind: event.kind, name: event.name, count: 1, start: event.start });
    }
  }
  const children = new Map();
  for (const node of nodes.values()) {
    const parent = nodes.has(node.owner) ? node.owner : null;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(node);
  }
  for (const group of children.values()) group.sort((a, b) => a.start - b.start);
  const positions = new Map();
  let nextY = 38;
  let maxDepth = 0;
  function place(node, depth) {
    maxDepth = Math.max(maxDepth, depth);
    const descendants = children.get(node.id) ?? [];
    const ys = descendants.map((child) => place(child, depth + 1));
    const y = ys.length ? (ys[0] + ys[ys.length - 1]) / 2 : nextY;
    if (!ys.length) nextY += 76;
    positions.set(node.id, { x: 28 + depth * 326, y });
    return y;
  }
  for (const root of children.get(null) ?? []) place(root, 0);
  const edges = [...nodes.values()].filter((node) => positions.has(node.owner)).map((node) => {
    const from = positions.get(node.owner);
    const to = positions.get(node.id);
    const middle = (from.x + 254 + to.x) / 2;
    return `<path d="M${from.x + 254} ${from.y + 25} C${middle} ${from.y + 25},${middle} ${to.y + 25},${to.x - 8} ${to.y + 25}" />`;
  }).join("\n");
  const cards = [...nodes.values()].map((node) => {
    const { x, y } = positions.get(node.id);
    const title = `${node.kind === "invoke_agent" ? "Agent" : node.kind === "chat" ? "Model" : "Tool"}: ${node.name}${node.count > 1 ? ` (${node.count} calls)` : ""}`;
    const shown = node.name.length > 30 ? `${node.name.slice(0, 28)}...` : node.name;
    return `<g class="graph-node ${node.kind}" transform="translate(${x} ${y})">
      <title>${escapeHtml(title)}</title><rect width="254" height="50" rx="10" />
      <circle cx="17" cy="25" r="5" />
      <text x="32" y="22">${escapeHtml(shown)}</text>
      <text class="graph-meta" x="32" y="39">${node.kind === "invoke_agent" ? "AGENT" : node.kind === "chat" ? "MODEL" : "TOOL"}${node.count > 1 ? ` · ${node.count} calls` : ""}</text>
    </g>`;
  }).join("\n");
  const width = 28 + maxDepth * 326 + 282;
  const height = Math.max(130, nextY + 32);
  return `<svg class="graph" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Observed agent to model and tool invocation graph">
    <g class="graph-edges">${edges}</g>${cards}
  </svg>`;
}

export function renderHtml({ events, counts, complete, includeMessages, messageCount }) {
  const start = Math.min(...events.map((event) => event.start));
  const total = Math.max(1, Math.max(...events.map((event) => event.end)) - start);
  const rows = events.map((event) => {
    const left = ((event.start - start) / total) * 100;
    const width = Math.min(100 - left, Math.max(0.4, ((event.end - event.start) / total) * 100));
    const messages = event.request || event.response
      ? `<details class="messages"><summary>Request / response</summary>
          ${event.request ? `<div><strong>Request</strong><pre>${escapeHtml(event.request)}</pre></div>` : ""}
          ${event.response ? `<div><strong>Response</strong><pre>${escapeHtml(event.response)}</pre></div>` : ""}
        </details>` : "";
    return `<div class="row" style="--depth:${event.depth}">
      <div><div class="event">${escapeHtml(event.text)}</div>${messages}</div>
      <div class="track"><span class="bar ${event.kind}" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%"></span></div>
    </div>`;
  }).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Copilot CLI invocation chain</title>
<script>
  (() => {
    const param = new URLSearchParams(window.location.search).get("scoutTheme");
    const theme =
      param || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  })();
</script>
<style>
:root {
  color-scheme: light;
  --cp-bg: #f7f4ef;
  --cp-bg-elevated: #fcfbf8;
  --cp-surface: #ffffff;
  --cp-surface-soft: #f5f5f5;
  --cp-border: #dedede;
  --cp-border-strong: #919191;
  --cp-text: #242424;
  --cp-text-muted: #5c5c5c;
  --cp-text-soft: #6f6f6f;
  --cp-accent: #b11f4b;
  --cp-accent-hover: #9a1a41;
  --cp-accent-soft: rgba(177, 31, 75, 0.08);
  --cp-accent-fg: #ffffff;
  --cp-success: #16a34a;
  --cp-danger: #dc2626;
  --cp-warning: #f59e0b;
  --cp-link: #0078d4;
  --cp-shadow: 0 18px 48px rgba(0, 0, 0, 0.12);
  --cp-overlay: rgba(255, 255, 255, 0.8);
  --cp-panel: rgba(255, 255, 255, 0.86);
  --cp-panel-strong: rgba(255, 255, 255, 0.96);
  --cp-sheen: rgba(255, 255, 255, 0.55);
  --cp-highlight: rgba(177, 31, 75, 0.12);
}
html[data-theme="dark"] {
  color-scheme: dark;
  --cp-bg: #3d3b3a;
  --cp-bg-elevated: #343231;
  --cp-surface: #292929;
  --cp-surface-soft: #2e2e2e;
  --cp-border: #474747;
  --cp-border-strong: #5f5f5f;
  --cp-text: #dedede;
  --cp-text-muted: #919191;
  --cp-text-soft: #b0b0b0;
  --cp-accent: #fd8ea1;
  --cp-accent-hover: #fb7b91;
  --cp-accent-soft: rgba(253, 142, 161, 0.14);
  --cp-accent-fg: #1a1a1a;
  --cp-success: #4ade80;
  --cp-danger: #f87171;
  --cp-warning: #fbbf24;
  --cp-link: #4da6ff;
  --cp-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
  --cp-overlay: rgba(41, 41, 41, 0.88);
  --cp-panel: rgba(41, 41, 41, 0.72);
  --cp-panel-strong: rgba(41, 41, 41, 0.96);
  --cp-sheen: rgba(255, 255, 255, 0.04);
  --cp-highlight: rgba(253, 142, 161, 0.12);
}
* { box-sizing: border-box; }
body { margin: 0; padding: 44px 28px; font-family: "Segoe UI Variable", "Segoe UI", Aptos, Calibri, sans-serif; background: var(--cp-bg); color: var(--cp-text); line-height: 1.5; }
main { max-width: 1280px; margin: auto; }
h1 { font-family: "Segoe UI Variable Display", "Segoe UI", Aptos, Calibri, sans-serif; font-size: clamp(28px, 3vw, 40px); font-weight: 650; letter-spacing: -0.025em; margin: 6px 0 4px; line-height: 1.15; }
h2 { font-size: 18px; font-weight: 650; letter-spacing: -0.015em; margin: 0; }
p { color: var(--cp-text-muted); margin: 8px 0; }
.eyebrow { color: var(--cp-accent); font-size: 11px; letter-spacing: 0.14em; font-weight: 700; }
.heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: 24px; }
.badge { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--cp-success); color: var(--cp-success); border-radius: 0.625rem; padding: 6px 12px; font-size: 12px; font-weight: 650; }
.badge.missing { color: var(--cp-danger); border-color: var(--cp-danger); }
.stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin: 0 0 24px; }
.stat { padding: 16px 20px; border: 1px solid var(--cp-border); border-radius: 16px; background: var(--cp-surface); }
.stat strong { display: block; font-size: 28px; font-weight: 650; font-variant-numeric: tabular-nums; line-height: 1.2; }
.stat span { color: var(--cp-text-muted); font-size: 12px; }
.panel { border: 1px solid var(--cp-border); border-radius: 16px; background: var(--cp-surface); margin-bottom: 20px; overflow: hidden; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 22px; border-bottom: 1px solid var(--cp-border); }
.panel-heading p { font-size: 12px; margin: 0; }
.legend { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; color: var(--cp-text-muted); font-size: 12px; }
.swatch { display: inline-block; width: 9px; height: 9px; border-radius: 0.625rem; margin-right: 5px; background: var(--cp-accent); }
.swatch.tool { background: var(--cp-success); }
.swatch.chat { background: var(--cp-link); }
.graph-scroll { padding: 16px 20px; overflow: auto; }
.graph { display: block; max-width: none; font-family: "Segoe UI Variable", "Segoe UI", Aptos, Calibri, sans-serif; }
.graph-edges path { fill: none; stroke: var(--cp-border-strong); stroke-width: 1.4; }
.graph-node rect { fill: var(--cp-surface); stroke: var(--cp-border-strong); stroke-width: 1.2; }
.graph-node circle { fill: var(--cp-accent); }
.graph-node.execute_tool circle { fill: var(--cp-success); }
.graph-node.chat circle { fill: var(--cp-link); }
.graph-node text { fill: var(--cp-text); font-size: 12px; font-weight: 600; }
.graph-node .graph-meta { fill: var(--cp-text-muted); font-size: 10px; font-weight: 500; letter-spacing: 0.04em; }
.timeline { padding: 0 22px 16px; }
.row { display: grid; grid-template-columns: minmax(320px, 3fr) minmax(200px, 2fr); gap: 20px; border-top: 1px solid var(--cp-border); align-items: center; padding: 9px 0; }
.event { padding-left: calc(var(--depth) * 18px); overflow-wrap: anywhere; font-family: Consolas, "Courier New", Courier, monospace; font-size: 11px; color: var(--cp-text-soft); }
.messages { margin: 8px 0 0 calc(var(--depth) * 18px); padding: 8px 12px; border: 1px solid var(--cp-border); border-radius: 0.625rem; background: var(--cp-bg-elevated); font-size: 12px; }
.messages summary { cursor: pointer; color: var(--cp-accent); font-weight: 600; }
.messages strong { display: block; font-size: 11px; color: var(--cp-text-muted); margin: 10px 0 3px; }
.messages pre { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; font-family: Consolas, "Courier New", Courier, monospace; font-size: 11px; }
.track { position: relative; height: 10px; border-radius: 0.625rem; background: var(--cp-surface-soft); }
.bar { position: absolute; height: 100%; border-radius: 0.625rem; background: var(--cp-accent); }
.bar.execute_tool { background: var(--cp-success); }
.bar.chat { background: var(--cp-link); }
.note { font-size: 12px; margin: 0 2px 24px; }
@media (max-width: 900px) { .stats { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 700px) { body { padding: 20px 12px; } .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .row { grid-template-columns: 1fr; gap: 6px; } .track { margin-left: calc(var(--depth) * 18px); } .panel-heading { flex-wrap: wrap; } }
</style>
</head>
<body>
<main>
  <header class="heading">
    <div><div class="eyebrow">COPILOT CLI / OBSERVABILITY</div><h1>Agent invocation trace</h1><p>Observed parent, subagent, model, and tool relationships</p></div>
    <span class="badge ${complete ? "" : "missing"}">${complete ? "Demo evidence verified" : "Demo evidence incomplete"}</span>
  </header>
  <div class="stats">
    <div class="stat"><strong>${counts.agents}</strong><span>Agent spans</span></div>
    <div class="stat"><strong>${counts.subagents}</strong><span>Subagents</span></div>
    <div class="stat"><strong>${counts.peak}</strong><span>Peak parallel</span></div>
    <div class="stat"><strong>${counts.tools}</strong><span>Tool calls</span></div>
    <div class="stat"><strong>${counts.chats}</strong><span>Model calls</span></div>
  </div>
  <section class="panel" aria-label="Invocation dependency graph">
    <div class="panel-heading"><div><h2>Invocation graph</h2><p>Edges follow observed agent ancestry; repeated tool and model calls are grouped.</p></div>
      <div class="legend"><span><i class="swatch"></i>Agent</span><span><i class="swatch tool"></i>Tool</span><span><i class="swatch chat"></i>Model</span></div>
    </div>
    <div class="graph-scroll">${renderGraph(events)}</div>
  </section>
  <section class="panel" aria-label="Invocation timeline">
    <div class="panel-heading"><div><h2>Span timeline</h2><p>UTC timestamps · duration bars show relative wall time</p></div></div>
    <div class="timeline">${rows}</div>
  </section>
  <p class="note">${includeMessages ? `${messageCount} spans show limited, redacted request/response excerpts. ` : "Message capture was off for this run. Re-run with include_messages to show excerpts. "}Raw OTLP is not included in this artifact.</p>
</main>
</body>
</html>`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const result = summarizeTrace(loadSpans(readFileSync(process.argv[2], "utf8")), {
      includeMessages: process.env.TRACE_INCLUDE_MESSAGES === "true",
      expectedModel: process.env.REQUIRE_MODEL || null,
    });
    if (process.env.TRACE_HTML_PATH) writeFileSync(process.env.TRACE_HTML_PATH, renderHtml(result));
    const artifactLink = process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `\n[Download the HTML trace viewer](https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}#artifacts)\n`
      : "";
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.summary + artifactLink);
    console.log(result.summary + artifactLink);
    if (process.env.REQUIRE_DEMO_EVIDENCE === "true" && (!result.complete || !result.modelMatches || (result.includeMessages && !result.messageCount))) {
      console.error("Demo evidence missing: require overlapping subagents, both research tools, the requested model, and message excerpts when requested.");
      process.exitCode = 1;
    }
  } catch (error) {
    const message = `## Copilot CLI invocation chain\n\nTrace rendering failed: ${safe(error.message, 280)}\n`;
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, message);
    console.error(message);
    process.exitCode = 1;
  }
}
