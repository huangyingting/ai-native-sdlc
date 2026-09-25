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

export const supportedPatterns = [
  {
    id: "direct-execution",
    label: "Direct execution",
    legacyLabels: ["Single-agent baseline", "Single agent baseline"],
    execution: "direct",
    defaultPrompt: "Analyze the Copilot CLI Trace Viewer workflow and interface, identify the highest-impact improvement, and support the recommendation with repository evidence.",
    instruction: "Handle the task directly without invoking any subagents. Produce a concise evidence-backed answer.",
  },
  {
    id: "parallel-delegation",
    label: "Parallel delegation",
    legacyLabels: ["Parallel research", "Concurrent research", "Parallel review", "Review panel"],
    execution: "fleet",
    defaultPrompt: "Compare Amazon S3 and Azure Blob Storage versioning, encryption, lifecycle/access tiers, and access control. Use official AWS and Microsoft Learn sources, cite them, and clearly identify non-equivalent features.",
    instruction: "Dynamically create at least two read-only subagents and run them concurrently. Give each an independent subtask or perspective, wait for all branches, then synthesize their results and reconcile conflicts.",
  },
  {
    id: "critic-reviser-loop",
    label: "Critic-reviser loop",
    legacyLabels: ["Critique and revision", "Rubber duck critique"],
    execution: "sequential",
    defaultPrompt: "Assess the Copilot CLI Trace Viewer workflow and interface, state an initial recommendation, then challenge its hidden assumptions, counterexamples, and unnecessary complexity before revising it into a simpler and more defensible proposal.",
    instruction: "First write a concise initial position. Then dynamically create one read-only subagent as an independent critic, give it the request and initial position, and wait for its response. Finish with a revised conclusion that states what changed.",
  },
  {
    id: "sequential-pipeline",
    label: "Sequential pipeline",
    legacyLabels: ["Sequential handoff", "Lead + specialists"],
    execution: "sequential",
    defaultPrompt: "Use a solution-design stage followed by a dependent critical-review stage to propose the next iteration of the Copilot CLI Trace Viewer with clear goals, architecture decisions, risks, and acceptance criteria.",
    instruction: "Dynamically create two read-only subagents in sequence. Wait for the first result, then give that result and the original request to a fresh second subagent. Finally synthesize the two stages.",
  },
];

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

function pattern(label) {
  const selectedLabel = label || "Parallel delegation";
  const selected = supportedPatterns.find((candidate) =>
    candidate.label === selectedLabel || candidate.legacyLabels.includes(selectedLabel));
  if (!selected) throw new Error(`Unsupported orchestration pattern: ${label || "(missing)"}`);
  return selected;
}

export function parseIssueRequest(body) {
  const selectedPattern = pattern(
    section(body, "Orchestration pattern")
      || section(body, "Orchestration demo")
      || section(body, "Orchestration scenario"),
  );
  const orchestratorModel = validateModel(section(body, "Orchestrator model"), "orchestrator model");
  const subagentModel = validateModel(section(body, "Subagent model"), "subagent model");
  const customPrompt = section(body, "Task or question") || section(body, "Comparison task");
  const prompt = customPrompt || selectedPattern.defaultPrompt;
  const guidance = section(body, "Agent instructions");
  const capture = section(body, "Trace content");
  return finalizeRequest({
    scenario: selectedPattern.id,
    scenarioLabel: selectedPattern.label,
    execution: selectedPattern.execution,
    instruction: [selectedPattern.instruction, guidance].filter(Boolean).join(" "),
    orchestratorModel,
    subagentModel,
    prompt,
    includeMessages: /-\s*\[[xX]\]\s+Include redacted request and response payloads/.test(capture),
  });
}

function finalizeRequest(request) {
  if (request.execution !== "direct") {
    request.instruction += ` Every dynamically created subagent must use the ${request.subagentModel} model.`;
  }
  request.requiredModels = request.execution === "direct"
    ? request.orchestratorModel
    : [...new Set([request.orchestratorModel, request.subagentModel])].join(",");
  return request;
}

function appendOutput(name, value) {
  const delimiter = `TRACE_${randomUUID()}`;
  appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const selectedPattern = pattern(process.env.INPUT_SCENARIO);
  const customPrompt = process.env.INPUT_TASK_PROMPT?.trim();
  const guidance = process.env.INPUT_AGENT_INSTRUCTIONS?.trim();
  const request = process.env.GITHUB_EVENT_NAME === "issues"
    ? parseIssueRequest(event.issue?.body)
    : finalizeRequest({
        scenario: selectedPattern.id,
        scenarioLabel: selectedPattern.label,
        execution: selectedPattern.execution,
        instruction: [selectedPattern.instruction, guidance].filter(Boolean).join(" "),
        orchestratorModel: validateModel(process.env.INPUT_ORCHESTRATOR_MODEL || "gpt-6-luna", "orchestrator model"),
        subagentModel: validateModel(process.env.INPUT_SUBAGENT_MODEL || "gpt-6-luna", "subagent model"),
        prompt: customPrompt || selectedPattern.defaultPrompt,
        includeMessages: process.env.INPUT_INCLUDE_MESSAGES === "true",
      });
  writeFileSync(process.env.TRACE_PROMPT_PATH, request.prompt);
  writeFileSync(process.env.TRACE_INSTRUCTION_PATH, request.instruction);
  appendOutput("scenario", request.scenario);
  appendOutput("scenario_label", request.scenarioLabel);
  appendOutput("execution", request.execution);
  appendOutput("orchestrator_model", request.orchestratorModel);
  appendOutput("subagent_model", request.subagentModel);
  appendOutput("required_models", request.requiredModels);
  appendOutput("include_messages", String(request.includeMessages));
  appendOutput("issue_number", String(event.issue?.number ?? ""));
}
