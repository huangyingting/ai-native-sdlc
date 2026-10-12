# Documentation / 文档导航

**This repository explains how to work. The demo repository records what was delivered.**

本仓库保存方法和操作指南；演示仓库保存具体案例、讲解路线、交付记录和截图。
同一份内容只维护一处，通过链接关联，不再复制整套文档。

## Choose a path / 按目的阅读

| Goal / 目的 | Entry / 入口 |
|---|---|
| Understand the method / 理解方法 | [AI-native SDLC guide / 中英文指南](guides/ai-native-sdlc/README.md) |
| Present the completed example / 讲解已完成的案例 | [Demo documentation / 演示文档](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/README.md) |
| Run a delivery from scratch / 从头完成一次交付 | [Step-by-step walkthrough / 分步操作](guides/brownfield-human-gated-delivery-walkthrough.md) |
| Configure approvals and troubleshoot / 配置审批与排查问题 | [Delivery reference / 交付参考](guides/brownfield-human-gated-delivery.md) |
| Validate release and recovery behavior / 验证发布与恢复 | [Reliability guide / 可靠性指南](guides/brownfield-reliability-loops.md) |
| Analyze changes and evaluate agents / 变更分析与 Agent 评估 | [Engineering experiments / 工程实验指南](guides/engineering-judgment-demos.md) |
| Choose an orchestration pattern / 选择编排模式 | [Orchestration guide / 编排指南](guides/copilot-cli-agent-orchestration-patterns.md) |
| Develop or extend the repository / 开发与扩展仓库 | [Repository guide / 仓库维护指南](guides/repository-guide.md) |

## Where content belongs / 内容放在哪里

```text
ai-native-sdlc/docs/
  README.md                 documentation entry point
  guides/                   methods, procedures and references
    ai-native-sdlc/          six matching Chinese/English chapters
  research/                 dated analysis and design rationale
  assets/traces/            images used by the trace guide

ai-native-sdlc-demo/docs/
  README.md                 demonstration entry point
  presenter.md              presentation route
  cases/                    completed cases and their screenshots
  delivery-runs/            workflow-managed, versioned delivery artifacts
  archive/                  separate, still-verifiable historical examples
```

### Supporting research / 延伸阅读

- [Intent, Spec and Plan](research/ai-native-sdlc-early-stage-research.md)
- [Build, Verify, Deploy and Operate](research/ai-native-sdlc-delivery-operations-research.md)

These are dated assessments, not the current demo's progress report.
研究文档保留其评估日期，不作为演示进度或验收结论。
需要查阅历史案例时，从演示仓库的
[归档索引](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/archive/README.md)进入。
已失效仓库的案例与截图不再作为文档维护对象。
