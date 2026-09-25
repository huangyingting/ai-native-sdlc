import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

export const supportedModels = [
  "gpt-6-luna",
  "gpt-6-sol",
  "gpt-6-astra",
  "gpt-5.6-luna",
  "gpt-5.6-terra",
  "gpt-5.6-sol",
  "gpt-5.5",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.3-codex",
  "gpt-5-mini",
  "claude-sonnet-5",
  "claude-sonnet-4.6",
  "gemini-3.8-flash",
  "grok-4.7",
  "mai-code-1.1-flash",
];

export const supportedScenarios = {
  "Single agent baseline": {
    id: "single",
    prompt: "Analyze the Agent Trace workflow and viewer, identify the highest-impact improvement, and support the recommendation with repository evidence.",
    instruction: "Handle the task directly without invoking any subagents. Produce a concise evidence-backed answer. This run is the single-agent baseline for comparing latency, token use, and cost with orchestrated scenarios.",
  },
  "Concurrent research": {
    id: "concurrent",
    prompt: "Compare Amazon S3 and Azure Blob Storage versioning, encryption, lifecycle/access tiers, and access control. Cite sources and clearly identify non-equivalent features.",
    instruction: "Use fleet to invoke the repository's aws-storage and azure-storage custom agents concurrently. Give both agents the request. Wait for both, then synthesize a concise comparison that explicitly identifies non-equivalent features.",
  },
  "Review panel": {
    id: "review",
    prompt: "Review this repository's Agent Trace implementation for architecture, reliability, maintainability, and user-facing failure modes. Report only concrete, actionable findings with file references.",
    instruction: "Use fleet to invoke the built-in code-review agent and the repository's architecture-review custom agent concurrently. Give both reviewers the request. Reconcile duplicates and disagreements, discard speculative findings, and return a prioritized evidence-backed review.",
  },
  "Rubber duck critique": {
    id: "rubber-duck",
    prompt: "Assess the Agent Trace workflow and viewer design, state an initial recommendation, then challenge its assumptions and revise it into a simpler and more defensible proposal.",
    instruction: "First analyze the request and write a concise initial position. Then invoke the repository's rubber-duck custom agent as an independent critic. Give it the original request and your initial position, ask it to identify hidden assumptions and counterexamples, and wait for its response. Finish with a revised conclusion that clearly states what changed after the critique.",
  },
  "Lead + specialists": {
    id: "collaboration",
    prompt: "Propose the next iteration of Agent Trace with clear goals, architecture decisions, risks, and acceptance criteria.",
    instruction: "First invoke the repository's solution-architect custom agent and wait for its proposal. Then invoke the critical-reviewer custom agent with both the original request and the proposal, asking it to challenge assumptions and identify gaps. Finally synthesize a revised plan that incorporates the valid critique. Do not run the two agents concurrently.",
  },
};

const defaultScenario = "Concurrent research";

function section(body, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(body ?? "").match(new RegExp(`(?:^|\\n)### ${escaped}\\r?\\n+([\\s\\S]*?)(?=\\r?\\n### |$)`, "i"));
  const content = match?.[1].trim();
  return content && content !== "_No response_" ? content : "";
}

function validateModel(model, field) {
  if (!supportedModels.includes(model)) throw new Error(`Unsupported ${field}: ${model || "(missing)"}`);
  return model;
}

function scenario(label) {
  const scenarioLabel = label || defaultScenario;
  const selected = supportedScenarios[scenarioLabel];
  if (!selected) throw new Error(`Unsupported scenario: ${label || "(missing)"}`);
  return { ...selected, label: scenarioLabel };
}

export function parseIssueRequest(body) {
  const selectedScenario = scenario(section(body, "Orchestration scenario"));
  const orchestratorModel = validateModel(section(body, "Orchestrator model"), "orchestrator model");
  const subagentModel = validateModel(section(body, "Subagent model"), "subagent model");
  const prompt = section(body, "Task or question") || section(body, "Comparison task") || selectedScenario.prompt;
  const capture = section(body, "Trace content");
  return {
    scenario: selectedScenario.id,
    scenarioLabel: selectedScenario.label,
    instruction: selectedScenario.instruction,
    orchestratorModel,
    subagentModel,
    prompt,
    includeMessages: /-\s*\[[xX]\]\s+Include redacted request and response payloads/.test(capture),
  };
}

function appendOutput(name, value) {
  const delimiter = `TRACE_${randomUUID()}`;
  appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const selectedScenario = scenario(process.env.INPUT_SCENARIO);
  const request = process.env.GITHUB_EVENT_NAME === "issues"
    ? parseIssueRequest(event.issue?.body)
    : {
        scenario: selectedScenario.id,
        scenarioLabel: process.env.INPUT_SCENARIO || defaultScenario,
        instruction: selectedScenario.instruction,
        orchestratorModel: validateModel(process.env.INPUT_ORCHESTRATOR_MODEL || "gpt-6-luna", "orchestrator model"),
        subagentModel: validateModel(process.env.INPUT_SUBAGENT_MODEL || "gpt-6-luna", "subagent model"),
        prompt: process.env.INPUT_TASK_PROMPT?.trim() || selectedScenario.prompt,
        includeMessages: process.env.INPUT_INCLUDE_MESSAGES === "true",
      };
  writeFileSync(process.env.TRACE_PROMPT_PATH, request.prompt);
  writeFileSync(process.env.TRACE_INSTRUCTION_PATH, request.instruction);
  appendOutput("scenario", request.scenario);
  appendOutput("scenario_label", request.scenarioLabel);
  appendOutput("orchestrator_model", request.orchestratorModel);
  appendOutput("subagent_model", request.subagentModel);
  appendOutput("include_messages", String(request.includeMessages));
  appendOutput("issue_number", String(event.issue?.number ?? ""));
}
