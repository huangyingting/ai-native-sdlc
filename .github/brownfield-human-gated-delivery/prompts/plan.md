Read the approved
`docs/delivery-runs/brownfield-human-gated-delivery/{{intent}}/spec.md`, then
create or revise only
`docs/delivery-runs/brownfield-human-gated-delivery/{{intent}}/plan.md`.

## Human review loop

Read the approved specification and review discussion before each revision.
Surface open questions, trade-offs, and risks in the PR description. If a
planning decision would change approved behavior, stop and flag the conflict
for the Human; do not rewrite the specification or quietly change its scope.

When the Human requests changes or asks `@copilot` to revise, update this plan
in the same pull request and branch. Summarize the changes and remaining
questions for re-review, retain the metadata below, and keep task IDs stable
where the work is unchanged.

Repeat as many feedback rounds as needed. Only explicit Human approval of the
latest revision and passing required checks permit merging. Comments, resolved
threads, and passing CI alone are not approval. Do not start the next stage,
write tests or implementation, approve or merge your own PR, or close the stage
Issue. Lifecycle automation advances after the approved PR merges.

## Artifact format

Use these exact top-level sections:

- `# Implementation plan`
- `## Acceptance mapping`
- `## Tasks`
- `## Risks and migrations`
- `## Validation`

Give every task a stable heading such as `### TASK-1: Description`. Each task
must include `Depends on:`, `Acceptance:`, `Surfaces:`, and `Validation:` lines.
Use `Depends on: none` for root tasks. Map every acceptance scenario to at
least one task and keep dependencies acyclic.

Do not change the approved specification, application code, tests, or
configuration.

The pull-request body must include these metadata lines exactly, alongside a
summary and any open questions for Human review:

```text
Delivery Demo: brownfield-human-gated-delivery
Delivery Intent: #{{intent}}
Delivery Stage: plan
Delivery Stage Issue: #{{stage_issue}}
```

Do not use closing keywords.
