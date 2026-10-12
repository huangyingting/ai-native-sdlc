# 证据来源与引用规则

[English](evidence.en.md) · [指南目录](README.md)

## 案例证据只维护一处

本页是指南的引用索引，不再复制截图清单或案例正文。当前交付的截图和说明，
统一维护在演示仓库的
[案例目录](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/README.md)。

| 标识 | 值 |
|---|---|
| 仓库 | `huangyingting/ai-native-sdlc-demo`，ID `1415043318` |
| 需求 | [huangyingting/ai-native-sdlc-demo#1](https://github.com/huangyingting/ai-native-sdlc-demo/issues/1) |
| 已批准规格 | [v5，提交 `9e18346`](https://github.com/huangyingting/ai-native-sdlc-demo/blob/9e183465d985bfa081f239a68eda400340320195/docs/delivery-runs/brownfield-human-gated-delivery/1/spec.md) |
| 已批准计划 | [v1，提交 `6b7a4dd`](https://github.com/huangyingting/ai-native-sdlc-demo/blob/6b7a4ddf96f43c6f1980c2e1ed4b568ec429d427/docs/delivery-runs/brownfield-human-gated-delivery/1/plan.md) |
| 测试 | [PR 8](https://github.com/huangyingting/ai-native-sdlc-demo/pull/8)，获批提交 `104be0889c54652bec8f9bc317ffa5f0cf33166f` |
| 实现 | [PR 9](https://github.com/huangyingting/ai-native-sdlc-demo/pull/9)，获批提交 `4ee82259b837f3e8f45d97ab4178afdd0d5b1814` |
| 合并 | `1a1e14d0031305ee5da35c523ffbac9fa6f7e58b` |
| 发布 | [工作流 38215333786，第 3 次执行](https://github.com/huangyingting/ai-native-sdlc-demo/actions/runs/38215333786/attempts/3) |
| 已验收镜像 | `sha256:90836abf909410db91b0d3c791812683e5424c5cab7d7a84df1af6772a66ce76` |
| 验收 | [评论 6119642416](https://github.com/huangyingting/ai-native-sdlc-demo/issues/1#issuecomment-6119642416)；关闭时间 `2026-10-12T07:22:08Z` |

仓库名和 Issue 编号可能在重建后被重复使用，不能仅凭这两项判断记录属于哪次交付。
核查时，应同时使用仓库身份、不可变提交和对应记录。本文使用的是
2026 年 10 月 12 日创建的仓库，不是已经删除的同名实例。

## 截图

[截图清单](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/assets/ownership/manifest.json)
保存了 14 张原始 PNG 的来源 URL、拍摄时间、尺寸、字节数和 SHA-256。
配图覆盖决策、文档批准、测试修改、Red、Green、实现批准、发布失败与恢复、
实际镜像中的交接和筛选、重启后数据，以及最终验收。

应用截图来自已发布镜像，不是此前的源码预览。本机回环地址只标识拍摄环境，
不代表持续对外提供服务的网站。

截图说明当时可见的状态；测试报告、批准记录、镜像身份和数据库对比说明验证结果。
运行截图拍摄时尚未验收，其来源记录中的 `humanAcceptance:false` 不应事后改写。
后续的明确验收有单独记录，不能用成功截图覆盖之前的失败。

## 追踪工具示例

Trace Viewer 属于单独的指南示例：
[报告列表](https://huangyingting.github.io/ai-native-sdlc/) ·
[直接执行记录](https://huangyingting.github.io/ai-native-sdlc/viewer/?run=36092002982)。

## 维护规则

- 中文和英文分别成篇，同步更新行为、数字、版本、限制和链接。
- 案例和截图只在演示仓库维护，指南引用它们，不再复制。
- 工作流日志和产物可能过期；保留适合公开的摘要和版本引用，不编造缺失记录。
- 冻结的 Spec、Plan、测试清单和审查记录不随文档整理或翻译改写。
- 不在文档中发布凭据、原始数据库或未经审查的日志。
