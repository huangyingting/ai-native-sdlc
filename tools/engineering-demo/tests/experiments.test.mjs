import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { approveImpact, benchmark, callAgent, proposalDigest, summarizeCells, validateDiagnosis, validateImpactProposal } from "../experiments.mjs";
import { IMPACT_CONTRACT } from "../cases.mjs";
import { root as source, treeHash, writeJson } from "../workspace.mjs";
import { parseTap } from "../validation.mjs";

test("diagnosis requires source-grounded citations rather than plausible prose", () => {
  const files = { "src/domain.mjs": "return ticket.owner === filter.owner;" };
  assert.equal(validateDiagnosis({ classification: "product", evidence: [{ path: "src/domain.mjs", quote: "ticket.owner === filter.owner" }] }, files), true);
  for (const value of [
    { classification: "product", evidence: [] },
    { classification: "product", evidence: [{ path: "src/domain.mjs", quote: "invented code" }] },
    { classification: "guessed", evidence: [{ path: "src/domain.mjs", quote: files["src/domain.mjs"] }] },
  ]) assert.equal(validateDiagnosis(value, files), false);
});

function proposalFixture() {
  const files = Object.fromEntries(IMPACT_CONTRACT.requiredSurfaces.map((path) => [path, "Existing source contract"]));
  const candidate = {
    impacts: Object.keys(files).map((path) => ({ path, quote: files[path], reason: "Needs compatible proxy semantics." })),
    decisions: [{ question: "one", selected: "one", rationale: "explicit contract" }, { question: "two", selected: "two", rationale: "preserve compatibility" }],
    acceptanceCriteria: ["one", "two", "three", "four"], plan: ["one", "two", "three"],
    spec: "The temporary proxy preserves the accountable owner and old rows.",
  };
  return { files, candidate };
}

test("impact analysis must cover every known surface with exact quotes", () => {
  const { files, candidate } = proposalFixture();
  validateImpactProposal(candidate, files);
  assert.throws(() => validateImpactProposal({ ...candidate, impacts: candidate.impacts.slice(1) }, files), /missed/);
  assert.throws(() => validateImpactProposal({ ...candidate, impacts: [...candidate.impacts, candidate.impacts[0]] }, files));
});

test("review binds current proposal, source fixture and acceptance contract and cannot be replayed", () => {
  const dir = mkdtempSync(join(tmpdir(), "engineering-review-"));
  try {
    const { files, candidate } = proposalFixture();
    const source = { commit: "a".repeat(40), fixtureHash: treeHash(files) };
    const proposal = { version: 1, source, contractHash: proposalDigest(IMPACT_CONTRACT), candidate };
    const hash = proposalDigest(proposal);
    writeJson(join(dir, "baseline.json"), files);
    writeJson(join(dir, "proposal.json"), proposal);
    writeJson(join(dir, "report.json"), { status: "awaiting-operator-review", kind: "engineering-impact-review", source, proposalHash: hash });
    assert.throws(() => approveImpact({ run: dir, proposalHash: "wrong", reviewer: "operator" }), /stale/);
    const result = approveImpact({ run: dir, proposalHash: hash, reviewer: "operator" });
    assert.equal(result.independentHumanReview, false);
    assert.throws(() => approveImpact({ run: dir, proposalHash: hash, reviewer: "operator" }));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("TAP parser rejects missing or duplicate totals and preserves failed test counts", () => {
  const output = "# tests 3\n# pass 2\n# fail 1\n# cancelled 0\n# skipped 0\n# todo 0\n";
  assert.deepEqual(parseTap(output), { tests: 3, pass: 2, fail: 1, cancelled: 0, skipped: 0, todo: 0 });
  assert.equal(parseTap(output + "# tests 3\n").tests, null);
  assert.equal(parseTap("no evidence").tests, null);
});

test("comparison retains failed cells and does not turn missing costs into zero", () => {
  const summary = summarizeCells([
    { strategy: "direct", passed: true, calls: [{}], wallMs: 10 },
    { strategy: "direct", passed: false, falseCompletion: true, calls: [{}], wallMs: 20 },
    { strategy: "diagnose-first", passed: true, calls: [{}, {}], wallMs: 40 },
  ]);
  assert.equal(summary[0].passed, 1);
  assert.equal(summary[0].falseCompletionClaims, 1);
  assert.equal(summary[0].dollarCost, null);
  assert.equal(summary[1].calls, 2);
});

test("failed paid calls retain telemetry and consume the same bounded call budget", async () => {
  const calls = [];
  const metrics = { inputTokens: 100, outputTokens: 40, premiumRequestCost: 1, models: ["observed-model"] };
  const agent = async () => { throw Object.assign(new Error("invalid response"), { metrics, status: "invalid-response" }); };
  const budget = { calls, started: performance.now() };
  await assert.rejects(callAgent("synthetic", "/unused", budget, agent), /invalid response/);
  assert.deepEqual(calls[0].metrics, metrics);
  assert.equal(calls[0].failureStatus, "invalid-response");
  const summary = summarizeCells([{ strategy: "direct", calls, wallMs: 1 }])[0];
  assert.equal(summary.usage.inputTokens, 100);
  assert.equal(summary.usage.premiumRequestCost, 1);
  assert.deepEqual(summary.observedModels, ["observed-model"]);
  await assert.rejects(callAgent("synthetic", "/unused", budget, agent), /invalid response/);
  await assert.rejects(callAgent("synthetic", "/unused", budget, agent), /exhausted/);
  assert.equal(calls.length, 2);
});

test("infrastructure failures abort as exit one without grading unexecuted trials", async () => {
  const directory = mkdtempSync(join(tmpdir(), "engineering-infrastructure-"));
  try {
    let verifications = 0;
    let calls = 0;
    const result = await benchmark({
      source, sourceRef: execFileSync("git", ["-C", source, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      image: "sha256:" + "a".repeat(64), dest: join(directory, "run"),
    }, {
      agent: async () => { calls += 1; throw new Error("Must not invoke the model."); },
      visible: () => {
        if (verifications++ === 0) return { valid: true, passed: true };
        throw new Error("Docker unavailable");
      },
    });
    assert.equal(result.exitCode, 1);
    assert.equal(result.status, "failed");
    assert.equal(calls, 0);
    assert.equal(result.cells.length, 1);
    assert.equal(result.cells[0].status, "infrastructure-error");
    assert.equal(result.summary[0].evaluated, 0);
    assert.equal(result.summary[0].infrastructureFailures, 1);
    assert.equal(result.summary[1].cells, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
