# Agent Trace orchestration scenarios

Agent Trace demonstrates how GitHub Copilot CLI can dynamically decompose a task into subagents. The repository defines the orchestration objective and constraints, but it does not define fixed scenario-specific agent profiles. At runtime, Copilot CLI chooses the appropriate built-in subagent type, creates isolated task contexts, and returns their results to the orchestrator.

## Scenario comparison

| Scenario | Subagents | Scheduling | Information flow | Best used for |
|---|---:|---|---|---|
| Single agent baseline | 0 | Direct | User → orchestrator → result | Establishing latency, token, and cost baselines |
| Concurrent research | 2 | Parallel | Two independent investigations → synthesis | Comparing products, sources, or independent domains |
| Review panel | 2 | Parallel | Two review perspectives → reconciliation | Finding defects while reducing single-reviewer bias |
| Rubber duck critique | 1 | Sequential | Initial position → critic → revised conclusion | Challenging assumptions and simplifying a proposal |
| Lead + specialists | 2 | Sequential | Design proposal → dependent review → revised plan | Work where the second specialist must inspect the first result |

## Runtime model selection

Every workflow run has two model inputs:

- **Orchestrator model** plans delegation, supplies context, and synthesizes the final response.
- **Subagent model** is requested for every dynamically created subagent.

The defaults are `gpt-6-luna` for both inputs. The trace reports the models actually observed rather than assuming that the requested models were used. For delegated scenarios, validation rejects models outside the selected set and requires the selected subagent model to appear. Cost is then calculated independently for every observed model call and aggregated by model and agent branch.

## 1. Single agent baseline

The orchestrator handles the task directly and is instructed not to delegate.

```text
User request
    └── Orchestrator
            └── Final answer
```

Use this scenario to measure the overhead introduced by delegation. It is the reference point for comparing elapsed time, token use, and cost with the other scenarios.

**Trace evidence**

- No subagent spans.
- At least one model call.
- Only the orchestrator model is required.
- Peak concurrent subagents is `0`.

## 2. Concurrent research

Copilot CLI runs in fleet mode and dynamically creates two focused research subagents. The default demonstration assigns one branch to Amazon S3 and the other to Azure Blob Storage.

```text
                         ┌── Dynamic researcher A ── AWS evidence ──┐
User request ── Orchestrator                                      ├── Synthesis
                         └── Dynamic researcher B ── Azure evidence ┘
```

The branches are independent and should overlap in time. The default task also demonstrates different tool integrations:

- AWS research uses `web_fetch` against allowlisted `docs.aws.amazon.com` pages.
- Azure research uses `microsoft-learn/microsoft_docs_search`.

Microsoft Learn URLs are intentionally not permitted through `web_fetch`; the Microsoft Learn MCP tools should be used instead. A denied attempt appears as a failed tool span, while a later successful MCP call can still satisfy the scenario.

**Trace evidence**

- At least two subagent branches.
- Peak concurrent subagents is at least `2`.
- A successful AWS `web_fetch` and Microsoft Learn search occur on different branches.
- The selected subagent model is observed.

## 3. Review panel

Copilot CLI runs in fleet mode and dynamically creates two reviewers with different concerns. The default instructions request one correctness/reliability perspective and one architecture/maintainability perspective.

```text
                         ┌── Dynamic reviewer A ── correctness ──┐
Repository ── Orchestrator                                      ├── Reconciled findings
                         └── Dynamic reviewer B ── architecture ─┘
```

The orchestrator reconciles duplicate findings and disagreements instead of concatenating two reports. Fixed reviewer names are deliberately not required; Copilot CLI may select the same built-in agent type twice with different task descriptions.

**Trace evidence**

- At least two dynamically created subagent branches.
- Peak concurrent subagents is at least `2`.
- No validation depends on predetermined agent names.
- The selected subagent model is observed.

## 4. Rubber duck critique

The orchestrator first develops an initial position. It then dynamically creates one independent critic with the original request and initial position as context. The final answer must explain how the critique changed the conclusion.

```text
User request
    └── Orchestrator initial position
            └── Dynamic critic
                    └── Orchestrator revised conclusion
```

Unlike a review panel, this pattern is intentionally asymmetric: the critic reacts to an existing position rather than independently solving the original task. It is useful for exposing hidden assumptions, counterexamples, and unnecessary complexity.

**Trace evidence**

- At least one dynamically created subagent branch.
- The critic executes after the initial reasoning begins.
- The selected subagent model is observed.

## 5. Lead + specialists

This scenario demonstrates dependent, sequential collaboration. The orchestrator dynamically creates a solution-design specialist and waits for its proposal. It then creates a fresh critical-review specialist whose input includes both the original request and the first result.

```text
User request
    └── Orchestrator
            └── Dynamic design specialist
                    └── result returned
                            └── Dynamic critical reviewer
                                    └── revised plan
```

This differs from concurrent research and review because the second task cannot start correctly until the first task finishes. Use it for plan-review-revision workflows, staged analysis, and other tasks with explicit data dependencies.

**Trace evidence**

- At least two dynamically created subagent branches.
- Peak concurrent subagents is exactly `1`.
- The second branch begins after the first branch completes.
- The selected subagent model is observed.

## Reading failures in the viewer

A red tool span means OpenTelemetry recorded an actual tool failure. It does not necessarily mean the overall orchestration failed. Common examples include:

- A URL rejected by the workflow allowlist.
- A subagent attempting a denied shell or write operation.
- An MCP or HTTP request returning an error.

Select the span to view its **Failure reason**. This diagnostic is shown independently of request/response payload capture. Payload capture remains off by default because tool arguments and results can contain sensitive information.

## Choosing a scenario

- Choose **Single agent baseline** when measuring whether delegation is worthwhile.
- Choose **Concurrent research** when subtasks are independent and benefit from parallel execution.
- Choose **Review panel** when the same artifact should be assessed from different perspectives.
- Choose **Rubber duck critique** when a proposal needs adversarial reflection rather than another complete solution.
- Choose **Lead + specialists** when later work must consume and critique an earlier specialist result.

Scenarios can be selected through **Actions → Agent Trace → Run workflow** or the **Agent Trace run** issue form. A custom task can replace the built-in demonstration task without changing the selected orchestration pattern.
