<a id="repository-guide"></a>
# 仓库指南

[English](repository-guide.en.md)

本指南介绍仓库结构、本地开发、GitHub 工作流、追踪处理、发布与运维防护。

如果你想了解端到端交付方法，而不是仓库管理，请从
[AI 原生 SDLC 图解手册（中文 / English）](ai-native-sdlc/README.md)开始。
手册通过六组中英对应章节解释方法。
案例叙述、截图和演示路线放在
[演示文档](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/README.md)中。

<a id="repository-structure"></a>
## 仓库结构

仓库将可运行演示与可复用工具分开：

- [`.github/`](../../.github) 包含 Issue 表单、工作流、MCP 配置，
  以及用于请求准备、Issue 评论和 Pages 发布的小型 Node.js 适配器。
- [`demos/`](../../demos) 包含可独立安装的应用。
  每个演示拥有自己的清单、锁文件、运行时要求、文档和按路径限定的 CI。
- [`tools/trace-viewer/`](../../tools/trace-viewer) 包含无依赖的追踪模型、
  渲染器、本地复合 Action 和共享 Pages 客户端。
- [`tools/brownfield-demo/`](../../tools/brownfield-demo/README.md) 包含
  可复用的准备、预检、容器展示和回放 CLI。
  演示专属场景清单位于
  [`demos/it-service-desk/.github/brownfield-human-gated-delivery/scenarios/`](../../demos/it-service-desk/.github/brownfield-human-gated-delivery/scenarios)。
- [`docs/`](../README.md) 包含文档索引：
  `guides/` 存放可复用操作说明，`research/` 存放带日期的评估，
  `assets/traces/` 存放指南专用图片。
  演示案例及其资源应放在 `ai-native-sdlc-demo/docs/`，而不是在本地再留一份副本。
- [`AGENTS.md`](../../AGENTS.md) 定义全仓库智能体指导；嵌套指令文件补充项目专属规则。

演示项目刻意不采用 npm workspaces。
这样，未来的 TypeScript 和 JavaScript 演示可以使用不同框架、依赖版本与运行时，
不必把依赖图绑定在一起。
根包保持无依赖，只提供仓库检查以及存量项目设置和展示命令。

<a id="naming-conventions"></a>
## 命名约定

- 项目目录、脚本、工作流、Issue 表单和文档文件使用小写 kebab-case。
- 按脚本产物或动作命名，例如 `build-demo-result-comment.mjs`、
  `render-trace-report.mjs` 和 `publish-trace-site.mjs`。
- 专门调用 Copilot CLI 的工作流和表单，文件名包含 `copilot-cli`。
- 领域模块使用单数名称，例如 `ticket.ts`；
  实现文件采用基于职责的后缀，例如 `ticket-store.ts`。
- 保留框架要求的名称，例如 `page.tsx`、`layout.tsx`、`actions.ts`、
  `action.yml` 和 `index.html`。
- 交互产品称为 **Copilot CLI Trace Viewer**，单次运行的渲染结果称为
  **trace report**（追踪报告），已发布报告集合称为 **trace site**（追踪站点），
  智能体/模型/工具可视化称为 **dependency graph**（依赖图）。

<a id="adding-a-demo"></a>
## 添加演示

每个演示都是 `demos/<demo-name>/` 下的自包含项目。添加时：

1. 包含项目 README、清单和包管理器锁文件。
2. 记录所需运行时。
3. 在项目清单中定义测试、lint 和构建脚本。
4. 在 `.github/workflows/` 下添加按路径限定的工作流。
5. 将演示加入根 README 的项目列表。

演示依赖必须留在演示项目中，不要加入根包。

<a id="local-development"></a>
## 本地开发

仓库推荐使用 Node.js 24。

从根目录运行仓库自动化与追踪查看器测试：

```sh
npm test
```

单独验证 IT 服务台：

```sh
cd demos/it-service-desk
npm ci
npm test
npm run lint
npm run build
```

服务台使用内置 `node:sqlite` 模块，会自动创建并填充 `data/service-desk.db`。
删除这个本地文件即可重置数据。

<a id="brownfield-human-gated-delivery-demo"></a>
## 存量项目人工门禁交付演示

IT 服务台是存量项目人工门禁交付闭环中的现有应用。
对于新 Intent，父 Issue 是 Spec/Plan 评审中心：
完整渲染的 Markdown 修订评论、当前文档链接、讨论和显式人工命令，
在工程交接前都留在这里。
**Brownfield Delivery · Documents**（`brownfield-human-gated-delivery-documents.yml`）
在 Actions 中运行只读 Copilot CLI 生成，并将可信发布与批准分设为独立作业。
它不构建应用，也不引入外部服务、UI 或应用依赖。
可选的本地展示工具包与这个 Actions 工作流彼此独立。

仓库自定义 Actions 命令包括 `/sdlc revise spec`、`/sdlc revise plan`
（反馈写在后续行），以及 `/sdlc approve spec v2`、`/sdlc approve plan v1`
这类带版本批准。请由人工在父 Intent 下新建顶层评论提交。
这些不是内置 `@copilot` 命令；普通讨论不会调用 AI，也不会批准文档。
`/sdlc retry` 仅恢复文档生成或交接，不提供新反馈；
工程 CI、Advance 或 Publish 失败时，须先修复原因，再重新运行实际失败的 Action。
每次运行都会核对持久化命令队列，因此重跑或带 `issue_number` 的手动 Documents 触发
可以恢复处理，不会丢失被后续运行取代的待运行任务中的命令。

每次修订与批准都保存在 `brownfield-documents/<intent>` 分支的
`docs/delivery-runs/brownfield-human-gated-delivery/<intent>/` 下，
文件为 `spec.md`、`plan.md` 和 `document-review.json`。
批准记录把已审文档的版本/哈希与批准命令 ID/正文、人工 ID/登录名/时间绑定；
它不另外保存不可变的已渲染修订评论 ID/正文快照。
编辑或删除已处理的批准评论不会撤销批准。
只有当前配置中具有仓库写权限的人（包括配置团队的成员）才能满足 `minimumApprovals`；
机器人不能。Issue 批准没有 PR 原生的独立评审限制。

交接前修改 Spec 会使 Spec 批准和现有 Plan 失效。
每份 Plan 都链接其已批准的 Spec。
Plan 获得全部批准后，文档冻结，自动化从已批准文档提交创建
`brownfield-delivery/<intent>`，关闭内部 Spec/Plan 跟踪 Issue，
只把 TDD Tests 分配给 Coding Agent。
Tests 和 Implementation PR 会保留全部已批准文档与批准状态 blob。
受控 Red、Green、GHCR 发布和临时容器验证仍然适用。
对所有基于 Issue 的 `issue-v1` 运行（包括升级后的现有运行），
冒烟测试成功后 Intent 仍保持打开，等待按配置的 Implementation 评审人策略和人数要求进行
**人工验收**。
接受/拒绝命令包含精确的 `sha256:<64hex>` 摘要与实际观测结果，
并绑定当前已验证的合并 SHA、Actions 运行 ID 和尝试次数。
只有验收接受才完成运行并删除工程分支；
重新验证会使先前验收失效，拒绝会阻止接受，直到出现新的验证尝试。

可变运维记录与封存的 `document-review.json` 分开：
`brownfield-runs/<intent>` 保存
`docs/delivery-runs/brownfield-human-gated-delivery/<intent>/run-state.json`。
可信工作流机器人账本证明保护该记录的来源。
缺少必需且带证明的文档/运行分支时会显式失败；恢复不得重置批准历史。
文档与运行分支保留供回放使用。
有写权限的人可以在 Intent 下提交全新、未编辑的
`/sdlc help`、`/sdlc status`、`/sdlc pause`、`/sdlc resume` 和 `/sdlc cancel` 评论。
暂停/取消限制后续工作，使策略检查保持待定，并禁用自动合并；
它们约束后续文档发布、发布结果解析和阶段推进，不影响已在运行的工作或此前合并。
Documents 工作流负责路由这些命令，并将运行控制/清理失败与生成失败分开报告。
取消是终态，保留 Issue、PR 和分支。
需要继续时创建新 Intent；合并后的关联代码或范围修复也使用新 Intent。
已有旧版文档 PR Intent 保留原有完成行为，不追溯迁移。
参见[命令契约](brownfield-human-gated-delivery.md#run-controls-and-human-acceptance)。

在 GitHub Web 上运行演示，请使用[分步演练](brownfield-human-gated-delivery-walkthrough.md)。
评审人配置、凭据、分支规则、阶段产物和失败行为，见
[存量项目人工门禁交付演示](brownfield-human-gated-delivery.md)。
这个生命周期把只读文档生成与可写的 Coding Agent 工程阶段结合起来，
仍与下文的只读 Copilot CLI 编排演示分开。

需要可重复的前置配置时，使用
[`npm run setup:brownfield`](brownfield-human-gated-delivery.md#run-the-setup-script)。
除非显式传入 `--apply`，否则只预览变更；默认保留现有保护，
并报告需要人工配置的前置条件。
显式 [`--single-owner` 模式](brownfield-human-gated-delivery.md#single-owner-demo-mode)
将原生批准数改为零，同时保留 PR 阶段已配置的人工批准策略。
新的 Issue 文档批准不需要此模式。
设置工具无法注册缺失的 Actions 工作流。
请先把已评审工作流文件发布到远程 `main`，等待 GitHub 注册；
设置工具可以验证注册情况，并启用已有但已禁用的工作流。
Copilot CLI 生成另外需要 `copilot-requests: write` 和 CLI 使用资格，
而不是用于可写分配的令牌。
托管规则集只覆盖 `main` 和 `brownfield-delivery/**`。
完整设置还会检查可信模块 `runs.mjs`、`run-core.mjs`、
`state-store.mjs` 已发布到 `main`。
文档与运行记录分支需要可信自动化写入，而不是规则集绕过。
**完整 `--apply` 会创建缺失的托管规则集，包括 `main` 保护。**
本仓库的 `main` 刻意不设保护；没有明确同意，不要在这里运行完整 apply。
只读预览不写入。

<a id="presentation-and-readiness"></a>
### 展示与就绪状态

从 `npm run demo:brownfield -- help` 开始，精确选项见
[工具包 README](../../tools/brownfield-demo/README.md)。
在一个独立、尚不存在的目录中准备固定源提交；
绝不复制秘密或本地数据库、重置源检出，或隐式创建远程仓库。
演示仓库的评审人配置必须显式更新并发布。
只读预检区分“已配置的设置”和“已证明的就绪状态”，
无法证明令牌权限、计费或端到端行为。

按摘要展示已验证镜像，只清理工具包管理的容器，
从真实运行证据生成已转义、只读的 HTML 回放。
工具包和冒烟验证都不会自动部署在线托管服务。
[演示者运行手册](brownfield-human-gated-delivery-walkthrough.md#presenter-runbook-and-readiness)
要求完成三次隔离运行：正常交付、Spec 变化导致 Plan 失效、失败恢复。
记录真实人工批准、测试结果和证据链接；
此次更新本身不能证明已经完成任何现场演练。

<a id="copilot-cli-demonstration-workflow"></a>
## Copilot CLI 演示工作流

**Copilot CLI Agent Demos** 工作流可手动触发，
也可由带 `copilot-agent-demo` 标签、已授权的 Issue 触发。
每个专属 Issue 表单对应一种编排模式，提供可编辑任务，
并通过内部 `copilot-pattern:*` 标签路由。

工作流会：

1. 验证并准备所选任务和编排契约。
2. 使用所选编排模型和子智能体模型运行 Copilot CLI。
3. 在运行器临时目录中捕获 OpenTelemetry JSONL。
4. 构建 Job Summary、标准追踪数据、离线 HTML 报告和依赖图。
5. 上传报告产物，把结果与追踪诊断回贴到来源 Issue。
6. 通过独立 Pages 工作流发布成功的标准追踪数据。

可选模式包括直接执行、并行委派、质疑—修订和顺序流水线。
执行模型、选择建议和验证证据，见
[Copilot CLI 智能体编排模式](copilot-cli-agent-orchestration-patterns.md)。

<a id="models-and-execution"></a>
## 模型与执行

每次运行选择一个 **Orchestrator model**（编排模型）和一个
**Subagent model**（子智能体模型），目前均默认为 `gpt-6-luna`。
编排模型规划委派并综合最终答复；
动态创建的子智能体会收到使用所选子智能体模型的指令。

并行演示使用 `--fleet`。
顺序演示允许编排智能体在前一阶段返回后再创建下一个子智能体。
验证依据实际观测到的 OpenTelemetry 证据，而不是预设智能体名称。

仓库所有者需要 Copilot 使用资格和可用额度。
组织仓库还需要启用 Copilot CLI 组织计费策略。

<a id="tool-and-network-access"></a>
## 工具与网络访问

工作流使用本次运行的短期 `GITHUB_TOKEN` 认证 Copilot，
仅授予工作流所需权限。
仓库中的 [`.github/mcp.json`](../../.github/mcp.json)
提供来自公开 Microsoft Learn MCP 服务器的两个只读工具。

通用工作流不会预批准外部 URL。
默认的并行 AWS/Azure 场景可以显式允许 `docs.aws.amazon.com`；
Azure 研究使用 Microsoft Learn MCP。
任务不需要 AWS 文档时，选择 **Block all external URLs**。

<a id="trace-viewer"></a>
## 追踪查看器

[`tools/trace-viewer/`](../../tools/trace-viewer)
既是本地复合 Action，也是一套独立命令行实现：

- `trace-model.mjs` 规范化直接 CLI JSONL 以及 OTLP
  `resourceSpans[].scopeSpans[].spans[]` 封装。
- `html-renderer.mjs` 渲染追踪与依赖视图。
- `render-trace-report.mjs` 生成摘要、HTML 和标准追踪数据。
- `capture-dependency-graph.mjs` 捕获 Issue 评论所用的图。
- `web/` 包含共享 GitHub Pages 应用。

查看器支持追踪与依赖的联动选择、过滤、按模型计价、
检查面板汇总，以及 SVG/PNG 图导出。
追踪缺失或格式错误会明确显示失败，包括 Copilot 本身失败的情况。

OpenTelemetry 状态 `UNSET`（`code: 0`）在没有错误状态或错误属性时视为成功。
即使禁用消息捕获，失败 span 仍保留失败原因。
一次快速失败的工具调用可能是有意的权限策略拒绝，而非基础设施故障。

<a id="message-capture-and-redaction"></a>
## 消息捕获与脱敏

演示表单默认启用详细请求与响应捕获。
如果载荷不应出现在公开报告或产物中，请选择 **Metadata only**。

原始 OpenTelemetry JSONL 绝不上传。
追踪模型只会从获准的运行器临时文件中补全大型 Copilot 工具结果，
对内容脱敏，并在 1 MiB 安全上限内嵌入载荷。
绝对运行器路径不会发布。

脱敏尽力而为，并非绝对保证。
本仓库中应把 GitHub Pages 报告、工作流产物和 Job Summary 视为公开内容；
私有提示词、敏感仓库或可能包含秘密的会话应使用仅元数据模式。

<a id="cost-calculation"></a>
## 成本计算

OpenTelemetry 提供 `gen_ai.usage.cost` 时，查看器直接使用该值。
否则会规范化实际观测到的模型名，读取
[`model-pricing.json`](../../tools/trace-viewer/model-pricing.json)，
选择默认或长上下文价格档，并根据观测到的输入、输出和缓存令牌数估算成本。

未知模型或缺少令牌用量的调用显示 `—`，并从总额中排除，
不会套用不相关模型的费率。
工作流可以传入 `pricing-path` 替换随包提供的价格目录。

<a id="github-pages-publishing"></a>
## GitHub Pages 发布

每次成功演示运行都会上传 `copilot-trace-viewer` 产物，
其中包含离线 HTML 报告和标准追踪数据。
Pages 发布器会：

1. 使用其工作流令牌下载产物。
2. 验证标准数据结构。
3. 只将 `trace-data.json` 发布到 `/traces/<run-id>.json`。
4. 使用最新成功运行更新共享 `/viewer/` 应用。

浏览器从不接收 GitHub 令牌，也不直接抓取 Actions 产物。
GitHub Pages 从 `gh-pages` 分支根目录部署。
发布串行执行，避免并发运行相互覆盖；
每次运行都保留一个不可变追踪 URL。

Issue 评论始终包含 Mermaid 依赖图。
若还希望使用生成的 PNG，请给 `AGENT_TRACE_MEDIA_TOKEN`
配置一个能访问仓库的用户令牌。
user-attachments 端点不接受短期 Actions 令牌，
因此可选令牌缺失或上传不可用时，工作流回退到 Mermaid。

<a id="references"></a>
## 参考资料

- [在 GitHub Actions 中使用 Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli-in-actions)
- [Copilot CLI 工具权限](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools)
- [Copilot CLI 工作区 MCP 配置](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers)
- [Microsoft Learn MCP 工具](https://learn.microsoft.com/en-us/training/support/mcp-developer-reference)
- [Copilot Actions 计费](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/copilot-cli-in-github-actions)
