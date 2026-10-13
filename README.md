# AI 原生软件交付：方法指南与工程工具集

[English](README.en.md)

本仓库系统化阐述了如何在现代软件工程全生命周期中深度应用 AI：从澄清业务需求、前置审查规格与测试套件，到严格验证代码实现、验收特定版本的容器交付物，并基于运行时的真实反馈实现闭环迭代。

本仓库专注沉淀**核心交付方法论与可复用的工程工具集**。具体的演示案例实录、现场截图与交付审计凭证统一归档于配套的演示仓库
[`ai-native-sdlc-demo`](https://github.com/huangyingting/ai-native-sdlc-demo)，
避免在两个仓库间维护重复的文档副本。

## 从这里开始

| 查阅目的 | 推荐入口 |
|---|---|
| 理解方法论与交付模型 | **[AI 原生软件交付系统指南](docs/guides/ai-native-sdlc/README.md)** |
| 查找全景操作文档 | **[文档导航总览](docs/README.md)** |
| 查阅已完成的真实案例 | **[演示仓库实录与路线](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/README.md)** |
| 从零开始演练端到端交付 | [既有系统分步演练指南](docs/guides/brownfield-human-gated-delivery-walkthrough.md) |
| 配置人工审批门禁与排错 | [交付流程与配置参考](docs/guides/brownfield-human-gated-delivery.md) |
| 参与本仓库的开发与扩展 | [仓库维护与贡献指南](docs/guides/repository-guide.md) |

当前源仓库中的服务台应用保留了**尚未实现工单负责人功能的初始基线**，供练习者从零启动演练；而演示仓库已完整交付并验收了该功能，适合用于观摩交付结果与全流程审计记录。重新开展实践演练时，应从本源仓库导出至独立的空仓库中运行，切勿直接覆盖或重置已完成的演示成果。

## 项目结构

- [demos/it-service-desk/](demos/it-service-desk/)：独立的 Next.js + SQLite 业务演示应用（初始未实现工单负责人）。
- [demos/engineering-lab/](demos/engineering-lab/)：零外部依赖的轻量级工程实验应用。
- [tools/brownfield-demo/](tools/brownfield-demo/README.md)：支持环境初始化、前置预检、本地镜像拉起与交付凭证只读回放的 CLI 工具。
- [tools/engineering-demo/](tools/engineering-demo/README.md)：用于受控变更影响分析、故障根因诊断与 Agent 策略评测的工具包。
- [tools/trace-viewer/](tools/trace-viewer/README.md)：无依赖的调用链路追踪模型解析、HTML 交互渲染与 GitHub Pages 查看器。
- [.github/](.github/)：自动化工作流定义与生命周期适配脚本。

各演示应用独立管理自身的依赖和锁定文件，不使用 npm workspaces。

## 本地验证

请使用 Node.js 24。在仓库根目录下运行自动化测试与工程实验基线：

```sh
npm test
npm --prefix demos/engineering-lab test
```

服务台应用另有独立的[单元测试、静态检查与构建命令](demos/it-service-desk/README.md)。
离线质量检查不会触发调用真实的 Copilot 模型。

## 开展一次交付

请按照[准备步骤](docs/guides/brownfield-human-gated-delivery-walkthrough.md#1-prepare-the-repository)
依次推进：准备未实现目标特性的原始代码基线、审查导出清单、推送到独立的远程仓库、配置权限凭证并执行前置预检。仅执行本地准备命令不会在远端创建任何仓库。

在交付过程中，AI 负责起草文档与代码，配置的审查者把关业务决策并对各阶段具体版本予以批准，GitHub Actions 则严格校验变更文件边界并自动归档审计记录。在基于 Issue 文档审查的流程中，即使自动化容器验证通过，也必须由业务人员明确提交绑定镜像摘要的验收决定后，方可关闭需求。工作流跑通绝不等于已获得正式审批。

在配置权限前，请务必阅读[权限模型与单人审查模式说明](docs/guides/brownfield-human-gated-delivery.md#single-owner-demo-mode)。
未经确认，切勿在源仓库中直接配置完整的演示环境，严禁将私密凭证写入命令或 Issue 讨论中，亦不得擅自绕过必需的安全门禁。

按照[演示就绪标准](docs/guides/brownfield-human-gated-delivery-walkthrough.md#presenter-runbook-and-readiness)，
只有当 3 个由人类真实参与决策的隔离场景均顺利走通后，方可对外宣告达到 **Demo Ready**。
当前已归档的案例不代表这三个场景全部完成，亦不代表系统已具备直接用于生产环境的安全认证。
