# Build, Verify, Deploy, and Operate: Research and Demo Improvement Design

[中文](ai-native-sdlc-delivery-operations-research.md)

Assessment date: 2026-09-28.

This complements the [Intent/Spec/Plan research](ai-native-sdlc-early-stage-research.en.md).
The table below is a **dated baseline**, before the three reliability loops.
The [reliability walkthrough](../guides/brownfield-reliability-loops.en.md) records the
implemented commands and their scope.
Improvements do not retrospectively change this assessment or earlier approvals.

## Executive summary

The principal later-stage risk is not slow code generation. It is accelerating
an insufficiently verified implementation into a running environment.

Our existing demo is strongest at traceable decisions, protected contracts,
controlled Red/Green gates, immutable delivery identity, and operator-led acceptance.
It is weaker at proving the adequacy of tests, limiting deployment impact,
recovering safely, and continuously detecting and learning from operational
failures. AI-generated explanations are not substitutes for runtime evidence.

Prioritize three small, complete loops:

1. **Trustworthy verification:** establish a passing control, deliberately
   introduce bounded behavioral defects, require assertion-based detection,
   restore the control, and test the actual delivered image under a fault.
2. **Safe release and recovery:** deny an unhealthy candidate traffic, admit a
   qualified candidate, exercise recovery, and verify persistent data.
3. **Operational feedback:** detect repeated failures, preserve sanitized
   evidence, produce a reviewable maintenance handoff, execute an authorized
   response, and measure the recovery window.

Do not start by adding a production platform, autonomous approvals, or more
code-generation agents.

## 1. Method and evidence boundaries

There is no authoritative universal ranking of the ten most common AI-specific
Build/Verify/Deploy/Operate problems. This is a qualitative prioritization for
small teams making brownfield changes through GitHub, based on impact,
recurrence in delivery practice, and the cost of discovering mistakes late.
It is not a measured frequency ranking or a numerical coverage score.

| Source | What it supports | What it cannot establish |
|---|---|---|
| DORA 2025 [S1] | AI amplifies the strengths and weaknesses of the underlying organizational system | A universal causal ranking or this demo's effectiveness |
| DORA test automation [S2] | Fast, reliable tests, developer ownership, realistic journeys, and intolerance of flaky feedback | That passing a particular suite proves semantic completeness |
| Google SRE release engineering and canarying [S3, S4] | Reproducible artifacts, controlled rollout, observable release evaluation and recovery | Production safety of an isolated Docker exercise |
| Google SRE monitoring and postmortems [S5, S6] | User-visible symptoms, actionable signals, evidence-based diagnosis and preventive follow-up | That a readiness endpoint constitutes an SLO or an on-call system |
| DORA database change management [S7] | Data changes must be versioned, coordinated and evaluated across environments | That reverting an image reverses a schema or restores data |
| NIST SSDF 1.1 [S8] | Secure development belongs throughout the lifecycle | That this repository implements every framework practice |
| Repository code and tests | Specific implemented mechanisms and test-covered behavior | Independent Human approval, production incidents or long-term business value |

The source-code assessment baseline is commit
`0bade0d1189c8e435ebf74789d33912409a983bf`.

## 2. Ten high-impact pain points

"Strong within scope" describes an implemented mechanism, not an eliminated risk.
"Partial" means relevant support exists but material gaps remain.

| # | Pain point | AI amplification | Baseline coverage and remaining gap |
|---|---|---|---|
| 1 | **Compiling code that violates intended behavior or scope.** Build | Plausible additional logic is produced faster than it can be reviewed. | **Partial.** Approved Spec/Plan, stage boundaries and exact-head review constrain changes, but do not automatically establish semantic correctness. |
| 2 | **Environment drift, unreliable feedback and irreproducible builds.** Build / Verify | Generated code assumes the wrong runtime/dependency behavior; retries can hide rather than resolve failures. | **Partial.** Independent lockfiles, `npm ci`, Node 24, Docker and real CI exist. The base image is a mutable tag, Node's patch version is not fixed, and systematic flaky-test governance is absent. |
| 3 | **False confidence from tests that do not detect incorrect behavior.** Verify | Implementation and tests can share the same mistaken assumption, overuse mocks, or assert only existence. | **Partial.** Exact Red, run/hook-error rejection, frozen tests, real SQLite and browser checks help, but do not establish that the test harness itself is defect-free. |
| 4 | **Regressing old behavior, persistent data or nonfunctional requirements.** Verify | A narrow happy path dominates attention; concurrency, compatibility and capacity are omitted. | **Partial.** Existing tests help preserve behavior, but a passing suite does not establish load, concurrency, performance budgets or comprehensive NFR coverage. |
| 5 | **Functional success with security or supply-chain risk.** Build / Verify | Unnecessary dependencies, insecure code and excessive tool privileges can spread quickly. | **Foundational only.** Scoped workflow permissions, some sanitization and non-root runtime exist. A complete exercised SAST/SCA, image scan, SBOM, signing, verification and admission chain was not established. This is a capability gap, not a finding of an exploitable vulnerability. |
| 6 | **Reviewing A, testing B and running C.** Verify / Deploy | A generated completion summary or mutable tag can be mistaken for evidence. | **Strong structural support.** Exact-head review, frozen Git blobs, digest pulls and digest-bound acceptance require checks against actual records. CI and post-merge publication still perform separate builds; there is no complete multi-environment build-once promotion system. |
| 7 | **Deploying without controlled exposure or safe recovery.** Deploy | Deployment instructions omit traffic control, configuration compatibility, persistent state and recovery prerequisites. | **Production-grade capability not established.** Isolated immutable containers are available, but no canary, traffic switch, release abort, previous-version rollback or backup/restore drill was demonstrated. Cancelling an Intent does not roll back a workload. |
| 8 | **Confusing a live process with user-visible availability.** Operate | A successful health probe or generic HTTP 200 becomes a false success signal. | **Partial.** Liveness alone does not establish usable storage; the baseline lacks continuous monitoring, SLI/SLO, alerting and traffic admission. Automated publish verification checks health and dashboard, not readiness. |
| 9 | **Detecting failure without enough evidence to diagnose and recover.** Operate | Fluent root-cause guesses can outrun logs, metrics and actual runtime observations. | **Partial.** CI records, delivery receipts, fixed generic failure logs and a runbook exist. Request/release correlation, diagnostic packets and on-call workflows do not. The Trace Viewer observes agent execution, not complete production application behavior. |
| 10 | **Repairing symptoms without owned, verified prevention.** Operate to Build | An agent finishes the immediate fix and omits follow-up, recurrence and outcome review. | **Basic path exists.** Operational observation can become a new Intent, reviewed delivery and digest-bound acceptance. Automatic incident intake, owned preventive deadlines, recurrence measures and long-term business results are not established. |

<a id="3-what-the-real-failures-taught-us"></a>
## 3. Verification and operating boundaries

### Frozen tests prevent changing the answer, not choosing the wrong answer

Frozen tests prevent implementation from changing approved assertions.
They do not prove that the test harness is correct or that the suite detects
selected behavioral defects.

If a harness defect invalidates a frozen contract, cancel and start a new
reviewed continuation rather than modifying frozen tests. Isolated harness
experiments must remain explicitly labelled; they are not stage Green or
permission to edit production code in the Tests stage.

Exception boundaries also need supplemental negative checks, such as frozen
errors that verify sanitization does not mutate its input. Passing the
original assertions cannot replace those checks.

### Identity consistency is necessary, but not deployment safety

Digest-bound acceptance proves which image was exercised. It does not prove
that the release can safely replace a production version or recover compatible
configuration and data. A known old image is not a database restore strategy.

### Readiness is an operational input, not a complete operating model

The readiness contract should distinguish unusable storage from a live process:
require exact 503/no-store/unavailable readiness under unusable storage while
liveness remains 200. That distinction must also inform admission, monitoring
and response. A finite number of successful readiness probes is a bounded
observation, not a long-term availability claim.

## 4. Three implementable slices

| Slice | Decisive evidence | Explicit boundary |
|---|---|---|
| Trustworthy verification | Original suite passes; each chosen behavioral mutant is caught by assertions rather than a broken runner; restored suite passes; healthy and faulted instances of the same digest meet exact HTTP contracts | A bounded qualification of selected readiness tests, not universal mutation coverage or proof of all acceptance criteria |
| Safe release and recovery | Read-only loopback traffic remains on the good release after rejection; a qualified candidate receives traffic; rechecked fallback restores service without losing controlled fixture writes | A same-image configuration/process recovery rehearsal; no cross-version migration, write-traffic replication, production canary or backup/restore claim |
| Operational feedback | Repeated samples open one incident; an authorized response runs; a sustained healthy window verifies recovery; evidence produces an owned, reviewable maintenance task | No automatic GitHub publication/approval, no fabricated root cause, and no claim that symptom recovery completes preventive work |

Preserve the ownership-free source application. Use a reviewed immutable readiness
image and its exact matching completed application source for these exercises rather than copying
finished features into the baseline. Never attach accepted demonstration volumes
to fault injection. Never change old lifecycle evidence.

Security/supply-chain admission remains a parallel follow-up. These slices do
not replace security verification, load testing, independent reviews, actual
customer validation or production operational ownership.

## Sources

- [S1: DORA 2025](https://dora.dev/research/2025/dora-report/)
- [S2: DORA test automation](https://dora.dev/capabilities/test-automation/)
- [S3: Google SRE release engineering](https://sre.google/sre-book/release-engineering/)
- [S4: Google SRE canarying releases](https://sre.google/workbook/canarying-releases/)
- [S5: Google SRE monitoring distributed systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [S6: Google SRE postmortem culture](https://sre.google/sre-book/postmortem-culture/)
- [S7: DORA database change management](https://dora.dev/capabilities/database-change-management/)
- [S8: NIST SP 800-218, SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final)
