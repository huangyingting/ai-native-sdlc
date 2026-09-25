import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const workflow = readFileSync(".github/workflows/it-service-desk-ci.yml", "utf8");
const pullRequestTrigger = workflow.match(/^  pull_request:([\s\S]*?)(?=^  push:)/m)?.[1];

test("required application checks run for documentation and tooling pull requests", () => {
  assert.ok(pullRequestTrigger, "The application CI workflow must handle pull requests.");
  assert.doesNotMatch(pullRequestTrigger, /\b(?:paths|paths-ignore|branches|branches-ignore):/);
  assert.match(workflow, /^  validate:/m);
  assert.match(workflow, /^  container-smoke:/m);
});

test("application checks re-evaluate edited TDD metadata without requiring another commit", () => {
  const types = pullRequestTrigger?.match(/types:\s*\[([^\]]+)\]/)?.[1]
    .split(",").map((type) => type.trim()) ?? [];
  for (const type of ["opened", "reopened", "synchronize", "edited", "ready_for_review"]) {
    assert.ok(types.includes(type), `Missing pull_request event: ${type}`);
  }
});

test("application CI retains its controlled-Red exception and path-scoped main pushes", () => {
  const redException = "!contains(github.event.pull_request.body, 'Delivery Stage: tests')";
  assert.equal(workflow.split(redException).length - 1, 2);
  const pushTrigger = workflow.match(/^  push:([\s\S]*?)(?=^permissions:)/m)?.[1];
  assert.ok(pushTrigger);
  assert.match(pushTrigger, /branches: \[main\]/);
  assert.match(pushTrigger, /paths:[\s\S]*"demos\/it-service-desk\/\*\*"/);
});

test("default-branch PRs cannot skip required Green checks through body text", () => {
  const defaultBranchGuard =
    "github.event.pull_request.base.ref == github.event.repository.default_branch";
  assert.equal(workflow.split(defaultBranchGuard).length - 1, 2);
});

test("CI exercises real Vitest hook regressions after installing demo dependencies", () => {
  assert.match(workflow, /- run: npm ci[\s\S]*?name: Verify lifecycle hook reporter against installed Vitest/);
  assert.match(workflow, /working-directory: \.\n\s+run: >-\n\s+node --test --test-name-pattern="installed Vitest runtime"\n\s+\.github\/brownfield-human-gated-delivery\/tests\/core\.test\.mjs/);
});
