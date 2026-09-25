# ai-native-sdlc

Demonstrations and tooling for exploring AI-native software delivery with
GitHub Copilot CLI, dynamic agent orchestration, OpenTelemetry traces, and
Issue-to-PR workflows.

## Projects

- [`demos/it-service-desk/`](demos/it-service-desk/) — independent Next.js and
  SQLite service-desk demonstration.
- [`tools/trace-viewer/`](tools/trace-viewer/) — dependency-free trace model,
  renderer, composite action, and GitHub Pages client.
- [`.github/`](.github/) — issue forms, workflow automation, and publishing
  adapters.

## Validate

Use Node.js 24 and run:

```sh
npm test
```

Each demo owns its dependencies and additional validation commands.

## Documentation

- [Repository guide](docs/repository-guide.md) — structure, local development,
  workflows, trace publishing, security, and operations.
- [Agent orchestration patterns](docs/copilot-cli-agent-orchestration-patterns.md)
  — pattern selection, execution diagrams, and trace evidence.
- [Demo project conventions](demos/README.md)
- [IT service desk](demos/it-service-desk/README.md)
- [Trace viewer](tools/trace-viewer/README.md)
- [Agent instructions](AGENTS.md)
