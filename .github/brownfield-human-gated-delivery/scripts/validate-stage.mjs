import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  artifactPaths,
  loadConfig,
  parsePullRequestMetadata,
  validateExpectedFailures,
  validateImplementationPlan,
  validateSpecification,
  validateStageFiles,
  validateVitestGreen,
  validateVitestRed,
} from "./core.mjs";

function appendOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required.");
  appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function appendSummary(lines) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
}

function parseMetadata() {
  const metadata = parsePullRequestMetadata(process.env.PR_BODY);
  appendOutput("demo", metadata.demo);
  appendOutput("intent", metadata.intentNumber);
  appendOutput("stage", metadata.stage);
  appendOutput("stage-issue", metadata.stageIssueNumber);
}

function changedFiles() {
  return String(process.env.CHANGED_FILES ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateArtifacts() {
  const config = loadConfig();
  const intentNumber = Number(process.env.INTENT_NUMBER);
  const stage = process.env.DELIVERY_STAGE;
  const paths = artifactPaths(intentNumber);
  const files = validateStageFiles(
    stage,
    changedFiles(),
    intentNumber,
    config.project.path,
  );
  let acceptance = [];
  if (stage !== "spec") {
    acceptance = validateSpecification(readFileSync(paths.spec, "utf8"));
  }
  if (stage === "spec") {
    acceptance = validateSpecification(readFileSync(paths.spec, "utf8"));
  } else if (stage === "plan") {
    validateImplementationPlan(readFileSync(paths.plan, "utf8"), acceptance);
  } else if (stage === "tests") {
    validateImplementationPlan(readFileSync(paths.plan, "utf8"), acceptance);
    validateExpectedFailures(
      JSON.parse(readFileSync(paths.expectedFailures, "utf8")),
      intentNumber,
      acceptance,
    );
  } else if (stage === "implementation") {
    validateImplementationPlan(readFileSync(paths.plan, "utf8"), acceptance);
    validateExpectedFailures(
      JSON.parse(readFileSync(paths.expectedFailures, "utf8")),
      intentNumber,
      acceptance,
    );
  }
  appendSummary([
    `## Brownfield delivery ${stage} gate`,
    "",
    `- Intent: #${intentNumber}`,
    `- Changed files: ${files.length}`,
    `- Acceptance scenarios: ${acceptance.length}`,
    "- Artifact contract: Passed",
  ]);
}

function validateRed() {
  const intentNumber = Number(process.env.INTENT_NUMBER);
  const paths = artifactPaths(intentNumber);
  const acceptance = validateSpecification(readFileSync(paths.spec, "utf8"));
  const expected = validateExpectedFailures(
    JSON.parse(readFileSync(paths.expectedFailures, "utf8")),
    intentNumber,
    acceptance,
  );
  const failed = validateVitestRed(
    JSON.parse(readFileSync(process.env.VITEST_REPORT, "utf8")),
    expected,
  );
  appendSummary([
    "## TDD Red evidence",
    "",
    `- Expected failures: ${expected.size}`,
    `- Observed exact failures: ${failed.length}`,
    "- Unexpected failures: 0",
    "- Result: Valid Red",
  ]);
}

function validateGreen() {
  const intentNumber = Number(process.env.INTENT_NUMBER);
  const paths = artifactPaths(intentNumber);
  const acceptance = validateSpecification(readFileSync(paths.spec, "utf8"));
  const expected = validateExpectedFailures(
    JSON.parse(readFileSync(paths.expectedFailures, "utf8")),
    intentNumber,
    acceptance,
  );
  const green = validateVitestGreen(
    JSON.parse(readFileSync(process.env.VITEST_REPORT, "utf8")),
    expected,
  );
  appendSummary([
    "## TDD Green evidence",
    "",
    `- Expected Red tests now Green: ${green.length}`,
    "- Missing expected tests: 0",
    "- Failing tests: 0",
    "- Result: Valid Green",
  ]);
}

const commands = {
  metadata: parseMetadata,
  artifacts: validateArtifacts,
  red: validateRed,
  green: validateGreen,
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2];
  if (!commands[command]) throw new Error(`Unknown stage validation command: ${command}`);
  commands[command]();
}
