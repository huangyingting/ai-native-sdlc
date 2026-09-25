import { afterEach, test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { classify, coordinate, delivery, intake, kickoff, review, verify } from "../scripts/github.mjs";

const unexpectedFetch = () => { throw new Error("Network access is forbidden in lifecycle tests."); };
globalThis.fetch = unexpectedFetch;
const originalEnv = { ...process.env };
const temporaryFiles = [];

function writeEvent(event) {
  const path = join(
    import.meta.dirname,
    `.event-${process.pid}-${temporaryFiles.length}.json`,
  );
  writeFileSync(path, JSON.stringify(event));
  temporaryFiles.push(path);
  process.env.GITHUB_EVENT_PATH = path;
}

function jsonResponse(body, status = 200) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  globalThis.fetch = unexpectedFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
  while (temporaryFiles.length) rmSync(temporaryFiles.pop(), { force: true });
});

test("rejects an unauthorized Intent before making GitHub API calls", async () => {
  writeEvent({
    issue: {
      number: 42,
      title: "[Brownfield delivery] Assign tickets",
      author_association: "CONTRIBUTOR",
      labels: [{ name: "brownfield-human-gated-delivery:intent" }],
    },
  });
  process.env.GITHUB_REPOSITORY = "example/repo";
  process.env.GITHUB_TOKEN = "test-token";
  process.env.COPILOT_ASSIGN_TOKEN = "test-agent-token";
  globalThis.fetch = () => {
    throw new Error("GitHub API must not be called.");
  };
  await assert.rejects(() => kickoff(), /Unauthorized Intent author/);
});

test("validates an implementation PR, retargets it, and requests configured reviewers", async () => {
  writeEvent({
    pull_request: {
      number: 77,
      body: [
        "Delivery Demo: brownfield-human-gated-delivery",
        "Delivery Intent: #42",
        "Delivery Stage: implementation",
        "Delivery Stage Issue: #46",
      ].join("\n"),
      base: { ref: "brownfield-delivery/42" },
      head: { sha: "head-sha", repo: { full_name: "example/repo" } },
      user: { login: "copilot-swe-agent[bot]" },
      html_url: "https://github.com/example/repo/pull/77",
    },
  });
  await retargetTestBody();
});

  function lifecycleApi({ stage = "implementation", parentState = "open", merged = false } = {}) {
    process.env.GITHUB_REPOSITORY = "example/repo";
    process.env.GITHUB_TOKEN = "test-token";
    process.env.COPILOT_ASSIGN_TOKEN = "test-agent-token";
    const names = ["spec", "plan", "tests", "implementation"];
    const index = names.indexOf(stage);
    const metadata = (name, number) => [
      "Delivery Demo: brownfield-human-gated-delivery", "Delivery Intent: #42",
      `Delivery Stage: ${name}`, `Delivery Stage Issue: #${number}`,
    ].join("\n");
    const issues = names.map((name, i) => ({
      number: 43 + i, body: metadata(name, 43 + i),
      state: i < index || (merged && i === index) ? "closed" : "open",
      labels: [{ name: `brownfield-human-gated-delivery:${name}` }],
      assignees: [{ login: "copilot-swe-agent[bot]" }],
      html_url: `https://github.com/example/repo/issues/${43 + i}`,
    }));
    const parent = { number: 42, state: parentState, labels: [{ name: "brownfield-human-gated-delivery:intent" }] };
    const pr = {
      number: 77, node_id: "PR_77", state: merged ? "closed" : "open", merged,
      body: metadata(stage, 43 + index), draft: false,
      base: { ref: stage === "implementation" ? "main" : "brownfield-delivery/42" },
      head: { sha: "current-head", repo: { full_name: "example/repo" } },
      merge_commit_sha: merged ? "merge-sha" : null,
      user: { login: "copilot-swe-agent[bot]", type: "Bot" },
      auto_merge: { enabled_at: "today" },
      html_url: "https://github.com/example/repo/pull/77",
    };
    const state = {
      parent, pr, issues, calls: [], comments: [], prComments: [],
      reviews: [], statuses: [], branchExists: true, deleteFailure: null, reads: 0,
    };
    globalThis.fetch = async (url, options = {}) => {
      const u = new URL(url);
      const path = u.pathname;
      const method = options.method ?? "GET";
      const body = options.body ? JSON.parse(options.body) : undefined;
      state.calls.push({ path, method, body, options });
      if (path === "/repos/example/repo/pulls/77" && method === "GET") {
        state.reads += 1;
        state.onRead?.(state.reads);
        return jsonResponse(pr);
      }
      if (path === "/repos/example/repo/pulls/77" && method === "PATCH") {
        pr.base.ref = body.base;
        return jsonResponse(pr);
      }
      if (path === "/repos/example/repo/pulls/77/requested_reviewers") return jsonResponse({});
      if (path === "/repos/example/repo/pulls/77/reviews") return jsonResponse(state.reviews);
      if (path.startsWith("/repos/example/repo/statuses/")) {
        state.statuses.push({ sha: path.split("/").at(-1), ...body });
        return jsonResponse({});
      }
      if (path === "/graphql") {
        if (body.query.includes("DisableAutoMerge")) pr.auto_merge = null;
        else if (body.query.includes("EnableAutoMerge")) pr.auto_merge = { enabled_at: "now" };
        else throw new Error(`Unexpected GraphQL ${body.query}`);
        return jsonResponse({ data: {} });
      }
      if (path.endsWith("/parent")) return jsonResponse(parent);
      if (path === "/repos/example/repo/issues/42/sub_issues") return jsonResponse(issues);
      if (path === "/repos/example/repo") return jsonResponse({ default_branch: "main" });
      const issueNumber = path.match(/^\/repos\/example\/repo\/issues\/(\d+)$/)?.[1];
      if (issueNumber) {
        const issue = Number(issueNumber) === 42 ? parent : issues.find((item) => item.number === Number(issueNumber));
        if (method === "PATCH") Object.assign(issue, body);
        return jsonResponse(issue);
      }
      if (path === "/repos/example/repo/issues/42/comments" || path === "/repos/example/repo/issues/77/comments") {
        const comments = path.includes("/42/") ? state.comments : state.prComments;
        if (method === "GET") return jsonResponse(comments);
        const comment = { id: state.comments.length + state.prComments.length + 100, body: body.body };
        comments.push(comment);
        return jsonResponse(comment);
      }
      if (path.startsWith("/repos/example/repo/issues/comments/")) {
        const comment = [...state.comments, ...state.prComments].find((item) => item.id === Number(path.split("/").at(-1)));
        Object.assign(comment, body);
        return jsonResponse(comment);
      }
      if (path === "/repos/example/repo/git/refs/heads/brownfield-delivery/42") {
        if (state.deleteFailure) {
          const failure = state.deleteFailure;
          state.deleteFailure = null;
          return jsonResponse({ message: "Ref deletion failed" }, failure);
        }
        if (!state.branchExists) return jsonResponse({ message: "Reference does not exist" }, 422);
        state.branchExists = false;
        return jsonResponse(null, 204);
      }
      if (path === "/repos/example/repo/git/ref/heads/brownfield-delivery/42") {
        return state.branchExists ? jsonResponse({ object: { sha: "branch-sha" } }) :
          jsonResponse({ message: "Not Found" }, 404);
      }
      if (path === "/repos/example/repo/git/refs" && method === "POST") {
        state.branchExists = true;
        return jsonResponse({});
      }
      if (path === "/repos/example/repo/pulls") return jsonResponse([{ number: 77 }]);
      if (path === "/repos/example/repo/commits/signal-head/pulls") return jsonResponse([{ number: 77 }]);
      throw new Error(`Unexpected mock request: ${method} ${path}`);
    };
    writeEvent({ pull_request: structuredClone(pr) });
    return state;
  }

  function humanReview(id, state = "APPROVED", login = "huangyingting", commit_id = "current-head") {
    return { id, state, commit_id, user: { login, type: "User" } };
  }

  test("records required policy success on the live head, ignoring comment-only reviews", async () => {
    const state = lifecycleApi();
    state.pr.auto_merge = null;
    state.reviews = [humanReview(1), humanReview(2, "COMMENTED")];
    await review();
    assert.equal(state.statuses.at(-1).state, "success");
    assert.equal(state.statuses.at(-1).sha, "current-head");
    assert.equal(state.statuses.at(-1).context, "Brownfield delivery policy");
    assert.ok(state.pr.auto_merge);
    const enable = state.calls.find((call) => call.body?.query?.includes("EnableAutoMerge"));
    assert.equal(enable.options.headers.Authorization, "Bearer test-agent-token");
  });

  for (const [scenario, reviews, draft] of [
    ["dismissal", [humanReview(1, "DISMISSED")], false],
    ["changes requested then commented", [humanReview(1, "CHANGES_REQUESTED"), humanReview(2, "COMMENTED")], false],
    ["new head", [humanReview(1, "APPROVED", "huangyingting", "old-head")], false],
    ["unconfigured human", [humanReview(1, "APPROVED", "outsider")], false],
    ["draft conversion", [humanReview(1)], true],
  ]) {
    test(`revokes previously-enabled auto-merge for ${scenario}`, async () => {
      const state = lifecycleApi();
      state.reviews = reviews;
      state.pr.draft = draft;
      await review();
      assert.equal(state.pr.auto_merge, null);
      assert.equal(state.statuses.at(-1).state, "failure");
    });
  }

  test("invalid metadata and closed parents fail closed and revoke auto-merge", async () => {
    const state = lifecycleApi();
    state.pr.body = "Markers removed";
    await assert.rejects(review, /marker/);
    assert.equal(state.statuses.at(-1).state, "failure");
    assert.equal(state.pr.auto_merge, null);
    const closed = lifecycleApi({ parentState: "closed" });
    await assert.rejects(review, /Parent Intent is not open/);
    assert.equal(closed.pr.auto_merge, null);
  });

  test("never publishes success for a head changed while reviews are being evaluated", async () => {
    const state = lifecycleApi();
    state.reviews = [humanReview(1)];
    state.onRead = (count) => { if (count === 2) state.pr.head.sha = "new-head"; };
    await review();
    assert.equal(state.statuses.at(-1).sha, "new-head");
    assert.equal(state.statuses.at(-1).state, "pending");
    assert.equal(state.pr.auto_merge, null);
    assert.ok(state.statuses.every((status) => status.state !== "success"));
  });

  test("re-evaluates review signal from live GitHub data without downloading untrusted artifacts", async () => {
    const state = lifecycleApi();
    state.reviews = [humanReview(1, "DISMISSED")];
    writeEvent({ workflow_run: { event: "pull_request_review", head_sha: "signal-head", pull_requests: [] } });
    await coordinate();
    assert.equal(state.statuses.at(-1).state, "failure");
    assert.equal(state.pr.auto_merge, null);
    assert.equal(state.prComments.length, 1);
    assert.ok(state.calls.every((call) => !call.path.includes("artifact")));
  });

  test("registered lifecycle PRs cannot bypass policy or CI by removing all body markers", async () => {
    const state = lifecycleApi();
    state.pr.body = "No routing metadata";
    state.prComments = [{ id: 100, body: "<!-- brownfield-human-gated-delivery-policy -->" }];
    writeEvent({ pull_request: state.pr });
    await assert.rejects(coordinate, /marker/);
    assert.equal(state.statuses.at(-1).state, "failure");
    assert.equal(state.pr.auto_merge, null);
    const outputPath = join(import.meta.dirname, `.outputs-${process.pid}.txt`);
    temporaryFiles.push(outputPath);
    process.env.GITHUB_OUTPUT = outputPath;
    await assert.rejects(classify, /marker/);
  });

  test("ordinary PRs get a non-lifecycle policy result instead of a skipped required check", async () => {
    const state = lifecycleApi();
    state.pr.body = "Ordinary repository maintenance";
    state.pr.auto_merge = null;
    writeEvent({ pull_request: state.pr });
    await coordinate();
    assert.equal(state.statuses.at(-1).state, "success");
    assert.equal(state.pr.auto_merge, null);
    const outputPath = join(import.meta.dirname, `.outputs-${process.pid}.txt`);
    temporaryFiles.push(outputPath);
    process.env.GITHUB_OUTPUT = outputPath;
    await classify();
    assert.equal(readFileSync(outputPath, "utf8"), "lifecycle=false\n");
  });

  test("delivery success and branch cleanup are safe to rerun with a closed parent", async () => {
    const state = lifecycleApi({ merged: true });
    process.env.DELIVERY_SUCCESS = "true";
    await delivery();
    assert.equal(state.parent.state, "closed");
    assert.equal(state.branchExists, false);
    await delivery();
    assert.equal(state.comments.length, 2, "one progress comment and one updatable delivery receipt");
    assert.equal(state.parent.state, "closed");
  });

  test("cleanup retries after a real deletion failure rather than mistaking permissions for success", async () => {
    const state = lifecycleApi({ merged: true });
    process.env.DELIVERY_SUCCESS = "true";
    state.deleteFailure = 403;
    await assert.rejects(delivery, /403/);
    assert.equal(state.parent.state, "closed");
    assert.equal(state.branchExists, true);
    await delivery();
    assert.equal(state.branchExists, false);
  });

  test("a deletion 422 is not suppressed while the branch still exists", async () => {
    const state = lifecycleApi({ merged: true });
    process.env.DELIVERY_SUCCESS = "true";
    state.deleteFailure = 422;
    await assert.rejects(delivery, /422/);
    assert.equal(state.branchExists, true);
  });

  test("failed delivery retries reopen a closed parent and preserve remediation branch", async () => {
    const state = lifecycleApi({ merged: true, parentState: "closed" });
    process.env.DELIVERY_SUCCESS = "false";
    await assert.rejects(delivery, /Intent remains open/);
    await assert.rejects(delivery, /Intent remains open/);
    assert.equal(state.parent.state, "open");
    assert.equal(state.branchExists, true);
    assert.equal(state.comments.length, 2);
  });

  test("publish verification allows closed implementation parents only for explicit delivery retries", async () => {
    const state = lifecycleApi({ merged: true, parentState: "closed" });
    const outputPath = join(import.meta.dirname, `.outputs-${process.pid}.txt`);
    temporaryFiles.push(outputPath);
    process.env.GITHUB_OUTPUT = outputPath;
    await assert.rejects(verify, /Parent Intent is not open/);
    process.env.DELIVERY_RETRY = "true";
    await verify();
    state.pr.base.ref = "brownfield-delivery/42";
    writeEvent({ pull_request: state.pr });
    await assert.rejects(verify, /merged into the default branch/);
  });

  test("a failed rerun after successful cleanup restores the remediation branch", async () => {
    const state = lifecycleApi({ merged: true });
    process.env.DELIVERY_SUCCESS = "true";
    await delivery();
    process.env.DELIVERY_SUCCESS = "false";
    await assert.rejects(delivery, /Intent remains open/);
    assert.equal(state.parent.state, "open");
    assert.equal(state.branchExists, true);
    assert.deepEqual(state.calls.find((call) => call.path === "/repos/example/repo/git/refs").body, {
      ref: "refs/heads/brownfield-delivery/42", sha: "merge-sha",
    });
  });

  test("default-branch policy configuration changes re-evaluate open pull requests", async () => {
    const state = lifecycleApi();
    writeEvent({ ref: "refs/heads/main", repository: { default_branch: "main" } });
    await coordinate();
    assert.equal(state.statuses.at(-1).state, "failure");
    assert.equal(state.pr.auto_merge, null);
  });

test("enables protected auto-merge while policy is pending before publishing success", async () => {
  const state = lifecycleApi();
  state.pr.auto_merge = null;
  state.reviews = [humanReview(1)];
  const api = globalThis.fetch;
  globalThis.fetch = (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : null;
    if (body?.query?.includes("EnableAutoMerge")) {
      assert.equal(state.statuses.at(-1).state, "pending",
        "GitHub can reject auto-merge if the last required check already made the PR clean");
    }
    return api(url, options);
  };
  await review();
  const enableIndex = state.calls.findIndex((call) => call.body?.query?.includes("EnableAutoMerge"));
  const successIndex = state.calls.findIndex((call) => call.body?.state === "success");
  assert.ok(enableIndex >= 0 && successIndex > enableIndex);
  assert.equal(state.statuses.at(-1).state, "success");
  assert.ok(state.pr.auto_merge);
  assert.ok(state.calls.every((call) => !call.path.endsWith("/merge")));
});

function twoPullRequests() {
  const first = lifecycleApi();
  const firstFetch = globalThis.fetch;
  const second = lifecycleApi();
  second.pr.number = 88;
  second.pr.node_id = "PR_88";
  second.pr.head.sha = "second-head";
  const secondFetch = globalThis.fetch;
  let activeFetch = firstFetch;
  globalThis.fetch = (url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/repos/example/repo/pulls") {
      return Promise.resolve(jsonResponse([first.pr, second.pr]));
    }
    if (parsed.pathname.startsWith("/repos/example/repo/pulls/77")) activeFetch = firstFetch;
    if (parsed.pathname.startsWith("/repos/example/repo/pulls/88")) activeFetch = secondFetch;
    parsed.pathname = parsed.pathname.replace("/pulls/88", "/pulls/77").replace("/issues/88/", "/issues/77/");
    return activeFetch(parsed.href, options);
  };
  writeEvent({ pull_request: structuredClone(second.pr) });
  return { first, second };
}

test("a surviving event for another PR reconciles approvals missed by the serialized queue", async () => {
  const { first, second } = twoPullRequests();
  first.prComments = [{ id: 100, body: "<!-- brownfield-human-gated-delivery-policy -->" }];
  first.reviews = [humanReview(1, "DISMISSED")];
  second.reviews = [humanReview(1, "APPROVED", "huangyingting", "second-head")];
  await coordinate();
  assert.equal(first.statuses.at(-1).state, "failure");
  assert.equal(first.pr.auto_merge, null);
  assert.equal(second.statuses.at(-1).state, "success");
});

test("an invalid PR cannot abort reconciliation of other PRs after a queued event is replaced", async () => {
  const { first, second } = twoPullRequests();
  first.prComments = [{ id: 100, body: "<!-- brownfield-human-gated-delivery-policy -->" }];
  first.pr.body = "Removed lifecycle markers";
  second.reviews = [humanReview(1, "APPROVED", "huangyingting", "second-head")];
  await assert.rejects(coordinate, /marker/);
  assert.equal(first.statuses.at(-1).state, "failure");
  assert.equal(first.pr.auto_merge, null);
  assert.equal(second.statuses.at(-1).state, "success");
});

test("the surviving lifecycle event does not classify unrelated PRs using another PR's body", async () => {
  const { first, second } = twoPullRequests();
  first.pr.body = "Ordinary maintenance";
  second.reviews = [humanReview(1, "APPROVED", "huangyingting", "second-head")];
  await coordinate();
  assert.equal(first.statuses.at(-1).description, "Not a lifecycle pull request");
  assert.equal(second.statuses.at(-1).state, "success");
});

async function retargetTestBody() {
  process.env.GITHUB_REPOSITORY = "example/repo";
  process.env.GITHUB_TOKEN = "test-token";
  process.env.COPILOT_ASSIGN_TOKEN = "test-agent-token";
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname + new URL(url).search;
    calls.push({ path, options });
    if (path === "/repos/example/repo/issues/46") {
      return jsonResponse({
        number: 46,
        body: [
          "Delivery Demo: brownfield-human-gated-delivery",
          "Delivery Intent: #42",
          "Delivery Stage: implementation",
          "Delivery Stage Issue: #46",
        ].join("\n"),
        labels: [{ name: "brownfield-human-gated-delivery:implementation" }],
        assignees: [{ login: "copilot-swe-agent[bot]" }],
      });
    }
    if (path === "/repos/example/repo/issues/46/parent") {
      return jsonResponse({
        number: 42,
        state: "open",
        labels: [{ name: "brownfield-human-gated-delivery:intent" }],
      });
    }
    if (path === "/repos/example/repo") {
      return jsonResponse({ default_branch: "main" });
    }
    if (
      path === "/repos/example/repo/pulls/77" &&
      options.method === "PATCH"
    ) {
      return jsonResponse({ number: 77, base: { ref: "main" } });
    }
    if (path === "/repos/example/repo/pulls/77/requested_reviewers") {
      return jsonResponse({ users: [{ login: "huangyingting" }], teams: [] });
    }
    if (path.startsWith("/repos/example/repo/issues/42/sub_issues?")) {
      return jsonResponse([
        {
          number: 43,
          state: "closed",
          body: "Delivery Stage: spec",
          html_url: "https://github.com/example/repo/issues/43",
          assignees: [],
        },
        {
          number: 44,
          state: "closed",
          body: "Delivery Stage: plan",
          html_url: "https://github.com/example/repo/issues/44",
          assignees: [],
        },
        {
          number: 45,
          state: "closed",
          body: "Delivery Stage: tests",
          html_url: "https://github.com/example/repo/issues/45",
          assignees: [],
        },
        {
          number: 46,
          state: "open",
          body: "Delivery Stage: implementation",
          html_url: "https://github.com/example/repo/issues/46",
          assignees: [],
        },
      ]);
    }
    if (path.startsWith("/repos/example/repo/issues/42/comments?")) {
      return jsonResponse([]);
    }
    if (path === "/repos/example/repo/issues/42/comments") {
      return jsonResponse({ id: 100 });
    }
    throw new Error(`Unexpected GitHub request: ${options.method ?? "GET"} ${path}`);
  };

  await intake();

  const retarget = calls.find((call) =>
    call.path === "/repos/example/repo/pulls/77" &&
    call.options.method === "PATCH");
  assert.deepEqual(JSON.parse(retarget.options.body), { base: "main" });
  assert.equal(retarget.options.headers.Authorization, "Bearer test-agent-token");
  const reviewers = calls.find((call) =>
    call.path === "/repos/example/repo/pulls/77/requested_reviewers");
  assert.deepEqual(JSON.parse(reviewers.options.body), {
    reviewers: ["huangyingting"],
    team_reviewers: [],
  });
}
