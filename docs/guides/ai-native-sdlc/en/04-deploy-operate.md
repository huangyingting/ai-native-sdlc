# 4. Deploy, Operate and learn: close the loop beyond merge

[Guide index](../README.md) · [中文](../zh/04-deploy-operate.md) ·
[Previous](03-build-verify.md) · [Next: engineering judgment](05-engineering-judgment.md)

First, this chapter explains exact-image acceptance using the current case.
Separate historical examples then illustrate readiness, recovery and preventive
work; those are not completed maintenance in the current demo repository.

## 4.1 Merge, publication and acceptance are different events

[![Successful publication and verification of the current delivery](https://raw.githubusercontent.com/huangyingting/ai-native-sdlc-demo/main/docs/cases/assets/ownership/publication-passed.png)](https://github.com/huangyingting/ai-native-sdlc-demo/actions/runs/38215333786/attempts/3)

**Ownership publication and verification, October 12, 2026.**
Inspect `publish` and `verify`, then the parent Intent's digest-bound record.
The Artifacts table's SHA-256 identifies a downloadable workflow artifact;
**it is not the GHCR image digest**.

In this repository:

1. Required review and checks permit a protected merge.
2. Publication builds and pushes an image.
3. Verification pulls the exact digest and starts a temporary container.
4. Exercise approved behavior against that artifact and record who ran the checks, results and limits.
5. Applicable acceptance closes the Intent.

The `it-service-desk-demo` Environment represents temporary container
verification, **not a permanently hosted public application**. A running local
container is not automatically upgraded by a merge.

Current ownership delivery record:

| Item | Value |
|---|---|
| Merged application revision | `1a1e14d0031305ee5da35c523ffbac9fa6f7e58b` |
| Publish/verify | Run `38215333786`, attempt `3` |
| GHCR image digest | `sha256:90836abf909410db91b0d3c791812683e5424c5cab7d7a84df1af6772a66ce76` |
| Acceptance | [Exact-image acceptance](https://github.com/huangyingting/ai-native-sdlc-demo/issues/1#issuecomment-6119642416) |

The [current case](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/ownership.en.md)
records the full image reference and observed checks. Create a dedicated volume and use an available
loopback port; do not attach an accepted instance's data to an experiment.

Attempt 2 failed with `permission_denied: write_package`. Job-level
`Packages: write` did not establish the package's access grant to this repository.
After the operator configured Actions access on the package, attempt 3 passed.
A successful build was not a successful delivery; the fix was authorization,
not a change to product code.

## 4.2 Exercise a user journey, not just an endpoint

[![Owner and requester in the published image](https://raw.githubusercontent.com/huangyingting/ai-native-sdlc-demo/main/docs/cases/assets/ownership/owner-handoff.png)](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/assets/ownership/owner-handoff.png)

**Handoff, October 12, 2026.** Requester Maya Chen and owner Sam Rivera are
distinct. This capture uses the published image, not a source preview.

[![Combined owner, status, priority and reference filters](https://raw.githubusercontent.com/huangyingting/ai-native-sdlc-demo/main/docs/cases/assets/ownership/owner-filter.png)](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/cases/assets/ownership/owner-filter.png)

**Combined filters, October 12, 2026.** Sam Rivera, Open, High and `inc-1`
intersect using AND semantics. See the [evidence register](../evidence.md).

To accept the ownership feature:

1. Record the digest and verification attempt before opening the application.
2. Inspect existing records and the initial unassigned state.
3. Assign, reassign and clear an owner; compare detail and queue.
4. Reload and restart the same disposable data volume; inspect persistence.
5. Exercise exact filter sets, empty states and navigation.
6. Submit invalid inputs safely in the isolated environment; verify no mutation.
7. Check original create/status/search behavior.
8. Record what was actually observed and what was not tested.

Screenshots document visible states. Tests and read-only database comparisons
establish no-op writes, complete-field preservation and pre-change schema migration.
Neither source replaces the other.

After checking the application in your own exercise, an eligible reviewer submits:

```text
/sdlc accept sha256:<64hex>
<Actual scenarios, observations, evidence links and limitations.>
```

Reject with `/sdlc reject sha256:<64hex>` and actual failures instead. Replace
placeholders; never accept a digest you did not exercise. For a still-open run,
reverification invalidates earlier acceptance even if the digest is unchanged.
An accepted run is terminal; further delivery uses a new Intent.

In the current case, the assistant ran browser checks; the user individually
confirmed product decisions, approvals and acceptance. After acceptance the
Intent closed and temporary resources were cleaned up. This is not a continuously
hosted service or production certification; eight baseline dependency advisories remain.

## 4.3 Turn an operational observation into maintenance

The following archived Discovery example is not a new result from the current demo.
A disposable replica with an invalid database path
returned:

| Request | Observation | Interpretation |
|---|---|---|
| `/api/health` | 200, `{"status":"ok"}` | Process liveness remained true |
| `/` | 500 | The user journey was unusable |
| `/api/ready` | 404 | No dependency-readiness endpoint existed |

This was deliberate fault injection, not a production outage. The prior
delivery verifier also checked the dashboard; it was not shown accepting this
broken replica. Liveness was doing its intended job, but operation needed a
separate readiness signal.

The readiness requirement became a separate maintenance Intent:

- Keep existing liveness unchanged.
- Check the database on every readiness request.
- Healthy: 200 and exactly `{"status":"ready"}`.
- Unavailable: 503 and exactly `{"status":"unavailable"}`.
- Both responses: `Cache-Control: no-store`.
- Log a fixed generic message rather than paths, exception details or stacks.
- Verify recovery after repair and preserve data.

[![Maintenance continuation explaining observed evidence and the failed prior harness](https://raw.githubusercontent.com/huangyingting/ai-native-sdlc-demo/main/docs/archive/assets/maintenance-continuation.png)](https://github.com/huangyingting/ai-native-sdlc-discovery-demo/issues/17)

**Figure G.** [huangyingting/ai-native-sdlc-discovery-demo#17](https://github.com/huangyingting/ai-native-sdlc-discovery-demo/issues/17)
records the readiness continuation's scope and why the first attempt was
cancelled. Chapter 3 explains the harness defect and its resolution.

The continuation's real acceptance checked healthy readiness, invalid-path
readiness, unchanged liveness, sanitized logs, 50 repeated readiness requests,
full data preservation and same-volume restart. The configuration repair
recreated a disposable instance; it did not edit a running process's environment.

## 4.4 Three small reliability loops

```mermaid
flowchart LR
  T["Qualify tests with controlled mutations"] --> A["Check image and read journey"]
  A --> G{"Admit candidate?"}
  G -->|"Bad configuration"| S["Keep stable serving"]
  G -->|"Healthy"| C["Route to candidate"]
  C --> F["Inject process fault in disposable lab"]
  F --> R["Detect, recheck standby, fall back"]
  R --> W["Verify recovery window and data hash"]
  W --> M["Review maintenance draft and preventive work"]
```

1. **Trustworthy verification:** original/restored 13-test controls and six
   deliberate mutants establish a narrow readiness-test capability.
2. **Safe local admission and recovery:** reject a misconfigured candidate;
   admit a healthy candidate; pause it; recheck stable before fallback.
3. **Operational feedback:** record incident/recovery observations, generate
   an unapproved maintenance draft, review and implement preventive scope,
   repeat relevant checks before closure.

[![Actual hosted reliability rehearsal with its execution and artifact](https://raw.githubusercontent.com/huangyingting/ai-native-sdlc-demo/main/docs/archive/assets/reliability-run.png)](https://github.com/huangyingting/ai-native-sdlc-discovery-demo/actions/runs/36388446065)

**Figure H.** [GitHub Actions reliability run 36388446065](https://github.com/huangyingting/ai-native-sdlc-discovery-demo/actions/runs/36388446065),
captured October 12, 2026. Open individual jobs from the summary; the
[measured report](https://github.com/huangyingting/ai-native-sdlc-demo/blob/main/docs/archive/brownfield-reliability-rehearsal.md) records the results.

Two local repetitions rejected bad configuration, performed exactly one
fallback and passed separate five-sample recovery windows. Observed detection
times were 4,208/4,207 ms and recovery confirmations 733/882 ms. The actual
hosted repetition is recorded separately in the report.

These are short, deliberately faulted **same-image, read-only-gateway exercises**.
They do not establish production MTTR, an SLO, arbitrary write-traffic safety,
cross-version rollback or backup restoration. The data hash comparison covers
the full controlled schema/rows for this scenario only.

## 4.5 Recovery is not preventive closure

Returning traffic to stable answers “is the read journey working again?”
It does not answer “have we prevented recurrence?”

The normal maintenance follow-up
[huangyingting/ai-native-sdlc-discovery-demo#25](https://github.com/huangyingting/ai-native-sdlc-discovery-demo/issues/25)
linked reviewed scope and
[huangyingting/ai-native-sdlc-discovery-demo#26](https://github.com/huangyingting/ai-native-sdlc-discovery-demo/pull/26).
Closure followed an actual post-merge hosted rehearsal, not merely creation of
an AI-generated draft.

For your own team, require an operational owner, observations separated from
hypotheses, proposed prevention, acceptance checks and a post-change result.
If the root cause is unknown, say so. “AI diagnosed it” is not root-cause evidence.

### Exit checklist and production gap

- [ ] Digest, source SHA, run and attempt all refer to the same delivery.
- [ ] User-journey observations accompany smoke verification.
- [ ] Fault drills use isolated resources and checked cleanup.
- [ ] Recovery and preventive completion have separate evidence.
- [ ] Maintenance links back to the observation without rewriting prior approvals.

Before production, add the controls appropriate to the system: independent
approvals, signed provenance/admission, authorization/privacy review, capacity
and load tests, cross-version database compatibility, tested backup restoration,
on-call ownership, SLOs and business-outcome measurement. These are **remaining
work**, not capabilities inferred from the screenshots.

[Next: evaluate changes, diagnoses and Agent strategies honestly](05-engineering-judgment.md).
