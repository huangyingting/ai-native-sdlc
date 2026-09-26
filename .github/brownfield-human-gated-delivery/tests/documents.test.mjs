import { afterEach, test } from "node:test";
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { artifactPaths, lifecycleBranch, loadConfig, validateStageFiles } from "../scripts/core.mjs";
import {
  approveDocument, contentHash, documentBranch, documentMode, documentStatePath,
  hasDocumentApproval, initialDocumentState, parseDocumentCommand, publishDocumentRevision,
  requestDocumentRevision, validateDocumentHandoff, validateGeneratedDocument,
} from "../scripts/document-core.mjs";
import { DocumentReview, routeDocumentKickoff } from "../scripts/documents.mjs";

const config = loadConfig();
const human = { id: 123, login: "huangyingting", type: "User" };
const spec = `# Specification

## Intent
Clarify ticket ownership.
## Scope
Optional owner names.
## Non-goals
No user directory.
## Actors
Support agents.
## Constraints
Preserve existing tickets.
## Acceptance scenarios
### AC-1: Assign an owner
**Given** a ticket
**When** an agent assigns an owner
**Then** the owner is persisted
## Revision summary
Initial proposal.
## Open questions
None.
`;
const plan = `# Implementation plan

## Acceptance mapping
TASK-1 covers AC-1.
## Tasks
### TASK-1: Persist ticket ownership
Depends on: none
Acceptance: AC-1
Surfaces: ticket store and UI
Validation: store and UI tests
## Risks and migrations
Add nullable column and preserve existing data.
## Validation
Controlled Red tests followed by Green tests, lint, build and container smoke.
## Revision summary
Initial plan.
## Open questions
None.
`;
const sha = (text) => createHash("sha1").update(text).digest("hex");
const blob = (text) => sha(`blob ${Buffer.byteLength(text)}\0${text}`);
const baseline = sha("baseline");
const parent = {
  number: 42, id: 42, title: "[Brownfield delivery] Ownership", body: "Clarify ticket ownership.",
  state: "open", author_association: "OWNER", labels: [{ name: "brownfield-human-gated-delivery:intent" }],
};
function command(body, id = 100) {
  return { id, body, user: human, author_association: "OWNER", created_at: "2026-09-26T00:00:00Z", updated_at: "2026-09-26T00:00:00Z" };
}
function pureSpec() {
  const state = initialDocumentState(parent, baseline);
  requestDocumentRevision(state, "spec", "Initial proposal", config);
  publishDocumentRevision(state, spec, null, config);
  return state;
}
function sealedState() {
  const state = pureSpec();
  approveDocument(state, parseDocumentCommand("/sdlc approve spec v1"), command("/sdlc approve spec v1"), config);
  requestDocumentRevision(state, "plan", "Initial plan", config);
  publishDocumentRevision(state, plan, spec, config);
  approveDocument(state, parseDocumentCommand("/sdlc approve plan v1"), command("/sdlc approve plan v1", 101), config);
  return state;
}

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function repository() {
  let counter = 1000;
  const initialTree = sha("initial-tree");
  const commits = new Map([[baseline, { tree: { sha: initialTree }, parents: [] }]]);
  const trees = new Map([[initialTree, { "README.md": "Existing application" }]]);
  const refs = new Map([["main", baseline]]);
  const issues = [structuredClone(parent)];
  const comments = [];
  const calls = [];
  const labels = [];
  const state = {
    comments, issues, refs, commits, trees, calls, assignments: [], dispatches: 0,
    permissions: new Map([[human.login, "admin"]]),
    teamMembers: [], fail: null, onCall: null,
  };
  const reply = (body, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status });
  const notFound = () => reply({ message: "Not Found" }, 404);
  const treeAt = (ref) => trees.get(commits.get(refs.get(ref) ?? ref)?.tree.sha);
  const listPage = (items, url) => {
    const page = Number(url.searchParams.get("page") ?? 1);
    return items.slice((page - 1) * 100, page * 100);
  };
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input);
    const method = options.method ?? "GET";
    const body = options.body ? JSON.parse(options.body) : undefined;
    const path = url.pathname.replace("/repos/example/repo", "");
    const call = { path, method, body };
    calls.push(call);
    state.onCall?.(call);
    if (state.fail?.(call)) return reply({ message: "Injected failure" }, 503);
    if (path === "/graphql") {
      if (body.query.includes("DocumentLedger")) {
        const comment = comments.find((item) => item.node_id === body.variables.id);
        return reply({ data: { node: {
          body: comment.body, lastEditedAt: comment.lastEditedAt ?? null,
          author: { __typename: "Bot", login: "github-actions" },
          editor: comment.editor ?? { __typename: "Bot", login: "github-actions" },
        } } });
      }
      if (body.query.includes("CopilotActor")) {
        return reply({ data: { repository: { id: "REPO", suggestedActors: { nodes: [{ __typename: "Bot", login: "Copilot", id: "BOT" }] } } } });
      }
      if (body.query.includes("AssignCopilot")) {
        state.assignments.push(body.variables);
        const issue = issues.find((item) => item.node_id === body.variables.assignableId);
        issue.assignees = [{ login: "Copilot", type: "Bot" }];
        return reply({ data: {} });
      }
    }
    if (path === "/orgs/example/teams/approvers/members") return reply(state.teamMembers);
    if (path === "") return reply({ default_branch: "main" });
    if (path.startsWith("/collaborators/")) return reply({ permission: state.permissions.get(path.split("/")[2]) ?? "read" });
    if (path.startsWith("/git/ref/heads/")) {
      const ref = path.slice("/git/ref/heads/".length);
      return refs.has(ref) ? reply({ object: { sha: refs.get(ref) } }) : notFound();
    }
    if (path.startsWith("/git/refs/heads/") && method === "PATCH") {
      const ref = path.slice("/git/refs/heads/".length);
      if (body.force !== false || commits.get(body.sha).parents[0] !== refs.get(ref)) {
        return reply({ message: "Non-fast-forward" }, 422);
      }
      refs.set(ref, body.sha);
      return reply({});
    }
    if (path === "/git/refs" && method === "POST") {
      const ref = body.ref.replace("refs/heads/", "");
      if (refs.has(ref)) return reply({ message: "Reference exists" }, 422);
      refs.set(ref, body.sha);
      return reply({});
    }
    if (path.startsWith("/git/commits/")) return reply(commits.get(path.split("/").at(-1)));
    if (path === "/git/trees" && method === "POST") {
      const tree = { ...trees.get(body.base_tree) };
      for (const file of body.tree) {
        if (file.sha === null) delete tree[file.path];
        else tree[file.path] = file.content;
      }
      const id = sha(JSON.stringify(tree));
      trees.set(id, tree);
      return reply({ sha: id });
    }
    if (path === "/git/commits" && method === "POST") {
      const id = sha(String(++counter));
      commits.set(id, { tree: { sha: body.tree }, parents: body.parents });
      return reply({ sha: id });
    }
    if (path.startsWith("/contents/")) {
      const text = treeAt(url.searchParams.get("ref"))?.[path.slice("/contents/".length)];
      return text === undefined ? notFound() : reply({ type: "file", encoding: "base64", sha: blob(text), content: Buffer.from(text).toString("base64") });
    }
    if (path.startsWith("/compare/")) {
      const [base, head] = path.slice("/compare/".length).split("...");
      const before = treeAt(base);
      const after = treeAt(head);
      const files = [...new Set([...Object.keys(before), ...Object.keys(after)])]
        .filter((name) => before[name] !== after[name])
        .map((filename) => ({ filename, status: before[filename] === undefined ? "added" : "modified" }));
      return reply({ merge_base_commit: { sha: base }, files });
    }
    if (path === "/labels" && method === "POST") { labels.push(body); return reply(body); }
    if (path.startsWith("/labels/")) {
      const label = labels.find((item) => item.name === decodeURIComponent(path.slice("/labels/".length)));
      return label ? reply(label) : notFound();
    }
    if (path === "/issues" && method === "GET") return reply(listPage(issues.slice(1), url));
    if (path === "/issues" && method === "POST") {
      const number = issues.length + 42;
      const issue = { ...body, number, id: number, node_id: `ISSUE_${number}`, state: "open", assignees: [],
        labels: body.labels.map((name) => ({ name })), html_url: `https://github.com/example/repo/issues/${number}` };
      issues.push(issue);
      return reply(issue);
    }
    if (path === "/issues/42/sub_issues") return reply(method === "GET" ? issues.slice(1) : {});
    if (path === "/issues/42/comments") {
      if (method === "GET") return reply(listPage(comments, url));
      const comment = { id: ++counter, node_id: `COMMENT_${counter}`, body: body.body, user: { login: "github-actions[bot]", type: "Bot" } };
      comments.push(comment);
      return reply(comment);
    }
    if (path.startsWith("/issues/comments/")) {
      const comment = comments.find((item) => item.id === Number(path.split("/").at(-1)));
      if (!comment) return notFound();
      if (method === "PATCH") Object.assign(comment, body);
      return reply(comment);
    }
    if (/^\/issues\/\d+$/.test(path)) {
      const issue = issues.find((item) => item.number === Number(path.split("/").at(-1)));
      if (method === "PATCH") Object.assign(issue, body);
      return reply(issue);
    }
    if (path === "/actions/workflows/brownfield-human-gated-delivery-documents.yml/dispatches") {
      state.dispatches++;
      assert.equal(body.ref, "main");
      assert.equal(body.inputs.issue_number, "42");
      return reply(null, 204);
    }
    throw new Error(`Unexpected document API request: ${method} ${path}`);
  };
  const review = new DocumentReview({ token: "test-workflow", copilotToken: "test-assignment", owner: "example", repo: "repo", config: structuredClone(config) });
  return {
    ...state, state, review, treeAt,
    add(body, overrides = {}) {
      const comment = { ...command(body, ++counter), ...overrides };
      comments.push(comment);
      return comment;
    },
    async draft(stage = "spec") {
      const snapshot = await review.process(42);
      assert.equal(snapshot.state.pending.stage, stage);
      return review.publish(42, snapshot.sha, stage === "spec" ? spec : plan);
    },
  };
}

test("Issue commands require exact submitted syntax and explicit document versions", () => {
  assert.equal(parseDocumentCommand("Looks good!"), null);
  assert.equal(parseDocumentCommand("> /sdlc approve spec v1"), null);
  assert.deepEqual(parseDocumentCommand("/sdlc revise spec\nPlease preserve unassigned tickets."), { action: "revise", stage: "spec", feedback: "Please preserve unassigned tickets." });
  assert.deepEqual(parseDocumentCommand("/sdlc approve plan v2"), { action: "approve", stage: "plan", version: 2 });
  assert.deepEqual(parseDocumentCommand("/sdlc retry"), { action: "retry" });
  for (const text of ["/sdlc approve spec", "/sdlc approve plan v0", "/sdlc revise spec", "/sdlc approve plan v2\nAlso change code", "/sdlc approve spec v9007199254740992"]) {
    assert.throws(() => parseDocumentCommand(text), /Use \/sdlc/);
  }
});

test("document validation enforces existing contracts and complete review presentation", () => {
  validateGeneratedDocument("spec", spec);
  validateGeneratedDocument("plan", plan, spec);
  assert.throws(() => validateGeneratedDocument("spec", `\`\`\`md\n${spec}\`\`\``), /must start/);
  assert.throws(() => validateGeneratedDocument("spec", spec.replace("## Open questions", "## Questions")), /Open questions/);
  assert.throws(() => validateGeneratedDocument("plan", plan.replace("AC-1", "AC-9").replace("Acceptance: AC-1", "Acceptance: AC-9"), spec), /unknown AC/);
  assert.throws(() => validateGeneratedDocument("spec", spec + "x".repeat(40000)), /40 KB/);
});

test("Human decisions are revision-bound, deduplicated and support configured approval thresholds", () => {
  const state = pureSpec();
  const approve = parseDocumentCommand("/sdlc approve spec v1");
  assert.throws(() => approveDocument(state, { ...approve, version: 2 }, command(""), config), /Stale/);
  assert.throws(() => approveDocument(state, approve, { ...command(""), user: { ...human, type: "Bot" } }, config), /Human/);
  assert.throws(() => approveDocument(state, approve, { ...command(""), user: { ...human, login: "outsider" } }, config), /Human/);
  approveDocument(state, approve, command("/sdlc approve spec v1"), config);
  approveDocument(state, approve, command("/sdlc approve spec v1", 101), config);
  assert.equal(state.documents.spec.approvals.length, 1);
  assert.equal(hasDocumentApproval(state.documents.spec, config.stages.spec), true);
  assert.equal(state.documents.spec.approvals[0].commentBody, "/sdlc approve spec v1");
  const multi = structuredClone(config);
  multi.stages.spec.minimumApprovals = 2;
  multi.stages.spec.reviewers.teams = ["approvers"];
  const second = initialDocumentState(parent, baseline);
  requestDocumentRevision(second, "spec", "Initial", multi);
  publishDocumentRevision(second, spec, null, multi);
  approveDocument(second, approve, command(""), multi);
  assert.equal(hasDocumentApproval(second.documents.spec, multi.stages.spec), false);
  approveDocument(second, approve, { ...command("", 102), user: { id: 456, login: "teammate", type: "User" } }, multi, ["teammate"]);
  assert.equal(hasDocumentApproval(second.documents.spec, multi.stages.spec), true);
});

test("Spec revisions invalidate approvals and Plan without reusing version numbers; handoff freezes documents", () => {
  const state = sealedState();
  validateDocumentHandoff(state, { spec, plan }, config);
  assert.throws(() => requestDocumentRevision(state, "spec", "Change it", config), /frozen/);
  state.sealed = false;
  requestDocumentRevision(state, "spec", "Revise", config);
  assert.equal(state.documents.spec.approvals.length, 0);
  assert.equal(state.documents.plan, null);
  assert.equal(state.counters.plan, 1);
  assert.throws(() => approveDocument(state, parseDocumentCommand("/sdlc approve spec v1"), command(""), config), /pending/);
  publishDocumentRevision(state, spec, null, config);
  assert.equal(state.documents.spec.version, 2);
  assert.throws(() => requestDocumentRevision(state, "plan", "Draft", config), /Approve/);
  approveDocument(state, parseDocumentCommand("/sdlc approve spec v2"), command(""), config);
  requestDocumentRevision(state, "plan", "New plan", config);
  assert.equal(state.pending.version, 2);
  assert.equal(state.pending.specHash, contentHash(spec));
});

test("policy changes and altered content cannot inherit previous document approvals", () => {
  const state = sealedState();
  const changed = structuredClone(config);
  changed.stages.spec.reviewers.users = ["someone-else"];
  assert.throws(() => validateDocumentHandoff(state, { spec, plan }, changed), /Missing approval/);
  assert.throws(() => validateDocumentHandoff(state, { spec: spec + "changed", plan }, config), /changed approved spec/);
  state.documents.plan.specHash = contentHash("different");
  assert.throws(() => validateDocumentHandoff(state, { spec, plan }, config), /different Spec/);
});

test("new Intent goes from rendered Spec through Plan approval to ONLY the Tests assignment", async () => {
  const mock = repository();
  let snapshot = await mock.draft();
  assert.equal(mock.refs.has(lifecycleBranch(42)), false);
  assert.ok(mock.comments.some((comment) => comment.body.includes("# Specification")));
  assert.equal(mock.state.assignments.length, 0);
  mock.add("Looks good, continue!");
  snapshot = await mock.review.process(42);
  assert.equal(snapshot.state.pending, null);
  assert.equal(snapshot.state.documents.plan, null);
  mock.add("/sdlc approve spec v1");
  snapshot = await mock.draft("plan");
  assert.equal(mock.refs.has(lifecycleBranch(42)), false);
  assert.ok(mock.comments.some((comment) => comment.body.includes("# Implementation plan")));
  mock.add("/sdlc approve plan v1");
  snapshot = await mock.review.process(42);
  assert.equal(snapshot.state.sealed, true);
  assert.equal(mock.refs.get(lifecycleBranch(42)), snapshot.sha);
  assert.deepEqual(mock.issues.slice(1).map((issue) => issue.state), ["closed", "closed", "open", "open"]);
  assert.ok(mock.issues.slice(1).every((issue) => issue.body.includes(documentMode)));
  assert.equal(mock.state.assignments.length, 1);
  assert.equal(mock.state.assignments[0].assignableId, "ISSUE_45");
  assert.equal(mock.state.assignments[0].baseRef, lifecycleBranch(42));
  await mock.review.process(42);
  assert.equal(mock.state.assignments.length, 1);
  await mock.review.verifyPullRequest(42, "tests", { head: { sha: snapshot.sha } });
  await assert.rejects(() => mock.review.verifyPullRequest(42, "spec", { head: { sha: snapshot.sha } }), /not through PRs/);
  assert.ok(!mock.calls.some((call) => call.path === "/pulls" || call.body?.force === true));
});

test("queued revision and stale approval are both handled across runs, not lost with workflow coalescing", async () => {
  const mock = repository();
  await mock.draft();
  mock.add("/sdlc revise spec\nKeep unassigned tickets.");
  const stale = mock.add("/sdlc approve spec v1");
  let snapshot = await mock.review.process(42);
  assert.equal(snapshot.state.pending.version, 2);
  snapshot = await mock.review.publish(42, snapshot.sha, spec.replace("Initial proposal.", "Preserve unassigned tickets."));
  snapshot = await mock.review.process(42);
  assert.equal(snapshot.state.documents.spec.version, 2);
  assert.equal(snapshot.state.documents.spec.approvals.length, 0);
  assert.ok(mock.comments.some((item) => item.body.includes(`Command #${stale.id} rejected: Stale`)));
  assert.equal(mock.comments.filter((item) => item.body.startsWith("<!-- sdlc-document:spec:")).length, 2);
});

test("unauthorized, edited, bot and malformed commands cannot approve documents", async () => {
  const mock = repository();
  await mock.draft();
  mock.add("/sdlc approve spec v1", { user: { id: 9, login: "outsider", type: "User" } });
  mock.add("/sdlc approve spec v1", { updated_at: "2026-09-27T00:00:00Z" });
  mock.add("/sdlc approve spec v1", { user: { id: 9, login: "github-actions[bot]", type: "Bot" } });
  mock.add("/sdlc approve spec");
  const snapshot = await mock.review.process(42);
  assert.equal(snapshot.state.documents.spec.approvals.length, 0);
  assert.equal(snapshot.state.documents.plan, null);
  assert.equal(snapshot.state.receipts.filter((item) => item.message.includes("rejected")).length, 3);
});

test("an approval queued before AI publishes a revision cannot preapprove unseen content", async () => {
  const mock = repository();
  const pending = await mock.review.process(42);
  mock.add("/sdlc approve spec v1");
  await mock.review.publish(42, pending.sha, spec);
  const snapshot = await mock.review.process(42);
  assert.equal(snapshot.state.documents.spec.approvals.length, 0);
  assert.match(snapshot.state.receipts[0].message, /predates publication/);
  mock.add("/sdlc approve spec v1");
  assert.equal((await mock.review.process(42)).state.pending.stage, "plan");
});

test("document source commits need trusted audit receipts, not editable Git approval JSON", async () => {
  const mock = repository();
  const snapshot = await mock.draft();
  const state = structuredClone(snapshot.state);
  state.lastCommentId = 99999;
  const treeId = sha("tampered-review-tree");
  const commitId = sha("tampered-review-commit");
  mock.trees.set(treeId, { ...mock.treeAt(snapshot.sha), [documentStatePath(42)]: JSON.stringify(state) });
  mock.commits.set(commitId, { tree: { sha: treeId }, parents: [snapshot.sha] });
  mock.refs.set(documentBranch(42), commitId);
  mock.add(`<!-- brownfield-human-gated-delivery-document-ledger -->\n${commitId} ${contentHash(JSON.stringify(state))}`);
  await assert.rejects(() => mock.review.load(42), /trusted workflow audit entry/);
});

test("a failed audit receipt leaves the authoritative branch unchanged and retryable", async () => {
  const mock = repository();
  const snapshot = await mock.review.process(42);
  mock.state.fail = (call) => call.method === "PATCH" && call.body?.body?.includes("document-ledger");
  await assert.rejects(() => mock.review.publish(42, snapshot.sha, spec), /503/);
  assert.equal(mock.refs.get(documentBranch(42)), snapshot.sha);
  mock.state.fail = null;
  const published = await mock.review.publish(42, snapshot.sha, spec);
  assert.equal(published.state.documents.spec.version, 1);
});

test("a Human edit of a bot-authored ledger cannot forge workflow approval evidence", async () => {
  const mock = repository();
  await mock.draft();
  const ledger = mock.comments.find((item) => item.body.startsWith("<!-- brownfield-human-gated-delivery-document-ledger"));
  ledger.lastEditedAt = "2026-09-26T01:00:00Z";
  ledger.editor = { __typename: "User", login: human.login };
  await assert.rejects(() => mock.review.load(42), /edited outside trusted workflow/);
});

test("Git update races fail closed without forcing a document ref or losing the new head", async () => {
  const mock = repository();
  const snapshot = await mock.review.process(42);
  const other = sha("concurrent-head");
  mock.commits.set(other, { tree: mock.commits.get(snapshot.sha).tree, parents: [snapshot.sha] });
  mock.state.onCall = (call) => {
    if (call.path === `/git/refs/heads/${documentBranch(42)}` && call.method === "PATCH") {
      mock.refs.set(documentBranch(42), other);
    }
  };
  await assert.rejects(() => mock.review.publish(42, snapshot.sha, spec), /422/);
  assert.equal(mock.refs.get(documentBranch(42)), other);
  assert.ok(!mock.calls.some((call) => call.body?.force === true));
});

test("generation prompt carries Human discussion and previous content but rejects silent truncation", async () => {
  const mock = repository();
  let snapshot = await mock.review.process(42);
  const prompt = await mock.review.prompt(snapshot);
  assert.match(prompt, /Human Intent #42/);
  assert.match(prompt, /Clarify ticket ownership/);
  await mock.review.publish(42, snapshot.sha, spec);
  mock.add("/sdlc revise spec\nPreserve unassigned tickets.");
  snapshot = await mock.review.process(42);
  const revisionPrompt = await mock.review.prompt(snapshot);
  assert.match(revisionPrompt, /previousDocument/);
  assert.match(revisionPrompt, /Preserve unassigned tickets/);
  mock.add("x".repeat(100001));
  await assert.rejects(() => mock.review.prompt(snapshot), /exceeds 100 KB/);
});

test("failed generation and publication can be retried without duplicate revisions or assignments", async () => {
  const mock = repository();
  let snapshot = await mock.review.process(42);
  await assert.rejects(() => mock.review.publish(42, snapshot.sha, "broken output"), /must start/);
  assert.equal((await mock.review.load(42)).state.pending.version, 1);
  snapshot = await mock.review.process(42);
  mock.state.fail = (call) => call.path === "/issues/42/comments" && call.method === "POST";
  await assert.rejects(() => mock.review.publish(42, snapshot.sha, spec), /503/);
  mock.state.fail = null;
  snapshot = await mock.review.process(42);
  assert.equal(snapshot.state.documents.spec.version, 1);
  assert.equal(snapshot.state.pending, null);
  await mock.review.process(42);
  assert.equal(mock.comments.filter((item) => item.body.startsWith("<!-- sdlc-document:spec:")).length, 1);
  assert.equal(mock.state.assignments.length, 0);
});

test("changed branches or Intents reject stale generation instead of overwriting work", async () => {
  const mock = repository();
  const first = await mock.review.process(42);
  mock.add("/sdlc revise spec\nA newer request.");
  const second = await mock.review.process(42);
  assert.notEqual(second.sha, first.sha);
  await assert.rejects(() => mock.review.publish(42, first.sha, spec), /Stale generation/);
  mock.issues[0].body += " changed";
  await assert.rejects(() => mock.review.publish(42, second.sha, spec), /original Intent changed/);
  mock.issues[0].state = "closed";
  await assert.rejects(() => mock.review.process(42), /open, authorized/);
});

test("approved Spec revisions remove the draft Plan and require new approvals for both", async () => {
  const mock = repository();
  await mock.draft();
  mock.add("/sdlc approve spec v1");
  await mock.draft("plan");
  mock.add("/sdlc revise spec\nChange the accepted behavior.");
  let snapshot = await mock.review.process(42);
  assert.equal(snapshot.state.documents.plan, null);
  assert.equal(mock.treeAt(snapshot.sha)[artifactPaths(42).plan], undefined);
  snapshot = await mock.review.publish(42, snapshot.sha, spec);
  mock.add("/sdlc approve spec v2");
  snapshot = await mock.draft("plan");
  assert.equal(snapshot.state.documents.plan.version, 2);
  assert.equal(mock.state.assignments.length, 0);
});

test("handoff retries survive an assignment failure and prohibit application changes in the document branch", async () => {
  const mock = repository();
  await mock.draft();
  mock.add("/sdlc approve spec v1");
  await mock.draft("plan");
  mock.add("/sdlc approve plan v1");
  mock.state.fail = (call) => call.path === "/graphql" && call.body?.query.includes("AssignCopilot");
  await assert.rejects(() => mock.review.process(42), /503/);
  assert.equal((await mock.review.load(42)).state.sealed, true);
  assert.equal(mock.state.assignments.length, 0);
  mock.state.fail = null;
  await mock.review.process(42);
  assert.equal(mock.state.assignments.length, 1);
  const snapshot = await mock.review.load(42);
  mock.treeAt(snapshot.sha)["demos/it-service-desk/src/evil.ts"] = "not a document";
  await assert.rejects(() => mock.review.handoff(mock.issues[0], snapshot, mock.issues.slice(1)), /only the Spec, Plan/);
});

test("engineering PRs must retain exact approved document and evidence blobs", async () => {
  const mock = repository();
  await mock.draft();
  mock.add("/sdlc approve spec v1");
  await mock.draft("plan");
  mock.add("/sdlc approve plan v1");
  const snapshot = await mock.review.process(42);
  const changedTree = sha("changed-tree");
  const changedHead = sha("changed-head");
  for (const path of [artifactPaths(42).spec, artifactPaths(42).plan, documentStatePath(42)]) {
    mock.trees.set(changedTree, { ...mock.treeAt(snapshot.sha), [path]: "changed" });
    mock.commits.set(changedHead, { tree: { sha: changedTree }, parents: [snapshot.sha] });
    await assert.rejects(() => mock.review.verifyPullRequest(42, "implementation", { head: { sha: changedHead } }), /changed an approved/);
  }
  assert.throws(() => validateStageFiles("implementation", ["demos/it-service-desk/src/a.ts", documentStatePath(42)], 42, "demos/it-service-desk"), /out-of-scope/);
  assert.equal(validateStageFiles("implementation", ["demos/it-service-desk/src/a.ts", documentStatePath(42)], 42, "demos/it-service-desk", true).length, 2);
});

test("legacy lifecycles are not migrated and spoofed bot markers cannot replace Human discussion", async () => {
  const mock = repository();
  mock.refs.set(lifecycleBranch(42), baseline);
  await assert.rejects(() => mock.review.process(42), /legacy document PRs/);
  assert.equal(mock.refs.has(documentBranch(42)), false);
  mock.refs.delete(lifecycleBranch(42));
  const spoofed = mock.add("<!-- brownfield-human-gated-delivery-progress -->\nHuman text");
  await mock.draft();
  assert.equal(spoofed.body, "<!-- brownfield-human-gated-delivery-progress -->\nHuman text");
});

test("kickoff dispatches Issue review for new and resumed document runs but preserves legacy PR assignment", async () => {
  const saved = { ...process.env };
  const directory = mkdtempSync(join(tmpdir(), "sdlc-document-routing-"));
  try {
    process.env.GITHUB_TOKEN = "test-workflow";
    process.env.COPILOT_ASSIGN_TOKEN = "test-assignment";
    process.env.GITHUB_REPOSITORY = "example/repo";
    process.env.GITHUB_EVENT_PATH = join(directory, "event.json");
    delete process.env.INTENT_ISSUE_NUMBER;
    writeFileSync(process.env.GITHUB_EVENT_PATH, JSON.stringify({ issue: parent }));
    const fresh = repository();
    await routeDocumentKickoff();
    assert.equal(fresh.state.dispatches, 1);
    assert.equal(fresh.refs.has(lifecycleBranch(42)), false);
    await fresh.draft();
    await routeDocumentKickoff();
    assert.equal(fresh.state.dispatches, 3);
    assert.equal(fresh.state.assignments.length, 0);
    const legacy = repository();
    legacy.refs.set(lifecycleBranch(42), baseline);
    await routeDocumentKickoff();
    assert.equal(legacy.state.dispatches, 0);
    assert.equal(legacy.state.assignments[0].assignableId, "ISSUE_43");
    assert.ok(legacy.issues.slice(1).every((issue) => !issue.body.includes(documentMode)));
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
    rmSync(directory, { recursive: true });
  }
});

test("workflow isolates read-only AI generation from trusted publication and routes new Intents", () => {
  const workflow = readFileSync(new URL("../../workflows/brownfield-human-gated-delivery-documents.yml", import.meta.url), "utf8");
  const generation = workflow.split("\n  generate:\n")[1].split("\n  publish:\n")[0];
  assert.match(generation, /contents: read/);
  assert.match(generation, /copilot-requests: write/);
  assert.match(generation, /persist-credentials: false/);
  assert.match(generation, /--available-tools='view,glob,rg'/);
  assert.match(generation, /--deny-tool=write --deny-tool=shell/);
  assert.doesNotMatch(generation, /COPILOT_ASSIGN_TOKEN|issues: write|contents: write|actions: write/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /ref: \$\{\{ needs.prepare.outputs.trusted-sha \}\}/);
  assert.match(workflow, /DOCUMENT_REQUEST_SHA:/);
  assert.match(workflow, /documents\.mjs failure/);
  const kickoff = readFileSync(new URL("../../workflows/brownfield-human-gated-delivery-kickoff.yml", import.meta.url), "utf8");
  assert.match(kickoff, /actions: write/);
  assert.match(kickoff, /github\.mjs route-kickoff/);
});
