# Copilot CLI Trace Viewer

This directory owns the dependency-free trace parsing and rendering used by
the Copilot CLI demonstration workflow. Its local package manifest makes the
component independently testable without turning the separate demos into npm
workspaces.

## Structure

- `action.yml` exposes the renderer as a local composite GitHub Action.
- `trace-model.mjs` normalizes JSONL and OTLP spans into the canonical model.
- `html-renderer.mjs` renders the trace and dependency views.
- `render-trace-report.mjs` generates summaries, HTML, and canonical trace data.
- `capture-dependency-graph.mjs` captures a dependency graph from generated HTML.
- `web/` contains the shared GitHub Pages application.
- `model-pricing.json` contains fallback model pricing.
- `render-trace-report.test.mjs` covers normalization, validation, rendering, and
  capture behavior.

Workflow-specific request preparation, issue comments, and Pages publishing
remain in `.github/scripts/`; they consume this directory but are not part of
the reusable action.

## Validate

From the repository root:

```sh
npm run test:trace-viewer
```
