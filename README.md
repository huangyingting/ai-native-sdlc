# AI-native SDLC: guides and tooling

Guides and reusable tools for AI-assisted software delivery: clarify requirements,
review specifications and tests, verify implementation, accept an exact artifact,
and learn from operational feedback.

本仓库保存 **Guide 和可复用工具**。具体演示、案例记录及截图统一放在
[`ai-native-sdlc-demo`](https://github.com/huangyingting/ai-native-sdlc-demo)，
不在两个仓库中维护重复文档。

## Start here / 从这里开始

| Goal / 目的 | Entry / 入口 |
|---|---|
| Learn the method / 理解方法 | **[AI-native SDLC guide: English / 中文](docs/guides/ai-native-sdlc/README.md)** |
| Find an operator reference / 查找操作说明 | **[Documentation index / 文档导航](docs/README.md)** |
| Present the completed example / 讲解已完成的案例 | **[Demo documentation / 演示文档](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/README.md)** |
| Run a new delivery / 从头完成一次交付 | [Step-by-step walkthrough](docs/guides/brownfield-human-gated-delivery-walkthrough.md) |
| Configure approvals or recover a failed stage / 配置审批、恢复失败阶段 | [Delivery reference](docs/guides/brownfield-human-gated-delivery.md) |
| Develop the repository / 开发与扩展 | [Repository guide](docs/guides/repository-guide.md) |

The source service desk is an **ownership-free baseline**. The demo repository
already contains the accepted ownership feature. For a new run, export the
source into a new isolated repository; do not reset the completed demo.

源仓库中的服务台保留未实现工单负责人的起点。新演示仓库已经交付该功能，
适合查看结果和过程；重新实践时，应从源仓库导出到另一个独立仓库。

## Projects

- [demos/it-service-desk/](demos/it-service-desk/) — independent Next.js/SQLite application.
- [demos/engineering-lab/](demos/engineering-lab/) — dependency-free engineering fixture.
- [tools/brownfield-demo/](tools/brownfield-demo/README.md) — preparation, preflight, image presentation and read-only evidence replay.
- [tools/engineering-demo/](tools/engineering-demo/README.md) — bounded impact analysis, diagnosis and strategy evaluation.
- [tools/trace-viewer/](tools/trace-viewer/) — trace model, renderer and GitHub Pages client.
- [.github/](.github/) — workflow automation and adapters.

Each demo owns its dependencies and lockfile; these are not npm workspaces.

## Validate

Use Node.js 24:

```sh
npm test
npm --prefix demos/engineering-lab test
```

The service desk has its own [test, lint and build commands](demos/it-service-desk/README.md).
Offline checks do not run real Copilot experiments.

## Running a delivery

Follow the [ordered preparation steps](docs/guides/brownfield-human-gated-delivery-walkthrough.md#1-prepare-the-repository):
prepare an ownership-free baseline, inspect it, publish the isolated repository,
configure access, then run preflight. Preparation alone does not create a remote.

AI proposes documents and code. Configured reviewers make product decisions and
approve specific versions; Actions checks boundaries and preserves records.
For Issue-based runs, image verification leaves the Intent open until explicit,
digest-bound acceptance. A successful workflow is not itself an approval.

Review [setup permissions and single-owner mode](docs/guides/brownfield-human-gated-delivery.md#single-owner-demo-mode)
before applying changes. Do not apply full demo setup to this source repository
without agreement, put credentials in commands or chat, or bypass required checks.

The [readiness policy](docs/guides/brownfield-human-gated-delivery-walkthrough.md#presenter-runbook-and-readiness)
requires three distinct Human-led scenarios before a **Demo Ready** claim.
The current completed case does not establish all three or production readiness.
