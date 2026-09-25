import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import {
  artifactPaths,
  countHumanApprovals,
  isAuthorizedAssociation,
  lifecycleBranch,
  nextStage,
  parsePullRequestMetadata,
  renderPrompt,
  validateConfig,
  validateExpectedFailures,
  validateImplementationPlan,
  validateSpecification,
  validateStageFiles,
  validateVitestGreen,
  validateVitestRed,
} from "../scripts/core.mjs";

const config = {
  version: 1,
  mergeMethod: "squash",
  project: {
    path: "demos/it-service-desk",
    testCommand: "npm test",
    lintCommand: "npm run lint",
    buildCommand: "npm run build",
  },
  stages: Object.fromEntries(
    ["spec", "plan", "tests", "implementation"].map((stage) => [
      stage,
      {
        prompt: `.github/brownfield-human-gated-delivery/prompts/${stage}.md`,
        minimumApprovals: 1,
        reviewers: { users: ["reviewer"], teams: [] },
      },
    ]),
  ),
};

const specification = `# Specification

## Intent
Improve ownership.

## Scope
Ticket assignment.

## Non-goals
Notifications.

## Actors
Support agents.

## Constraints
Unassigned tickets remain valid.

## Acceptance scenarios

### AC-1: Assign a ticket
**Given** an unassigned ticket
**When** an agent selects an assignee
**Then** the assignee is persisted

### AC-2: Filter tickets
**Given** assigned tickets
**When** an agent filters by assignee
**Then** matching tickets are shown
`;

const plan = `# Implementation plan

## Acceptance mapping
AC-1 and AC-2 are implemented by the tasks below.

## Tasks

### TASK-1: Persist assignment
Depends on: none
Acceptance: AC-1
Surfaces: ticket store
Validation: store tests

### TASK-2: Add filtering
Depends on: TASK-1
Acceptance: AC-2
Surfaces: dashboard
Validation: filter tests

## Risks and migrations
Additive SQLite migration.

## Validation
Run tests, lint, and build.
`;

test("validates the checked-in lifecycle configuration shape", () => {
  assert.equal(validateConfig(config), config);
  assert.throws(
    () => validateConfig({ ...config, unknown: true }),
    /Unknown config key/,
  );
  const invalid = structuredClone(config);
  invalid.stages.spec.minimumApprovals = 2;
  assert.throws(() => validateConfig(invalid), /exceeds configured reviewers/);
});

test("authorizes only trusted repository associations", () => {
  assert.equal(isAuthorizedAssociation("OWNER"), true);
  assert.equal(isAuthorizedAssociation("member"), true);
  assert.equal(isAuthorizedAssociation("COLLABORATOR"), true);
  assert.equal(isAuthorizedAssociation("CONTRIBUTOR"), false);
});

test("builds lifecycle names and ordered transitions", () => {
  assert.equal(lifecycleBranch(42), "brownfield-delivery/42");
  assert.deepEqual(artifactPaths(42), {
    root: "docs/delivery-runs/brownfield-human-gated-delivery/42",
    spec: "docs/delivery-runs/brownfield-human-gated-delivery/42/spec.md",
    plan: "docs/delivery-runs/brownfield-human-gated-delivery/42/plan.md",
    expectedFailures:
      "docs/delivery-runs/brownfield-human-gated-delivery/42/expected-failures.json",
  });
  assert.equal(nextStage("spec"), "plan");
  assert.equal(nextStage("implementation"), null);
});

test("parses strict PR metadata and rejects closing references", () => {
  assert.deepEqual(parsePullRequestMetadata(`Delivery Demo: brownfield-human-gated-delivery
Delivery Intent: #42
Delivery Stage: tests
Delivery Stage Issue: #45`), {
    demo: "brownfield-human-gated-delivery",
    intentNumber: 42,
    stage: "tests",
    stageIssueNumber: 45,
  });
  assert.throws(
    () => parsePullRequestMetadata(`Delivery Demo: brownfield-human-gated-delivery
Delivery Intent: #42
Delivery Stage: tests
Delivery Stage Issue: #45
Fixes #45`),
    /Closing keywords/,
  );
  assert.throws(
    () => parsePullRequestMetadata(
      "Delivery Demo: brownfield-human-gated-delivery",
    ),
    /Delivery Intent/,
  );
});

test("renders stage prompts without leaving unknown placeholders", () => {
  assert.equal(
    renderPrompt("Intent {{intent}}, issue {{stage_issue}}", {
      intent: 42,
      stage_issue: 45,
    }),
    "Intent 42, issue 45",
  );
  assert.throws(() => renderPrompt("{{missing}}", {}), /Missing prompt value/);
});

test("counts only current configured human approvals", () => {
  const policy = {
    minimumApprovals: 2,
    reviewers: { users: ["alice"], teams: ["maintainers"] },
  };
  const result = countHumanApprovals([
    { id: 1, state: "APPROVED", user: { login: "alice", type: "User" } },
    { id: 2, state: "CHANGES_REQUESTED", user: { login: "alice", type: "User" } },
    { id: 3, state: "APPROVED", user: { login: "bob", type: "User" } },
    { id: 4, state: "APPROVED", user: { login: "copilot-swe-agent[bot]", type: "Bot" } },
    { id: 5, state: "APPROVED", user: { login: "carol", type: "User" } },
  ], policy, "carol", ["bob"]);
  assert.deepEqual(result, {
    approved: ["bob"],
    changesRequested: ["alice"],
    satisfied: false,
  });
});

test("validates specification scenarios and implementation plan dependencies", () => {
  const acceptance = validateSpecification(specification);
  assert.deepEqual(acceptance, ["AC-1", "AC-2"]);
  const tasks = validateImplementationPlan(plan, acceptance);
  assert.deepEqual([...tasks.keys()], ["TASK-1", "TASK-2"]);
  assert.throws(
    () => validateImplementationPlan(
      plan.replace("Depends on: TASK-1", "Depends on: TASK-2"),
      acceptance,
    ),
    /dependency cycle/,
  );
});

test("validates expected failures and exact Vitest Red evidence", () => {
  const expected = validateExpectedFailures({
    version: 1,
    intent: 42,
    tests: [
      { name: "TicketStore assigns a ticket", acceptance: ["AC-1"] },
      { name: "TicketStore filters assignees", acceptance: ["AC-2"] },
    ],
  }, 42, ["AC-1", "AC-2"]);
  assert.deepEqual([...expected], [
    "TicketStore assigns a ticket",
    "TicketStore filters assignees",
  ]);
  assert.deepEqual(validateVitestRed({
    testResults: [{
      assertionResults: [
        { fullName: "TicketStore assigns a ticket", status: "failed" },
        { fullName: "TicketStore filters assignees", status: "failed" },
        { fullName: "TicketStore creates tickets", status: "passed" },
      ],
    }],
  }, expected), [...expected]);
  assert.throws(
    () => validateVitestRed({
      testResults: [{
        assertionResults: [
          { fullName: "TicketStore assigns a ticket", status: "failed" },
          { fullName: "unrelated regression", status: "failed" },
        ],
      }],
    }, expected),
    /Red test mismatch/,
  );
  assert.deepEqual(validateVitestGreen({
    testResults: [{
      assertionResults: [
        { fullName: "TicketStore assigns a ticket", status: "passed" },
        { fullName: "TicketStore filters assignees", status: "passed" },
        { fullName: "TicketStore creates tickets", status: "passed" },
      ],
    }],
  }, expected), [...expected]);
});

test("restricts files by lifecycle stage", () => {
  assert.deepEqual(
    validateStageFiles(
      "spec",
      ["docs/delivery-runs/brownfield-human-gated-delivery/42/spec.md"],
      42,
      config.project.path,
    ),
    ["docs/delivery-runs/brownfield-human-gated-delivery/42/spec.md"],
  );
  assert.deepEqual(
    validateStageFiles("tests", [
      "docs/delivery-runs/brownfield-human-gated-delivery/42/expected-failures.json",
      "demos/it-service-desk/src/lib/ticket-store.test.ts",
    ], 42, config.project.path),
    [
      "docs/delivery-runs/brownfield-human-gated-delivery/42/expected-failures.json",
      "demos/it-service-desk/src/lib/ticket-store.test.ts",
    ],
  );
  assert.throws(
    () => validateStageFiles("tests", [
      "demos/it-service-desk/src/lib/ticket-store.ts",
      "docs/delivery-runs/brownfield-human-gated-delivery/42/expected-failures.json",
    ], 42, config.project.path),
    /non-test change/,
  );
  assert.throws(
    () => validateStageFiles("implementation", [
      "docs/delivery-runs/brownfield-human-gated-delivery/42/spec.md",
      ".github/workflows/untrusted.yml",
      "demos/it-service-desk/src/lib/ticket.ts",
    ], 42, config.project.path),
    /out-of-scope change/,
  );
});

test("keeps staged workflows and trusted boundaries synchronized", () => {
  const checkedConfig = validateConfig(
    JSON.parse(
      readFileSync(
        ".github/brownfield-human-gated-delivery/config.json",
        "utf8",
      ),
    ),
  );
  for (const stage of ["spec", "plan", "tests", "implementation"]) {
    assert.match(
      readFileSync(checkedConfig.stages[stage].prompt, "utf8"),
      /Delivery Demo: brownfield-human-gated-delivery/,
    );
  }

  const issueForm = readFileSync(
    ".github/ISSUE_TEMPLATE/brownfield-human-gated-delivery-intent.yml",
    "utf8",
  );
  const coordinator = readFileSync(
    ".github/workflows/brownfield-human-gated-delivery-pr-coordinator.yml",
    "utf8",
  );
  const stageCi = readFileSync(
    ".github/workflows/brownfield-human-gated-delivery-stage-ci.yml",
    "utf8",
  );
  const delivery = readFileSync(
    ".github/workflows/brownfield-human-gated-delivery-publish.yml",
    "utf8",
  );

  assert.match(
    issueForm,
    /labels: \["brownfield-human-gated-delivery:intent"\]/,
  );
  assert.match(coordinator, /pull_request_target:/);
  assert.doesNotMatch(coordinator, /pull_request\.head\.sha/);
  assert.match(coordinator, /COPILOT_ASSIGN_TOKEN/);
  assert.match(stageCi, /permissions:\s*\n  contents: read/);
  assert.doesNotMatch(stageCi, /COPILOT_ASSIGN_TOKEN/);
  assert.match(stageCi, /expected controlled Red/);
  assert.match(stageCi, /Validate expected Red tests are Green/);
  assert.match(delivery, /Delivery Stage: implementation/);
});
