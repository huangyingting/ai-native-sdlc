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

## Set up the brownfield demo

With Node.js 24+ and GitHub CLI authenticated as a repository administrator:

```sh
npm run setup:brownfield -- --repo huangyingting/ai-native-sdlc
```

This previews prerequisites without changing GitHub. Add `--apply` to configure
missing settings. See the [setup guide](docs/brownfield-human-gated-delivery.md#run-the-setup-script)
for secure token entry, existing-Intent recovery, and remaining manual checks.

## Documentation

- [Step-by-step brownfield demo](docs/brownfield-human-gated-delivery-walkthrough.md)
  — run the human Intent, iterative Spec/Plan reviews, TDD, and verified delivery
  demonstration through GitHub Web.
- [Repository guide](docs/repository-guide.md) — structure, local development,
  workflows, trace publishing, security, and operations.
- [Brownfield Human-Gated Delivery demo](docs/brownfield-human-gated-delivery.md)
  — safely evolve an existing application through Intent, Spec, Plan, TDD,
  implementation, delivery, and Human Review gates.
- [Agent orchestration patterns](docs/copilot-cli-agent-orchestration-patterns.md)
  — pattern selection, execution diagrams, and trace evidence.
- [Adding a demo](docs/repository-guide.md#adding-a-demo)
- [IT service desk](demos/it-service-desk/README.md)
- [Trace viewer](tools/trace-viewer/README.md)
- [Agent instructions](AGENTS.md)
