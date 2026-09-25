Read the approved
`docs/delivery-runs/brownfield-human-gated-delivery/{{intent}}/spec.md`, then
create only
`docs/delivery-runs/brownfield-human-gated-delivery/{{intent}}/plan.md`.

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

The pull-request body must contain exactly:

```text
Delivery Demo: brownfield-human-gated-delivery
Delivery Intent: #{{intent}}
Delivery Stage: plan
Delivery Stage Issue: #{{stage_issue}}
```

Do not use closing keywords.
