# 证据来源与跨仓库引用规范

[English](evidence.en.md) · [指南目录](README.md)

## 案例证据严格遵循单一事实源

本页为交付指南的核心审计索引，旨在建立严密的可追溯性，避免复制冗余的截图清单或正文。当前交付案例的高清过程截图与详尽说明，统一在演示仓库的
[案例索引总览](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/README.md) 中结构化归档。

| 交付审计维度 | 确切版本与审计值 |
|---|---|
| **目标 GitHub 仓库** | `huangyingting/ai-native-sdlc-demo`，唯一标识 ID `1415043318` |
| **原始需求意图** | [需求 Issue #1](https://github.com/huangyingting/ai-native-sdlc-demo/issues/1) |
| **已获批规格说明** | [Spec v5，提交 `9e18346`](https://github.com/huangyingting/ai-native-sdlc-demo/blob/9e183465d985bfa081f239a68eda400340320195/docs/delivery-runs/brownfield-human-gated-delivery/1/spec.md) |
| **已获批实施计划** | [Plan v1，提交 `6b7a4dd`](https://github.com/huangyingting/ai-native-sdlc-demo/blob/6b7a4ddf96f43c6f1980c2e1ed4b568ec429d427/docs/delivery-runs/brownfield-human-gated-delivery/1/plan.md) |
| **测试套件评审与合并** | [PR #8](https://github.com/huangyingting/ai-native-sdlc-demo/pull/8)，获批提交 SHA `104be0889c54652bec8f9bc317ffa5f0cf33166f` |
| **功能实现评审与合并** | [PR #9](https://github.com/huangyingting/ai-native-sdlc-demo/pull/9)，获批提交 SHA `4ee82259b837f3e8f45d97ab4178afdd0d5b1814` |
| **主干交付合并 SHA** | `1a1e14d0031305ee5da35c523ffbac9fa6f7e58b` |
| **生产发布与镜像验证** | [Actions 流水线 38215333786（第 3 次运行）](https://github.com/huangyingting/ai-native-sdlc-demo/actions/runs/38215333786/attempts/3) |
| **已验收生产容器镜像** | `sha256:90836abf909410db91b0d3c791812683e5424c5cab7d7a84df1af6772a66ce76` |
| **人工最终验收决策签署** | [验收评论 #6119642416](https://github.com/huangyingting/ai-native-sdlc-demo/issues/1#issuecomment-6119642416)；关闭时间戳 `2026-10-12T07:22:08Z` |

仓库名称与 Issue 编号在同名销毁重建后可能会被重复分配，切不可单凭仓库名或 Issue 序号来判定记录属于哪一次交付。在严肃审计中，必须交叉比对唯一的仓库数值 ID、不可变的 Git 提交 SHA 以及不可变的镜像 Digest。本文档引用的数据严格对应 2026 年 10 月 12 日创建并完成交付的真实仓库。

## 现场过程截图归档规范

[截图校验清单](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/assets/ownership/manifest.json)
完整归档了 14 张原始 PNG 截图的来源 URL、拍摄时间戳、分辨率、文件大小与 SHA-256 哈希值。全套截图覆盖了产品决策、规格批准、计划批准、测试两轮审查、受控 Red、实现全绿 Green、实现批准、发布失败排查、重试成功、实际镜像流转验证、组合筛选、数据持久化及最终人工验收等全部关键节点。

业务功能截图直接截取自正式发布的 Docker 镜像，绝非本地热更新源码的临时预览。截图中出现的本地回环地址（localhost）仅记录当时的隔离测试环境，不代表公网长期在线的服务。

截图仅反映拍摄当时系统界面的客观状态；测试执行日志、各阶段审批回执、镜像 Digest 与数据库底层比对才是核心验证证据。前端操作截图拍摄时，该镜像尚未获得最终签署验收，因此元数据清单中的 `humanAcceptance:false` 属于当时的真实状态，严禁在事后篡改抹除。后续明确签署的最终验收具有专属的审计记录，绝不用最后的成功结果掩饰或覆盖早期的失败记录。

## 追踪工具与样例索引

调用追踪查看器（Trace Viewer）属于独立的方法论演示套件：
[公开追踪列表](https://huangyingting.github.io/ai-native-sdlc/) ·
[直接执行基线记录](https://huangyingting.github.io/ai-native-sdlc/viewer/?run=36092002982)。

## 文档维护与更新原则

- **双语同步原则**：中文与英文文档独立成篇，但在技术行为描述、数据指标、版本号、限制说明与外部超链接上必须保持严格同步。
- **单一事实源**：具体案例实录与过程截图仅在演示仓库维护；指南仓库负责方法论抽象并建立指向，杜绝复制多份副本。
- **正视临时证据生命周期**：流水线临时构件和日志可能超过保留期限；应持久化归档适合公开的度量摘要与版本引用，严禁臆造已丢失的历史记录。
- **契约不可篡改**：已冻结归档的 Spec、Plan、测试清单与审查凭据，严禁随文档润色或翻译而发生任何改动。
- **安全与合规红线**：严禁在文档中提交私密令牌、真实账号凭证、未经脱敏的本地数据库文件或敏感日志。
