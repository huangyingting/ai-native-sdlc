Create only
`docs/delivery-runs/brownfield-human-gated-delivery/{{intent}}/spec.md`.

Translate the parent Intent into a technology-aware behavioral specification.
Do not change application code, tests, configuration, or other documentation.

Use these exact top-level sections:

- `# Specification`
- `## Intent`
- `## Scope`
- `## Non-goals`
- `## Actors`
- `## Constraints`
- `## Acceptance scenarios`

Give every scenario a stable heading such as `### AC-1: Description` and include
explicit `**Given**`, `**When**`, and `**Then**` lines. Cover error and
compatibility behavior, not only the happy path.

The pull-request body must contain exactly:

```text
Delivery Demo: brownfield-human-gated-delivery
Delivery Intent: #{{intent}}
Delivery Stage: spec
Delivery Stage Issue: #{{stage_issue}}
```

Do not use closing keywords.
