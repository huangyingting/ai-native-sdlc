# Copilot CLI agent orchestration demos

Each JSON file contains one runnable demonstration of a reusable agent orchestration pattern. The workflow discovers these manifests through `.github/scripts/demo-catalog.mjs`; demo logic does not belong in the workflow file.

## Directory naming

Use a lowercase kebab-case filename that matches the demo `id` and describes the execution topology or information flow, not a temporary agent persona:

- `single-agent-baseline.json`
- `parallel-research.json`
- `parallel-review.json`
- `critique-and-revision.json`
- `sequential-handoff.json`

Prefer names such as `parallel-*`, `sequential-*`, `fan-out-*`, `handoff-*`, or `consensus-*`. Avoid names tied to a specific model, provider, repository, or custom agent implementation.

## Manifest

Each JSON file contains:

- `id`: stable identifier matching the filename without `.json`.
- `label`: concise user-facing workflow label.
- `legacyLabels`: previous labels accepted when parsing older issues.
- `execution`: `direct`, `fleet`, or `sequential`.
- `description`: one-sentence purpose.
- `defaultPrompt`: runnable example used when no custom task is supplied.
- `instruction`: orchestration contract given to Copilot CLI.

When adding a demo:

1. Add `demos/<demo-id>.json`.
2. Add its label to the workflow-dispatch and issue-form choices.
3. Add or reuse trace evidence validation for its `id`.
4. Document the pattern in `docs/copilot-cli-agent-orchestration-patterns.md`.
5. Run the catalog tests and one real Actions workflow.
