<a id="ai-native-sdlc-brownfield-demo-step-by-step-walkthrough"></a>
# AI 原生 SDLC 既有系统演示：分步演练指南

[English](brownfield-human-gated-delivery-walkthrough.en.md)

本指南用于在现有 IT 服务台上，演示一轮完整、由人工逐关把关的功能交付。
所有生命周期决策都在 GitHub 网页中完成。
最终验收前，必须由人实际操作经过验证的镜像；
工具包可以在本地展示该镜像，无需创建托管部署。

<a id="start-here"></a>
## 从这里开始

- **先了解整体方法：**阅读 [AI 原生 SDLC 图解手册](ai-native-sdlc/README.md)，
  其中包含概念、真实示例、截图及逐页工作坊。本演练指南仍作为详细的命令与配置参考。
- **查看或展示已有成果：**阅读
  [当前工单负责人案例](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/ownership.zh-CN.md)
  和[演示路线](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/presenter.md)。
  案例记录了 2026 年 10 月 12 日由用户确认的决策、助手执行的浏览器检查，以及对实际已发布镜像的验收。
- **从零运行负责人场景：**操作人员按顺序完成下方[第 1 步](#1-prepare-the-repository)，
  然后由请求人和已配置的人工评审者执行[第 2 至第 9 步](#2-show-the-existing-application)。
- **继续已配置但尚无负责人功能的运行：**核对[预检清单](#15-preflight-and-handoff)，
  再从对应阶段继续。对于中断的运行，使用[运行控制](#run-controls-during-presentation)
  与[故障排查](#troubleshooting-during-the-demo)，不要重新配置一套运行。

不要重置已经完成的 `ai-native-sdlc-demo` 仓库，
也不要对已实现该功能的应用再次提交相同负责人请求。
应从尚未实现负责人功能的源版本准备一个新的隔离仓库。

示例从**工单负责人不明确**这一问题开始。
人撰写 Intent，AI 提出 Spec 和 Plan；在批准进入下一阶段之前，人可以按需要求任意多轮修订。
新的 Intent 流程中，人始终在父 Issue 上阅读完整渲染的 Spec/Plan 修订评论、展开讨论，并提交带版本号的批准命令。
只有工程阶段使用 PR 评审。

```text
Human Intent
  -> AI Spec <-> Human feedback and revision
  -> AI Plan <-> Human feedback and revision
  -> AI tests: controlled Red -> Human approval
  -> AI implementation: Green -> Human approval
  -> Merge -> Publish image -> Smoke verification
  -> Human exercises exact digest -> Human acceptance -> Close Intent
```

本指南介绍 Issue 文档评审工作流。
所有基于 Issue 的运行（`issue-v1`）都使用最终人工验收，包括验收机制升级前已经启动的运行。
只有[旧版 Spec/Plan PR 模式](brownfield-human-gated-delivery.md#legacy-specplan-pr-mode)
仍在冒烟验证后自动关闭，而且不会迁移。
现场演示前，务必确认新工作流已经部署到远程 `main`；
本指南本身不能证明部署已经完成。
配置详情请参阅[配置与策略参考](brownfield-human-gated-delivery.md)。
文档生成通过 Actions 中的只读 Copilot CLI 完成，与仓库中的编排模式演示、
以及稍后的 Coding Agent PR 工作相互独立。

<a id="presenter-runbook-and-readiness"></a>
## 演示者操作手册与就绪标准

**当前证据边界：**[案例研究](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/ownership.zh-CN.md)
记录了一次完整的真实交付，其中每项决策及验收都分别获得用户确认。
它不是独立的多人评审，也不能证明下列三个场景全部完成。
在所有必需的隔离场景都由人真实作出决策并完成之前，不得宣告 **Demo Ready（演示就绪）**。

在根目录执行 `npm run demo:brownfield -- help`，并通过
[工具包 README](../../tools/brownfield-demo/README.md)获取准确命令。
演示项目自己的[场景清单](../../demos/it-service-desk/.github/brownfield-human-gated-delivery/scenarios)
定义了演练案例；不要杜撰 CLI 参数或 Issue 表单选择项。

演示前：

1. 固定一个尚未具备该场景能力的源提交。
   在独立且**尚不存在**的目标目录中准备副本。
   不要重置本检出目录、覆盖已有目标，也不要复制凭据、被忽略文件或本地 SQLite 数据库。
2. 使用另行约定的演示仓库。
   准备操作不会创建远程仓库或发布工作流：
   操作人员必须明确创建或选择仓库、发布已检查的源代码，并确认工作流已在 `main` 注册。
3. 明确更新并发布该仓库的评审者身份配置，包括最终验收所使用的 Implementation 评审者。
   请确保这些人到场；演示者或自动化不得冒充他们，也不得代他们提交批准。
4. 执行只读预检并审阅配置预览。
   区分**已配置**（设置与文件可见）和**已就绪**（运行时访问、模型使用资格、镜像发布、评审者参与及真实运行均已验证可用）。
   未确认的令牌能力、计费或运行前提仍属于阻碍。
5. 随时可以打开父 Intent、Actions、PR 评审界面，以及绑定镜像摘要的应用演示。
   只使用工具包管理的容器清理方式。
   离线展示时，应使用从真实运行导出的、经过转义的只读 HTML 回放，并清楚标注这是回放，不是新的现场执行。

| 阶段 | 负责角色与应展示的证据 | 下一步人工操作 |
|---|---|---|
| 准备 | 操作人员：固定基线、明确目标仓库、预检发现 | 解决阻碍，并同意将要执行的配置写入 |
| Intent | 请求人：可编辑的业务问题与开放问题 | 提交 Intent；保留其原始标题和正文 |
| Spec | AI 提出方案；已配置 Spec 评审者完整阅读最新修订 | 解决问题、请求修订，然后批准实际版本 |
| Plan | AI 提出方案；已配置 Plan 评审者检查与已批准 Spec 的链接 | 按需修订；只有准备好冻结契约时才批准 |
| Tests | Coding Agent 提供受控 Red；已配置 Tests 评审者检查断言与证据 | 请求修正，或批准当前 head 的 Tests PR |
| Implementation | Coding Agent 提供 Green；已配置 Implementation 评审者检查契约保留情况与代码 | 必需检查通过后，才批准当前 head |
| 发布/验证 | 受信任 Actions：已合并 SHA、精确摘要、运行 ID/尝试次数、冒烟结果 | 等待验证结果发布；在不绕过关卡的前提下修复失败 |
| 验收 | 已配置 Implementation 评审者：观察该精确摘要对应镜像的行为 | 每个人在父 Intent 上以真实结果接受或拒绝 |
| 完成 | 操作人员：已验收运行、已关闭 Intent、保留证据及分支清理 | 导出真实回放；仅清理受管理的演示容器 |

三种演练的验收标准如下：

| 隔离运行 | 计为完成前，额外必需的证据 |
|---|---|
| 正常交付 | 完整 Intent → 评审后的 Spec/Plan → 受控 Red → Green → 已验证摘要 → 人工验收 |
| Spec 变更 / Plan 失效 | Spec 已批准且 Plan 已发布，但在 **Plan 获得全部批准之前**请求修订 Spec；展示批准与 Plan 失效，再批准新版本并完成交付和验收 |
| 可恢复故障 | 在隔离运行中观察并记录真实失败的 Action，修复原因，使用文档规定的恢复方式，再完成交付和验收；不得伪造故障或削弱检查 |

每次运行都要保留：仓库及 Intent URL、固定基线 SHA、Spec/Plan 版本与哈希、
人工批准命令、Tests/Implementation PR 及 head、Red/Green 作业链接、合并 SHA、
镜像摘要、验证运行 ID 与尝试次数、验收观察结果及批准人数、
保留的文档与运行分支，以及回放位置。
故障恢复场景还须保留失败运行和修正操作。
缺失证据应标为**未验证**；本地测试通过、模拟结果截图或旧回放都不能补足。
现场运行失败时，应暂停并说明阻碍，或展示明确标识的真实历史回放。

<a id="1-prepare-the-repository"></a>
## 1. 准备仓库

这是操作人员首次运行时的准备流程，必须在提交 Intent 之前完成。
每个命令块应分别执行，并在确认预期结果后再继续。
出现意外错误时，不要继续执行后续步骤。

<a id="11-choose-the-source-target-and-review-mode"></a>
### 1.1 选择源版本、目标与评审模式

你需要 Node.js 24+、Git、已认证的 GitHub CLI（`gh`）、daemon 正在运行的 Docker，
以及创建或管理选定 GitHub 仓库的权限。
Copilot Coding Agent 访问、Actions 中的 Copilot CLI 使用资格及镜像仓库访问，是独立的前提；
`gh auth status` 成功并不能证明这些条件满足。

创建任何内容之前，先检查本地前提：

```sh
node --version
git --version
gh auth status --hostname github.com
docker info
```

如果 GitHub CLI 尚未认证，请使用 `gh auth login --hostname github.com`。
先解决工具缺失、daemon 访问和 Git 身份验证问题，再继续。

整份指南中，请一致地替换这些占位符：

| 占位符 | 含义 |
|---|---|
| `/absolute/path/to/source-checkout` | `huangyingting/ai-native-sdlc` 的本地检出目录，尚未实现负责人功能 |
| `FULL_40_HEX_COMMIT` | 已审查的源提交，复制自 `git rev-parse HEAD`；不是字面量 `HEAD`，也不是短 SHA |
| `/absolute/path/to/new-isolated-demo` | 源目录之外的新目录；父目录必须存在，但目标目录不得已存在 |
| `OWNER/NEW_DEMO_REPO` | 你明确同意创建的新 GitHub 仓库，不是源仓库，也不是已经完成的演示仓库 |
| `REVIEWER_LOGIN` | 将参与评审、并对新仓库具有写权限的人 |

示例采用**明确选择的单人演示模式**，由一个人完成评审。
准备、配置及预检命令都应保留 `--single-owner`。
若使用独立评审模式，请一致地省略该参数，并根据
[评审者参考](brownfield-human-gated-delivery.md#configure-human-reviewers)配置符合条件的独立评审者。
两种模式都不授权助手代为提交人工批准。

使用已有源检出目录，或克隆到一个新路径：

```sh
git clone https://github.com/huangyingting/ai-native-sdlc.git /absolute/path/to/source-checkout
git -C /absolute/path/to/source-checkout rev-parse HEAD
```

**预期结果：**得到源检出目录和完整提交 SHA。
不要克隆覆盖现有目录，也不要选择已完成演示的实现提交。

<a id="12-prepare-the-isolated-baseline"></a>
### 1.2 准备隔离基线

从源检出目录根部运行，无需安装根目录依赖：

```sh
cd /absolute/path/to/source-checkout &&
node tools/brownfield-demo/cli.mjs prepare \
  --source /absolute/path/to/source-checkout \
  --source-ref FULL_40_HEX_COMMIT \
  --dest /absolute/path/to/new-isolated-demo \
  --reviewer REVIEWER_LOGIN \
  --scenario ownership-standard \
  --single-owner
```

**预期结果：**生成一个尚无负责人功能的新导出副本，包含当前工作流、选定评审者和 `brownfield-demo-provenance.json`。
此时它还不是 Git 仓库，也不是已发布的演示。
基线不匹配是阻碍；不要禁用指纹检查，也不要删除负责人代码来勉强通过。
[工具包准备参考](../../tools/brownfield-demo/README.md#2-prepare-from-a-full-immutable-source-commit)
说明了排除项及其他可用演练场景。

<a id="13-inspect-and-publish-the-new-repository"></a>
### 1.3 检查并发布新仓库

发布前，请检查导出文件、评审者配置及来源记录。
来源记录包含本地源路径，须确认可以安全分享。
即使准备过程已排除常见敏感路径，也应检查是否包含机密和本地数据。
本小节所有命令都针对**新导出副本**，不是源检出目录。

创建远程仓库前，确认账户及套餐支持所选可见性下的保护规则和 Copilot 功能。
示例使用私有可见性；只有审查数据及组织策略后，才应有意识地选择公开。
不要为了绕过套餐限制而削弱关卡。

```sh
git -C /absolute/path/to/new-isolated-demo init --initial-branch=main
git -C /absolute/path/to/new-isolated-demo add .
git -C /absolute/path/to/new-isolated-demo diff --cached --stat
```

检查暂存内容后：

```sh
git -C /absolute/path/to/new-isolated-demo commit -m "Initialize isolated brownfield demo"
gh repo create OWNER/NEW_DEMO_REPO --private \
  --source /absolute/path/to/new-isolated-demo --remote origin --push
```

**这会创建私有远程仓库，并推送已检查的导出副本。**
如果远程仓库已存在，应停止并检查；不要强制推送或覆盖现有运行。
提交前必须配置好 Git 作者身份。

```sh
gh repo view OWNER/NEW_DEMO_REPO --json defaultBranchRef --jq .defaultBranchRef.name
gh workflow list --repo OWNER/NEW_DEMO_REPO --all
```

**预期结果：**`main` 是默认分支，GitHub 已注册包括 **Brownfield Delivery · Documents** 在内的交付工作流。
必要时，在仓库设置中将 `main` 设为默认分支，并等待工作流注册。
邀请其他已配置评审者，并赋予写权限。
仅发布仓库不会配置令牌、保护规则或 Copilot 访问。

<a id="14-configure-github-and-review-the-setup-preview"></a>
### 1.4 配置 GitHub 并审阅配置预览

使用 Node.js 24+，并让 GitHub CLI 以仓库管理员身份认证后，
从**新的隔离检出目录根部**运行，而不是从源检出目录运行：

```sh
cd /absolute/path/to/new-isolated-demo &&
npm run setup:brownfield -- --repo OWNER/NEW_DEMO_REPO --single-owner
```

第一次预览可能因设置、凭据缺失或仍有待人工确认事项而以 **2** 退出。
请审阅每一项拟议变更。
**完整 apply 会创建缺失的 `main` 保护**，并非只设置令牌。
已有目标仓库可能已经受到保护。
绝不能根据本指南位于哪个仓库来推断其策略，也不要误将 setup 应用于原始源仓库。
只读预览不会写入。

按[令牌说明](brownfield-human-gated-delivery.md#configure-the-copilot-token)创建受限自动化凭据。
只有同意完整预览后，才在交互式终端执行：

```sh
npm run setup:brownfield -- --repo OWNER/NEW_DEMO_REPO --single-owner --apply --set-token
```

只在安全提示中输入令牌，绝不放入参数、文件或聊天。
如果正确机密已经存在，请省略 `--set-token`，保持其不变。
setup 不会触发 kickoff，也不会发布本地修改。
除明确选择的单人模式变更外，默认会保留已有保护。
权限、部分失败恢复及人工检查详情，请参阅
[配置脚本说明](brownfield-human-gated-delivery.md#run-the-setup-script)。

示例中的 `--single-owner` 针对 Tests 和 Implementation PR。
新的 Issue Spec/Plan 批准不受 GitHub 原生 PR 独立评审限制。
如果你曾与 Copilot 协作，原生 PR 规则可能不计入你的批准。
[单人演示模式](brownfield-human-gated-delivery.md#single-owner-demo-mode)
将原生批准数设为零，同时通过 **Brownfield delivery policy** 保留你对当前修订的明确批准要求、
必需检查，以及禁止绕过规则的约束。
它不是独立的双人评审。
该选项只修改现有受管理规则集中的原生批准数量；应用后可能解除已批准自动合并 PR 的阻碍。
该模式并不会豁免 setup 的其余部分：完整 apply 仍可能创建缺失的 `main` 保护。
仅编辑规则集不足以证明工作流已发布并注册。

| 检查项 | 在 GitHub 中的核对位置 |
|---|---|
| 当前 Issue 表单、提示词、工作流和受信任模块位于默认分支 | **Code**；`main` 必须包含 `.github/brownfield-human-gated-delivery/scripts/` 下的 `runs.mjs`、`run-core.mjs` 和 `state-store.mjs`；完整 setup 会检查它们 |
| Documents 已注册且启用 | 将 `brownfield-human-gated-delivery-documents.yml` 发布到远程 `main`，并由 GitHub 注册。setup 可启用已有但被禁用的工作流，不能注册缺失工作流 |
| Copilot Coding Agent 可用，且被允许在此仓库工作 | 仓库或组织的 Copilot 设置 |
| Copilot CLI 能在 Actions 中生成文档 | `copilot-requests: write`、CLI 使用资格及组织的 CLI 计费策略 |
| Issue、子 Issue、Actions 和 Packages 可用 | 仓库标签页与设置 |
| PR 自动合并已启用 | **Settings > General > Pull Requests** |
| `brownfield-human-gated-delivery:intent` 已存在 | **Issues > Labels** |
| `COPILOT_ASSIGN_TOKEN` 已配置 | **Settings > Secrets and variables > Actions** |
| `it-service-desk-demo` 已存在 | **Settings > Environments** |
| 人工评审者已配置 | `main` 上的[交付配置](../../.github/brownfield-human-gated-delivery/config.json) |
| 必需检查与评审规则已实施 | **Settings > Rules > Rulesets** |
| 受信任自动化可写入 `brownfield-documents/**` 与 `brownfield-runs/**` | 没有冲突的 PR 必需规则集，也没有授予绕过权限 |

自动化凭据请按[令牌说明](brownfield-human-gated-delivery.md#configure-the-copilot-token)配置。
生成环节绝不接收该凭据或其他仓库写凭据；受信任发布和批准是独立步骤。
人工评审者正常登录 GitHub 即可，不必为评审文档或 PR 创建令牌。

源配置指定 `huangyingting`；
准备过程会在保留批准门槛的同时，将评审者列表替换为选定的 `REVIEWER_LOGIN`。
请检查并发布本次运行的实际配置。
最终验收使用 Implementation 策略和批准人数要求，不是独立的可配置阶段。
提交 Intent 不会让作者自动成为评审者。
如果必须由某位特定最终用户批准，请将其设为 Spec 和 Plan 的唯一评审者，门槛设为一人。
Issue 批准人必须是当前已配置且具有仓库写权限的人，包括已配置团队的当前成员。
机器人不能批准。不要为了单人模式降低 `minimumApprovals`。

检查[规则集说明](brownfield-human-gated-delivery.md#configure-branch-rulesets)：

- `brownfield-delivery/**` 和 `main` 都要求 `Brownfield delivery policy` 与 `stage-validation`。
- `main` 还要求 `validate` 和 `container-smoke`。
- 撤销过期批准、要求解决讨论，不允许人或自动化绕过关卡。
- 生命周期分支首次创建时豁免状态检查，以便从已批准文档进行交接创建；
  后续更新仍受保护，且基于 Issue 的运行只有人工验收后才允许清理。
- 受管理规则集只覆盖 `main` 和 `brownfield-delivery/**`，不覆盖 `brownfield-documents/**` 或 `brownfield-runs/**`。
  状态分支需要受信任自动化的写入能力，不需要绕过规则集的权限。

<a id="15-preflight-and-handoff"></a>
### 1.5 预检与交接

解决配置发现的问题后，从新的隔离检出目录运行：

```sh
cd /absolute/path/to/new-isolated-demo &&
npm run setup:brownfield -- --repo OWNER/NEW_DEMO_REPO --single-owner &&
node tools/brownfield-demo/cli.mjs preflight --repo OWNER/NEW_DEMO_REPO --single-owner
```

**预期结果：**setup 自动检查通过，preflight 报告 `automatedReady: true`。
其 `readyForLiveRun` 仍为 `false`，因为工具不会认证人工检查。
请自行验证凭据范围与有效期、使用资格、计费、Docker daemon 与镜像仓库访问，以及评审者参与情况。
存在未解决阻碍时应停止。
不要用新基线预检来评估已经完成的负责人实现；应使用回放。

**何时算已配置：**表单可见、预期评审者已配置、自动化前提及约定的分支保护都已到位。
这还不等于 **Demo Ready**；必须完成上文的真实演练。
在[第 2 步](#2-show-the-existing-application)交给请求人与评审者，
然后在 **`OWNER/NEW_DEMO_REPO`** 创建 Intent，而不是在源仓库或已完成的演示仓库创建。

<a id="2-show-the-existing-application"></a>
## 2. 展示现有应用

结合 [IT 服务台概览](../../demos/it-service-desk/README.md)说明起点：

- 工单已支持创建、搜索、状态变更及筛选；
- 数据持久化到 SQLite；
- 本示例尚缺少工单负责人功能。

如有需要，可使用 Node.js 24 或更新版本，从仓库根目录执行：

```sh
cd demos/it-service-desk
npm ci
npm run dev
```

打开 <http://localhost:3000>。
在任何功能开发开始前，展示一个已有工单及工单队列。不要删除已有工单数据。

**讲解要点：**这是既有系统开发。
目标是在保留现有行为的前提下改进系统，而不是重新生成一个替代品。

<a id="3-submit-the-human-authored-intent"></a>
## 3. 提交人工撰写的 Intent

1. 打开 **Issues > New issue**。
2. 选择 **Brownfield human-gated delivery: Submit an intent**。
3. 检查预填标题：**[Brownfield delivery] Clarify ticket ownership**。
4. 检查或编辑全部五个字段：

   | 字段 | 人需要提供的内容 |
   |---|---|
   | Problem or opportunity（问题或机会） | 负责人不明确为何造成交接困难 |
   | Proposed outcome（预期结果） | 服务台人员与团队负责人应如何受益 |
   | Affected users and systems（受影响用户与系统） | 涉及的人员和现有应用 |
   | Constraints and non-goals（约束与非目标） | 保留当前数据和工作流程，控制范围 |
   | Open questions（开放问题） | 需要在 Spec 评审中讨论的决策 |

   尽可能说明问题观察的来源、已知的成功衡量方式，以及更小范围的替代方案。
   不知道的内容应明确写“未知”，不要编造用户研究、性能指标或业务指标。

5. 保留真正的不确定性。
   本例表单询问工单是否可以不分配负责人、如何选择负责人，以及是否需要按负责人筛选。
6. 点击 **Create**，记录新 Intent Issue 编号。

提交人必须是 `OWNER`、`MEMBER` 或 `COLLABORATOR`。
不要选择 Copilot CLI 演示表单，也不要手动指派全部生命周期阶段。

**预期结果：**一个带有 `brownfield-human-gated-delivery:intent` 标签的父 Intent Issue。
没有 AI 代写 Intent 的阶段，也没有额外的 Intent 批准关卡。
立即检查 Issue 的 **Labels**。
若标签缺失，确认仓库中已创建该标签，将其加到此 Issue，然后按下方手动 kickoff 恢复步骤操作。
GitHub 不会根据表单定义自动创建标签。

文档评审一旦启动，Intent 标题与正文就会被保存为快照。
此后不要编辑它们：Documents 会拒绝对原始请求的修改。
细化文档请使用明确的修订命令反馈；原始请求改变时，请新建 Intent。

<a id="4-verify-automatic-kickoff"></a>
## 4. 确认自动启动

1. 打开 **Actions > Brownfield Delivery · Kickoff**。
2. 打开与该 Intent 关联的运行，等待完成。
3. 确认新 Intent 被路由到 **Brownfield Delivery · Documents**。
4. 回到 Intent Issue，检查当前评审汇总。

你应看到：

- 一个 `brownfield-documents/<intent-number>` 分支；
- 一个独立的 `brownfield-runs/<intent-number>` 分支，用于保存受信任运行状态，并带有工作流机器人账本证明；
- 父 Issue 上当前的汇总评论，链接最新文档版本及评审状态；
- 生成和受信任发布成功后，一条完整渲染的 Markdown **Spec v1** 修订评论；
  按源配置新建的 `decisions-v1` 运行，还会展示探索简报及所有阻断性的 Q-n 问题；
- 可能存在四个内部阶段 Issue：Spec、Plan、TDD Tests、Implementation，
  但不会把 Spec/Plan 指派给 Coding Agent。

请留在父 Intent 上。
kickoff 运行完成，不代表 Spec 生成与发布已经完成；也要检查 Documents 运行。
新 Intent 此时还不应有 `brownfield-delivery/<intent-number>` 分支或 Spec PR。

**预期结果：**只读 Copilot CLI 生成首个 Spec；
受信任自动化验证修订并保存到 Git，然后在 Issue 发布完整文档供人工评审。
此时不运行应用构建。

<a id="5-review-and-iterate-on-the-spec"></a>
## 5. 评审并迭代 Spec

1. 等待 Documents 发布首条完整 Spec 修订评论。
2. 通过父 Intent 汇总定位并阅读最新版本。
3. 检查它是否描述了预期结果、范围、非目标、参与角色、约束，以及稳定的 Given/When/Then 验收场景。
4. 评审开放问题和拟议决策。可以用普通 Issue 评论讨论；它们不会执行 AI，也不会批准文档。

每次修订都以 `spec.md` 保存到文档分支的
`docs/delivery-runs/brownfield-human-gated-delivery/<intent-number>/` 下，
评审状态保存在 `document-review.json`。
完整评论供人阅读，Git 修订提供持久证据。
新的 `decisions-v1` 运行还要求以已记录决策证明就绪。
这里没有 Spec PR，也不运行应用测试、构建或容器作业。

<a id="resolve-discovery-questions-first"></a>
### 先解决探索问题

源配置只在新运行初始化时启用 `specReadiness: "decisions-v1"`。
第 2 版文档状态会保留这一选择。
已有第 1 版运行保留原有的仅结构性评审；更改配置既不会升级它们，也不会关闭第 2 版运行的就绪检查。
选择命令前，先在汇总评论中确认当前模式。

对于新的探索模式运行：

1. 阅读简报：问题、证据或未知信息、成功衡量标准、备选方案。
   将其与真实 Intent 核对，不要把 AI 的表述直接当成事实。
2. 检查每个标为 **BLOCKING** 的 Q-n 条目。
   以已配置 Spec 评审者身份，使用当前版本和实际问题 ID 回答一个问题：

   ```text
   /sdlc decide spec v1 Q-1
   Outcome: Tickets may remain unassigned until triage.
   Rationale: New requests arrive before a responsible agent is known.
   ```

3. 等待新的 Spec 修订。决策本身不会批准任何内容。
   阅读变更后的行为及其决策到 AC 的映射。
4. 针对这个新版本回答下一个问题，或按
   [决策命令参考](brownfield-human-gated-delivery.md#discovery-and-decision-readiness)
   的要求，填写理由、负责人、后续行动和风险字段，明确暂缓。
5. 只有汇总中没有未回答的阻碍后，才按下文普通批准命令评审并批准实际的当前 Spec 版本。
   暂缓的问题仍是可见风险，不是已经解决的事实。

对于预填的负责人 Intent，有价值的决策包括：负责人是可选还是必填、固定名单还是自由文本、是否需要筛选。
不要假定 AI 每次都会给它们相同的 Q-n ID。
如果漏掉重要问题，应请求修订 Spec 并将其补入。
普通评论或 `/sdlc revise spec` 反馈，不能替代对已经登记问题的正式处理记录。

要演示关卡，可先在仍有真实阻碍时尝试批准。
预期结果是明确拒绝、不生成 Plan，也不分配工程任务。
然后由有权限的人记录决策，展示由此触发的修订及重新批准。
这是演练脚本，不是在宣称现场人工评审已经完成。绝不要代其他评审者提交决策。

<a id="request-ordinary-document-changes-and-approve"></a>
### 请求一般文档修订并批准

为了安排第一轮明确反馈，可将以下内容作为**父 Intent 上一条新的顶层评论**提交，命令放在第一行：

```text
/sdlc revise spec
For this demo, tickets may remain unassigned. Use the scenario's fixed local
owner roster, Avery Stone and Jordan Lee, and include filtering by owner.
Preserve existing tickets and workflows. Make these decisions explicit in
the specification for re-review.
```

这是修订反馈示例，不是 Intent 表单自动强加的需求。
在探索模式运行中，应先按上文步骤记录对应问题的决策；只有反馈并不能解除问题阻碍。
请根据你实际想要的功能和决策调整示例。

这是仓库自定义的 Actions 命令，不是内置 `@copilot` 命令。
提交文本本身，不要作为引用示例或放进代码围栏。
等待 Documents 发布下一个 Spec 版本（只有从 v1 开始时才是 **v2**），然后：

1. 完整阅读修订文档，对照反馈检查变更。
2. 仍需澄清时，再提交修订命令：

   ```text
   /sdlc revise spec
   Clarify the behavior for invalid owner selections and unassignment, and explain
   how invalid updates preserve stored ticket data. Add the missing acceptance
   scenarios for re-review.
   ```

3. 重复这一过程，直到 Spec 可接受，所有开放决策均已解决或明确暂缓。
   探索决策可能让版本号增加多次；请以当前汇总为准，不要照抄示例版本号。
4. 如果 **v2 仍是最新版本**，新建顶层评论提交：

   ```text
   /sdlc approve spec v2
   ```

   如果之后又请求了修订，应使用实际最新版本；旧版本批准会被拒绝。

**预期结果：**批准保存到 Git，内容包括文档版本与哈希、
探索运行的决策上下文哈希、批准命令评论 ID 与正文，以及批准人的 ID、登录名和时间，
而不是另存一份不可变的已渲染修订评论快照。
达到配置门槛后，Documents 生成链接到已批准 Spec 的 Plan v1。
没有需要合并的 Spec PR。

<a id="the-rule-for-every-review-round"></a>
### 每轮评审的规则

- 整个文档评审过程中，始终保留同一个父 Intent 和文档分支。
- 明确新建顶层 `/sdlc` 评论；普通讨论、`@copilot` 提及及编辑已有评论不会触发这套流程。
- 只有最新版本可被批准，且批准人必须是当前已配置、具有写权限的人。
  团队成员资格与 `minimumApprovals` 仍适用；机器人不能批准。
  这里没有原生 PR 的独立评审限制。
- “looks good”评论、修改检查清单或生成成功都不是批准。
  没有超时自动批准。
  探索运行最多允许 20 个问题和 100 份决策回执；
  上下文或历史过大时会明确失败，而不是截断。
- 编辑或删除已经处理的批准评论，**不会**撤销 Git 中保存的决定。
  应改为在交接前明确提交修订。
- 交接前修订 Spec，会使全部 Spec 批准及草稿或已批准的 Plan（包括其批准）失效。
  必须重新评审 Spec，并生成新 Plan 版本。
- Plan 获得全部批准后，文档冻结。
  若仍需修改 Spec，不要批准 Plan。
- 命令持久排队，每次运行都会核对。
  如果等待运行被替换或执行失败，请恢复 Documents；
  不要认为评论已丢失，也不要创建替代 Intent。

<a id="6-review-and-iterate-on-the-plan"></a>
## 6. 评审并迭代 Plan

1. 从父 Issue 汇总进入最新的完整 **Plan v1** 修订评论。
2. 确认其链接的 Spec 正是你已批准的版本。
3. 评审其开放问题与拟议方案。
4. 检查：
   - 每个已批准验收场景至少映射到一个任务；
   - 任务 ID 与依赖关系清晰，且不存在循环；
   - 明确列出受影响的代码部分与验证方法；
   - 已处理现有数据兼容性、迁移风险及范围问题。
5. 确认此阶段未修改已批准 Spec，也未编写应用代码或测试。

与 Spec 一样，Plan 执行文档、范围及批准验证，而不是应用构建或容器检查。
它以 `plan.md` 连同评审状态保存到 `brownfield-documents/<intent-number>`。

需要改进时，在父 Issue 新建顶层评论：

```text
/sdlc revise plan
Refine this plan into small, dependency-ordered tasks for storage
compatibility, server-side behavior, UI changes, and regression coverage where
required by the approved Spec. Map each task to acceptance scenarios and explain
its validation. Preserve the approved specification.
```

反复评审与修订，直到满意。
如果无需修订 Plan，且 **v1 仍是最新版本**，提交：

```text
/sdlc approve plan v1
```

如果执行了上面的修订命令，就应等待新 Plan 并批准新版本，例如 `/sdlc approve plan v2`。
不要仅为了照着示例操作而批准旧版本。

如果规划暴露出已批准 Spec 的问题，应在 **Plan 获得全部批准之前**，
提交 `/sdlc revise spec` 并附反馈。
这会使 Spec 批准及现有 Plan 失效。
先评审并批准新 Spec，再评审并批准新 Plan 版本。
Plan 不得悄悄改写已批准的需求。

**预期结果：**最新 Plan 获得配置要求的全部人工批准后，自动化冻结
`spec.md`、`plan.md` 与 `document-review.json`，
从已批准的文档提交创建 `brownfield-delivery/<intent-number>`，
关闭内部 Spec/Plan 阶段 Issue，并且**只将 TDD Tests** 分配给 Coding Agent。
下一评审界面是 Tests PR。
交接后若需修改契约，应创建新 Intent，而不是编辑已批准产物。

<a id="7-review-the-tdd-red-evidence"></a>
## 7. 评审 TDD Red 证据

1. 打开 TDD Tests PR；其目标仍应是生命周期分支。
2. 检查新测试及
   `docs/delivery-runs/brownfield-human-gated-delivery/<intent-number>/expected-failures.json`。
3. 确认测试名称映射到已批准验收场景，断言描述真实行为，而不是无条件失败。
4. 确认生产代码，以及已批准的 `spec.md`、`plan.md` 与 `document-review.json` blob 均未改变。
5. 打开 **Brownfield Delivery · Stage CI** 运行，查看 `tdd-red` 作业及其摘要。

证据必须显示：

- 现有基线测试通过；
- 新功能测试实际运行，且失败与声明完全一致；
- lint 和构建通过；
- 无关的测试收集、setup/teardown 或运行时错误，都不能被接受为 Red。

**重要：**功能测试有意处于 Red，但 `stage-validation` 检查必须通过。
它成功表示工作流已验证这些预期失败；不要批准一个验证作业本身已损坏的 PR。

需要时，在同一个 PR 中要求修正。
只有测试与证据都可靠后，才明确批准最新修订。

**预期结果：**已批准测试合并到生命周期分支，而不是 `main`。
随后工作流指派 Implementation。
已批准测试文件成为实现阶段不可更改的契约。

<a id="8-review-the-implementation-and-green-checks"></a>
## 8. 评审实现与 Green 检查

1. Copilot 完成初步工作后，打开 Implementation PR。
2. 确认协调器已将其目标改为 `main`。
   PR 包含完整增量：Spec、Plan、文档批准状态、测试和实现。
3. 对照已批准产物评审代码。
4. 确认已批准测试和生命周期产物没有被削弱、编辑、删除或重命名。
   可以在新文件中添加测试。
5. 检查必需结果：

   | 必需状态/检查 | 证据 |
   |---|---|
   | `stage-validation` | 已批准契约保持不变；原预期 Red 测试现为 Green |
   | `validate` | 应用测试、lint 和生产构建通过 |
   | `container-smoke` | 生产容器启动并通过冒烟检查 |
   | `Brownfield delivery policy` | 已配置的人工评审者批准了当前修订 |

6. 实现不可接受时，通过 `@copilot` 请求修订。
   新提交需要再次人工评审。
7. 只有行为和代码均符合约定 Spec 时，才批准最新修订。

可视化演示时，应验证 Spec 评审中选定的行为，包括已有工单的兼容性。
通用仪表板冒烟测试不能证明每个功能验收场景成立；也要检查功能测试。

**预期结果：**已批准且检查通过的 PR 自动合并到 `main`。
父 Intent 仍保持打开，等待交付验证。

<a id="9-verify-delivery-and-accept-the-result"></a>
## 9. 验证交付并验收结果

1. 打开已合并 PR 对应的 **Actions > Brownfield Delivery · Publish**。
2. 查看 `publish` 作业中的镜像构建与 GHCR 发布结果。
3. 查看 `verify` 作业是否：
   - 按不可变摘要拉取并运行已发布镜像；
   - 获得成功的 `/api/health` 响应；
   - 通过仪表板冒烟检查；
   - 在验证后停止临时容器。
4. 回到父 Intent Issue，阅读当前验证证据：镜像摘要、合并 SHA、Actions 运行 ID 和尝试次数。
   冒烟成功后，这个新 Intent 仍**保持打开，等待人工验收**。
5. 使用[工具包](../../tools/brownfield-demo/README.md)展示该精确摘要对应的镜像。
   每位已配置 Implementation 评审者都应实际操作已批准场景，包括已有工单的兼容性。
   仅有仪表板冒烟测试不能证明负责人行为或其他功能要求。
6. 发布后，每位符合资格的评审者应在 Intent 新建一条未经编辑的顶层评论，
   将下方摘要和观察结果替换为实际内容：

   ```text
   /sdlc accept sha256:<64hex>
   <Scenarios actually exercised, observed outcomes, and any limitations.>
   ```

   不得粘贴占位符，也不得声称做过实际未执行的界面测试。
   要拒绝验收，则使用 `/sdlc reject sha256:<64hex>`，并填写真实失败观察结果。
7. 确认配置要求的 Implementation 评审人数均已接受**当前**验证。
   只有此时才应关闭 Intent，并移除工程分支 `brownfield-delivery/<intent-number>`。
   保留 `brownfield-documents/<intent-number>` 和 `brownfield-runs/<intent-number>` 供回放。

**预期结果：**形成一条可追溯链路：
从人工撰写的 Intent，经已批准产物及测试，到已发布、已验证的镜像摘要，
以及与合并 SHA、运行 ID 和尝试次数绑定的人工验收记录。

完成前重新验证，会使已收集验收失效，即使摘要不变；
每位评审者都必须检查新发布的证据，再次作决定。
拒绝验收会阻止后续验收，直到另一次验证尝试。
合并后发现代码或范围缺陷，应创建关联的修复 Intent；
绝不能通过编辑已封存 Spec/Plan 或已批准测试来抹去分歧。
不要宣称被拒绝的运行已经完成。
只有旧版文档 PR 运行保留冒烟成功即关闭的行为。
已验收运行处于终态；再次交付必须新建 Intent。

`it-service-desk-demo` Environment 记录临时容器验证。
它**不会**创建永久托管应用或公开演示 URL。
你机器上已经运行的应用也不会自动升级。
验收及演示后的界面导览，都应使用经过验证的精确镜像摘要。
清理只能针对工具包管理的演示容器，不能影响无关本地工作负载。

<a id="completion-checklist"></a>
## 完成检查清单

- [ ] 由人提交了 Intent。
- [ ] 父 Intent 上可见完整 Spec 修订、讨论及明确命令。
- [ ] Plan 开始前，人工已批准最新 Spec 版本。
- [ ] 同一个 Issue 上的完整 Plan 修订链接到已批准 Spec。
- [ ] TDD 开始前，人工已批准最新 Plan；批准及文档哈希已保存到 Git。
- [ ] 文档已冻结，交付分支从已批准文档提交创建。
- [ ] 工程交接时只指派了 TDD Tests。
- [ ] 受控 Red 证据已验证并批准。
- [ ] Implementation 已通过 Green 测试、构建及容器检查。
- [ ] 实现合并前已获得人工批准。
- [ ] 已发布镜像摘要及冒烟验证运行已记录在 Intent 上。
- [ ] 已配置 Implementation 评审者已操作精确摘要对应的镜像，并在当前验证之后提交真实观察结果。
- [ ] 当前验收满足批准人数要求，并绑定摘要、合并 SHA、运行 ID 和尝试次数。
- [ ] Intent 仅在人工验收后关闭；工程分支已移除，文档与运行分支保留。
- [ ] 真实证据及回放已保留；只清理了受管理的演示容器。

<a id="run-controls-during-presentation"></a>
## 演示过程中的运行控制

Documents 工作流负责路由运行控制。
具有写权限的人应在 Intent 新建未经编辑的顶层评论，提交 `/sdlc help`、
`/sdlc status`、`/sdlc pause`、`/sdlc resume` 或 `/sdlc cancel`。
暂停或取消会阻止后续工作，让 PR 策略保持 pending，并禁用自动合并，
包括后续文档发布、发布结果处理及阶段推进。
它们**不会终止已经运行的代理或工作流，也不会撤销合并**。
取消是终态，会保留 Issue、PR 和分支；继续工作需新建 Intent。
恢复只解除暂停，不会重试失败作业。
详见[命令参考](brownfield-human-gated-delivery.md#run-controls-and-human-acceptance)。

<a id="troubleshooting-during-the-demo"></a>
## 演示中的故障排查

重试前，先按以下故障判断流程处理：

1. **没有 kickoff 或工作流？**
   检查已发布的 `main`、GitHub 注册、标签和授权。
   解决前提条件；setup 无法发布或注册缺失工作流。
2. **文档生成、发布或交接失败？**
   修复原因，再执行 `/sdlc retry`，或为同一个 Intent 触发 Documents。
   如果 Plan 已经获得全部批准，必须保持封存状态完整。
3. **工程 CI 失败？**
   真实缺陷应在同一个 PR 中要求修正并重新评审。
   基础设施故障则先修复，再重跑失败的 CI Action。
   不要把无关失败当作受控 Red。
4. **Advance 或 Publish 失败？**
   查看那个实际失败的 Action，修复原因，重跑其失败作业，必要时重跑整个运行。
   `/sdlc retry` 不能恢复这些流程，也不存在无限自动重跑循环。
5. **验证已通过，但无法完成？**
   检查暂停或取消、拒绝记录、当前摘要/运行/尝试次数、决定时间、评审者资格及人数。
   必须获得真实、最新的人工验收，不得伪造。
6. **合并后发现代码或范围缺陷，或运行已取消？**
   保留证据并创建关联的新 Intent。
   不要重置分支或改写已封存产物。

| 现象 | 检查与处理 |
|---|---|
| 表单缺失或内容陈旧 | 确认模板位于默认分支；重新打开一个 **New issue** 表单 |
| Actions 中没有 Documents | 将审查后的工作流发布到远程 `main` 并等待 GitHub 注册。setup 无法注册缺失工作流，但可以启用已注册且被禁用的工作流 |
| Kickoff 没有启动 | 检查 Intent 标签与作者关联身份。事后添加标签不会触发 kickoff；请通过 **Actions > Brownfield Delivery · Kickoff > Run workflow** 输入现有 Intent 编号运行 |
| Kickoff 中途失败 | 修复报告的前提问题，再用同一个 Intent 编号触发 Kickoff；不要为了重试而重复创建 Intent |
| Documents 拒绝更改后的 Intent 标题或正文 | 启动时已保存原始请求快照。保持不变；细化内容使用修订命令反馈，改变原始请求则新建 Intent |
| 普通评论或 `@copilot` 提及没有修订文档 | 这是预期行为：在父 Issue 新建顶层 `/sdlc revise spec` 或 `/sdlc revise plan` 评论并附反馈；普通讨论和编辑评论不运行命令接口 |
| 文档生成失败 | 检查 Documents 运行、`copilot-requests: write`、CLI 使用资格与计费，以及 Actions 策略。修复原因后提交 `/sdlc retry`，或带 `issue_number` 手动触发 Documents |
| 等待执行的运行被替换，或发布、批准记录、交接失败 | 为同一个父 Issue 恢复 Documents；其持久队列每次运行都会核对已提交命令。不要仅因为原运行被替换就重新发命令 |
| Issue 批准没有推进 | 检查精确的最新版本、当前已配置人工登录名或团队成员资格、仓库写权限及 `minimumApprovals`；机器人不能批准 |
| 删除或编辑批准评论没有撤销它 | 对已处理的批准快照，这是预期行为。请在 Plan 获得全部批准前明确请求修订；交接后使用新 Intent |
| 修订 Spec 使 Plan 失效 | 这是预期行为：重新批准新 Spec，再评审并批准新 Plan 版本；旧 Spec/Plan 批准不能复用 |
| 受信任自动化无法写入状态分支 | 检查匹配 `brownfield-documents/**` 与 `brownfield-runs/**` 的规则。在不授予绕过权限的前提下允许受信任写入；受管理规则集只覆盖 `main` 和 `brownfield-delivery/**` |
| 缺少必需且经过证明的文档或运行分支 | 停止并检查原始账本与历史；缺少状态会明确失败，不得通过重建状态重置批准 |
| Documents 报告运行控制或清理失败 | 阅读该阶段的失败信息，修复原因并重跑失败的 Documents Action；这不一定是文档生成错误 |
| 验收已记录，但合并证据错误后 Issue 仍打开 | 检查实际 PR 的 `merged` 时间线事件及其 `commit_id`；REST API `2026-03-10` 已从 PR 响应中省略 `merge_commit_sha`。保留已记录决定及封存文档。部署修复后，在更新的 `main` 上使用相同 `issue_number` 触发 Documents，重新核对清理；不要重复批准，也不要拿当前 main 顶端提交替代 |
| 现有 Intent 仍使用 Spec/Plan PR | 这是[旧版模式](brownfield-human-gated-delivery.md#legacy-specplan-pr-mode)，不是迁移失败。保留其 PR 工作流 |
| Copilot 没有修订 Tests、Implementation 或旧版文档 PR | 先提交评审，再在该 PR 中直接向 `@copilot` 发出请求，并检查代理会话 |
| Copilot 已完成，但 PR 仍是草稿 | 检查 **Copilot cloud agent** 运行及最终回复，不要只看草稿状态。审查范围，必要时要求修正，然后标记为可评审。这不是批准；精确的当前 head 仍需配置要求的评审及必需检查 |
| Copilot 表示进度工具无法编辑必需 PR 元数据 | 有权限的操作人员可以依据已指派阶段 Issue，恢复 `Delivery Demo`、`Delivery Intent`、`Delivery Stage`、`Delivery Stage Issue` 这四行，并移除关闭关键词。先核对实际 Intent、阶段及目标分支；绝不能编造元数据来重新分类无关工作。之后重新检查 Stage CI 和策略 |
| Copilot PR 工作流或 Review Signal 以 `action_required` 结束 | 授权执行前先审查代码与工作流。使用 GitHub 批准界面，或由有权限的操作人员通过 `gh run rerun RUN_ID --repo OWNER/REPO` 重跑特定运行，并确认新尝试实际执行。用于 fork PR 的 REST 批准端点，对 Copilot 创建的运行可能返回 403。不要禁用必需的工作流批准，不要把 `action_required` 当成成功，也不要用工作流授权替代独立 PR 评审 |
| PR 批准未解除策略阻碍 | 检查已配置评审者身份、当前 head 批准、未解决变更请求及草稿状态。Review Signal 与 PR Coordinator 异步运行；查看其最新运行 |
| PR 策略已通过，但 GitHub 不接受 Copilot 协作者的批准 | 原生 PR 规则需要另一位具有写权限的独立评审者。单人演示可使用[单人模式](brownfield-human-gated-delivery.md#single-owner-demo-mode)；不要移除策略或阶段检查。该限制不适用于 Issue 批准 |
| 必需 PR 策略或检查始终不出现 | 确认 Review Signal、PR Coordinator 和 Stage CI 工作流已安装且启用，并且规则集使用精确的必需名称。新的 Issue 文档不等待这些 PR 检查 |
| 阶段检查失败 | 阅读失败作业，并要求在同一个 PR 中修正；不要削弱验证器，也不要批准无关失败 |
| 分类拒绝生成的 `Fixes` 后缀 | 更新后的协调器只修复 Copilot 可识别的、指向当前阶段 Issue 的关闭引用，然后重新运行正文编辑 CI。确认兼容性修复已在默认分支；无关关闭引用仍需另行修正 |
| 已批准 PR 没有推进 | 检查运行暂停或取消状态、必需检查、讨论、分支是否最新、自动合并，以及 PR 是否真正合并。查看 **Advance**，修复原因并重跑该失败 Action，而不是使用 `/sdlc retry` |
| Publish 或冒烟验证失败 | 阅读实际 Publish 运行。基础设施故障修复后再使用 **Re-run failed jobs**；代码缺陷通过关联的新 Intent 报告。新的验证会使此前验收失效 |
| 冒烟通过但 Intent 仍打开 | 对每个基于 Issue 的运行，这是预期行为，包括升级后的既有运行：操作精确的已验证摘要对应镜像，并取得配置人数要求的人工验收 |
| 已接受摘要遭拒绝或被重新验证 | 拒绝后必须重新验证；重新验证后必须重新验收。旧评论不能接受未来尝试 |

如果只需恢复文档生成或交接，不提供新反馈，请在现有父 Intent 新建顶层评论：

```text
/sdlc retry
```

也可以打开 **Actions > Brownfield Delivery · Documents > Run workflow**，
选择 `main`，在手动 `workflow_dispatch` 输入 `issue_number` 中填写父 Issue 编号。
等价命令如下，请按实际情况替换仓库和示例编号：

```sh
gh workflow run brownfield-human-gated-delivery-documents.yml \
  --repo OWNER/NEW_DEMO_REPO --ref main -f issue_number=7
```

恢复后检查最新汇总及运行结果。
即使创建分支或指派 Tests 需要重试，Plan 获得全部批准后，文档仍保持冻结。

如果交付 Environment 另有批准规则，其评审者还必须放行等待中的验证作业。
交付失败期间，保持原始 Intent 打开；不要仅因为实现已经合并就关闭它。

下一次运行应选择当前基线仍缺失的功能。
负责人功能交付后，再次提交相同 Intent 已不是有意义的既有系统演示。
为了可重复演练，应从固定基线另行准备演示仓库，而不是删除应用数据或撤销无关工作。
宣告 Demo Ready 前，请核对[就绪标准](#presenter-runbook-and-readiness)。
