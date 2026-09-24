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
  const end = Math.max(...events.map((event) => event.end));
  const total = Math.max(1, end - start);
  const rows = events.map((event) => {
    const left = ((event.start - start) / total) * 100;
    const width = Math.min(100 - left, Math.max(0.4, ((event.end - event.start) / total) * 100));
    return `<div class="row" style="--depth:${event.depth}" data-filter="${escapeHtml(`${event.kind} ${event.name}`.toLowerCase())}">
      <div class="event">${escapeHtml(event.text)}</div>
      <div class="track"><span class="bar ${event.kind}" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%"></span></div>
    </div>`;
  }).join("\n");
  const messageEvents = events.filter((event) => event.request || event.response);
  const messageIndex = messageEvents.map((event, index) =>
    `<button class="message-item${index === 0 ? " active" : ""}" type="button" data-message="${index}" role="option" aria-selected="${index === 0}">
      <span class="message-kind ${event.kind}">${event.kind === "chat" ? "MODEL" : "TOOL"}</span>
      <strong>${escapeHtml(event.name)}</strong>
      <span>${new Date(event.start).toISOString().slice(11, 23)} UTC</span>
    </button>`).join("\n");
  const messageDetails = messageEvents.map((event, index) =>
    `<article class="message-detail${index === 0 ? " active" : ""}" data-message-panel="${index}" ${index === 0 ? "" : "hidden"}>
      <div class="detail-header"><div><span class="message-kind ${event.kind}">${event.kind === "chat" ? "MODEL" : "TOOL"}</span><h2>${escapeHtml(event.name)}</h2></div>
        <span class="duration">${Math.max(0, event.end - event.start).toLocaleString()} ms</span></div>
      <div class="payload-grid">
        <section><h3>Request</h3><pre>${escapeHtml(event.request ?? "No request content recorded.")}</pre></section>
        <section><h3>Response</h3><pre>${escapeHtml(event.response ?? "No response content recorded.")}</pre></section>
      </div>
    </article>`).join("\n");
  const agentNames = [...new Set(events.filter((event) => event.kind === "invoke_agent").map((event) => event.name))];
  const modelNames = [...new Set(events.filter((event) => event.kind === "chat").map((event) => event.name))];
  const toolNames = [...new Set(events.filter((event) => event.kind === "execute_tool").map((event) => event.name))];
  const chips = (items, className) => items.map((item) => `<span class="chip ${className}">${escapeHtml(item)}</span>`).join("");
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
body { margin: 0; min-width: 320px; font-family: "Segoe UI Variable", "Segoe UI", Aptos, Calibri, sans-serif; background: var(--cp-bg); color: var(--cp-text); line-height: 1.5; }
button, input { font: inherit; }
button { color: inherit; }
.app-shell { min-height: 100vh; }
.topbar { background: var(--cp-bg-elevated); border-bottom: 1px solid var(--cp-border); }
.topbar-inner { max-width: 1440px; margin: auto; padding: 28px 32px 24px; }
main { max-width: 1440px; margin: auto; padding: 24px 32px 48px; }
h1 { font-family: "Segoe UI Variable Display", "Segoe UI", Aptos, Calibri, sans-serif; font-size: clamp(26px, 3vw, 36px); font-weight: 650; letter-spacing: -0.025em; margin: 5px 0 3px; line-height: 1.15; }
h2 { font-size: 17px; font-weight: 650; letter-spacing: -0.015em; margin: 0; }
h3 { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--cp-text-muted); margin: 0 0 8px; }
p { color: var(--cp-text-muted); margin: 6px 0; }
.eyebrow { color: var(--cp-accent); font-size: 10px; letter-spacing: 0.16em; font-weight: 700; }
.heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.badge { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--cp-success); color: var(--cp-success); border-radius: 0.625rem; padding: 6px 12px; font-size: 12px; font-weight: 650; }
.badge.missing { color: var(--cp-danger); border-color: var(--cp-danger); }
.tabs { display: flex; gap: 4px; overflow-x: auto; max-width: 1440px; margin: auto; padding: 0 32px; }
.tab { position: relative; border: 0; background: transparent; padding: 13px 14px 12px; color: var(--cp-text-muted); cursor: pointer; font-size: 13px; font-weight: 600; white-space: nowrap; }
.tab:hover { color: var(--cp-text); }
.tab[aria-selected="true"] { color: var(--cp-accent); }
.tab[aria-selected="true"]::after { content: ""; position: absolute; left: 12px; right: 12px; bottom: -1px; height: 2px; background: var(--cp-accent); }
.tab-count { margin-left: 5px; color: var(--cp-text-soft); font-size: 11px; }
.tab-panel[hidden] { display: none; }
.stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin: 0 0 20px; }
.stat { padding: 18px 20px; border: 1px solid var(--cp-border); border-radius: 16px; background: var(--cp-surface); box-shadow: 0 0 2px var(--cp-border), 0 1px 2px var(--cp-border); }
.stat strong { display: block; font-size: 27px; font-weight: 650; font-variant-numeric: tabular-nums; line-height: 1.2; }
.stat span { color: var(--cp-text-muted); font-size: 12px; }
.panel { border: 1px solid var(--cp-border); border-radius: 16px; background: var(--cp-surface); margin-bottom: 20px; overflow: hidden; box-shadow: 0 0 2px var(--cp-border), 0 1px 2px var(--cp-border); }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 22px; border-bottom: 1px solid var(--cp-border); }
.panel-heading p { font-size: 12px; margin: 0; }
.overview-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr); gap: 20px; }
.overview-body { padding: 22px; }
.status-list { display: grid; gap: 12px; margin-top: 18px; }
.status-row { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; gap: 10px; align-items: center; font-size: 13px; }
.status-icon { display: inline-grid; place-items: center; width: 20px; height: 20px; border: 1px solid var(--cp-success); color: var(--cp-success); border-radius: 50%; font-size: 11px; font-weight: 700; }
.status-row span:last-child { color: var(--cp-text-muted); font-size: 12px; }
.inventory { padding: 20px 22px; }
.inventory-group + .inventory-group { border-top: 1px solid var(--cp-border); margin-top: 18px; padding-top: 18px; }
.chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
.chip { display: inline-flex; border: 1px solid var(--cp-border); border-radius: 0.625rem; padding: 5px 9px; font-family: Consolas, "Courier New", Courier, monospace; font-size: 10px; color: var(--cp-text-soft); background: var(--cp-surface-soft); }
.chip.agent { border-color: var(--cp-accent); }
.chip.model { border-color: var(--cp-link); }
.chip.tool { border-color: var(--cp-success); }
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
.toolbar { display: flex; align-items: center; gap: 10px; }
.search { width: min(300px, 55vw); border: 1px solid var(--cp-border); border-radius: 0.625rem; padding: 7px 10px; background: var(--cp-bg-elevated); color: var(--cp-text); font-size: 12px; outline: none; }
.search:focus { border-color: var(--cp-accent); }
.timeline { padding: 0 22px 16px; }
.row { display: grid; grid-template-columns: minmax(320px, 3fr) minmax(200px, 2fr); gap: 20px; border-top: 1px solid var(--cp-border); align-items: center; padding: 9px 0; }
.row.filtered { display: none; }
.event { padding-left: calc(var(--depth) * 18px); overflow-wrap: anywhere; font-family: Consolas, "Courier New", Courier, monospace; font-size: 11px; color: var(--cp-text-soft); }
.track { position: relative; height: 10px; border-radius: 0.625rem; background: var(--cp-surface-soft); }
.bar { position: absolute; height: 100%; border-radius: 0.625rem; background: var(--cp-accent); }
.bar.execute_tool { background: var(--cp-success); }
.bar.chat { background: var(--cp-link); }
.messages-layout { display: grid; grid-template-columns: 300px minmax(0, 1fr); min-height: 580px; }
.message-sidebar { border-right: 1px solid var(--cp-border); background: var(--cp-bg-elevated); }
.message-sidebar-head { padding: 16px; border-bottom: 1px solid var(--cp-border); }
.message-list { max-height: 660px; overflow: auto; padding: 8px; }
.message-item { display: grid; width: 100%; grid-template-columns: auto minmax(0, 1fr); gap: 3px 8px; align-items: center; border: 1px solid transparent; border-radius: 0.625rem; background: transparent; padding: 10px; text-align: left; cursor: pointer; }
.message-item:hover { background: var(--cp-surface-soft); }
.message-item.active { background: var(--cp-accent-soft); border-color: var(--cp-accent); }
.message-item strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.message-item > span:last-child { grid-column: 2; color: var(--cp-text-muted); font-size: 10px; }
.message-kind { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; border-radius: 0.625rem; padding: 3px 5px; background: var(--cp-accent-soft); color: var(--cp-accent); font-size: 9px; font-weight: 700; letter-spacing: 0.06em; }
.message-kind.chat { color: var(--cp-link); border: 1px solid var(--cp-link); background: transparent; }
.message-kind.execute_tool { color: var(--cp-success); border: 1px solid var(--cp-success); background: transparent; }
.message-stage { min-width: 0; }
.message-detail { padding: 24px; }
.detail-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; border-bottom: 1px solid var(--cp-border); padding-bottom: 18px; margin-bottom: 20px; }
.detail-header h2 { margin-top: 7px; }
.duration { color: var(--cp-text-muted); font-family: Consolas, "Courier New", Courier, monospace; font-size: 11px; }
.payload-grid { display: grid; gap: 18px; }
.payload-grid section { min-width: 0; }
.payload-grid pre { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 310px; overflow: auto; margin: 0; padding: 16px; border: 1px solid var(--cp-border); border-radius: 0.625rem; background: var(--cp-surface-soft); color: var(--cp-text-soft); font-family: Consolas, "Courier New", Courier, monospace; font-size: 11px; line-height: 1.55; }
.empty-state { display: grid; min-height: 340px; place-items: center; padding: 32px; text-align: center; }
.empty-state strong { display: block; margin-bottom: 4px; }
.note { font-size: 11px; margin: 16px 2px 0; }
@media (max-width: 1000px) { .stats { grid-template-columns: repeat(3, minmax(0, 1fr)); } .overview-grid { grid-template-columns: 1fr; } }
@media (max-width: 760px) { .topbar-inner, main { padding-left: 16px; padding-right: 16px; } .tabs { padding: 0 16px; } .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .row { grid-template-columns: 1fr; gap: 6px; } .track { margin-left: calc(var(--depth) * 18px); } .panel-heading { align-items: flex-start; flex-wrap: wrap; } .messages-layout { grid-template-columns: 1fr; } .message-sidebar { border-right: 0; border-bottom: 1px solid var(--cp-border); } .message-list { display: flex; max-height: none; overflow-x: auto; } .message-item { min-width: 230px; } }
</style>
</head>
<body>
<div class="app-shell">
  <header class="topbar">
    <div class="topbar-inner">
      <div class="heading">
        <div><div class="eyebrow">COPILOT CLI / OBSERVABILITY</div><h1>Agent invocation trace</h1><p>Execution topology, timing, and captured exchanges</p></div>
        <span class="badge ${complete ? "" : "missing"}">${complete ? "Demo evidence verified" : "Demo evidence incomplete"}</span>
      </div>
    </div>
    <nav class="tabs" role="tablist" aria-label="Trace views">
      <button class="tab" id="tab-overview" role="tab" aria-selected="true" aria-controls="overview" data-tab="overview">Overview</button>
      <button class="tab" id="tab-graph" role="tab" aria-selected="false" aria-controls="graph" data-tab="graph">Dependency graph</button>
      <button class="tab" id="tab-timeline" role="tab" aria-selected="false" aria-controls="timeline" data-tab="timeline">Timeline <span class="tab-count">${events.length}</span></button>
      <button class="tab" id="tab-messages" role="tab" aria-selected="false" aria-controls="messages" data-tab="messages">Messages <span class="tab-count">${messageEvents.length}</span></button>
    </nav>
  </header>
  <main>
    <section class="tab-panel" id="overview" role="tabpanel" aria-labelledby="tab-overview">
      <div class="stats">
        <div class="stat"><strong>${counts.agents}</strong><span>Agent spans</span></div>
        <div class="stat"><strong>${counts.subagents}</strong><span>Subagents</span></div>
        <div class="stat"><strong>${counts.peak}</strong><span>Peak parallel</span></div>
        <div class="stat"><strong>${counts.tools}</strong><span>Tool calls</span></div>
        <div class="stat"><strong>${counts.chats}</strong><span>Model calls</span></div>
      </div>
      <div class="overview-grid">
        <section class="panel">
          <div class="panel-heading"><div><h2>Run assessment</h2><p>Observed evidence from ${events.length} spans over ${(total / 1000).toFixed(1)} seconds.</p></div></div>
          <div class="overview-body">
            <div class="status-list">
              <div class="status-row"><span class="status-icon">✓</span><strong>Parallel orchestration</strong><span>${counts.peak} concurrent subagents</span></div>
              <div class="status-row"><span class="status-icon">✓</span><strong>AWS research branch</strong><span>web_fetch observed</span></div>
              <div class="status-row"><span class="status-icon">✓</span><strong>Azure research branch</strong><span>Microsoft Learn MCP observed</span></div>
              <div class="status-row"><span class="status-icon">✓</span><strong>Message privacy</strong><span>${includeMessages ? `${messageCount} redacted excerpts` : "content capture disabled"}</span></div>
            </div>
          </div>
        </section>
        <section class="panel inventory">
          <div class="inventory-group"><h3>Agents</h3><div class="chips">${chips(agentNames, "agent")}</div></div>
          <div class="inventory-group"><h3>Models</h3><div class="chips">${chips(modelNames, "model")}</div></div>
          <div class="inventory-group"><h3>Tools</h3><div class="chips">${chips(toolNames, "tool")}</div></div>
        </section>
      </div>
      <p class="note">${includeMessages ? `${messageCount} spans include bounded, redacted request/response excerpts. ` : "Message capture was off for this run. Re-run with include_messages to inspect exchanges. "}Raw OTLP is not included.</p>
    </section>
    <section class="tab-panel" id="graph" role="tabpanel" aria-labelledby="tab-graph" hidden>
      <section class="panel" aria-label="Invocation dependency graph">
        <div class="panel-heading"><div><h2>Invocation graph</h2><p>Observed agent ancestry; repeated tool and model calls are grouped.</p></div>
          <div class="legend"><span><i class="swatch"></i>Agent</span><span><i class="swatch tool"></i>Tool</span><span><i class="swatch chat"></i>Model</span></div>
        </div>
        <div class="graph-scroll">${renderGraph(events)}</div>
      </section>
    </section>
    <section class="tab-panel" id="timeline" role="tabpanel" aria-labelledby="tab-timeline" hidden>
      <section class="panel" aria-label="Invocation timeline">
        <div class="panel-heading"><div><h2>Span timeline</h2><p>UTC timestamps · duration bars show relative wall time</p></div>
          <div class="toolbar"><input class="search" id="timeline-filter" type="search" placeholder="Filter by agent, model, or tool" aria-label="Filter timeline"></div>
        </div>
        <div class="timeline">${rows}</div>
      </section>
    </section>
    <section class="tab-panel" id="messages" role="tabpanel" aria-labelledby="tab-messages" hidden>
      <section class="panel">
        <div class="panel-heading"><div><h2>Request and response inspector</h2><p>Bounded, best-effort redacted excerpts captured for this run.</p></div></div>
        ${messageEvents.length ? `<div class="messages-layout">
          <aside class="message-sidebar"><div class="message-sidebar-head"><input class="search" id="message-filter" type="search" placeholder="Filter exchanges" aria-label="Filter message exchanges"></div>
            <div class="message-list" role="listbox" aria-label="Captured exchanges">${messageIndex}</div></aside>
          <div class="message-stage">${messageDetails}</div>
        </div>` : `<div class="empty-state"><div><strong>No message content captured</strong><p>Run the workflow with include_messages enabled to populate this view.</p></div></div>`}
      </section>
    </section>
  </main>
</div>
<script>
  (() => {
    const tabs = [...document.querySelectorAll("[data-tab]")];
    const panels = [...document.querySelectorAll(".tab-panel")];
    const activateTab = (id, updateHash = true) => {
      if (!panels.some((panel) => panel.id === id)) id = "overview";
      tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.tab === id)));
      panels.forEach((panel) => panel.hidden = panel.id !== id);
      if (updateHash) history.replaceState(null, "", "#" + id);
    };
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => activateTab(tab.dataset.tab));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        const current = tabs.indexOf(tab);
        const next = tabs[(current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
        next.focus();
        activateTab(next.dataset.tab);
      });
    });
    activateTab(location.hash.slice(1) || "overview", false);
    const timelineFilter = document.querySelector("#timeline-filter");
    timelineFilter?.addEventListener("input", () => {
      const query = timelineFilter.value.trim().toLowerCase();
      document.querySelectorAll(".row[data-filter]").forEach((row) =>
        row.classList.toggle("filtered", query && !row.dataset.filter.includes(query)));
    });
    const messageItems = [...document.querySelectorAll(".message-item")];
    const messagePanels = [...document.querySelectorAll(".message-detail")];
    const activateMessage = (id) => {
      messageItems.forEach((item) => {
        const active = item.dataset.message === id;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      messagePanels.forEach((panel) => {
        const active = panel.dataset.messagePanel === id;
        panel.classList.toggle("active", active);
        panel.hidden = !active;
      });
    };
    messageItems.forEach((item) => item.addEventListener("click", () => activateMessage(item.dataset.message)));
    const messageFilter = document.querySelector("#message-filter");
    messageFilter?.addEventListener("input", () => {
      const query = messageFilter.value.trim().toLowerCase();
      let firstVisible = null;
      messageItems.forEach((item) => {
        const visible = !query || item.textContent.toLowerCase().includes(query);
        item.hidden = !visible;
        if (visible && !firstVisible) firstVisible = item;
      });
      if (firstVisible) activateMessage(firstVisible.dataset.message);
    });
  })();
</script>
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
