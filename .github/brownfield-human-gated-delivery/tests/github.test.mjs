import { afterEach, test } from "node:test";
import { strict as assert } from "node:assert";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { intake, kickoff } from "../scripts/github.mjs";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const temporaryFiles = [];

function writeEvent(event) {
  const path = join(
    tmpdir(),
    `brownfield-delivery-event-${process.pid}-${temporaryFiles.length}.json`,
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
  globalThis.fetch = originalFetch;
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
      user: { login: "copilot-swe-agent[bot]" },
      html_url: "https://github.com/example/repo/pull/77",
    },
  });
  process.env.GITHUB_REPOSITORY = "example/repo";
  process.env.GITHUB_TOKEN = "test-token";
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
  const reviewers = calls.find((call) =>
    call.path === "/repos/example/repo/pulls/77/requested_reviewers");
  assert.deepEqual(JSON.parse(reviewers.options.body), {
    reviewers: ["huangyingting"],
    team_reviewers: [],
  });
});
