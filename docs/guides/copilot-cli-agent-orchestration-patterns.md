<a id="copilot-cli-agent-orchestration-patterns"></a>
# Copilot CLI 智能体编排模式

[English](copilot-cli-agent-orchestration-patterns.en.md)

仓库设置、工作流操作、追踪发布与安全指引，见[仓库指南](repository-guide.md)。

本指南介绍 GitHub Copilot CLI 的可复用编排模式。每种模式都展示 Copilot 如何动态地把任务拆分给子智能体、协调执行并综合结果。仓库定义编排目标与约束，但不定义固定的、演示专用的智能体角色配置。

Copilot CLI Trace Viewer 是本仓库用于展示和验证这些模式的可观测性工具。它记录生成的 OpenTelemetry 调用层级、时间、模型用量、工具调用和成本；它本身并不是这些模式的名称。

<a id="pattern-comparison"></a>
## 模式对比

| 模式 | 子智能体数量 | 调度方式 | 信息流 | 最适合的场景 |
|---|---:|---|---|---|
| 直接执行 | 0 | 直接 | 用户 → 编排智能体 → 结果 | 建立延迟、令牌和成本基线 |
| 并行委派 | 2+ | 并行 | 独立分支 → 综合 | 研究、比较、评审或可分离的子任务 |
| 质疑—修订循环 | 1+ | 顺序 | 初始观点 → 质疑 → 修订 | 挑战假设并简化方案 |
| 顺序流水线 | 2+ | 顺序 | 阶段结果 → 依赖该结果的阶段 → 综合 | 后续阶段需要使用前序结果的工作 |

<a id="runtime-model-selection"></a>
## 运行时模型选择

每次工作流运行都有两个模型输入：

- **编排模型（Orchestrator model）**负责规划委派、提供上下文并综合最终答复。
- **子智能体模型（Subagent model）**是为每个动态创建的子智能体请求使用的模型。

两个输入默认均为 `gpt-6-luna`。追踪报告展示实际观测到的模型，而不是假定请求的模型一定被使用。对于委派模式，验证会拒绝所选集合之外的模型，并要求所选子智能体模型确实出现。随后对每个实际观测到的模型调用单独计算成本，再按模型和智能体分支汇总。

每种模式都有专属 Issue 表单，其中包含一个可运行、可编辑的演示任务。模板专属的 `copilot-pattern:*` 标签负责内部路由，因此用户不必在下拉框中重复选择模式。这些场景属于模板内容，不属于可复用模式本身的定义。表单不提供独立的智能体指令字段：所选模式的通用编排契约会自动注入。手动触发工作流仍保留可选的高级指导输入，未提供任务时使用通用仓库分析任务。

任务文本会保留 `### Requirements` 这类 Markdown 标题和围栏示例。行内代码不会被误认为围栏起始标记，因此后续表单设置仍保持独立。只有 `### Trace detail` 这类已知表单标签，才会在代码围栏之外分隔字段。请将这些标签保留给表单本身；重复字段会被拒绝，而不是静默选择其中一个值。

所有表单默认使用详细追踪，并对请求和响应载荷进行脱敏。如果不希望载荷内容进入公开的 GitHub Pages 报告或 HTML 产物，请选择 **Metadata only**。

并行委派表单还有 **Internet access** 选项。通用工作流没有预批准 URL，但表单中的 AWS/Azure 比较场景会预选 `https://docs.aws.amazon.com`，通过 `--allow-url` 传给 CLI；Azure 研究使用默认启用的 Microsoft Learn MCP。替换成不需要 AWS 文档的任务时，请选择 **Block all external URLs**。手工编辑 Issue 正文填入的任意其他值会被拒绝。

<a id="1-direct-execution"></a>
## 1. 直接执行

编排智能体直接处理任务，并被明确要求不进行委派。

```text
User request
    └── Orchestrator
            └── Final answer
```

用这个模式测量委派带来的额外开销。它是与其他模式比较耗时、令牌用量和成本的参照基线。

**追踪证据**

- 没有子智能体 span。
- 至少一次模型调用。
- 只要求出现编排模型。
- 子智能体峰值并发数为 `0`。

<a id="2-parallel-delegation"></a>
## 2. 并行委派

Copilot CLI 在 fleet 模式下运行，动态创建至少两个相互独立的子智能体。由任务决定各分支是研究不同主题、从不同视角评审同一产物，还是解决较大任务中彼此分离的部分。

```text
                         ┌── Dynamic subagent A ── independent result ──┐
User request ── Orchestrator                                          ├── Synthesis
                         └── Dynamic subagent B ── independent result ──┘
```

各分支必须相互独立，且执行时间存在重叠。研究和评审是同一种底层模式的演示，不需要各自另起模式名称。

**追踪证据**

- 至少两个子智能体分支。
- 子智能体峰值并发数至少为 `2`。
- 观测到所选子智能体模型。

<a id="3-critic-reviser-loop"></a>
## 3. 质疑—修订循环

编排智能体先形成初始观点，再动态创建一个独立的质疑者，把原始请求与初始观点作为上下文交给它。最终答复必须解释质疑如何改变了结论。

```text
User request
    └── Orchestrator initial position
            └── Dynamic critic
                    └── Orchestrator revised conclusion
```

与并行委派不同，这个模式有意采用不对称结构：质疑者回应已有观点，而不是独立解决原始任务。它适合揭示隐藏假设、反例和不必要的复杂性。

**追踪证据**

- 至少一个动态创建的子智能体分支。
- 质疑者在初始推理开始后执行。
- 观测到所选子智能体模型。

<a id="4-sequential-pipeline"></a>
## 4. 顺序流水线

这个模式展示具有依赖关系的顺序协作。编排智能体动态创建一名方案设计专家，等待其提出方案，再创建一个全新的批判性评审专家；后者的输入同时包含原始请求和第一个结果。

```text
User request
    └── Orchestrator
            └── Dynamic design specialist
                    └── result returned
                            └── Dynamic critical reviewer
                                    └── revised plan
```

它与并行委派的区别在于：第一个任务完成之前，第二个任务无法正确开始。它适用于计划—评审—修订流程、分阶段分析，以及其他具有显式数据依赖的任务。

**追踪证据**

- 至少两个动态创建的子智能体分支。
- 子智能体峰值并发数恰好为 `1`。
- 第二个分支在第一个分支完成之后开始。
- 观测到所选子智能体模型。

<a id="reading-failures-in-the-viewer"></a>
## 在查看器中理解失败

红色工具 span 表示 OpenTelemetry 记录到一次真实的工具失败，不一定意味着整个编排失败。常见情况包括：

- URL 被工作流允许列表拒绝。
- 子智能体尝试了不被允许的 shell 或写入操作。
- MCP 或 HTTP 请求返回错误。

选择该 span，查看 **Failure reason**。这个诊断会独立于请求/响应载荷捕获显示。载荷捕获仍默认关闭，因为工具参数和结果可能包含敏感信息。

<a id="choosing-a-pattern"></a>
## 如何选择模式

- 需要衡量委派是否值得时，选择**直接执行（Direct execution）**。
- 子任务或视角相互独立时，选择**并行委派（Parallel delegation）**。
- 需要对初始观点进行对抗性反思时，选择**质疑—修订循环（Critic-reviser loop）**。
- 后续工作必须使用前序结果时，选择**顺序流水线（Sequential pipeline）**。

通过 **Actions → Copilot CLI Agent Demos → Run workflow** 选择模式，或选择四个模式专属 Issue 表单之一。GitHub Issue Forms 不支持根据下拉选择改变文本区域的值，因此独立表单能提供最清晰的一键体验，同时仍共享执行工作流。
