import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { findDemo } from "./demo-catalog.mjs";

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

function demo(label) {
  const selected = findDemo(label);
  return { ...selected, label: selected.label };
}

export function parseIssueRequest(body) {
  const selectedDemo = demo(section(body, "Orchestration demo") || section(body, "Orchestration scenario"));
  const orchestratorModel = validateModel(section(body, "Orchestrator model"), "orchestrator model");
  const subagentModel = validateModel(section(body, "Subagent model"), "subagent model");
  const prompt = section(body, "Task or question") || section(body, "Comparison task") || selectedDemo.defaultPrompt;
  const capture = section(body, "Trace content");
  return finalizeRequest({
    scenario: selectedDemo.id,
    scenarioLabel: selectedDemo.label,
    execution: selectedDemo.execution,
    instruction: selectedDemo.instruction,
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
  const selectedDemo = demo(process.env.INPUT_SCENARIO);
  const request = process.env.GITHUB_EVENT_NAME === "issues"
    ? parseIssueRequest(event.issue?.body)
    : finalizeRequest({
        scenario: selectedDemo.id,
        scenarioLabel: selectedDemo.label,
        execution: selectedDemo.execution,
        instruction: selectedDemo.instruction,
        orchestratorModel: validateModel(process.env.INPUT_ORCHESTRATOR_MODEL || "gpt-6-luna", "orchestrator model"),
        subagentModel: validateModel(process.env.INPUT_SUBAGENT_MODEL || "gpt-6-luna", "subagent model"),
        prompt: process.env.INPUT_TASK_PROMPT?.trim() || selectedDemo.defaultPrompt,
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
