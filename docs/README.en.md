# Documentation

[中文](README.md)

**This repository explains how to work. The demo repository records what was delivered.**

Reusable methods and operator guides live here. Case studies, presentation
routes, delivery records and screenshots live in the demo repository.
Each item has one home, with links rather than duplicated copies.
Chinese is the default; English has separate pages, accessible through the
language switch at the top.
Commands, code, original screenshots, experiment inputs and frozen delivery
artifacts retain their original content; language changes must not rewrite
executable inputs or evidence.

## Choose a path

| Goal | Entry |
|---|---|
| Understand the method | [AI-native SDLC guide](guides/ai-native-sdlc/README.en.md) |
| Present the completed example | [Demo documentation](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/README.en.md) |
| Run a delivery from scratch | [Step-by-step walkthrough](guides/brownfield-human-gated-delivery-walkthrough.en.md) |
| Configure approvals and troubleshoot | [Delivery reference](guides/brownfield-human-gated-delivery.en.md) |
| Validate release and recovery behavior | [Reliability guide](guides/brownfield-reliability-loops.en.md) |
| Analyze changes and evaluate agents | [Engineering experiments](guides/engineering-judgment-demos.en.md) |
| Choose an orchestration pattern | [Orchestration guide](guides/copilot-cli-agent-orchestration-patterns.en.md) |
| Develop or extend the repository | [Repository guide](guides/repository-guide.en.md) |

## Where content belongs

```text
ai-native-sdlc/docs/
  README.md                 Chinese documentation entry point
  README.en.md              English documentation entry point
  guides/                   methods, procedures and references
    ai-native-sdlc/          six separate Chinese/English chapters
  research/                 dated analysis and design rationale
  assets/traces/            images used by the trace guide

ai-native-sdlc-demo/docs/
  README.md                 Chinese demonstration entry point
  README.en.md              English demonstration entry point
  presenter.md              Chinese presentation route
  presenter.en.md           English presentation route
  cases/                    case studies and their screenshots
  delivery-runs/            workflow-managed, versioned delivery artifacts
```

## Supporting research

- [Intent, Spec and Plan](research/ai-native-sdlc-early-stage-research.en.md)
- [Build, Verify, Deploy and Operate](research/ai-native-sdlc-delivery-operations-research.en.md)

These are dated assessments, not the current demo's progress or acceptance report.
