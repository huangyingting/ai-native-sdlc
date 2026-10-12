# 6. Workshop and adoption playbook

[Guide index](../README.md) · [中文](../zh/06-workshop.md) ·
[Previous](05-engineering-judgment.md) · [Evidence register](../evidence.md)

Presentation routes live in the demo repository. This chapter explains three
hands-on routes: local practice without model calls, a delivery from scratch,
and focused experiments. Choose according to time, permissions and budget.

## 6.1 Choose between reviewing a case and running an exercise

| Mode | What you do | How to describe the result |
|---|---|---|
| Review a case | Read the guide, screenshots and execution records | Explain the recorded outcome of that case |
| Verify locally | Start a reviewed image or run offline checks in isolated resources | Report the behavior you actually checked |
| Run from scratch | Prepare a separate repository/output directory, configure access, call the model and verify the result | Record the complete exercise, including failures, retries and interventions |

No website setup is needed for a presentation. The
[public Trace Viewer](https://huangyingting.github.io/ai-native-sdlc/) provides
interactive inspection of the execution. To demonstrate the application live,
start your own isolated instance; localhost URLs in the reports are not public
demo addresses. See the [evidence register](../evidence.md) for source notes.

## 6.2 Use the demo repository's presentation route

The [30-minute route](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/presenter.md)
covers handoffs, four product decisions, Spec/Plan approval, two test revision
rounds, 38 passing tests, package-access recovery and exact-image acceptance.
It uses the current repository's records and 14 screenshots, not another case's
roster or test counts.

Open the pages in advance. Read-only presentation needs no comments, approvals
or workflow reruns. For an hour, add chapter 5's engineering topic and explicitly
identify it as a separate historical experiment. For a half-day workshop, add
the exercises below. Do not promise a complete cloud delivery in a fixed slot:
queues, review, permissions and builds are external dependencies.

### Page-reading checklist

- **Issue:** original problem → latest hub → full revision → decisions → approval.
- **PR:** base/head → files → review → checks → merge, in that order.
- **Actions:** exact source → run/attempt → required jobs → logs/summary →
  reviewed artifacts; sign in with your normal authorized account if logs require it.
- **Application:** fixture → user action → resulting state → persistence and
  negative checks, not merely loading the home page.
- **Trace:** identity → hierarchy → time overlap → errors → measured usage →
  what remains unverified.

## 6.3 Route A: local practice without model calls

From the source repository root, use Node.js 24:

```sh
npm test
npm --prefix demos/engineering-lab test
node tools/brownfield-demo/cli.mjs --help
node tools/brownfield-demo/cli.mjs scenario list
node tools/engineering-demo/cli.mjs --help
```

These checks/help commands do not call Copilot. Follow each project's dependency
instructions if a required package is missing; demo dependencies stay in the
demo, not the root.

At the engineering exercises' publication, validation passed 456 repository tests
and 15 fixture tests. Counts depend on the checkout; report your actual results.
`scenario list` describes plans and marks them `planned-not-evidence`; listed
scenarios are not completed runs.

Exercises without model calls:

1. Compare the case's Intent to the approved Spec: locate a decision-to-criterion
   mapping and one explicit non-goal.
2. Read the Tests review and propose one implementation that a weak assertion
   would accidentally accept.
3. Compare the failed maintenance and continuation: identify what changed and
   which records remained intact.
4. Explain why the engineering pilot is not “all failed” or “all accepted.”

## 6.4 Route B: a delivery from scratch

Use the existing [ordered operator walkthrough](../../brownfield-human-gated-delivery-walkthrough.md#1-prepare-the-repository)
for complete setup. The sequence matters:

1. Choose a reviewed **full 40-hex source commit**, still ownership-free and
   containing the required workflows. Do not start from the current accepted demo app.
2. Choose a separate external destination, an agreed dedicated remote and explicit review
   mode. Destination must not exist; its parent must exist.
3. Export the fixed scenario:

   ```sh
   node tools/brownfield-demo/cli.mjs prepare \
     --source /absolute/path/to/ai-native-sdlc \
     --source-ref FULL_40_HEX_COMMIT \
     --dest /absolute/path/to/new-isolated-demo \
     --reviewer YOUR_GITHUB_LOGIN \
     --scenario ownership-standard
   ```

4. Inspect the export/provenance for content safe to publish. Preparation
   does not initialize Git, create a remote or push.
5. Deliberately initialize/publish the reviewed export. Verify remote `main`,
   workflow registration and configured reviewer access.
6. Preview setup **from the exported repository**, resolve permissions, Copilot
   entitlement, image access and proposed branch protections. Apply only
   explicitly agreed changes using the secure credential flow.
7. Run read-only preflight and hand off to actual eligible reviewers.
8. Submit a new Intent and follow chapters 2–4 to real acceptance.

Use `--single-owner` only for an explicitly chosen single-owner rehearsal,
consistently across prepare/setup/preflight as documented. It is not independent
review. Never apply full setup to the intentionally unprotected source main
by mistake, paste tokens into commands/chat, or force-push over a completed run.

**Where to stop:** unresolved access/billing, missing registered workflows,
baseline mismatch, unavailable reviewers, failed required checks, unverified
digest or failed cleanup. Do not bypass a gate to finish a presentation.

## 6.5 Route C: smaller focused experiments

### Change impact and strategy evaluation

Prerequisites: Node.js 24, Docker, Git, authenticated Copilot CLI and explicitly
accepted usage costs. Review the [qualified CLI version and transport](../../engineering-judgment-demos.md#2-prerequisites);
an upgraded CLI is not automatically qualified.

The published experiment used fixture commit
`540cacd2a10be5ed326479fd959d21eec5d4997c`. Source and execution-tool revisions
are recorded separately. Use dedicated output directories and the same immutable
runtime across comparison cells.

Follow the exact [impact commands](../../engineering-judgment-demos.md#3-change-impact-and-consistency-loop):

1. `impact-propose`: real model call; read the complete candidate.
2. `impact-approve`: local operator receipt for the exact `proposalHash`;
   never approve solely because generation exited zero.
3. `impact-implement`: second real call; restricted tests/oracle decide the result.
4. Optional `benchmark`: nine planned real calls over six fixed cells.

These are CLI experiments, not a separate web UI or automatic GitHub delivery.
Full syntax is available via the help command above. Record output, approval,
usage, candidate/test/oracle results, code/tool identities and all failures.
Exit 0 can mean **awaiting operator review** for a proposal; exit 2 means
completed with failed candidates; exit 1 means error.

### Reliability without model calls

With access to source that implements readiness and its image, follow
[qualification](../../brownfield-reliability-loops.md#3-start-here-qualify-the-tests),
then [runtime rehearsal](../../brownfield-reliability-loops.md#4-run-real-image-verification-admission-recovery-and-monitoring).
These execute real tests/Docker/HTTP/SQLite, not Copilot calls. Image/dependency
downloads and compute may still incur costs.

Do not qualify the ownership-free source as though it had readiness. Do not
reuse accepted volumes, inject faults into shared workloads, or count a
generated maintenance draft as reviewed preventive work.

## 6.6 Recovery and evidence handoff

| Situation | Supported response |
|---|---|
| Document generation/handoff failed | Diagnose it, then use documented `/sdlc retry` or Documents dispatch for the same Intent |
| Engineering CI/Advance/Publish failed | Correct the cause and rerun the actual failed Action; document retry does not repair these jobs |
| Need to pause an active run | Use supported `/sdlc pause` and later `/sdlc resume`, not ad hoc state edits |
| Frozen scope is wrong | Explicit new Intent/continuation; preserve the cancelled evidence |
| Evidence artifact expired | Use durable report/commit/Issue references; label raw evidence unavailable, never fabricate replacement logs |
| Local application unavailable | Show dated screenshots or start a deliberately isolated instance; do not claim current health |

For each run preserve:

```text
Repository + Intent URL + execution mode
Source/tool commit + scenario/input hash
Decisions + Spec/Plan versions/hashes + approval identities
Tests/implementation heads + Red/Green run/attempts
Merge SHA + image digest + verification run/attempt
Actual acceptance observations + limitations
Failures/retries/interventions + measured usage
Resource ownership + cleanup result + operational follow-up
```

Keep private prompts, raw CLI events, databases, payloads and logs outside Git.
Redaction is not proof that arbitrary free text contains no sensitive material.
Publish reviewed summaries and references instead.

## 6.7 Adopt one trustworthy loop before scaling

| Step | Team agreement | Observable result |
|---|---|---|
| 1. Select a small real change | Owner, scope, baseline, non-goals | A reviewed Intent, not an “AI adoption” slogan |
| 2. Make ambiguity explicit | Who decides and what blocks progress | A decision register and testable criteria |
| 3. Separate proposals from authority | Allowed tools/files, review and execution roles | AI cannot silently approve or expand scope |
| 4. Require independent verification | Legacy behavior, negative cases and evidence identity | Repeatable checks, not model assertions |
| 5. Accept the exact artifact | Deployment/recovery owner and acceptance procedure | Digest-bound observations |
| 6. Observe and measure | Operational feedback and quality/cost definitions | A reviewed follow-up and comparable results |

Useful team metrics include first-pass acceptance, escaped regressions,
unsupported assumptions caught, review rework, elapsed lead time, interventions
and actual model usage. Establish a real baseline and measurement rules first.
The repository does not supply measured customer ROI.

Before claiming **Demo Ready** under this repository's existing policy, complete
three genuine isolated Human-led scenarios: normal delivery, explicit Spec
revision/Plan invalidation, and recoverable failure. The current accepted case
does not establish all three; historical scripted development-test runs do not
substitute for those requirements.

The best takeaway is not “AI removes every gate.” It is:
**make useful proposals cheap, make unsupported transitions difficult, and
make every outcome inspectable.**

[Back to the guide](../README.md) · [Open the evidence and screenshot register](../evidence.md).
