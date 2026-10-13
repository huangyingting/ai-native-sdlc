# AI 原生软件交付系统指南

[English](README.en.md) · [文档导航总览](../../README.md) ·
[演示仓库实录](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/README.md)

当生成式 AI 深度融入软件工程全生命周期时，技术团队应如何建立科学的协作机制，将业务需求稳健转化为生产级可用软件？
本指南系统化梳理了从业务需求澄清、架构方案审查、测试与实现验证，到容器部署验收与运行时运维保障的完整工程方法论。具体演示案例实录、现场讲解路线与高清截图统一归档于演示仓库，本处不存放重复副本。

| 章节编号 | 核心主题 | 核心关注点 |
|---|---|---|
| 第 1 章 | [流程总览：AI 提出方案，人做决策，用证据把关](zh/01-operating-model.md) | 明确人机职责边界与各阶段推进门禁 |
| 第 2 章 | [需求意图、规格说明与实施计划](zh/02-intent-spec-plan.md) | 编码前先理清业务不变量与架构约束 |
| 第 3 章 | [开发与验证：审查测试套件与功能实现](zh/03-build-verify.md) | 先行审查测试断言，再行检验功能兑现 |
| 第 4 章 | [部署、运行与维护：镜像验收与闭环运维](zh/04-deploy-operate.md) | 基于确切交付物现场验收，持续跟进运行时状态 |
| 第 5 章 | [变更分析、故障诊断与 Agent 策略评估](zh/05-engineering-judgment.md) | 深度区分代码修复效果与归因证据质量 |
| 第 6 章 | [演示演练与团队工程落地实践](zh/06-workshop.md) | 循序渐进搭建团队专属的端到端小闭环 |
| 附录 | [证据来源与核验索引规则](evidence.md) | 交叉核验真实审计记录与版本哈希 |

## 核心交付案例

本指南主线基于 **`huangyingting/ai-native-sdlc-demo` 中的“工单负责人”真实交付案例**展开：
团队确立了由 Alex Chen 与 Sam Rivera 组成的固定成员名单；Spec v5 与 Plan v1 历经多轮人机交互分别独立获批；
测试用例历经两轮严格审查修正，最终 38 项测试全部绿灯通过；在独立验证拉取的正式发布镜像后，
由业务人员正式签署验收决定，需求 Issue 于 2026 年 10 月 12 日正式关闭。

- [工单负责人图文案例实录](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/ownership.zh-CN.md)
- [30 分钟标准演示讲解路线](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/presenter.md)
- [14 张过程截图清单与校验记录](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/assets/ownership/manifest.json)

## 推荐阅读路线与适用范围

- **初次通读与理论建构**：建议按顺序阅读 第 1 章 → 第 2 章 → 第 3 章 → 第 4 章。
- **现场宣讲与技术演示**：建议参考演示仓库的[30 分钟演示大纲](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/presenter.md)；遇到方法论疑问时随时索引至本指南相关章节。
- **团队实战演练**：查阅 第 6 章 并结合[分步演练指南](../brownfield-human-gated-delivery-walkthrough.md)，在独立的隔离仓库中开展练习。
- **进阶工程研讨**：研读 第 5 章，深入了解评测实验设计与判定器（Oracle）机制；请注意该章属于实验方法论，不作为已上线的功能成果。

本案例全流程在生产流水线中真实执行。浏览器端操作核验由 AI 助手辅助执行，而业务决策、阶段性门禁批准与最终镜像验收均由人类工程师逐项确认。该记录展现了单人主审模式下的真实交付闭环，不代表多人跨团队的复杂审批，亦不构成生产安全合规认证。数据库就绪检查与更多前沿实验见演示仓库的后续更新。

**基准更新时间：2026-10-12**
