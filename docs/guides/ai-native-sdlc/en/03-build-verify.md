# 3. Build and Verify: make the executable contract trustworthy

[Guide index](../README.en.md) · [中文](../zh/03-build-verify.md) ·
[Previous](02-intent-spec-plan.md) · [Next: Deploy and Operate](04-deploy-operate.md)

This chapter continues **the current ticket ownership delivery** and explains
harness qualification: how can tests constrain implementation effectively,
and what should happen when the tests themselves are defective?

## 3.1 Build starts with a boundary

Once the Plan is fully approved, the repository creates an engineering branch
from the approved document commit. It assigns Tests first, not implementation.
The Tests PR targets that lifecycle branch; the later Implementation PR targets
`main` and carries the complete increment.

[![Review identifies assertions hidden behind expected failures](https://raw.githubusercontent.com/huangyingting/ai-native-sdlc-demo/main/docs/cases/assets/ownership/tests-request-changes.png)](https://github.com/huangyingting/ai-native-sdlc-demo/pull/8#pullrequestreview-5486915007)

**Tests review,** [huangyingting/ai-native-sdlc-demo#8](https://github.com/huangyingting/ai-native-sdlc-demo/pull/8).
Captured October 12, 2026. Identify the target branch, delivery-stage metadata and
scope. Then open **Files changed**, **Checks** and the
[second requested-changes review](https://github.com/huangyingting/ai-native-sdlc-demo/pull/8#pullrequestreview-5486915007).

| Tests stage may | Tests stage must not |
|---|---|
| Add meaningful executable acceptance assertions | Implement production behavior |
| Record the exact observed expected failures | Invent failures before running the suite |
| Correct weak tests before approval | Alter approved Spec/Plan to match easier tests |
| Preserve baseline regression behavior | Call import errors, skipped tests or broken hooks valid Red |

## 3.2 Red tests can produce a green validation job

Controlled Red means:

1. The unmodified baseline passes.
2. New feature tests actually run.
3. They fail for the declared missing behavior, with the expected named failures.
4. Compilation/lint/build are valid and unrelated failures are absent.

The `tdd-red` job checks that contract. Therefore **expected feature tests are
red while `stage-validation` is green**. Approving a failed validator merely
because “we expected Red” confuses the test outcome with the gate outcome.

The [final Red check](https://github.com/huangyingting/ai-native-sdlc-demo/actions/runs/38210170335/attempts/2)
first passed all 26 baseline tests, then checked 38 tests on the Tests head:
**29 passed and exactly nine declared assertions failed**, without skips or
infrastructure errors. Approval bound head `104be0889c54652bec8f9bc317ffa5f0cf33166f`.

## 3.3 Review what assertions prove

The first proposed tests were not accepted immediately. Here is the difference
between a plausible test and a useful one:

| Weak proxy | Stronger required observation |
|---|---|
| Owner names appear in dropdown options | Actual owner text appears in the correct queue row and detail metadata |
| Timestamp did not change | A separate SQLite `PRAGMA data_version` observer sees no write |
| Updating owner returns success | Assign, reassign and clear each persist across close/reopen |
| All records are returned somewhere | Exact combined filter result sets and empty-set cases match |
| HTML contains a selected option | A mounted control synchronizes after real navigation |
| A field can be updated | Only permitted fields change; unrelated rows/fields are preserved |

Use this review question repeatedly: **Could a wrong implementation still pass
this assertion?** If yes, improve the test or state the limitation. Do not
increase test count without improving discriminatory power.

This case required two revision rounds. The first corrected failure names,
legacy fixtures and missing coverage. Even after controlled Red passed, the
second found contradictory filter/timestamp expectations, a detached-DOM lookup
and a no-op check that did not advance time. Earlier expected failures had
hidden later assertions. **A passing validator does not prove all tests are sound.**

## 3.4 Implementation is evaluated against the approved tests

After reviewed Tests merge, AI proposes the implementation. Reviewers inspect:

- Storage migration, validation and behavior required by the Spec.
- Actual UI/data integration, not only a helper that is never used.
- Byte-preserved approved tests, documents and failure manifest.
- Additional regressions in new files where needed.
- Passing current-head checks and review, not an earlier approved head.

The [ownership implementation](https://github.com/huangyingting/ai-native-sdlc-demo/pull/9)
passed Stage Green and application CI: **38 tests, lint, build and container
smoke**. All nine Red tests passed and nine frozen files were unchanged.

| Required surface | What to inspect |
|---|---|
| `stage-validation` | Approved blobs unchanged; formerly expected Red scenarios now Green |
| `validate` | Application tests, lint and build |
| `container-smoke` | Actual production container startup and smoke |
| Delivery policy | Eligible current-head approval, required checks and branch policy |

New commits require renewed applicable review. A successful coordination
workflow is not a substitute for the application checks it coordinates.

## 3.5 Do not change the product to accommodate a faulty harness

Red establishes an observed failure, not the correctness of every deeper
assertion or the test harness. Review whether tests reach meaningful behavior,
and distinguish product defects, harness defects and environment failures.

Qualify a harness in isolation, with explicit inputs and results; do not
present that experiment as stage Green. If a defect affects frozen tests,
create explicitly scoped follow-up work and obtain renewed review rather
than adding product hacks or silently editing approved files.

## 3.6 Qualify the verifier itself

Verify that tests detect wrong implementations as well as accept correct ones.
For a readiness contract, consider the following controlled mutations.
This is an experiment design example, not verification completed in the current case.

| Deliberate mutation | Why it should be caught |
|---|---|
| Omit the database read | An apparently healthy endpoint may not check the dependency |
| Return 200 on database failure | Admission would accept an unusable instance |
| Omit `no-store` on success or failure | A cached answer could hide current state |
| Log the raw exception | Readiness diagnostics could disclose sensitive details |
| Mutate a caught frozen error | Error handling can introduce a new failure |

Run passing controls, inject each mutation and record its result, then restore
the implementation and rerun the controls. Keep test files unchanged and
declare valid failure types in advance. Import, hook and timeout errors do
not establish detection of a product defect.

Limit conclusions to the mutations actually checked, rather than claiming
a project-wide mutation score. See the
[reliability guide](../../brownfield-reliability-loops.en.md) for procedures.

## 3.7 A failure-triage decision table

| Observation | Correct next action |
|---|---|
| Dependencies/imports fail before feature assertions | Repair environment/harness; do not record valid Red |
| Code violates approved behavior | Correct code under the same contract; rerun checks |
| Tests are weak before approval | Revise Tests and rerun actual Red |
| Frozen contract or harness is wrong | Use explicit continuation/new work; preserve failed evidence |
| Green passes but coverage misses an important failure | Add independent/supplemental qualification without weakening approved tests |
| Only a model summary says “fixed” | Execute verification before accepting |

### Exit checklist

- [ ] Baseline, actual Red and actual Green are separately identifiable.
- [ ] The approved assertions reached meaningful behavior.
- [ ] Tests and documents were not weakened to obtain Green.
- [ ] Every failure has a cause classification and retained evidence.
- [ ] Current-head code review and required checks are satisfied.
- [ ] Remaining untested behavior is explicit.

[Next: verify the image, accept behavior and close the operational loop](04-deploy-operate.md).
