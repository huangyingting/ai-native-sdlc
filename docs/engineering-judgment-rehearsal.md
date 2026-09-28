# Engineering Judgment: Actual Rehearsal Evidence

This report records the development-test rehearsal of the
[three engineering judgment demos](engineering-judgment-demos.md). It keeps
tooling failures separate from evaluated Agent outcomes.

## Fixed input

- Source fixture commit:
  `540cacd2a10be5ed326479fd959d21eec5d4997c`.
- Exported fixture SHA-256:
  `57dc5e092135fe4e55c34fc094302c24cbb254050d9729c844939dc8dcd11f5f`.
- Runtime:
  `node@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6`.
- Copilot CLI: `1.0.89-3`; observed default model: `gpt-5.6-sol`.
- Baseline: 15 visible tests; diagnosis oracle: 20 checks; impact oracle:
  35 checks including actual additive legacy SQLite migration.

The first real restricted-Docker control passed all 15 visible tests and all
20 diagnosis-oracle checks. Every created control container was removed.
No accepted service-desk image, data volume or application source was reused
as the synthetic experiment workspace.

## Failures found before accepted trials

### Plain CLI rendering is not a JSON transport

The first real impact proposal call consumed one observed premium-request
unit but was rejected as `invalid-response`. Plain terminal rendering inserted
literal line breaks inside JSON strings. Exit zero from the CLI did not make
the response valid.

Its private call evidence recorded:

| Input tokens | Output tokens | Cache-read tokens | Cache-write tokens | Nano-AIU | Wall time |
|---:|---:|---:|---:|---:|---:|
| 16,514 | 2,014 | 0 | 16,511 | 12,284,700,000 | 37,762 ms |

That attempt was not repaired in place, approved, executed, or counted as a
successful proposal. The adapter was changed to extract exact assistant
content from structured JSONL events, without heuristic newline correction.
The proposal prompt was also clarified: source quotations must be exact
contiguous excerpts, with reasoning kept in a separate field.

### An empty tool allowlist did not mean zero tools

Structured preflight telemetry exposed a second problem:

| CLI configuration tested | Observed tools |
|---|---:|
| Empty `--available-tools=` | 19 |
| Include `bash` and exclude `bash` simultaneously | 1 |
| Explicitly exclude all 19 observed tools, without an allowlist | 0 |

The successful empty-tool-set probe also showed an empty assistant
`toolRequests` array. The adapter now rejects responses without observed
zero-tool telemetry, or with tool requests/execution events. This is an
explicitly qualified CLI configuration, not an assumption that any future
CLI version interprets empty flags the same way.

The earlier plain-output attempt cannot establish this zero-tool guarantee
and is excluded from accepted evaluation. Raw CLI events contain private
session metadata and are not published.

Four real qualification calls were made in total: the initial simple CLI
preflight, lossless JSONL transport, include/exclude precedence and explicit
tool exclusion. Together they used 32,579 input tokens, 41 output tokens,
four reported premium-request units and 16,370,300,000 nano-AIU. Together
with the rejected impact attempt, setup overhead was five calls/units,
49,093 input tokens, 2,055 output tokens and 28,655,000,000 nano-AIU.
These costs are disclosed separately rather than omitted from the rehearsal.

### Review corrections

A code review identified three further correctness defects, addressed with
targeted regression tests:

1. Docker setup operations had fresh timeouts and could start a candidate
   after the cell execution deadline. Setup and execution now share a deadline;
   bounded cleanup is accounted separately.
2. Failed paid calls dropped available usage telemetry from aggregate reports.
   Failure metrics are now retained rather than replaced by unknown values.
3. Docker infrastructure failures were counted as completed failed trials.
   They now abort with exit 1, preserve the attempted cell and distinguish
   unexecuted trials from evaluated candidates.

The fixed synthetic source was not changed to hide any of these failures.

### Impact coverage is not the same as allowed edit paths

One subsequent attempt was blocked before any CLI process was spawned while
tool-isolation qualification was being integrated; it incurred no model request.

The first zero-tool, lossless proposal then supplied **17 exact source
quotations**. It correctly cited multiple responsibilities in individual files
and unchanged CLI/test consumers. The original validator incorrectly demanded
exactly one entry per required edit surface and rejected this useful analysis.

This was a harness defect, not fabricated model evidence. The validator now
allows distinct quotations from any supplied source file, still requires every
mandatory domain/storage/API/documentation surface, and rejects duplicated
quotations, unknown files and inexact excerpts. Implementation edit paths remain
unchanged and restricted to four files. The rejected report and original
response remain intact; the corrected validator also accepts that original
response without modifying it.

That model call recorded 7,173 input tokens, 3,316 output tokens,
10,218,200,000 nano-AIU, one premium-request unit and 47,499 ms wall time.
Including it, pre-acceptance overhead is six actual calls/units, 56,266 input
tokens, 5,371 output tokens and 38,873,200,000 nano-AIU. The pre-spawn blocked
attempt is not counted as a model call.

## Interpretation and preservation

Private evidence remains in new external experiment directories: original
prompts, raw CLI events, usage files, candidate files, test executions,
approval receipts and reports. Failed attempts are not overwritten. Published
summaries contain only reviewed measurements and hashes.

The benchmark uses one sample per case and strategy. Results are illustrative,
not statistically significant. Measured premium-request units and nano-AIU
are not dollars, and cache tokens must not be added to total input twice.
Preflight, transport qualification and failed setup attempts are overhead,
not hidden inside a successful benchmark cell.
