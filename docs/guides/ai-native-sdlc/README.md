# AI 原生软件交付指南

[English](README.en.md) · [文档导航](../../README.md) ·
[演示文档](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/README.md)

当 AI 参与软件交付的全过程时，团队该怎样把一个需求变成可用的软件？
本指南讲解需求澄清、方案审查、开发验证、部署验收和运行维护的方法。
具体案例、演示路线和截图统一保存在演示仓库，这里不再维护副本。

| 章节 | 内容 | 重点 |
|---|---|---|
| 1 | [流程总览与职责分工](zh/01-operating-model.md) | 谁决策，凭什么推进 |
| 2 | [需求意图、规格与计划](zh/02-intent-spec-plan.md) | 写代码前先说清楚 |
| 3 | [开发与验证](zh/03-build-verify.md) | 审查测试与实现 |
| 4 | [部署、运行与维护](zh/04-deploy-operate.md) | 验收交付物，再跟进运行 |
| 5 | [变更分析、故障诊断与 Agent 评估](zh/05-engineering-judgment.md) | 区分修复效果与证据质量 |
| 6 | [实操与团队落地](zh/06-workshop.md) | 从一个小闭环开始 |
| 附录 | [证据来源与引用规则](evidence.md) | 核对案例与版本 |

## 当前案例

主线是 **`huangyingting/ai-native-sdlc-demo` 的工单负责人交付**：
固定名单为 Alex Chen、Sam Rivera；Spec v5 和 Plan v1 分别获批；
测试经过两轮修改，最终 38 项测试全部通过；实际发布的镜像验证后，
由用户确认验收，需求于 2026 年 10 月 12 日关闭。

- [图文案例](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/ownership.zh-CN.md)
- [演示路线](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/presenter.md)
- [14 张截图与来源](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/assets/ownership/manifest.json)

## 阅读路线与范围

- **初次了解：** 第 1 → 2 → 3 → 4 章。
- **准备演示：** 转到演示仓库的讲解路线，遇到方法问题再回到相关章节。
- **亲自实践：** 第 6 章 → 分步操作指南，使用独立仓库。
- **工程专题：** 第 5 章，介绍实验设计和评估方法，不作为当前演示的交付结果。

当前交付采用 live 流程。浏览器核验由助手执行，产品决定、阶段批准和最终验收由用户逐项确认。
这不等于独立多人审查，也不证明生产可用性。就绪检查和其他工程案例在当前演示仓库尚未完成。

**更新日期：2026-10-12。**
