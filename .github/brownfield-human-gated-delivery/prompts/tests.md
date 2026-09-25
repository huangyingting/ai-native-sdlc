Read the approved specification and plan. Write executable tests before
implementation and create
`docs/delivery-runs/brownfield-human-gated-delivery/{{intent}}/expected-failures.json`.

Do not change production code, the approved specification, or the approved
plan. Existing tests must remain Green. New tests must compile but fail because
the planned behavior is not implemented.

The manifest shape is:

```json
{
  "version": 1,
  "intent": {{intent}},
  "tests": [
    {
      "name": "exact Vitest full test name",
      "acceptance": ["AC-1"]
    }
  ]
}
```

List every and only expected failing test. The CI gate rejects missing,
unexpected, infrastructure, syntax, and unrelated failures.

The pull-request body must contain exactly:

```text
Delivery Demo: brownfield-human-gated-delivery
Delivery Intent: #{{intent}}
Delivery Stage: tests
Delivery Stage Issue: #{{stage_issue}}
```

Do not use closing keywords.
