# AI-native SDLC: guides and tooling

[中文](README.md)

Guides and reusable tools for AI-assisted software delivery: clarify requirements,
review specifications and tests, verify implementation, accept an exact artifact,
and learn from operational feedback.

This repository owns reusable guides and tooling. Demonstration narratives,
case records and screenshots live in
[`ai-native-sdlc-demo`](https://github.com/huangyingting/ai-native-sdlc-demo);
the two repositories do not maintain duplicate documentation.

## Start here

| Goal | Entry |
|---|---|
| Learn the method | **[AI-native SDLC guide](docs/guides/ai-native-sdlc/README.en.md)** |
| Find an operator reference | **[Documentation index](docs/README.en.md)** |
| Present the completed example | **[Demo documentation](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/README.en.md)** |
| Run a new delivery | [Step-by-step walkthrough](docs/guides/brownfield-human-gated-delivery-walkthrough.en.md) |
| Configure approvals or recover a failed stage | [Delivery reference](docs/guides/brownfield-human-gated-delivery.en.md) |
| Develop the repository | [Repository guide](docs/guides/repository-guide.en.md) |

The source service desk is an **ownership-free baseline**. The demo repository
already contains the accepted ownership feature. For a new run, export the
source into a new isolated repository; do not reset the completed demo.

## Projects

- [demos/it-service-desk/](demos/it-service-desk/README.en.md) — independent Next.js/SQLite application.
- [demos/engineering-lab/](demos/engineering-lab/README.en.md) — dependency-free engineering fixture.
- [tools/brownfield-demo/](tools/brownfield-demo/README.en.md) — preparation, preflight, image presentation and read-only evidence replay.
- [tools/engineering-demo/](tools/engineering-demo/README.en.md) — bounded impact analysis, diagnosis and strategy evaluation.
- [tools/trace-viewer/](tools/trace-viewer/README.en.md) — trace model, renderer and GitHub Pages client.
- [.github/](.github/) — workflow automation and adapters.

Each demo owns its dependencies and lockfile; these are not npm workspaces.

## Validate

Use Node.js 24:

```sh
npm test
npm --prefix demos/engineering-lab test
```

The service desk has its own [test, lint and build commands](demos/it-service-desk/README.en.md).
Offline checks do not run real Copilot experiments.

## Running a delivery

Follow the [ordered preparation steps](docs/guides/brownfield-human-gated-delivery-walkthrough.en.md#1-prepare-the-repository):
prepare an ownership-free baseline, inspect it, publish the isolated repository,
configure access, then run preflight. Preparation alone does not create a remote.

AI proposes documents and code. Configured reviewers make product decisions and
approve specific versions; Actions checks boundaries and preserves records.
For Issue-based runs, image verification leaves the Intent open until explicit,
digest-bound acceptance. A successful workflow is not itself an approval.

Review [setup permissions and single-owner mode](docs/guides/brownfield-human-gated-delivery.en.md#single-owner-demo-mode)
before applying changes. Do not apply full demo setup to this source repository
without agreement, put credentials in commands or chat, or bypass required checks.

The [readiness policy](docs/guides/brownfield-human-gated-delivery-walkthrough.en.md#presenter-runbook-and-readiness)
requires three distinct Human-led scenarios before a **Demo Ready** claim.
The current completed case does not establish all three or production readiness.
