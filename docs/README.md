# 文档导航总览

[English](README.en.md)

**方法指南阐明工程方法论与落地范式（“如何做”），演示文档记录特定演练的客观过程（“做了什么”）。**

本仓库专注沉淀系统化的交付方法论与操作指南；配套的演示仓库则完整保存了具体案例、现场讲解路线、版本化交付审计记录与高清截图。所有内容遵循单一事实源（Single Source of Truth）原则，通过超链接有机互联，杜绝维护冗余副本。中文与英文文档独立成篇，可随时通过页面顶部的语言切换链接跳转。所有命令行指令、代码片段、原始截图、实验输入数据以及已冻结归档的交付凭据均保留原始格式与内容，确保技术凭据真实可审计。

## 按目标阅读导航

| 阅读目标 | 推荐入口 |
|---|---|
| 理解 AI 原生交付模型与核心原则 | [AI 原生软件交付系统指南](guides/ai-native-sdlc/README.md) |
| 查阅已完成的完整实战案例 | [演示仓库实录与进度](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/README.md) |
| 从零开始完成一轮端到端交付 | [既有系统分步演练指南](guides/brownfield-human-gated-delivery-walkthrough.md) |
| 配置人工审批门禁与排错恢复 | [交付流程与配置参考指南](guides/brownfield-human-gated-delivery.md) |
| 验证版本准入拦截与自动回滚 | [系统发布与恢复可靠性指南](guides/brownfield-reliability-loops.md) |
| 开展变更影响分析与 Agent 策略评估 | [工程实验设计与判定器指南](guides/engineering-judgment-demos.md) |
| 横向评测 SDD（规格驱动开发）框架 | [SDD 基准评测用例指南](guides/sdd-benchmark-use-cases.md) |
| 选择适用的 CLI 智能体编排模式 | [Copilot CLI Agent 编排模式指南](guides/copilot-cli-agent-orchestration-patterns.md) |
| 参与本仓库工具的开发与扩展维护 | [仓库维护与贡献指南](guides/repository-guide.md) |

## 内容架构分布

```text
ai-native-sdlc/docs/
  README.md                 中文文档导航入口
  README.en.md              英文文档导航入口
  guides/                   交付方法论、操作规程与权威参考
    ai-native-sdlc/          中英双语独立维护的六章核心交付指南
  research/                 注明评估日期的前沿研究与架构设计依据
  assets/traces/            调用追踪指南的流程图表与拓扑配图

ai-native-sdlc-demo/docs/
  README.md                 中文演示实录导航
  README.en.md              英文演示实录导航
  presenter.md              中文演示讲解路线（30 分钟标准大纲）
  presenter.en.md           英文演示讲解路线
  cases/                    各阶段案例图文正文、度量报告与过程截图
  delivery-runs/            由 GitHub Actions 自动化归档的版本化交付审计文件
```

## 延伸阅读与前沿研究

- [需求意图澄清、规格说明与计划编制的深入研究](research/ai-native-sdlc-early-stage-research.md)
- [编码实现、独立验证、容器部署与运维保障的深入研究](research/ai-native-sdlc-delivery-operations-research.md)

研究文档明确载明了其完成与评估的特定时间点，仅作为架构设计的背景参考，不代表当前演示案例的即时进度或验收结论。
