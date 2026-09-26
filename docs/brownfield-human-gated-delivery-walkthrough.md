# AI-native SDLC brownfield demo: step-by-step walkthrough

Use this guide to demonstrate a complete, human-gated feature delivery cycle
against the existing IT service desk. All lifecycle decisions happen in GitHub
Web; running the application locally is optional.

The example starts with **unclear ticket ownership**. The Human writes the
Intent, AI proposes the Spec and Plan, and the Human can request as many
revisions as needed before approving the next stage.
For new Intents, the Human stays on the parent Issue for full rendered
Spec/Plan revision comments, discussion, and versioned approval commands.
Only the engineering stages use PR reviews.

```text
Human Intent
  -> AI Spec <-> Human feedback and revision
  -> AI Plan <-> Human feedback and revision
  -> AI tests: controlled Red -> Human approval
  -> AI implementation: Green -> Human approval
  -> Merge -> Publish image -> Smoke verification -> Close Intent
```

This walkthrough describes the new Issue document-review workflow. Intents with
existing lifecycle branches remain in
[legacy Spec/Plan PR mode](./brownfield-human-gated-delivery.md#legacy-specplan-pr-mode);
there is no automatic migration. Verify the new workflow is deployed on remote
`main` before a live session; this guide does not establish that it is already
deployed. Use the
[setup and policy reference](./brownfield-human-gated-delivery.md) for configuration
details. Document generation uses read-only Copilot CLI in Actions, separate
from the repository's orchestration-pattern demos and from Coding Agent's later
PR work.

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
dispatch kickoff or publish local changes. By default, it preserves existing
protections.
See [setup script details](./brownfield-human-gated-delivery.md#run-the-setup-script)
for permissions, exit codes, and manual checks. No root dependencies need to
be installed.

If you are the only Human reviewer, add `--single-owner` to both preview and
apply commands for the Tests and Implementation PR stages. New Issue
Spec/Plan approvals do not have GitHub's native PR independent-review
restriction. Native PR review rules can exclude your approval when you
collaborated with Copilot. [Single-owner demo mode](./brownfield-human-gated-delivery.md#single-owner-demo-mode)
uses zero native approvals while retaining your explicit current-revision
approval through **Brownfield delivery policy**, required checks, and no
bypasses. It is not independent two-person review. The option changes only
native approval counts in existing managed rulesets; applying it may unblock
already-approved auto-merge PRs. Keep full setup's workflow verification and
registration; a ruleset-only edit is not enough. An existing unprotected `main`
is not changed automatically; inspect the preview and configure any needed
protection separately.

| Check | Where to verify in GitHub |
|---|---|
| Current issue forms, prompts, and workflows are on the default branch | **Code**; the demo workflows assume `main` |
| Documents is registered and enabled | **Actions > Brownfield Delivery · Documents**; file `brownfield-human-gated-delivery-documents.yml`; full setup verifies/registers it |
| Copilot Coding Agent is available and allowed to work in this repository | Repository/organization Copilot settings |
| Copilot CLI can generate documents in Actions | `copilot-requests: write`, CLI entitlement, and any organization CLI billing policy |
| Issues, sub-issues, Actions, and Packages are available | Repository tabs and settings |
| Pull-request auto-merge is enabled | **Settings > General > Pull Requests** |
| `brownfield-human-gated-delivery:intent` exists | **Issues > Labels** |
| `COPILOT_ASSIGN_TOKEN` is configured | **Settings > Secrets and variables > Actions** |
| `it-service-desk-demo` exists | **Settings > Environments** |
| Human reviewers are configured | [Delivery configuration](../.github/brownfield-human-gated-delivery/config.json) on `main` |
| Required checks and review rules are enforced | **Settings > Rules > Rulesets** |
| Trusted automation can write `brownfield-documents/**` | No conflicting PR-required ruleset; no bypass is granted |

Use the [token instructions](./brownfield-human-gated-delivery.md#configure-the-copilot-token)
for the automation credential. Generation never receives that credential or
other repository write credentials; trusted publication and approval are
separate steps. Human reviewers sign in to GitHub normally; they do not need
to create a token to review documents or PRs.

The checked-in configuration assigns `huangyingting` and requires one approval
at every stage. Change it before the demo if another person will approve.
Submitting the Intent does not automatically make its author a reviewer.
For mandatory approval by one particular end user, configure that person as
the sole Spec and Plan reviewer with a threshold of one. Issue approvers must
be current configured Humans with repository write access, including current
members of configured teams. Bots cannot approve. Do not lower
`minimumApprovals` for single-owner mode.

Check the [ruleset instructions](./brownfield-human-gated-delivery.md#configure-branch-rulesets):

- Both `brownfield-delivery/**` and `main` require
  `Brownfield delivery policy` and `stage-validation`.
- `main` also requires `validate` and `container-smoke`.
- Dismiss stale approvals, require conversation resolution, and do not allow
  humans or automation to bypass the gates.
- Exempt initial lifecycle-branch creation from status checks so the approved
  document handoff can create it; keep subsequent updates protected and allow
  final cleanup.
- Managed rulesets cover only `main` and `brownfield-delivery/**`, not
  `brownfield-documents/**`. Document branches need trusted automation writes,
  not a ruleset bypass.

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

Once document review starts, the Intent's title and body are snapshotted.
Do not edit them afterward: Documents rejects changes to that original request.
Use explicit revision-command feedback to refine the documents, or create a
new Intent for a changed original request.

## 4. Verify automatic kickoff

1. Open **Actions > Brownfield Delivery · Kickoff**.
2. Open the run associated with the Intent and wait for it to complete.
3. Confirm it routes the new Intent to **Brownfield Delivery · Documents**.
4. Return to the Intent Issue and inspect its current review hub.

You should see:

- a `brownfield-documents/<intent-number>` branch;
- a current hub on the parent Issue, linking the latest document versions and
  their review status;
- a full rendered Markdown **Spec v1** revision comment after generation and
  trusted publication succeed;
- possibly four internal stage issues: Spec, Plan, TDD Tests, and
  Implementation, with no Spec/Plan Coding Agent assignment.

Stay on the parent Intent. A completed kickoff run does not itself mean Spec
generation and publication have finished; inspect the Documents run too.
For a new Intent there should not yet be a `brownfield-delivery/<intent-number>`
branch or a Spec PR.

**Expected result:** read-only Copilot CLI generates the first Spec; trusted
automation validates and saves the revision in Git, then publishes the full
document for Human review on the Issue. No application build runs.

## 5. Review and iterate on the Spec

1. Wait for Documents to publish the first full Spec revision comment.
2. Use the parent Intent's hub to locate the latest version and read it.
3. Check that it describes the intended outcome, scope, non-goals, actors,
   constraints, and stable Given/When/Then acceptance scenarios.
4. Review open questions and proposed decisions. Ordinary Issue comments are
   available for discussion; they do not execute AI or approve the document.

Each revision is saved under
`docs/delivery-runs/brownfield-human-gated-delivery/<intent-number>/` on the
document branch as `spec.md`, with review state in `document-review.json`.
The full comment is the reading surface, and the Git revision is durable
evidence. Only document structure/scope and approval validation apply here;
there is no Spec PR or application test, build, or container job.

For a deliberate first feedback round, submit the following as a **new
top-level comment on the parent Intent**, with the command on its first line:

```text
/sdlc revise spec
For this demo, tickets may remain unassigned. Use a simple free-text
owner name rather than a user directory, and include filtering by owner.
Preserve existing tickets and workflows. Make these decisions explicit in
the specification for re-review.
```

These are example Human decisions for this run, not requirements automatically
imposed by the Intent form. Adapt them to the feature you actually want.

This is a custom repository Actions command, not a built-in `@copilot` command.
Post the text itself, not a quoted example or fenced block. Wait for Documents
to publish **Spec v2**, then:

1. Read the full revised document and inspect the changes against your feedback.
2. If further clarification is needed, submit another revision command:

   ```text
   /sdlc revise spec
   Clarify the behavior for blank and overlong owner names, and explain
   how invalid updates preserve stored ticket data. Add the missing acceptance
   scenarios for re-review.
   ```

3. Repeat until the Spec is acceptable and open decisions are resolved.
4. If **v2 is still the latest version**, submit this new top-level comment:

   ```text
   /sdlc approve spec v2
   ```

   If you requested another revision, use its actual latest version instead;
   a stale-version approval is rejected.

**Expected result:** the approval is recorded in Git with the reviewed revision
comment ID/body, document version/hash, approval command comment, and Human
ID/login/time. After the configured threshold is satisfied, Documents generates
Plan v1 linked to the approved Spec. There is no Spec PR to merge.

### The rule for every review round

- Keep the same parent Intent and document branch throughout document review.
- Submit new top-level `/sdlc` comments explicitly; ordinary discussion,
  `@copilot` mentions, and edits to existing comments do not trigger this flow.
- Only the latest version is approvable, by current configured Humans with
  write access. Team membership and `minimumApprovals` still apply; bots cannot
  approve. There is no native PR independent-review restriction here.
- A comment saying "looks good," checklist changes, or successful generation is
  not approval. There is no iteration limit or automatic approval timeout.
- Editing or deleting a processed approval comment does **not** revoke its
  Git-recorded decision. Submit an explicit revision before handoff instead.
- Revising Spec before handoff invalidates all Spec approvals and the draft or
  approved Plan, including its approvals. A new Spec review and new Plan
  version are required.
- Full Plan approval freezes the documents. Do not approve it while a Spec
  change is still needed.
- Commands are durably queued and reconciled on each run. If a pending run is
  superseded or execution fails, resume Documents; do not assume comments were
  lost or create a replacement Intent.

## 6. Review and iterate on the Plan

1. Follow the latest full **Plan v1** revision comment from the parent hub.
2. Confirm its linked Spec is the version you approved.
3. Review its open questions and proposed approach.
4. Check that:
   - every approved acceptance scenario maps to at least one task;
   - task IDs and dependencies are clear and acyclic;
   - affected code surfaces and validation are specified;
   - existing-data compatibility, migration risks, and scope are addressed.
5. Confirm this stage has not changed the approved Spec or written application
   code or tests.

As with Spec, Plan runs document/scope and approval validation, not application
builds or container checks. It is saved as `plan.md` with review state on
`brownfield-documents/<intent-number>`.

If improvement is needed, submit a new top-level parent-Issue comment:

```text
/sdlc revise plan
Refine this plan into small, dependency-ordered tasks for storage
compatibility, server-side behavior, UI changes, and regression coverage where
required by the approved Spec. Map each task to acceptance scenarios and explain
its validation. Preserve the approved specification.
```

Repeat review and revision until satisfied. If no Plan revision was needed and
**v1 remains latest**, submit:

```text
/sdlc approve plan v1
```

If you used the revision command above, wait for the new Plan and approve that
version instead (for example `/sdlc approve plan v2`). Do not approve an older
version merely to follow this example.

If planning exposes a problem with the approved Spec, use `/sdlc revise spec`
with feedback **before fully approving the Plan**. This invalidates Spec
approvals and the existing Plan. Review and approve the new Spec, then the new
Plan version. The Plan must not silently rewrite approved requirements.

**Expected result:** after the latest Plan has all configured Human approvals,
automation freezes `spec.md`, `plan.md`, and `document-review.json`, creates
`brownfield-delivery/<intent-number>` from the approved document commit, closes
the internal Spec/Plan stage issues, and assigns **only TDD Tests** to Coding
Agent. The next review surface is a Tests PR. After this handoff, contract
changes need a new Intent rather than editing approved artifacts.

## 7. Review the TDD Red evidence

1. Open the TDD Tests PR. Its base should still be the lifecycle branch.
2. Inspect the new tests and
   `docs/delivery-runs/brownfield-human-gated-delivery/<intent-number>/expected-failures.json`.
3. Confirm test names map to approved acceptance scenarios and the assertions
   describe real behavior rather than unconditional failures.
4. Confirm production code and approved `spec.md`, `plan.md`, and
   `document-review.json` blobs are unchanged.
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
   increment: Spec, Plan, document approval state, tests, and implementation.
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
- [ ] Full Spec revisions, discussion, and explicit commands are visible on the parent Intent.
- [ ] Humans approved the latest Spec version before Plan started.
- [ ] Full Plan revisions on that same Issue link the approved Spec.
- [ ] Humans approved the latest Plan before TDD started; approvals and document hashes are saved in Git.
- [ ] Documents froze and the delivery branch was created from the approved document commit.
- [ ] Only TDD Tests was assigned at engineering handoff.
- [ ] Controlled Red evidence was validated and approved.
- [ ] Implementation passed Green tests, build, and container checks.
- [ ] Human approved the implementation before it merged.
- [ ] Published image digest and smoke-verification run are recorded on the Intent.
- [ ] Intent is closed after successful delivery.

## Troubleshooting during the demo

| Symptom | What to check or do |
|---|---|
| Form is missing or has old content | Confirm the template is on the default branch; open a fresh **New issue** form |
| Documents is missing from Actions | Confirm `brownfield-human-gated-delivery-documents.yml` is deployed on remote `main`; rerun full setup to verify/register **Brownfield Delivery · Documents**. Local edits are not a remote deployment |
| Kickoff did not start | Check the Intent label and author association. Adding a label later is not a kickoff trigger; use **Actions > Brownfield Delivery · Kickoff > Run workflow** with the existing Intent number |
| Kickoff failed partway through | Fix the reported prerequisite, then dispatch Kickoff with the same Intent number; do not create duplicate Intents just to retry |
| Documents rejects a changed Intent title/body | The original request is snapshotted at startup. Keep it unchanged; use revision-command feedback for refinements or a new Intent for a changed original request |
| An ordinary comment or `@copilot` mention did not revise the document | Expected: submit a new top-level `/sdlc revise spec` or `/sdlc revise plan` with feedback on the parent Issue; discussion and edited comments do not run the command interface |
| Document generation failed | Check the Documents run, `copilot-requests: write`, CLI entitlement/billing, and Actions policy. Fix the cause, then submit `/sdlc retry` or manually dispatch Documents with `issue_number` |
| A pending run was replaced, or publication/approval/handoff failed | Resume Documents for the same parent Issue; its durable queue reconciles submitted commands on every run. Do not repost commands just because their original run was superseded |
| Issue approval did not advance | Check the exact latest version, current configured Human login/team membership, repository write access, and `minimumApprovals`; bots cannot approve |
| Deleting or editing an approval comment did not revoke it | Expected for a processed approval snapshot. Request an explicit revision before full Plan approval; after handoff, use a new Intent |
| A Spec revision invalidated the Plan | Expected: reapprove the new Spec, then review and approve a new Plan version; old Spec/Plan approvals cannot be reused |
| Document publication cannot write its Git branch | Inspect rules matching `brownfield-documents/**`. Allow trusted automation writes without granting a bypass; managed rulesets cover only `main` and `brownfield-delivery/**` |
| An existing Intent still uses Spec/Plan PRs | This is [legacy mode](./brownfield-human-gated-delivery.md#legacy-specplan-pr-mode), not a failed migration. Keep its PR workflow |
| Copilot did not revise a Tests, Implementation, or legacy document PR | Submit the review, then post a direct `@copilot` request in that PR and inspect the agent session |
| PR approval did not unblock policy | Check configured reviewer identity, current-head approval, outstanding change requests, and draft state. Review Signal and PR Coordinator run asynchronously; inspect their latest runs |
| PR policy passed, but GitHub rejects approval from a Copilot collaborator | Native PR rules need an independent person with write access. For a one-Human demo, use [single-owner mode](./brownfield-human-gated-delivery.md#single-owner-demo-mode); do not remove the policy or stage checks. This restriction does not apply to Issue approvals |
| Required PR policy/check never appears | Confirm the Review Signal, PR Coordinator, and Stage CI workflows are installed and enabled, and that rulesets use the exact required names. New Issue documents do not wait for these PR checks |
| Stage check failed | Read the failing job and request a correction in the same PR; do not weaken the validator or approve an unrelated failure |
| Classification rejects a generated `Fixes` suffix | The updated coordinator repairs only Copilot's recognized closing reference to the current stage Issue, then body-edited CI reruns. Ensure the compatibility fix is on the default branch; unrelated closing references still need correction |
| Approved PR has not advanced | Check required checks, unresolved conversations, branch freshness, auto-merge, and whether the PR actually merged. Then inspect **Brownfield Delivery · Advance** |
| Publish or smoke verification failed | Read the Publish run. Retry infrastructure failures with **Re-run failed jobs**; report code defects through a new remediation Intent |

To resume Documents without new feedback, post this as a new top-level comment
on the existing parent Intent:

```text
/sdlc retry
```

Alternatively, open **Actions > Brownfield Delivery · Documents > Run workflow**,
select `main`, and supply that parent Issue's number in the manual
`workflow_dispatch` input `issue_number`. The equivalent command, replacing the
repository and example number as needed, is:

```sh
gh workflow run brownfield-human-gated-delivery-documents.yml \
  --repo huangyingting/ai-native-sdlc --ref main -f issue_number=7
```

Inspect the latest hub and run result after recovery. A full Plan approval
keeps documents frozen even if branch creation or the Tests assignment must be
retried.

If the delivery Environment has an additional approval rule, its reviewer must
also release the pending verification job. Keep the original Intent open while
delivery is failing; do not close it merely because implementation merged.

For another run, choose a feature still missing from the current baseline.
After ownership has been delivered, submitting the same ownership Intent again
is not a meaningful brownfield demonstration. Use a separately prepared demo
repository for repeatable rehearsals instead of deleting application data or
undoing unrelated work.
