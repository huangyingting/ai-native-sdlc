# Brownfield Human-Gated Delivery demo

For a hands-on session, follow the
[step-by-step walkthrough](./brownfield-human-gated-delivery-walkthrough.md).
This page is the setup, policy, and implementation reference.

This demo safely evolves the existing IT service desk from a human-authored Intent into
a reviewed specification, implementation plan, executable tests, working
increment, and verified container image.

```text
Human Intent -> AI Spec <-> Human review and revision
             -> AI Plan <-> Human review and revision
             -> TDD Red review -> Implementation Green review
             -> Build -> Smoke test -> Feedback
```

Every design and code transition requires a Human approval in the GitHub Web
UI. GitHub Actions assigns reviewers and advances approved stages; Copilot
never approves its own work or bypasses branch rules.
The Human writes the Intent in a GitHub Issue; there is no AI-written Intent
stage or additional Intent approval gate. AI writes the Spec and Plan, and each
can be revised in its own PR as many times as needed before Human approval.

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
    loop Spec feedback and revision as needed
        Reviewer-->>Copilot: Request changes and @copilot feedback
        Copilot->>Reviewer: Revise same Spec PR for re-review
    end
    Reviewer->>Actions: Approve latest Spec revision
    Actions->>Copilot: Merge and assign Plan stage
    Copilot->>Reviewer: Open Plan PR
    loop Plan feedback and revision as needed
        Reviewer-->>Copilot: Request changes and @copilot feedback
        Copilot->>Reviewer: Revise same Plan PR for re-review
    end
    Reviewer->>Actions: Approve latest Plan revision
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

Spec and Plan each have a separate document-review PR. Their titles identify
the Intent and say **Spec review** or **Plan review**. The coordinator normalizes
these titles without rewriting the agent's summary or the review discussion.

Their PR descriptions include **Summary**, **Review document**, **Open
questions**, and **Review checklist** sections. The agent keeps the document
link pinned to the current PR commit and summarizes changes for each review
round. Checklists are reminders, not approval controls: checking every box
does not satisfy the Human gate.

Use the parent Intent's progress comment as the hub. The active Spec or Plan
row links to both its PR and the rendered **Read document** snapshot. The
coordinator refreshes that commit-pinned link as revisions are reconciled.
Return to the PR's **Files changed** tab to leave inline feedback or submit
the formal review; the rendered document page itself is not an approval UI.

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

### Run the setup script

Use the dependency-free
[`setup.mjs`](../.github/brownfield-human-gated-delivery/scripts/setup.mjs)
from the repository root. It targets GitHub.com and requires Node.js 24+, GitHub
CLI (`gh`), and an authenticated **repository administrator**. No root `npm
install` is needed. The existing demo automation and application must already
be on `main`, which must be the default branch; setup does not publish local
code or change branch names.

```sh
gh auth login --hostname github.com

# Read-only preview, including configured reviewers and missing prerequisites.
npm run setup:brownfield -- --repo huangyingting/ai-native-sdlc

# Apply missing settings, then read them back to verify.
npm run setup:brownfield -- --repo huangyingting/ai-native-sdlc --apply
```

Replace `huangyingting/ai-native-sdlc` with your repository when using a fork.
The explicit repository argument prevents accidental changes to another remote.
The administrator's CLI credential needs permission to manage repository
settings/rulesets, Actions settings/secrets, Environments, and Issues. This is
**separate from** the limited automation PAT below; do not give that PAT
administration access just to run setup.

The script:

- verifies the configuration, issue form, prompts, validators, workflows, and
  application manifests/Dockerfile exist on `main`;
- enables Issues, auto-merge, the configured merge method, and GitHub Actions;
- enables disabled delivery workflows and IT service desk CI, leaving unrelated
  workflows alone;
- creates the Intent label and temporary verification Environment if missing;
- creates the two named rulesets described below, binding required checks to
  the verified GitHub Actions app identity, with no bypass actors;
- checks individual Human reviewers have repository write access, checks for
  an assignable Copilot Bot, and checks the automation secret **name**, never
  its stored value.

Existing rulesets and Environment protections are never overwritten. Compliant,
stronger rules are preserved. Conflicts in the named rulesets stop setup before
any writes; resolve those conflicts in GitHub settings and rerun. Other or
inherited rulesets and classic branch protection may impose additional checks
or prevent lifecycle-branch creation/deletion; inspect those manually. Setup
does not grant bypasses or relax organization policies.

To create or replace the automation secret, first create the PAT using
[the permissions below](#configure-the-copilot-token), then use an interactive
terminal:

```sh
npm run setup:brownfield -- --repo huangyingting/ai-native-sdlc --apply --set-token
```

GitHub CLI prompts securely for the value. Do not put the token in command-line
arguments, files, or chat. Without `--set-token`, an existing secret is untouched.
Secret presence cannot verify its permissions, expiration, selected repository,
or Copilot entitlement.

To repair an already-created Intent's missing label:

```sh
npm run setup:brownfield -- --repo huangyingting/ai-native-sdlc --apply --intent 7
```

This requires an open Issue from an authorized author. It only adds the label;
it does **not** dispatch kickoff. The script prints the explicit resume command
for after setup and manual checks.

Exit codes: **0** means automated checks passed (manual checks still apply),
**2** means previewed changes or unresolved checks remain, and **1** means an
error/conflict. Changes are not transactional: if GitHub rejects a later write,
earlier successful changes remain. Fix the reported error and rerun; resources
are not duplicated, secrets are not rotated implicitly, and applied settings
are read back before success is reported.

Manual steps still include account/organization Copilot access and billing,
PAT creation/authorization, sub-issue availability, GHCR package publication
permissions, and optional automatic Copilot review. Restricted Actions
allowlists and team-based reviewer policies are reported as unverified (exit
2); the script does not expand the allowlist or claim to have validated team
membership using the secret. Configure the intended Human reviewers through a
reviewed change to `main`; setup never changes reviewer identities. Local
application installation is optional and covered by the walkthrough.

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
GitHub does not create a missing label from an Issue form: the Issue can be
submitted without it, and kickoff is then skipped. To recover, create the label,
apply it to the existing Intent, and manually run **Brownfield Delivery ·
Kickoff** with that Issue number after completing the remaining setup. Adding
the label alone does not trigger kickoff.

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
The Intent author is not implicitly an approver. To make an end user's approval
mandatory for Spec and Plan in this demo, configure that user's GitHub login
as the sole reviewer for those stages with `minimumApprovals: 1`. With a larger
reviewer pool, the threshold can be satisfied by any eligible members of that
pool; it does not require one particular person.

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
For the lifecycle-branch ruleset's required status checks, enable
`do_not_enforce_on_create` (do not require status checks on branch creation).
Kickoff must be able to create the initial lifecycle branch from `main` before
any stage PR exists. Subsequent updates and merges still require the checks.
Do not add a rule restricting creation of lifecycle branches.

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

The IT service desk CI workflow runs for every PR, without PR-level path filters,
so these required checks also exist for unrelated documentation or tooling PRs.
On lifecycle branches, Spec and Plan skip the application `validate` and
`container-smoke` jobs: their stage CI validates documents and scope, not
application code. Tests also skip normal Green CI and use the dedicated
controlled-Red validation instead.
PRs targeting the default branch always run the real Green checks, even if their
body contains `Delivery Stage: tests` as prose.

| Stage | Automated validation | Human gate |
|---|---|---|
| Spec | Specification structure, acceptance scenarios, and allowed file scope; no application build | Review and approve the latest Spec |
| Plan | Task/dependency structure, acceptance mappings, and allowed file scope; no application build | Review and approve the latest Plan |
| TDD Tests | Green baseline, compilable test changes, and exact controlled-Red evidence | Review and approve tests |
| Implementation | Immutable contracts, Green tests, lint, build, and container smoke checks | Review and approve implementation |

The native review rule enforces a common floor, **not** the configured reviewer
identities or higher stage thresholds. The required policy status prevents that
weaker floor from authorizing a manual or automatic merge on its own. Do not grant
humans or automation a ruleset bypass for this demo.

The coordinator writes pending/failure/success on the current head and revokes
existing auto-merge whenever review policy is no longer satisfied. When approvals
are satisfied, it enables protected auto-merge while the required policy status
is still pending, then publishes success; it never directly merges or bypasses
branch rules. It re-reads
live PR metadata and reviews on open/reopen/close, head synchronization, body/base edits,
draft transitions, submitted/edited/dismissed reviews, stage-CI completion, and
default-branch policy configuration changes. These are asynchronous GitHub events;
keep native stale-review dismissal and up-to-date branch requirements enabled.
Coordinator runs are serialized, and **every surviving run reconciles all open
PRs** because GitHub can replace pending runs in a concurrency group. An invalid
PR is failed and its auto-merge revoked without preventing other PRs from being
reconciled; the run reports accumulated failures only after processing the list.
Commit statuses are keyed by **SHA and context**, not PR number. The coordinator
keeps one aggregate `Brownfield delivery policy` status pending until it has
evaluated **every open PR sharing that SHA**. All applicable lifecycle policies
must pass before success; an ordinary PR cannot overwrite a sibling's failure.
All protected auto-merge requests for an approved shared head are enabled while
the aggregate remains pending. A failed decision or mutation revokes auto-merge
for that shared-head group. Unrelated heads are still reconciled independently.
Closing a blocking duplicate PR triggers reconciliation of the remaining peers.
Ordinary non-lifecycle PRs receive a not-applicable success only when no lifecycle
policy on their shared head blocks it. Lifecycle registration
is retained in a PR comment, so deleting body markers instead fails validation.
Do not delete that registration comment.

## Run the demo

### 1. Submit an Intent

Open **Issues > New issue**, choose
**Brownfield human-gated delivery: Submit an intent**. The title and all five
fields are prefilled with an example intent: **Clarify ticket ownership** in
the existing IT service desk. These are editable values, not
placeholder hints, so they are included in the submitted Issue.

The Human reviews or edits the defaults and clicks **Create**. The Intent
describes unclear ownership and handoffs, the desired improvement, affected
users and systems, and constraints. It leaves assignment rules, owner selection,
and filtering as open questions for Spec review rather than dictating the
solution. Detailed acceptance scenarios belong in the Spec; test, build, and
smoke checks are delivery policy, not business intent.

For a different feature, replace the title and all five fields:

- the problem or opportunity;
- the proposed outcome;
- affected users and systems;
- constraints and non-goals;
- open questions.

Do not write the implementation plan. Only Issues created by an `OWNER`,
`MEMBER`, or `COLLABORATOR` can start automation. Complete the
[one-time repository setup](#one-time-repository-setup) first; the prefilled
form does not configure tokens, reviewers, or branch rules. GitHub uses the
Issue form from the default branch, so template changes must be merged there
before they appear under **New issue**.

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
Copilot must identify unanswered Intent questions and label proposed decisions
for review rather than presenting them as agreed requirements.

In GitHub Web:

1. Follow **Read document** from the Intent's progress comment, or use the PR's
   **Review document** link. Inspect scope, non-goals, edge cases, acceptance
   scenarios, and the **Open questions** and **Review checklist** sections.
   Return to **Files changed** on the PR to leave review feedback.
2. Add inline feedback and submit **Request changes** when behavior is
   ambiguous or incomplete.
3. Post an `@copilot` comment on that PR, for example:

   > @copilot Address the submitted review feedback in this same PR. Update
   > only the specification, summarize the changes and remaining questions,
   > and wait for my re-review. Do not start the Plan stage.

4. Review the new commits and repeat steps 2-3 as many times as needed.
5. When no decisions remain unresolved and the behavioral contract is
   acceptable, ensure the PR is ready for review rather than draft, then
   submit **Approve** on the latest revision.

After the configured Human approvals and checks are satisfied, GitHub
auto-merges the PR and the workflow assigns the Plan stage.

#### Rules for every review round

- Keep the same PR, branch, and stage Issue throughout the current stage's
  iterations. Do not create another lifecycle for each feedback round.
- The coordinator enforces approval policy; a Human's `@copilot` request drives
  revisions. It does not launch an autonomous revision loop from every comment.
- There is no fixed round limit and no timeout that grants approval. Missing
  approval, outstanding change requests, or a draft PR keep the gate blocked.
- New commits invalidate previous-head approvals. Re-review and approve the
  latest revision, even if an earlier one was approved.
- Comments such as "looks good," resolved threads, and passing CI do not
  substitute for a formal approving review.
- Approval enables protected auto-merge; it does not start the next stage
  until required checks pass and the PR actually merges. Closing a PR without
  merging does not advance the lifecycle.
- Existing Issues without an Open questions field remain valid; no migration
  of earlier human-authored Intents is required.

### 3. Review the Plan

Copilot changes only
`docs/delivery-runs/brownfield-human-gated-delivery/<intent>/plan.md`. CI
verifies:

- every acceptance scenario maps to tasks;
- task IDs and dependencies are valid and acyclic;
- affected surfaces and validation are explicit.

Review feasibility, sequencing, migration risk, unnecessary complexity, and
coverage of the approved Spec. Use the same iterative review flow:

> @copilot Address the submitted review feedback in this same PR. Update only
> the implementation plan, preserve the approved specification, summarize the
> changes and remaining questions, and wait for my re-review. Do not start TDD
> or implementation.

Repeat until the configured Human reviewers approve the latest Plan revision.
Only after required checks pass and the Plan PR merges does the workflow assign
TDD Tests. The revision loop covers the current, unmerged stage. If planning
reveals a conflict with the approved Spec, stop and flag it rather than silently
rewriting that artifact; automatic rollback to an already completed stage is
not part of this demo.

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
no assertions. A companion reporter records unhandled errors and nested suite
errors omitted by Vitest's JSON reporter. It also tracks Vitest's public
`onHookStart`/`onHookEnd` callbacks: failed or incomplete `beforeEach`/`afterEach`
hooks leave unmatched starts and are rejected even when an expected test name is
reported as failing. Passing hooks around a genuine assertion failure remain
valid Red. Missing, malformed, interrupted, or
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
- Stage CI checks out PR artifacts into `pr/` and a separate trusted copy into
  `trusted/`. Validators, reviewer configuration, and the companion reporter are
  selected from one default-branch SHA pinned by classification, never from the
  PR head. Trusted validators load configuration relative to their own source;
  their working directory still points at the PR artifacts under validation.
- `pull_request_target` workflows coordinate APIs only and never checkout the
  PR head.
- Before policy success, the trusted coordinator independently enumerates REST
  PR files and enforces stage boundaries, including `previous_filename` for
  renames. A lifecycle PR cannot change its validator or workflow to bypass CI.
  Incomplete file enumeration (including GitHub's file-list limit), malformed
  rename records, or API failures fail closed. Head, base, and metadata snapshots
  are refreshed before publishing policy success; changed snapshots stay pending.
- Review events run a permissionless **Review Signal** workflow. Its completion
  invokes the default-branch coordinator via `workflow_run`; the coordinator
  re-reads all open PRs and their current reviews using live API data, never artifacts or code from
  the signal run. Stage-CI completion uses the same trusted path. Install both
  workflows on the default branch before enabling the required policy status.
- Reviewer policy always comes from `main`.
- Copilot and bot reviews never satisfy Human approval counts.
- Closing keywords are forbidden in stage PRs; lifecycle automation owns Issue
  completion.
- GitHub can append a `START COPILOT CODING AGENT SUFFIX` block containing
  `Fixes #<stage-issue>` despite the prompt. The trusted coordinator changes
  only that recognized trailing reference to `References #<stage-issue>` after
  validating the Copilot bot author and stage context. It uses the user token
  to trigger body-edited CI and leaves policy pending until the updated PR is
  reconciled. Other closing references, including parent, unrelated, and
  cross-repository Issues, remain rejected.
- Copilot identity checks accept the current REST `Copilot` bot and legacy
  `copilot-swe-agent` bot names. They require a Bot actor type, not a matching
  substring in an arbitrary user's login.
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

The lifecycle suite includes real Vitest reporter fixtures for passing hooks,
controlled assertion Red, failed setup, and failed teardown. These subprocess
tests use the demo's installed Vitest dependency; if it is absent, they explicitly
skip until `npm --prefix demos/it-service-desk ci` has been run. Generated reports
and caches are isolated inside the test scratch directory and removed afterward.

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
