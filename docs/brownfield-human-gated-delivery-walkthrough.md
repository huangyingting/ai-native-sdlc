# AI-native SDLC brownfield demo: step-by-step walkthrough

Use this guide to demonstrate a complete, human-gated feature delivery cycle
against the existing IT service desk. All lifecycle decisions happen in GitHub
Web; running the application locally is optional.

The example starts with **unclear ticket ownership**. The Human writes the
Intent, AI proposes the Spec and Plan, and the Human can request as many
revisions as needed before approving the next stage.

```text
Human Intent
  -> AI Spec <-> Human feedback and revision
  -> AI Plan <-> Human feedback and revision
  -> AI tests: controlled Red -> Human approval
  -> AI implementation: Green -> Human approval
  -> Merge -> Publish image -> Smoke verification -> Close Intent
```

This walkthrough describes the repository's implemented workflow. Use the
[setup and policy reference](./brownfield-human-gated-delivery.md) for configuration
details. It is separate from the read-only Copilot CLI orchestration demos.

## 1. Prepare the repository

Complete the [one-time setup](./brownfield-human-gated-delivery.md#one-time-repository-setup)
before the live session.

With Node.js 24+ and GitHub CLI authenticated as a repository administrator,
preview and apply the supported prerequisites from the repository root:

```sh
npm run setup:brownfield -- --repo huangyingting/ai-native-sdlc
npm run setup:brownfield -- --repo huangyingting/ai-native-sdlc --apply
```

Use `--apply --set-token` for secure interactive token entry, or
`--apply --intent 7` to repair the label on an existing Intent. Setup does not
start kickoff, publish local changes, or replace existing protections.
See [setup script details](./brownfield-human-gated-delivery.md#run-the-setup-script)
for permissions, exit codes, and manual checks. No root dependencies need to
be installed.

| Check | Where to verify in GitHub |
|---|---|
| Current issue forms, prompts, and workflows are on the default branch | **Code**; the demo workflows assume `main` |
| Copilot Coding Agent is available and allowed to work in this repository | Repository/organization Copilot settings |
| Issues, sub-issues, Actions, and Packages are available | Repository tabs and settings |
| Pull-request auto-merge is enabled | **Settings > General > Pull Requests** |
| `brownfield-human-gated-delivery:intent` exists | **Issues > Labels** |
| `COPILOT_ASSIGN_TOKEN` is configured | **Settings > Secrets and variables > Actions** |
| `it-service-desk-demo` exists | **Settings > Environments** |
| Human reviewers are configured | [Delivery configuration](../.github/brownfield-human-gated-delivery/config.json) on `main` |
| Required checks and review rules are enforced | **Settings > Rules > Rulesets** |

Use the [token instructions](./brownfield-human-gated-delivery.md#configure-the-copilot-token)
for the automation credential. Human reviewers sign in to GitHub normally;
they do not need to create a token to review a PR.

The checked-in configuration assigns `huangyingting` and requires one approval
at every stage. Change it before the demo if another person will approve.
Submitting the Intent does not automatically make its author a reviewer.
For mandatory approval by one particular end user, configure that person as
the sole Spec and Plan reviewer with a threshold of one.

Check the [ruleset instructions](./brownfield-human-gated-delivery.md#configure-branch-rulesets):

- Both `brownfield-delivery/**` and `main` require
  `Brownfield delivery policy` and `stage-validation`.
- `main` also requires `validate` and `container-smoke`.
- Dismiss stale approvals, require conversation resolution, and do not allow
  humans or automation to bypass the gates.
- Exempt initial lifecycle-branch creation from status checks so kickoff can
  create the branch; keep subsequent updates protected and allow final cleanup.

**Ready when:** the form is visible, the intended reviewer is configured, and
the automation prerequisites and branch protections are in place.

## 2. Show the existing application

Explain the starting point using the
[IT service desk overview](../demos/it-service-desk/README.md):

- tickets already support creation, search, status changes, and filtering;
- data is persisted in SQLite;
- ticket ownership is the missing capability for this example.

Optionally, from the repository root with Node.js 24 or newer:

```sh
cd demos/it-service-desk
npm ci
npm run dev
```

Open <http://localhost:3000>. Show an existing ticket and the queue before any
feature work begins. Do not delete existing ticket data.

**Explain:** this is brownfield development. The goal is to improve an existing
system while preserving its current behavior, not generate a replacement.

## 3. Submit the human-authored Intent

1. Open **Issues > New issue**.
2. Choose **Brownfield human-gated delivery: Submit an intent**.
3. Review the prefilled title: **[Brownfield delivery] Clarify ticket ownership**.
4. Review or edit all five fields:

   | Field | What the Human supplies |
   |---|---|
   | Problem or opportunity | Why unclear ownership makes handoffs difficult |
   | Proposed outcome | How agents and team leads should benefit |
   | Affected users and systems | The people and existing application involved |
   | Constraints and non-goals | Preserve current data/workflows and keep scope small |
   | Open questions | Decisions that need discussion during Spec review |

5. Leave genuine uncertainties visible. For this example, the form asks whether
   tickets may be unassigned, how owners are selected, and whether filtering
   by owner is needed.
6. Click **Create** and record the new Intent Issue number.

The submitting user must be an `OWNER`, `MEMBER`, or `COLLABORATOR`.
Do not select a Copilot CLI demo form or manually assign all lifecycle stages.

**Expected result:** one parent Intent Issue with the
`brownfield-human-gated-delivery:intent` label. There is no AI-written Intent
stage and no separate Intent approval gate.
Check the Issue's **Labels** immediately. If the label is absent, confirm it was
created in the repository, apply it to this Issue, and follow the manual kickoff
recovery below. GitHub does not create labels from the form definition.

## 4. Verify automatic kickoff

1. Open **Actions > Brownfield Delivery · Kickoff**.
2. Open the run associated with the Intent and wait for it to complete.
3. Return to the Intent Issue and inspect the progress comment and sub-issues.

You should see:

- a `brownfield-delivery/<intent-number>` branch;
- four stage sub-issues: Spec, Plan, TDD Tests, and Implementation;
- Copilot assigned to **Spec** first; later stages wait;
- a progress table that is updated as the lifecycle advances.

Open the Spec sub-issue and follow its linked Copilot PR when available.
Agent execution is asynchronous; a completed kickoff run does not mean the
Spec has already been written.

**Expected result:** Copilot prepares a Spec PR targeting the lifecycle branch,
not `main`, and the configured Human reviewer is requested.
Its title includes **Spec review** and the Intent number. The Intent's progress
row links to the PR and to **Read document** once the revision is reconciled.

## 5. Review and iterate on the Spec

1. Wait for Copilot's initial work to finish. If the PR is still a draft when
   it is ready for Human review, use **Ready for review**.
2. Click **Read document** in the Intent's progress comment, or use **Review
   document** in the PR description, to read the rendered Spec at that commit.
3. Check that it describes the intended outcome, scope, non-goals, actors,
   constraints, and stable Given/When/Then acceptance scenarios.
4. Read **Summary**, **Open questions**, and **Review checklist** in the PR
   description. Return to the PR's **Files changed** tab for inline comments
   and the formal review.

The rendered link is a revision snapshot, not a live `main` document. After a
new commit, use the refreshed progress link and review that revision. Checking
the checklist boxes does not constitute approval.

Only document/scope validation and the Human approval policy apply here.
Application tests, builds, and container smoke jobs are skipped for Spec PRs;
`stage-validation` must still pass. A skipped application job is not missing
Spec evidence.

For a deliberate first feedback round, submit **Request changes**, then post
this as a PR conversation comment:

```text
@copilot For this demo, tickets may remain unassigned. Use a simple free-text
owner name rather than a user directory, and include filtering by owner.
Preserve existing tickets and workflows. Revise only the specification in this
same PR, make these decisions explicit, and summarize the changes for re-review.
Do not start the Plan stage.
```

These are example Human decisions for this run, not requirements automatically
imposed by the Intent form. Adapt them to the feature you actually want.

When Copilot pushes a revision:

1. Inspect the changed sections and rerun check results.
2. If further clarification is needed, submit another **Request changes**.
3. Post another focused `@copilot` request, for example:

   ```text
   @copilot Clarify the behavior for blank and overlong owner names, and explain
   how invalid updates preserve stored ticket data. Add the missing acceptance
   scenarios in this same Spec PR and wait for my re-review.
   ```

4. Repeat until the Spec is acceptable and open decisions are resolved.
5. Submit **Review changes > Approve > Submit review** on the latest revision.

**Expected result:** once the required Human approvals and checks pass, the PR
auto-merges into the lifecycle branch. **Brownfield Delivery · Advance** closes
the Spec stage Issue and assigns Plan to Copilot.

### The rule for every review round

- Keep the same PR, branch, and stage Issue during revisions.
- Submit feedback, then explicitly ask `@copilot` to act on it. The coordinator
  enforces gates; it does not independently launch revisions for every comment.
- New commits require fresh approval of the latest revision.
- A comment saying "looks good," resolving a thread, or passing CI is not approval.
- Outstanding change requests, missing approvals, or draft status keep the
  gate blocked. There is no iteration limit or automatic approval timeout.
- Approval alone does not start the next stage: required checks must pass and
  the current PR must merge. Closing without merging does not advance.

The policy check may be unsuccessful while it waits for Human approval. That
is expected; do not bypass it merely to make the PR appear green.

## 6. Review and iterate on the Plan

1. Follow the separate **Plan review** PR from the Intent or its stage Issue.
2. Confirm its base is `brownfield-delivery/<intent-number>`.
3. Open the rendered Plan through **Read document** or **Review document**.
   Review its summary, open questions, checklist, and the linked approved Spec.
4. Check that:
   - every approved acceptance scenario maps to at least one task;
   - task IDs and dependencies are clear and acyclic;
   - affected code surfaces and validation are specified;
   - existing-data compatibility, migration risks, and scope are addressed.
5. Confirm this stage has not changed the approved Spec or written application
   code or tests.

As with Spec, Plan runs document/scope checks and the Human approval policy,
not application builds or container checks.

If improvement is needed, submit **Request changes** and post:

```text
@copilot Refine this plan into small, dependency-ordered tasks for storage
compatibility, server-side behavior, UI changes, and regression coverage where
required by the approved Spec. Map each task to acceptance scenarios and explain
its validation. Update only the plan in this same PR, summarize the changes,
and wait for my re-review. Do not start TDD or implementation.
```

Repeat review and revision until satisfied. Mark the PR ready for review if
needed, then explicitly approve its latest revision.

**Expected result:** the Plan PR merges only after approvals and checks pass;
the workflow closes the Plan stage Issue and assigns TDD Tests.

If planning exposes a problem with the approved Spec, stop and flag it. This
demo does not automatically roll back completed stages; the Plan must not
silently rewrite approved requirements.

## 7. Review the TDD Red evidence

1. Open the TDD Tests PR. Its base should still be the lifecycle branch.
2. Inspect the new tests and
   `docs/delivery-runs/brownfield-human-gated-delivery/<intent-number>/expected-failures.json`.
3. Confirm test names map to approved acceptance scenarios and the assertions
   describe real behavior rather than unconditional failures.
4. Confirm production code and approved Spec/Plan artifacts are unchanged.
5. Open the **Brownfield Delivery · Stage CI** run and inspect the `tdd-red`
   job and its summary.

The evidence must show:

- existing baseline tests pass;
- the new feature tests run and fail exactly as declared;
- lint and build pass;
- no unrelated collection, setup/teardown, or runtime errors are accepted as Red.

**Important:** the feature tests are intentionally Red, but the
`stage-validation` check must pass. Its success means the workflow verified
the expected failures. Do not approve a broken validation job.

Request corrections in the same PR if needed. When the tests and evidence are
sound, explicitly approve the latest revision.

**Expected result:** approved tests merge into the lifecycle branch, not
`main`. The workflow then assigns Implementation. The approved test files
become an immutable contract for that implementation.

## 8. Review the implementation and Green checks

1. Open the Implementation PR after Copilot finishes its initial work.
2. Confirm the coordinator has retargeted it to `main`. It contains the complete
   increment: Spec, Plan, tests, and implementation.
3. Review the code against the approved artifacts.
4. Confirm approved tests and lifecycle artifacts have not been weakened,
   edited, deleted, or renamed. Additional tests may be added in new files.
5. Inspect the required results:

   | Required status/check | Evidence |
   |---|---|
   | `stage-validation` | Approved contracts preserved; expected Red tests now Green |
   | `validate` | Application tests, lint, and production build pass |
   | `container-smoke` | The production container starts and passes smoke checks |
   | `Brownfield delivery policy` | Configured Humans approved the current revision |

6. Request revisions with `@copilot` if the implementation is not acceptable.
   New commits require another Human review.
7. Approve the latest revision only when behavior and code meet the agreed Spec.

For a visual demonstration, validate the behavior selected during Spec review,
including existing-ticket compatibility. A generic dashboard smoke test does
not prove every feature acceptance scenario; inspect the feature tests too.

**Expected result:** the approved, passing PR auto-merges into `main`. The
parent Intent remains open pending delivery verification.

## 9. Verify delivery and close the loop

1. Open **Actions > Brownfield Delivery · Publish** for the merged PR.
2. Inspect the `publish` job for the image build and GHCR publication.
3. Inspect the `verify` job for:
   - pulling and running the published image by its immutable digest;
   - a successful `/api/health` response;
   - the dashboard smoke check;
   - stopping the temporary container after verification.
4. Return to the parent Intent Issue and read the delivery result comment.
5. Confirm successful delivery closes the Intent and removes the temporary
   lifecycle branch.

**Expected result:** a traceable chain from the human-authored Intent through
approved artifacts and tests to a published, verified image digest.

The `it-service-desk-demo` Environment records temporary container verification.
It does **not** create a permanently hosted application or public demo URL.
An application already running on your machine is not automatically upgraded.
Use the merged source or published image for an optional after-demo UI tour.

## Completion checklist

- [ ] Human submitted the Intent.
- [ ] Spec feedback and revisions are visible in the same PR.
- [ ] Human approved the final Spec before Plan started.
- [ ] Plan feedback and revisions are visible in the same PR.
- [ ] Human approved the final Plan before TDD started.
- [ ] Controlled Red evidence was validated and approved.
- [ ] Implementation passed Green tests, build, and container checks.
- [ ] Human approved the implementation before it merged.
- [ ] Published image digest and smoke-verification run are recorded on the Intent.
- [ ] Intent is closed after successful delivery.

## Troubleshooting during the demo

| Symptom | What to check or do |
|---|---|
| Form is missing or has old content | Confirm the template is on the default branch; open a fresh **New issue** form |
| Kickoff did not start | Check the Intent label and author association. Adding a label later is not a kickoff trigger; use **Actions > Brownfield Delivery · Kickoff > Run workflow** with the existing Intent number |
| Kickoff failed partway through | Fix the reported prerequisite, then dispatch Kickoff with the same Intent number; do not create duplicate Intents just to retry |
| Copilot did not revise the PR | Submit the review, then post a direct `@copilot` request in that PR and inspect the agent session |
| Approval did not unblock policy | Check configured reviewer identity, current-head approval, outstanding change requests, and draft state. Review Signal and PR Coordinator run asynchronously; inspect their latest runs |
| Required policy/check never appears | Confirm the Review Signal, PR Coordinator, and Stage CI workflows are installed and enabled, and that rulesets use the exact required names |
| Stage check failed | Read the failing job and request a correction in the same PR; do not weaken the validator or approve an unrelated failure |
| Classification rejects a generated `Fixes` suffix | The updated coordinator repairs only Copilot's recognized closing reference to the current stage Issue, then body-edited CI reruns. Ensure the compatibility fix is on the default branch; unrelated closing references still need correction |
| Approved PR has not advanced | Check required checks, unresolved conversations, branch freshness, auto-merge, and whether the PR actually merged. Then inspect **Brownfield Delivery · Advance** |
| Publish or smoke verification failed | Read the Publish run. Retry infrastructure failures with **Re-run failed jobs**; report code defects through a new remediation Intent |

If the delivery Environment has an additional approval rule, its reviewer must
also release the pending verification job. Keep the original Intent open while
delivery is failing; do not close it merely because implementation merged.

For another run, choose a feature still missing from the current baseline.
After ownership has been delivered, submitting the same ownership Intent again
is not a meaningful brownfield demonstration. Use a separately prepared demo
repository for repeatable rehearsals instead of deleting application data or
undoing unrelated work.
