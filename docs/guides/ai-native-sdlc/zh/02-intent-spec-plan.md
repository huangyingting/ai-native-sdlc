# 2. 从需求意图到规格与计划：先把问题说清楚

[指南目录](../README.md) · [English](../en/02-intent-spec-plan.md) ·
[上一章](01-operating-model.md) · [下一章：开发与验证](03-build-verify.md)

本章沿着**当前工单负责人案例**展开：先说明为什么需要负责人，
再确定分配和筛选规则，最后把这些规则拆成开发任务。Intent 说明问题与目标，
Spec 约定行为与验收标准，Plan 则说明如何实现和验证。

## 2.1 先描述问题，不急着指定实现

[![详情页交接规则的产品决定](https://raw.githubusercontent.com/huangyingting/ai-native-sdlc-demo/main/docs/cases/assets/ownership/product-decision.png)](https://github.com/huangyingting/ai-native-sdlc-demo/issues/1#issuecomment-6117980837)

**产品决定，2026 年 10 月 12 日。** 从
[huangyingting/ai-native-sdlc-demo#1](https://github.com/huangyingting/ai-native-sdlc-demo/issues/1)
的原始问题读起，再看为何决定仅在详情页交接。

服务台原本可以创建、查询和更新工单，却看不出每张工单由谁负责。
如果需求只写“加个负责人下拉框”，就跳过了一个更重要的问题：
负责人到底意味着什么，用户需要怎样分配和交接工单？

更好的 Intent 包含：

| 字段 | 工单归属示例 |
|---|---|
| 问题及依据 | 在模拟的交接场景中，看不出责任人，也找不到未分配的工作；应用尚无 owner 数据模型 |
| 预期结果 | 能看清负责人、完成交接，同时保持已有流程可用 |
| 用户 | 支持人员和团队负责人 |
| 约束 | 保留已有记录和时间戳；控件有标签且支持键盘操作；分配结果能够持久化 |
| 非目标 | 身份认证、外部目录、SLA、通知、批量分配 |
| 未知项 | 负责人必填吗？使用固定名单吗？只展示还是支持筛选？ |
| 如何验证 | 检查界面行为、查询结果集合和数据保留情况 |

这个功能案例不提供客户访谈或生产效率提升的数据。
团队在实际项目中应补充调研和测量依据；尚不清楚的部分，应列为待调研事项，
而不是先写一个未经验证的收益数字。

## 2.2 让 AI 列出需要决策的问题

流程从提交 Intent 开始：Kickoff 将任务交给 Documents 工作流，
Copilot CLI 在只读权限下起草 Spec，自动化检查后将完整版本发布到主 Issue。
**这一步只处理需求文档，还不修改生产代码、不创建 Tests PR，也不构建应用。**

本次交付确认了四项产品规则：

| 决策 | 为什么重要 | 记录的结果 |
|---|---|---|
| Q-1：可选还是必填 | 影响工单创建和已有数据的处理 | 可选；已有工单和此后创建的工单默认均未分配 |
| Q-2：身份从哪里来 | 影响校验、持久化和范围 | 固定 Alex Chen／Sam Rivera；空选项对应 null |
| Q-3：只展示还是支持筛选 | 影响操作流程和查询规则 | 与其他筛选条件取交集；页面导航后选项要正确同步 |
| Q-4：在哪里交接，有没有状态限制 | 影响入口和与已有操作的关系 | 仅在详情页，四种状态均可；建单不变，状态与负责人分别保存 |

每处理一项决策，系统都会更新 Spec。这次交付最终批准的是 **Spec v5**，
随后生成并批准 **Plan v1**。版本号取决于实际修订次数，并非流程要求固定走到 v5。

[四项决定及各次修订](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/README.md)
可以逐项核对。审查重点不是问题列表有多长，而是答案是否真正写入了验收条件；
不能把 AI 的建议当作已经确认的产品决定。

## 2.3 审查者具体怎么做？

亲自练习时，请在自己的隔离仓库中操作，并以该次演练的 Issue 汇总区（hub）
为准。案例链接只供查阅。以下 `/sdlc` 命令由本仓库实现，并非 GitHub 或 Copilot
的内置命令。

1. 阅读当前完整 Spec，以及其中的需求澄清摘要（discovery brief）。
2. 对照原始需求和仓库现状，逐项检查待决问题。
3. 由配置中有权限的审查者回答当前一个问题：

   ```text
   /sdlc decide spec v1 Q-1
   Outcome: Tickets may remain unassigned until triage.
   Rationale: Requests arrive before a responsible agent is known.
   ```

4. 等待修订版发布，确认刚才的决策已写入验收条件，再处理下一个问题。
5. 必须延期的问题，按 [defer 命令参考](../../../../tools/brownfield-demo/README.md#spec-readiness-profiles)
   记录原因、负责人、后续工作和风险。延期处理不等于问题已经解决。
6. Spec 仍不完整时，提交明确的修改意见。
7. 处理完阻塞项后，批准当前版本，例如：

   ```text
   /sdlc approve spec v5
   ```

这里的 `v1`、`Q-1`、`v5` 都是示例，请替换为本次演练 hub 中的编号。
另发一条顶层评论，将命令放在第一行，不要粘贴代码围栏，也不要通过编辑已有评论发命令。
普通讨论和 `@copilot` 提及都不是文档批准。

## 2.4 把 Spec 写成可以验证的行为

[![Spec v5 的批准与回执](https://raw.githubusercontent.com/huangyingting/ai-native-sdlc-demo/main/docs/cases/assets/ownership/spec-approved.png)](https://github.com/huangyingting/ai-native-sdlc-demo/blob/9e183465d985bfa081f239a68eda400340320195/docs/delivery-runs/brownfield-human-gated-delivery/1/spec.md)

**Spec v5 的批准。** 截图展示批准与处理回执，点击图片可查看固定提交中的完整规格。

Spec 要说清楚行为和结果，但不必提前规定所有实现细节。例如，下列场景概括了
已批准的分配行为；正式验收仍以链接中的 Spec 为准：

```text
前提：INC-0001 尚未分配负责人。
操作：用户在详情页选择名单中的负责人并保存。
结果：详情页和工单列表都显示该负责人；
      刷新页面，或使用同一份数据重启应用后，分配结果仍然保留；
      工单的其他字段不变。
```

除了正常流程，还要覆盖异常、边界和兼容性：

- 清空归属：存储为 null，界面显示 Unassigned。
- 重复选择同一负责人：确认数据库没有发生写入，不能仅凭时间戳不变来判断。
- 提交非法负责人或不存在的工单：显式失败并保留数据。
- 负责人、搜索、状态、优先级使用 **AND**，而不是 OR。
- 只清除负责人筛选：保留其他条件，导航返回后控件正确同步。
- 打开变更前的数据库：增加允许为空的 owner 字段，保留原有数据。

“筛选正常”太笼统，应写出预期返回哪些工单。本次实际镜像核验中，
Sam Rivera＋Open＋High＋`inc-1` 只返回 INC-0001；换成 Alex Chen 得到空集。
这些结果依赖核验时准备的数据，不能直接套用到刚创建的数据库。

## 2.5 Plan 必须建立在仓库事实之上

[![Plan v1 的独立批准](https://raw.githubusercontent.com/huangyingting/ai-native-sdlc-demo/main/docs/cases/assets/ownership/plan-approved.png)](https://github.com/huangyingting/ai-native-sdlc-demo/blob/6b7a4ddf96f43c6f1980c2e1ed4b568ec429d427/docs/delivery-runs/brownfield-human-gated-delivery/1/plan.md)

**Plan v1 的批准。** 点击可查看计划全文，对照验收条件、任务和验证安排。
计划中的验证安排不是已经执行的测试结果。

Plan 说明如何落实已批准的 Spec。审查时，要核对任务依赖、修改范围和验证方法，
不能只看任务列表是否完整。

| 示意任务 | 依赖 | 验证方式 |
|---|---|---|
| 增加允许为空的字段和兼容迁移 | 已批准的分配规则 | 迁移前的数据行及字段值完整保留 |
| 实现交接，并避免重复分配造成写入 | 存储 API | 非法输入、重复分配、关闭后重开 |
| 在工单列表和详情中展示 owner | 存储查询结果 | 实际显示的负责人，而不只是下拉选项 |
| 增加交集筛选，并同步导航状态 | 查询规则 | 精确结果集合、单项筛选清除、前进与后退 |
| 检查创建、状态和搜索功能 | 完整功能变更 | 已批准的回归测试和镜像冒烟测试 |

上表用于说明任务结构，并非原 Plan 的任务清单。实际计划应将每个验收条件
对应到具体任务和检查。

单独的历史就绪检查案例中，Plan 曾假定仓库已有可复用的 HTTP 测试工具。
检查后发现，现有 Vitest 测试直接测试模块和组件，审查者因此
[要求修正](https://github.com/huangyingting/ai-native-sdlc-discovery-demo/issues/8#issuecomment-5863070163)。
计划中涉及仓库能力的判断，都应能找到对应代码或工具作为依据。

发现遗漏或错误假设时，用 `/sdlc revise plan` 提出修改意见。
审查通过后，再批准当前版本，例如：

```text
/sdlc approve plan v1
```

## 2.6 批准之后，哪些内容不能随意改动？

Plan 完整批准之前，主动修订 Spec 会使原 Spec 批准及关联 Plan 失效。
Plan 完整批准之后，系统冻结 Spec、Plan 和审查状态，并且**只分配测试任务**。
此后若要改变范围，应另建 Intent，而不是直接在实现中增加要求。

当前案例展示了决策如何推动规格修订。它没有演示
“撤销已批准的 Spec”，因为 v1–v4 本来就没有获批。要验证批准失效机制，
需要单独执行“显式 Spec 修改”场景。

### 进入开发前的检查

- [ ] 问题描述有依据，待确认事项已明确列出。
- [ ] 阻塞项已解决，或已记录延期理由、负责人和风险。
- [ ] 验收条件覆盖异常和兼容性，不只检查正常流程。
- [ ] Plan 中的仓库假设有具体代码或工具作为依据。
- [ ] 任务与验收条件、验证方法对应，且没有循环依赖。
- [ ] 审查者理解 Plan 批准后哪些产物将被冻结。

深入阅读：[当前图文案例](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/ownership.zh-CN.md)
与 [操作手册](../../brownfield-human-gated-delivery-walkthrough.md#5-review-and-iterate-on-the-spec)。

[下一章：审查测试，再用测试检验实现](03-build-verify.md)。
