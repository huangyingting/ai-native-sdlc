# 2. Intent, Spec and Plan: resolve uncertainty before coding

[Guide index](../README.md) · [中文](../zh/02-intent-spec-plan.md) ·
[Previous](01-operating-model.md) · [Next: Build and Verify](03-build-verify.md)

This chapter follows **the current ticket ownership case**: explain the need,
decide assignment and filtering rules, then plan the implementation. Intent
defines the problem and outcome; Spec defines behavior and acceptance criteria;
Plan describes implementation and verification.

## 2.1 Start on the Intent page, not in an implementation prompt

[![Product decision on detail-only handoffs](https://raw.githubusercontent.com/huangyingting/ai-native-sdlc-demo/main/docs/cases/assets/ownership/product-decision.png)](https://github.com/huangyingting/ai-native-sdlc-demo/issues/1#issuecomment-6117980837)

**Product decision, October 12, 2026.** Read the original problem in
[huangyingting/ai-native-sdlc-demo#1](https://github.com/huangyingting/ai-native-sdlc-demo/issues/1),
then inspect the decision to keep handoffs on the detail page.

The existing service desk could create, find and update tickets but did not
show who was responsible. A weak request would be “add an owner dropdown.”
That chooses a UI before deciding what responsibility means.

A better Intent records:

| Field | Ownership example |
|---|---|
| Problem / evidence | In the synthetic handoff, agents cannot identify responsibility or unassigned work; the baseline has no owner model |
| Desired outcome | Make responsibility visible, support handoff, preserve existing workflows |
| Users | Support agents and team leads |
| Constraints | Preserve records/timestamps; keyboard-usable labelled controls; persisted behavior |
| Non-goals | Authentication, external directories, SLA, notifications, bulk assignment |
| Unknowns | Optional ownership? Fixed roster? Visibility only or filtering too? |
| Success evidence | Observable UI behavior, exact result sets and data preservation |

This functional case provides no customer interviews or measured productivity
improvement. In a real team, attach the actual research and baseline; if unknown,
assign discovery work rather than invent a business benefit.

## 2.2 Use AI to expose choices, not silently make them

The process starts when the requester submits the Intent. Kickoff routes to
the Documents workflow. Read-only Copilot CLI proposes the Spec; trusted
automation validates and publishes its full revision on the parent Issue.
**No production code, Tests PR or application build is needed at this stage.**

This delivery confirmed four product decisions:

| Decision | Why it matters | Recorded outcome |
|---|---|---|
| Q-1: optional or mandatory ownership | Determines create behavior and treatment of existing tickets | Optional; both existing and subsequently created tickets begin unassigned |
| Q-2: identity source | Determines validation, persistence and scope | Fixed Alex Chen/Sam Rivera roster; empty selection maps to null |
| Q-3: display only or filtering | Determines user journey and query semantics | Filtering intersects existing predicates; navigation must not show stale selection |
| Q-4: handoff location and status limits | Determines entry points and interaction with existing forms | Detail-only in all four statuses; creation unchanged; independent status and owner saves |

Each decision revised the Spec. This exercise approved **Spec v5**, then
**Plan v1**. Version numbers reflect the revisions needed; the process does
not require reaching v5.

The [decision and revision register](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/README.md)
links each answer to its revision. Check that decisions changed the acceptance
criteria; do not mistake AI suggestions for confirmed product policy.

## 2.3 What the reviewer actually does

For hands-on work, use your own isolated repository and that exercise's current
Issue hub. The linked case is for reference. The `/sdlc` commands below belong
to this repository, not to GitHub or Copilot's built-in command interface.

1. Read the complete latest Spec and its discovery brief.
2. Check each question against the original problem and repository facts.
3. As an eligible configured reviewer, answer one current question:

   ```text
   /sdlc decide spec v1 Q-1
   Outcome: Tickets may remain unassigned until triage.
   Rationale: Requests arrive before a responsible agent is known.
   ```

4. Wait for publication of the new version. Read how the answer changed the
   acceptance criteria before answering the next question.
5. If a question must be deferred, record a rationale, owner, follow-up and risk
   using the [documented defer command](../../../../tools/brownfield-demo/README.md#spec-readiness-profiles).
   “Deferred” means owned uncertainty, not a resolved fact.
6. If the Spec is incomplete, request a revision with concrete feedback.
7. Approve only the actual current version after its blockers are handled:

   ```text
   /sdlc approve spec v5
   ```

The `v1`, `Q-1` and `v5` above are illustrative. Copy the current identifiers
from your own hub. Submit a new top-level comment with the command on the first
line, not a code fence or an edit to an existing comment. Ordinary discussion and
`@copilot` mentions do not satisfy a document approval.

## 2.4 Make the Spec testable without designing every implementation detail

[![Spec v5 approval and receipt](https://raw.githubusercontent.com/huangyingting/ai-native-sdlc-demo/main/docs/cases/assets/ownership/spec-approved.png)](https://github.com/huangyingting/ai-native-sdlc-demo/blob/9e183465d985bfa081f239a68eda400340320195/docs/delivery-runs/brownfield-human-gated-delivery/1/spec.md)

**Spec v5 approval.** The screenshot shows approval and processing receipt;
follow the image link for the full specification at its immutable commit.

The following is a **teaching reconstruction** of the approved behavior, not
a replacement for the frozen Spec:

```text
Given INC-0001 is unassigned,
when a permitted local owner is selected on its detail page and saved,
then detail and queue display that owner,
and reloading/restarting with the same data preserves the assignment,
while the ticket's unrelated fields remain unchanged.
```

Add negative, boundary and compatibility scenarios:

- Clear ownership; stored owner is null and the UI says Unassigned.
- Select the same owner; prove no database write, not just equal timestamps.
- Submit an invalid owner or nonexistent ticket; fail explicitly and preserve data.
- Combine owner, search, status and priority with **AND**, not OR.
- Clear only the owner filter; preserve other filters and synchronize navigation.
- Open a pre-change database; preserve its values while adding nullable owner.

Concrete result sets are better than “filter works.” In the published-image
check, Sam Rivera + Open + High + `inc-1` returned only INC-0001; switching to
Alex Chen returned an empty set. These results depend on the prepared data,
not every fresh database.

## 2.5 Plan from repository facts

[![Separate Plan v1 approval](https://raw.githubusercontent.com/huangyingting/ai-native-sdlc-demo/main/docs/cases/assets/ownership/plan-approved.png)](https://github.com/huangyingting/ai-native-sdlc-demo/blob/6b7a4ddf96f43c6f1980c2e1ed4b568ec429d427/docs/delivery-runs/brownfield-human-gated-delivery/1/plan.md)

**Plan v1 approval.** Open the plan to inspect criterion-to-task mappings.
Planned evidence is an obligation, not proof that checks have already run.

The Plan is an implementation proposal linked to the approved Spec.
Review dependencies, scope and validation, not just a plausible task list.

| Illustrative task | Depends on | Verification |
|---|---|---|
| Add nullable storage and compatible migration | Approved owner semantics | Pre-change schema, rows and field values |
| Implement validated handoff and no-op behavior | Storage API | Invalid input, repeated owner, close/reopen |
| Expose owner on queue and detail | Store results | Actual row/detail metadata, not only options |
| Add intersecting filter/navigation behavior | Domain query contract | Exact sets, clear-one-filter, Back/Forward |
| Verify existing create/status/search paths | Complete increment | Approved regression tests and image smoke |

This table teaches task structure; it is not the actual task-ID ledger.
In the real Plan, every acceptance criterion must map to named tasks and checks.

In the separate historical readiness case, the Plan assumed an existing public HTTP test harness.
Inspection found direct-module/component Vitest tests instead. The reviewer
[requested a correction](https://github.com/huangyingting/ai-native-sdlc-discovery-demo/issues/8#issuecomment-5863070163).
This is why “AI sounds familiar with the repository” is not sufficient evidence.

Use `/sdlc revise plan` with specific missing mappings or unsupported assumptions.
When ready, approve the latest actual version, for example:

```text
/sdlc approve plan v1
```

## 2.6 Treat approval as a change boundary

Before full Plan approval, an explicit Spec revision invalidates earlier Spec
approval and the dependent Plan. After full Plan approval, the system freezes
Spec, Plan and review state and assigns **Tests only**. Scope changes thereafter
need a new Intent, not a hidden adjustment in implementation.

The current case demonstrates decision-driven revisions.
It does **not** prove revocation of an already-approved Spec: v1–v4
were not approved. The separate Spec-revision scenario remains a distinct
rehearsal requirement.

### Exit checklist

- [ ] The problem and unknowns are honest, with no invented customer evidence.
- [ ] Each blocking choice has a recorded answer or owned deferment.
- [ ] Acceptance includes negative and compatibility behavior, not only happy paths.
- [ ] Plan assumptions name real repository surfaces.
- [ ] Tasks map to criteria and validation; dependencies are acyclic.
- [ ] Reviewers understand what will freeze after Plan approval.

Further detail: [current illustrated case](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/ownership.en.md)
and the [operator walkthrough](../../brownfield-human-gated-delivery-walkthrough.md#5-review-and-iterate-on-the-spec).

[Next: review executable contracts and implementation](03-build-verify.md).
