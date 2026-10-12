# AI-native SDLC guide

[中文](README.md) · [All guides](../../README.en.md) ·
[Demo documentation](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/README.en.md)

How can a team turn a request into working software when AI participates
throughout delivery? This guide explains the method: clarify requirements,
review plans and tests, verify implementation, accept the artifact and learn
from operation. Case studies, presentation routes and screenshots have one home
in the demo repository; this repository owns reusable guidance.

| Chapter | Content | Focus |
|---|---|---|
| 1 | [Operating model](en/01-operating-model.md) | Roles and evidence |
| 2 | [Intent, Spec and Plan](en/02-intent-spec-plan.md) | Resolve ambiguity before coding |
| 3 | [Build and Verify](en/03-build-verify.md) | Review assertions and implementation |
| 4 | [Deploy and Operate](en/04-deploy-operate.md) | Artifact acceptance and follow-up |
| 5 | [Engineering judgment](en/05-engineering-judgment.md) | Separate repair from evidence quality |
| 6 | [Practice and adoption](en/06-workshop.md) | Run a bounded exercise |
| Reference | [Evidence references](evidence.en.md) | Identify the exact case and version |

## The current example

The current example is **ticket ownership in `huangyingting/ai-native-sdlc-demo`**:
Alex Chen and Sam Rivera form the roster. Spec v5 and Plan v1 were separately
approved, tests went through two revision rounds, all 38 tests became Green,
and the published image was verified before user-confirmed acceptance.
The Intent closed on October 12, 2026.

- [Illustrated case](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/ownership.en.md)
- [Presentation route](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/presenter.en.md)
- [14 screenshots and provenance](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/assets/ownership/manifest.json)

## Reading paths and boundaries

- **Introduction:** chapters 1 → 2 → 3 → 4.
- **Presentation:** use the demo repository's route; return to these chapters for method questions.
- **Hands-on:** chapter 6 → the step-by-step operator guide, using a separate repository.
- **Engineering:** chapter 5 explains experiment design and evaluation methods, not additional delivery results.

The current delivery used the live workflow, with assistant-run browser checks
and individually user-confirmed decisions and approvals. This is not
independent multi-reviewer approval or production certification. Readiness and
the other engineering cases remain unfinished in the current demo repository.

**Updated: 2026-10-12.**
