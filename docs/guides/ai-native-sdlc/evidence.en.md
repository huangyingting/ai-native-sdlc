# Evidence references

[中文](evidence.md) · [Guide index](README.en.md)

## One home for case evidence

This page identifies evidence used by the guide. The demo repository owns
case narratives and the screenshot manifest; they are not duplicated here.
Use its [case index](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/README.en.md).

| Identity | Value |
|---|---|
| Repository | `huangyingting/ai-native-sdlc-demo`, ID `1415043318` |
| Intent | [huangyingting/ai-native-sdlc-demo#1](https://github.com/huangyingting/ai-native-sdlc-demo/issues/1) |
| Approved Spec | [v5 at `9e18346`](https://github.com/huangyingting/ai-native-sdlc-demo/blob/9e183465d985bfa081f239a68eda400340320195/docs/delivery-runs/brownfield-human-gated-delivery/1/spec.md) |
| Approved Plan | [v1 at `6b7a4dd`](https://github.com/huangyingting/ai-native-sdlc-demo/blob/6b7a4ddf96f43c6f1980c2e1ed4b568ec429d427/docs/delivery-runs/brownfield-human-gated-delivery/1/plan.md) |
| Tests | [PR 8](https://github.com/huangyingting/ai-native-sdlc-demo/pull/8), approved head `104be0889c54652bec8f9bc317ffa5f0cf33166f` |
| Implementation | [PR 9](https://github.com/huangyingting/ai-native-sdlc-demo/pull/9), approved head `4ee82259b837f3e8f45d97ab4178afdd0d5b1814` |
| Merge | `1a1e14d0031305ee5da35c523ffbac9fa6f7e58b` |
| Publication | [Run 38215333786, attempt 3](https://github.com/huangyingting/ai-native-sdlc-demo/actions/runs/38215333786/attempts/3) |
| Accepted image | `sha256:90836abf909410db91b0d3c791812683e5424c5cab7d7a84df1af6772a66ce76` |
| Acceptance | [Comment 6119642416](https://github.com/huangyingting/ai-native-sdlc-demo/issues/1#issuecomment-6119642416); closed `2026-10-12T07:22:08Z` |

Repository names and Issue numbers may be reused after recreation. Use the
repository identity, immutable commits and exact records together. This case
uses the repository created on October 12, 2026, not its deleted predecessor.

## Screenshots

The [screenshot manifest](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/assets/ownership/manifest.json)
records the original URL, capture time, dimensions, byte count and SHA-256
for all 14 unchanged PNGs. They cover decisions, document approvals, test
revisions, Red, Green, implementation approval, publication failure and recovery,
handoffs and filters in the actual image, restart persistence and acceptance.

Application screenshots came from the published image, not the earlier source
preview. Loopback URLs identify the capture environment, not a publicly hosted
service.

Screenshots show visible state; reports, approvals, image identity and database
comparisons establish underlying checks. A runtime capture's
`humanAcceptance:false` describes its capture time, before the later explicit
acceptance. Keep failures and success as separate observations.

## Trace viewer example

Trace Viewer is a separate guide example:
[report list](https://huangyingting.github.io/ai-native-sdlc/) ·
[direct execution](https://huangyingting.github.io/ai-native-sdlc/viewer/?run=36092002982).

## Maintenance rules

- Keep Chinese and English on separate pages, with matching behavior, numbers, versions, limitations and links.
- Maintain case evidence once in the demo repository; guides link to it.
- Workflow logs and artifacts may expire; keep reviewed public summaries and version references, never fabricated replacements.
- Do not rewrite frozen Spec, Plan, test manifests or review records during reorganization or translation.
- Never publish credentials, raw databases or unreviewed logs.
