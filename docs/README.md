# 文档导航

[English](README.en.md)

**指南讲“怎么做”，演示文档讲“这次做了什么”。**

本仓库保存方法和操作指南；演示仓库保存具体案例、讲解路线、交付记录和截图。
同一份内容只维护一处，通过链接关联，不再复制整套文档。
中文为默认版本，英文另设独立页面，可通过页首入口切换。
操作命令、代码、原始截图、实验输入和已冻结的交付文件保留原文，
不为了统一语言而改写可执行内容或证据。

## 按目的阅读

| 目的 | 入口 |
|---|---|
| 理解方法 | [AI 原生软件交付指南](guides/ai-native-sdlc/README.md) |
| 讲解已完成的案例 | [演示文档](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/README.md) |
| 从头完成一次交付 | [分步操作指南](guides/brownfield-human-gated-delivery-walkthrough.md) |
| 配置审批与排查问题 | [交付参考](guides/brownfield-human-gated-delivery.md) |
| 验证发布与恢复 | [可靠性指南](guides/brownfield-reliability-loops.md) |
| 变更分析与 Agent 评估 | [工程实验指南](guides/engineering-judgment-demos.md) |
| 选择编排模式 | [编排指南](guides/copilot-cli-agent-orchestration-patterns.md) |
| 开发与扩展仓库 | [仓库维护指南](guides/repository-guide.md) |

## 内容放在哪里

```text
ai-native-sdlc/docs/
  README.md                 中文文档入口
  README.en.md              英文文档入口
  guides/                   方法、操作步骤和参考说明
    ai-native-sdlc/          分开维护的中英文六章指南
  research/                 注明日期的分析和设计依据
  assets/traces/            追踪指南使用的配图

ai-native-sdlc-demo/docs/
  README.md                 中文演示入口
  README.en.md              英文演示入口
  presenter.md              中文演示路线
  presenter.en.md           英文演示路线
  cases/                    案例正文与截图
  delivery-runs/            工作流管理的版本化交付文件
```

## 延伸阅读

- [需求意图、规格与计划的研究](research/ai-native-sdlc-early-stage-research.md)
- [开发、验证、部署与运行的研究](research/ai-native-sdlc-delivery-operations-research.md)

研究文档保留其评估日期，不作为当前演示的进度或验收结论。
