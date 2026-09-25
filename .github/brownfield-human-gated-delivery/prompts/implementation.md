Read the approved specification, plan, tests, and expected-failure manifest.
Implement the planned tasks without weakening or rewriting those artifacts.

Make every expected Red test Green, preserve all existing tests, and run the
configured test, lint, build, and container validation. Keep the solution
within the scope and non-goals of the approved specification.

The pull-request body must contain exactly:

```text
Delivery Demo: brownfield-human-gated-delivery
Delivery Intent: #{{intent}}
Delivery Stage: implementation
Delivery Stage Issue: #{{stage_issue}}
```

Do not use closing keywords. This final pull request will be retargeted to
`main` and must contain the complete reviewed product increment.
