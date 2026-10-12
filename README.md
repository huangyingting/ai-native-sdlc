# AI 原生软件交付：指南与工具

[English](README.en.md)

本仓库介绍如何在软件交付中使用 AI：澄清需求、审查规格和测试、验证实现、
验收指定版本的交付物，再根据运行反馈持续改进。

这里保存**方法指南和可复用工具**。具体演示、案例记录及截图统一放在
[`ai-native-sdlc-demo`](https://github.com/huangyingting/ai-native-sdlc-demo)，
不在两个仓库中维护重复文档。

## 从这里开始

| 目的 | 入口 |
|---|---|
| 理解方法 | **[AI 原生软件交付指南](docs/guides/ai-native-sdlc/README.md)** |
| 查找操作说明 | **[文档导航](docs/README.md)** |
| 讲解已完成的案例 | **[演示文档](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/README.md)** |
| 从头完成一次交付 | [分步操作指南](docs/guides/brownfield-human-gated-delivery-walkthrough.md) |
| 配置审批、恢复失败阶段 | [交付参考](docs/guides/brownfield-human-gated-delivery.md) |
| 开发与扩展仓库 | [仓库维护指南](docs/guides/repository-guide.md) |

源仓库中的服务台保留**尚未实现工单负责人的基线**。演示仓库已经交付该功能，
适合查看结果和过程；重新实践时，应从源仓库导出到另一个独立仓库，不要重置已完成的演示。

## 项目

- [demos/it-service-desk/](demos/it-service-desk/)：独立的 Next.js／SQLite 应用。
- [demos/engineering-lab/](demos/engineering-lab/)：不依赖第三方包的工程实验应用。
- [tools/brownfield-demo/](tools/brownfield-demo/README.md)：准备环境、执行预检、展示镜像和只读回放交付证据。
- [tools/engineering-demo/](tools/engineering-demo/README.md)：限定范围的影响分析、故障诊断和策略评估。
- [tools/trace-viewer/](tools/trace-viewer/README.md)：调用追踪模型、渲染器和 GitHub Pages 客户端。
- [.github/](.github/)：自动化工作流与适配脚本。

各演示应用独立管理依赖和锁文件，不使用 npm workspaces。

## 验证

使用 Node.js 24，在仓库根目录执行：

```sh
npm test
npm --prefix demos/engineering-lab test
```

服务台另有自己的[测试、静态检查和构建命令](demos/it-service-desk/README.md)。
离线检查不会运行真实的 Copilot 实验。

## 开展一次交付

按[准备步骤](docs/guides/brownfield-human-gated-delivery-walkthrough.md#1-prepare-the-repository)
依次操作：准备未实现目标功能的基线、检查导出内容、发布独立仓库、配置访问权限、
执行预检。仅执行准备命令不会创建远程仓库。

AI 提出文档和代码；配置中的审查者作出产品决定，并批准具体版本；
GitHub Actions 检查变更边界并保存记录。采用 Issue 文档审查的交付，
即使镜像验证通过，也要等到明确提交绑定镜像摘要的验收决定后才关闭需求。
工作流成功不等于已经批准。

应用配置前，请先阅读[权限与单人审查模式](docs/guides/brownfield-human-gated-delivery.md#single-owner-demo-mode)。
未经确认，不要在源仓库执行完整的演示环境配置，不要将凭据写入命令或聊天，
也不要绕过必需检查。

按照[演示就绪要求](docs/guides/brownfield-human-gated-delivery-walkthrough.md#presenter-runbook-and-readiness)，
只有三种由人实际参与决策的独立场景均完成后，才能宣布达到 **Demo Ready**。
当前已完成的案例不代表这三个场景全部完成，也不证明已经具备生产条件。
