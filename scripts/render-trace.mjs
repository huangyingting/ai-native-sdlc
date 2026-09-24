import { readFileSync, appendFileSync } from "node:fs";
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
  const observed = String(attrs["gen_ai.tool.name"] ?? span.name.replace(/^execute_tool ?/, ""));
  return mcpNames.get(observed) ?? observed;
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
      lines.push(`${"  ".repeat(depth)}${kind} ${safe(label || "(unnamed)")} @ ${timestamp(span.startTimeUnixNano)} (${elapsed(span)})${tokens}${cost}${status}`);
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
  return { summary: summary.join("\n"), complete: Boolean(complete) };
}

export function renderTrace(spans) {
  return summarizeTrace(spans).summary;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const result = summarizeTrace(loadSpans(readFileSync(process.argv[2], "utf8")));
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.summary);
    console.log(result.summary);
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
