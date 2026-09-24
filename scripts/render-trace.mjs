import { readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const configured = JSON.parse(readFileSync(new URL("../.github/mcp.json", import.meta.url), "utf8")).mcpServers;
const hash = (name) => createHash("sha256").update(name).digest("hex");
const mcpNames = new Map(Object.entries(configured).flatMap(([server, config]) =>
  config.tools.map((tool) => [`${hash(server)}/${hash(tool).slice(0, 35)}`, `${server}/${tool}`])));

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

export function summarizeTrace(spans) {
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
  function visit(node, depth, insideAgent, branch) {
    const { span, attrs } = node;
    const kind = operation(span, attrs);
    const isAgent = kind === "invoke_agent";
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
        kind, depth, text,
        start: Number(BigInt(span.startTimeUnixNano) / 1_000_000n),
        end: Number(BigInt(span.endTimeUnixNano) / 1_000_000n),
      });
    }
    for (const child of node.children.sort(sort)) {
      visit(child, depth + (kind && ["invoke_agent", "execute_tool", "chat"].includes(kind) ? 1 : 0), insideAgent || isAgent, currentBranch);
    }
  }
  for (const root of roots.sort(sort)) visit(root, 0, false, undefined);
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
  const web = tools.find(({ span, attrs, branch }) =>
    branch && toolName(span, attrs) === "web_fetch" && Number(span.status?.code) !== 2 && !attrs["error.type"]);
  const mcp = tools.find(({ span, attrs, branch }) =>
    branch && toolName(span, attrs) === "microsoft-learn/microsoft_docs_search");
  const complete = peak >= 2 && web && mcp && web.branch !== mcp.branch;
  const summary = [
    "## Copilot CLI invocation chain",
    "",
    `Agent spans: ${agents.length} | Subagents: ${subagents.length} | Peak concurrent subagents: ${peak}`,
    `Tool calls: ${tools.length} | Failed tool calls: ${tools.filter(({ span, attrs }) => Number(span.status?.code) === 2 || attrs["error.type"]).length} | Chat calls: ${chats.length} | Tokens: ${tokenInfo}`,
    `Demo evidence: ${complete ? "PASS" : "MISSING"} | overlapping subagents: ${peak >= 2 ? "yes" : "no"} | AWS web_fetch: ${web ? "observed" : "not observed"} | Azure microsoft-learn/microsoft_docs_search: ${mcp ? "observed" : "not observed"} | distinct branches: ${web && mcp && web.branch !== mcp.branch ? "yes" : "no"}`,
    "AWS uses web_fetch on docs.aws.amazon.com; built-in web_search was unavailable with this Actions token.",
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
    summary: summary.join("\n"), complete: Boolean(complete), events,
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

export function renderHtml({ events, counts, complete }) {
  const start = Math.min(...events.map((event) => event.start));
  const total = Math.max(1, Math.max(...events.map((event) => event.end)) - start);
  const rows = events.map((event) => {
    const left = ((event.start - start) / total) * 100;
    const width = Math.min(100 - left, Math.max(0.4, ((event.end - event.start) / total) * 100));
    return `<div class="row" style="--depth:${event.depth}">
      <div class="event">${escapeHtml(event.text)}</div>
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
body { margin: 0; padding: 32px; font-family: "Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif; background: var(--cp-bg); color: var(--cp-text); }
main { max-width: 1200px; margin: auto; }
h1 { margin: 0 0 8px; }
p { color: var(--cp-text-muted); }
.stats { display: flex; flex-wrap: wrap; gap: 12px; margin: 24px 0; }
.stat { min-width: 120px; padding: 16px; border: 1px solid var(--cp-border); border-radius: 16px; background: var(--cp-surface); }
.stat strong { display: block; font-size: 24px; }
.stat span { color: var(--cp-text-muted); }
.panel { border: 1px solid var(--cp-border); border-radius: 16px; background: var(--cp-surface); padding: 16px; }
.legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 14px; color: var(--cp-text-muted); margin-bottom: 16px; }
.swatch { display: inline-block; width: 12px; height: 12px; border-radius: 0.625rem; margin-right: 4px; background: var(--cp-accent); }
.swatch.tool { background: var(--cp-success); }
.swatch.chat { background: var(--cp-link); }
.row { display: grid; grid-template-columns: minmax(280px, 3fr) minmax(180px, 2fr); gap: 12px; border-top: 1px solid var(--cp-border); align-items: center; padding: 8px 0; }
.event { padding-left: calc(var(--depth) * 20px); overflow-wrap: anywhere; font-family: Consolas, "Courier New", Courier, monospace; font-size: 12px; }
.track { position: relative; height: 14px; border-radius: 0.625rem; background: var(--cp-surface-soft); }
.bar { position: absolute; height: 100%; border-radius: 0.625rem; background: var(--cp-accent); }
.bar.execute_tool { background: var(--cp-success); }
.bar.chat { background: var(--cp-link); }
.badge { color: var(--cp-success); }
.badge.missing { color: var(--cp-danger); }
@media (max-width: 700px) { body { padding: 16px; } .row { grid-template-columns: 1fr; } .track { margin-left: calc(var(--depth) * 20px); } }
</style>
</head>
<body>
<main>
  <h1>Copilot CLI invocation chain</h1>
  <p>Observed spans only · UTC timestamps · relative timeline · <strong class="badge ${complete ? "" : "missing"}">${complete ? "Demo evidence verified" : "Demo evidence incomplete"}</strong></p>
  <div class="stats">
    <div class="stat"><strong>${counts.agents}</strong><span>Agent spans</span></div>
    <div class="stat"><strong>${counts.subagents}</strong><span>Subagents</span></div>
    <div class="stat"><strong>${counts.peak}</strong><span>Peak parallel</span></div>
    <div class="stat"><strong>${counts.tools}</strong><span>Tool calls</span></div>
    <div class="stat"><strong>${counts.chats}</strong><span>Model calls</span></div>
  </div>
  <section class="panel" aria-label="Invocation timeline">
    <div class="legend"><span><i class="swatch"></i>Agent</span><span><i class="swatch tool"></i>Tool</span><span><i class="swatch chat"></i>Model</span></div>
    ${rows}
  </section>
  <p>Generated from selected trace metadata only; prompts, tool arguments, responses, and raw OTLP are not included.</p>
</main>
</body>
</html>`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const result = summarizeTrace(loadSpans(readFileSync(process.argv[2], "utf8")));
    if (process.env.TRACE_HTML_PATH) writeFileSync(process.env.TRACE_HTML_PATH, renderHtml(result));
    const artifactLink = process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `\n[Download the HTML trace viewer](https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}#artifacts)\n`
      : "";
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.summary + artifactLink);
    console.log(result.summary + artifactLink);
    if (process.env.REQUIRE_DEMO_EVIDENCE === "true" && !result.complete) {
      console.error("Demo evidence missing: require overlapping subagents and web_fetch and microsoft_docs_search on separate branches.");
      process.exitCode = 1;
    }
  } catch (error) {
    const message = `## Copilot CLI invocation chain\n\nTrace rendering failed: ${safe(error.message, 280)}\n`;
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, message);
    console.error(message);
    process.exitCode = 1;
  }
}
