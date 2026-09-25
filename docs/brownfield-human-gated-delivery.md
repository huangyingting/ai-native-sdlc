# Brownfield Human-Gated Delivery demo

This demo safely evolves the existing IT service desk from a user Intent into
a reviewed specification, implementation plan, executable tests, working
increment, and verified container image.

```text
Intent -> Spec review -> Plan review -> TDD Red review
       -> Implementation Green review -> Build -> Smoke test -> Feedback
```

Every design and code transition requires a Human approval in the GitHub Web
UI. GitHub Actions assigns reviewers and advances approved stages; Copilot
never approves its own work or bypasses branch rules.

## Lifecycle

```mermaid
sequenceDiagram
    actor User
    participant Issue as Intent Issue
    participant Actions
    participant Copilot as Copilot Coding Agent
    actor Reviewer as Human Reviewer
    participant GHCR

    User->>Issue: Submit Intent form
    Actions->>Issue: Create lifecycle branch and 4 sub-issues
    Actions->>Copilot: Assign Spec stage
    Copilot->>Reviewer: Open Spec PR
    Reviewer-->>Copilot: Request changes or Approve
    Actions->>Copilot: Merge and assign Plan stage
    Copilot->>Reviewer: Open Plan PR
    Reviewer-->>Copilot: Request changes or Approve
    Actions->>Copilot: Merge and assign TDD Tests stage
    Copilot->>Reviewer: Open Tests PR with controlled Red
    Reviewer-->>Copilot: Request changes or Approve
    Actions->>Copilot: Merge and assign Implementation stage
    Copilot->>Reviewer: Open final PR with Green tests
    Reviewer-->>Copilot: Request changes or Approve
    Actions->>GHCR: Merge, build, and publish digest
    Actions->>Issue: Smoke evidence and close Intent
```

The workflow creates `brownfield-delivery/<intent-number>` from `main`. Spec,
Plan, and Tests PRs merge into that lifecycle branch. The Implementation PR
starts from the lifecycle branch and is automatically retargeted to `main`, so
the final PR contains the complete reviewed increment.

## Review artifacts

Each lifecycle stores:

```text
docs/delivery-runs/brownfield-human-gated-delivery/<intent-number>/
  spec.md
  plan.md
  expected-failures.json
```

- `spec.md` contains scope, non-goals, constraints, and stable Given/When/Then
  scenarios such as `AC-1`.
- `plan.md` decomposes the work into stable task IDs, dependencies, affected
  surfaces, validation, and acceptance mappings.
- `expected-failures.json` lists the exact executable tests expected to be Red
  before implementation.

These files are versioned evidence. Later stages may consume them but cannot
silently rewrite an artifact that a Human already approved.
Implementation also preserves every approved test file's Git blob from the
lifecycle branch. Add additional tests in **new files**; do not edit, delete,
rename, or weaken approved tests, even if their test names remain unchanged.

## One-time repository setup

### Enable GitHub features

Enable:

- Copilot Coding Agent;
- Issues and sub-issues;
- pull-request auto-merge;
- GitHub Actions;
- GitHub Packages and GHCR;
- automatic Copilot code review, if available for the repository plan.

Create the `it-service-desk-demo` Environment. It records the final temporary
container verification; it is not a persistent hosting environment.

### Create the Intent label

Create `brownfield-human-gated-delivery:intent` before using the Issue form.
The kickoff workflow creates the internal stage labels automatically.

### Configure the Copilot token

Create a fine-grained user PAT or GitHub App user-to-server token named
`COPILOT_ASSIGN_TOKEN`. GitHub's Copilot assignment API does not accept the
default server-to-server `GITHUB_TOKEN`.

The fine-grained token needs:

- metadata: read;
- actions: read and write;
- contents: read and write;
- issues: read and write;
- pull requests: read and write;
- organization members: read, when configuring organization teams.

The token is used only by trusted default-branch workflows to assign Copilot,
retarget implementation PRs, and enable or revoke protected auto-merge. Retargeting
uses this token rather than `GITHUB_TOKEN`, whose edits suppress the
`pull_request: edited` event needed to validate the new base. The token is never exposed to PR-head workflows.
Human review in GitHub Web does not require this token.

### Configure Human reviewers

Edit
[`config.json`](../.github/brownfield-human-gated-delivery/config.json):

```json
{
  "stages": {
    "spec": {
      "minimumApprovals": 1,
      "reviewers": {
        "users": ["huangyingting"],
        "teams": []
      }
    }
  }
}
```

Each stage supports GitHub user logins, organization team slugs, and its own
approval threshold. The checked-in default assigns `huangyingting` and
requires one approval for Spec, Plan, Tests, and Implementation.

Configuration is loaded from the default branch. A pull request cannot assign
friendlier reviewers or reduce its own approval threshold.
Approvals must be from configured users or current configured team members, on
the current head SHA, and not from the PR author or bots. Comment-only and pending
reviews do not replace the last decisive review. Dismissals invalidate approvals;
configured reviewers' outstanding change requests block the policy.
Team membership is read with `COPILOT_ASSIGN_TOKEN`, not the repository-scoped
`GITHUB_TOKEN`; ensure it can read the configured organization teams.

### Configure branch rulesets

Create active rulesets for `brownfield-delivery/**` and `main`.

For both:

1. Require a pull request.
2. Require at least one approving review as the repository floor.
3. Dismiss stale approvals when new commits are pushed.
4. Require conversation resolution.
5. Block force pushes.
6. Require the branch to be up to date before merging.
7. Do not grant Copilot a bypass.

Block deletion of `main`. Allow deletion of `brownfield-delivery/**` so
successful delivery can remove its temporary lifecycle branch.

For **both** `brownfield-delivery/**` and `main`, require:

- **`Brownfield delivery policy`** — the exact commit-status context written
  by the trusted PR Coordinator; select GitHub Actions as the expected source.
- **`stage-validation`** — the aggregate **Brownfield Delivery · Stage CI** job.

Do not substitute the coordinator workflow's successful job conclusion for its
policy status. A coordinator can complete successfully while reporting
insufficient approvals. Likewise, do not rely solely on the individually routed
`artifact-gate`, `tdd-red`, or `implementation-contract` jobs: skipped jobs are
not evidence that the applicable stage passed. The aggregate fails if metadata
classification fails or the selected stage does not succeed.

For `main`, require:

- both required status/check names above;
- `validate`;
- `container-smoke`.

The native review rule enforces a common floor, **not** the configured reviewer
identities or higher stage thresholds. The required policy status prevents that
weaker floor from authorizing a manual or automatic merge on its own. Do not grant
humans or automation a ruleset bypass for this demo.

The coordinator writes pending/failure/success on the current head and revokes
existing auto-merge whenever review policy is no longer satisfied. When approvals
are satisfied, it enables protected auto-merge while the required policy status
is still pending, then publishes success; it never directly merges or bypasses
branch rules. It re-reads
live PR metadata and reviews on open/reopen, head synchronization, body/base edits,
draft transitions, submitted/edited/dismissed reviews, stage-CI completion, and
default-branch policy configuration changes. These are asynchronous GitHub events;
keep native stale-review dismissal and up-to-date branch requirements enabled.
Coordinator runs are serialized, and **every surviving run reconciles all open
PRs** because GitHub can replace pending runs in a concurrency group. An invalid
PR is failed and its auto-merge revoked without preventing other PRs from being
reconciled; the run reports accumulated failures only after processing the list.
Ordinary non-lifecycle PRs receive a not-applicable success. Lifecycle registration
is retained in a PR comment, so deleting body markers instead fails validation.
Do not delete that registration comment.

## Run the demo

### 1. Submit an Intent

Open **Issues > New issue**, choose
**Brownfield human-gated delivery: Submit an intent**, and describe:

- the problem or opportunity;
- the users and stakeholders;
- the desired observable outcome;
- constraints and non-goals;
- success signals.

Do not write the implementation plan. Only Issues created by an `OWNER`,
`MEMBER`, or `COLLABORATOR` can start automation.

The **Brownfield Delivery · Kickoff** workflow creates:

- `brownfield-delivery/<intent-number>`;
- Spec, Plan, TDD Tests, and Implementation sub-issues;
- one progress comment on the parent Intent;
- the initial Copilot Spec assignment.

### 2. Review the Spec

Copilot changes only
`docs/delivery-runs/brownfield-human-gated-delivery/<intent>/spec.md`. CI
checks the required sections, stable acceptance IDs, and Given/When/Then
behavior.

In GitHub Web:

1. Inspect scope, non-goals, edge cases, and acceptance scenarios.
2. Use **Request changes** when behavior is ambiguous or incomplete.
3. Ask Copilot to address the comments.
4. Use **Approve** only when the behavioral contract is acceptable.

After the configured Human approvals and checks are satisfied, GitHub
auto-merges the PR and the workflow assigns the Plan stage.

### 3. Review the Plan

Copilot changes only
`docs/delivery-runs/brownfield-human-gated-delivery/<intent>/plan.md`. CI
verifies:

- every acceptance scenario maps to tasks;
- task IDs and dependencies are valid and acyclic;
- affected surfaces and validation are explicit.

Review feasibility, sequencing, migration risk, and unnecessary complexity.
Approve or request changes through the same GitHub Web review flow.

### 4. Review TDD Red

Copilot adds executable tests and `expected-failures.json` without changing
production code.

The Red gate succeeds only when:

1. the lifecycle base test suite is Green;
2. head lint, type-check, and build succeed;
3. the new tests execute and fail;
4. observed failures match the manifest exactly;
5. there are no unrelated, syntax, environment, or infrastructure failures.

Validation checks the full Vitest 5 JSON report, including failed suites with
no assertions. A companion reporter records unhandled errors and nested hook
errors omitted by Vitest's JSON reporter. Missing, malformed, interrupted, or
inconsistent evidence, duplicate expected test names, and skipped expected tests
are rejected. Scope checks use the PR merge-base diff with rename detection
disabled, so renamed files cannot hide an out-of-scope deletion.

The Actions Job Summary records the exact Red evidence. The Human reviews the
assertions and their mapping to the approved acceptance scenarios, then
Approves or Requests changes.

### 5. Review Implementation Green

Copilot implements the approved task plan without modifying the approved Spec,
Plan, expected-failure contract, or approved test blobs. Automation retargets
this PR to `main`. New test files are allowed alongside implementation changes.

Required checks prove:

- every expected Red test is now Green;
- all existing tests pass;
- lint and production build pass;
- the production container builds;
- `/api/health` and the dashboard smoke test pass.

The Human performs the final code and behavior review. Approval enables
auto-merge only after every required check is Green.

### 6. Observe delivery

The **Brownfield Delivery · Publish** workflow:

1. validates that the merged PR is the lifecycle Implementation stage;
2. builds the merged commit;
3. publishes its SHA tag and immutable digest to GHCR;
4. runs that exact digest in the `it-service-desk-demo` Environment;
5. verifies `/api/health` and the dashboard's stable
   `data-testid="service-desk-dashboard"` marker;
6. writes the digest and Actions run link to the parent Intent.

Success closes the Implementation sub-issue and parent Intent, then deletes
the lifecycle branch. Failure keeps or reopens the Intent and retains the
branch for diagnosis and remediation.
Result comments are updated rather than duplicated on reruns. Closed parents are
allowed only for merged default-branch implementation delivery verification and
reporting; other lifecycle operations retain the open-parent guard. Cleanup can
retry after closing the parent, and an already-absent branch counts as success.
Real deletion errors still fail the job. A failed rerun after successful cleanup
reopens the Intent and restores a remediation branch at the merged commit.

## Recovery and retries

- Re-run **Brownfield Delivery · Kickoff** with an existing Intent number when
  kickoff is interrupted. Branch, sub-issue, comment, and assignment
  operations are idempotent.
- For a failed stage check or requested change, leave PR review comments and
  let Copilot push a correction to the same stage PR. Stale approvals are
  dismissed and Human Review is requested again.
- For delivery infrastructure failures, use GitHub's **Re-run failed jobs**.
  For a code defect discovered after merge, keep the Intent open and submit a
  new remediation Intent; the retained lifecycle branch preserves evidence for
  diagnosis.

## Workflow security

- `pull_request` CI executes PR code with read-only permissions and no secrets.
- `pull_request_target` workflows coordinate APIs only and never checkout the
  PR head.
- Review events run a permissionless **Review Signal** workflow. Its completion
  invokes the default-branch coordinator via `workflow_run`; the coordinator
  re-reads all open PRs and their current reviews using live API data, never artifacts or code from
  the signal run. Stage-CI completion uses the same trusted path. Install both
  workflows on the default branch before enabling the required policy status.
- Reviewer policy always comes from `main`.
- Copilot and bot reviews never satisfy Human approval counts.
- Closing keywords are forbidden in stage PRs; lifecycle automation owns Issue
  completion.
- Kickoff and transition operations are idempotent so retries do not duplicate
  stage Issues or assignments.

## Local verification

```sh
node --test .github/brownfield-human-gated-delivery/tests/core.test.mjs .github/brownfield-human-gated-delivery/tests/github.test.mjs
npm test
npm --prefix demos/it-service-desk test
npm --prefix demos/it-service-desk run lint
npm --prefix demos/it-service-desk run build
docker build -t it-service-desk:local demos/it-service-desk
docker run --rm -p 3000:3000 it-service-desk:local
```

Then check <http://localhost:3000/api/health> and
<http://localhost:3000/>.

This write-enabled Coding Agent lifecycle is separate from the repository's
read-only
[Copilot CLI orchestration demonstrations](./copilot-cli-agent-orchestration-patterns.md).

## References

- [Using Copilot cloud agent via the API](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-via-the-api)
- [Requesting pull-request reviewers](https://docs.github.com/en/rest/pulls/review-requests)
- [GitHub sub-issues API](https://docs.github.com/en/rest/issues/sub-issues)
- [Managing auto-merge](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-auto-merge-for-pull-requests-in-your-repository)
- [Creating repository rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)
- [Publishing Docker images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)
