# Evidence references / 证据来源与引用规则

[Guide index / 指南目录](README.md)

## One home for case evidence / 案例证据只维护一处

本页是指南的引用索引，不再复制截图清单或案例正文。当前交付的截图和说明，
统一维护在演示仓库的
[案例目录](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/README.md)。

This page identifies evidence used by the guide. The demo repository owns
case narratives and the screenshot manifest; they are not duplicated here.

| Identity / 标识 | Value / 值 |
|---|---|
| Repository / 仓库 | `huangyingting/ai-native-sdlc-demo`, ID `1415043318` |
| Intent / 需求 | [huangyingting/ai-native-sdlc-demo#1](https://github.com/huangyingting/ai-native-sdlc-demo/issues/1) |
| Approved Spec / 已批准规格 | [v5 at `9e18346`](https://github.com/huangyingting/ai-native-sdlc-demo/blob/9e183465d985bfa081f239a68eda400340320195/docs/delivery-runs/brownfield-human-gated-delivery/1/spec.md) |
| Approved Plan / 已批准计划 | [v1 at `6b7a4dd`](https://github.com/huangyingting/ai-native-sdlc-demo/blob/6b7a4ddf96f43c6f1980c2e1ed4b568ec429d427/docs/delivery-runs/brownfield-human-gated-delivery/1/plan.md) |
| Tests / 测试 | [PR 8](https://github.com/huangyingting/ai-native-sdlc-demo/pull/8), approved head `104be0889c54652bec8f9bc317ffa5f0cf33166f` |
| Implementation / 实现 | [PR 9](https://github.com/huangyingting/ai-native-sdlc-demo/pull/9), approved head `4ee82259b837f3e8f45d97ab4178afdd0d5b1814` |
| Merge / 合并 | `1a1e14d0031305ee5da35c523ffbac9fa6f7e58b` |
| Publication / 发布 | [Run 38215333786, attempt 3](https://github.com/huangyingting/ai-native-sdlc-demo/actions/runs/38215333786/attempts/3) |
| Accepted image / 已验收镜像 | `sha256:90836abf909410db91b0d3c791812683e5424c5cab7d7a84df1af6772a66ce76` |
| Acceptance / 验收 | [Comment 6119642416](https://github.com/huangyingting/ai-native-sdlc-demo/issues/1#issuecomment-6119642416); closed `2026-10-12T07:22:08Z` |

仓库名可能被重复使用，因此不能仅凭名称或 Issue 编号判断记录属于哪次交付。
本文使用的是 2026 年 10 月 12 日创建的仓库，不是已经删除的同名实例。

Repository names and Issue numbers may be reused after recreation. Use the
repository identity, immutable commits and exact records together.

## Screenshots / 截图

[截图清单 / Screenshot manifest](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/assets/ownership/manifest.json)
保存了 14 张原始 PNG 的来源 URL、拍摄时间、尺寸、字节数和 SHA-256。
配图覆盖决策、文档批准、测试修改、Red、Green、实现批准、发布失败与恢复、
实际镜像中的交接和筛选、重启后数据，以及最终验收。

The manifest records the original URL, capture time, dimensions, byte count
and SHA-256 for all 14 unchanged PNGs. Application screenshots came from the
published image, not the earlier source preview. Loopback URLs identify the
capture environment, not a publicly hosted service.

截图说明当时可见的状态；测试报告、批准记录、镜像身份和数据库对比说明验证结果。
运行截图拍摄时尚未验收，其来源记录中的 `humanAcceptance:false` 不应事后改写。
后续的明确验收有单独记录，不能用成功截图覆盖之前的失败。

Screenshots show visible state, not every underlying assertion. A runtime
capture's `humanAcceptance:false` describes its capture time, before the later
explicit acceptance. Keep failures and success as separate observations.

## Historical references / 历史参考

Discovery、可靠性和工程评估仍有独立、可核查的来源，集中在演示仓库的
[归档索引](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/archive/README.md)。
它们采用开发测试模式；其中的测试数量、镜像和实验结论不代表当前案例。
此前已删除的同名仓库案例及配图不再保留。

The separate Discovery, reliability and engineering reports remain verifiable
and live in the demo archive. Their development-test results do not belong to
the current delivery. The deleted repository incarnation's case and images
have been removed from maintained documentation.

Trace Viewer is a separate guide example:
[report list](https://huangyingting.github.io/ai-native-sdlc/) ·
[direct execution](https://huangyingting.github.io/ai-native-sdlc/viewer/?run=36092002982).

## Maintenance rules / 维护规则

- 两种语言同步更新行为、数字、版本、限制和链接。
- 案例和截图只在演示仓库维护，指南引用它们，不再复制。
- 工作流日志和产物可能过期；保留适合公开的摘要和版本引用，不编造缺失记录。
- 冻结的 Spec、Plan、测试清单和审查记录不随文档整理改写。
- 不在文档中发布凭据、原始数据库或未经审查的日志。

Keep both languages aligned; maintain case evidence once; preserve immutable
delivery artifacts; distinguish unavailable evidence from passing evidence;
never publish credentials, databases or unreviewed logs.
