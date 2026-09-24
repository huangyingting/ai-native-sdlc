# ai-native-sdlc

Manually run **Copilot CLI call-chain demo** from **Actions → Copilot CLI call-chain demo → Run workflow**. Open the completed run's **Job Summary** to see the observed parent/subagent/model/tool hierarchy, timestamps, durations, parallel-agent peak, and token counts when emitted. The prompt requests two independent, read-only research tracks that each use the built-in `web_search` tool; `--fleet` encourages parallel delegation but **does not guarantee any subagents or tool calls**. The summary explicitly says when no subagents were observed.

The workflow runs only with `workflow_dispatch`, installs Node 22 and `@github/copilot`, and authenticates with the run's short-lived `GITHUB_TOKEN` (`contents: read`, `copilot-requests: write`). The repository owner needs a Copilot entitlement and available usage; usage in a personal repository is billed to that owner's Copilot seat. Organization repositories additionally need the Copilot CLI organization billing policy. No PAT or repository secret is required.

CLI OpenTelemetry writes JSONL to the runner's temporary directory; prompt/content capture remains disabled and the raw trace is **not uploaded**. The renderer reads OTLP `resourceSpans[].scopeSpans[].spans[]` and publishes only selected metadata to the Job Summary, including explicitly reported errors. A missing or malformed trace fails the renderer (which runs even if Copilot fails), rather than producing a fake call chain. The summary may contain public agent/tool/model metadata, so do not put sensitive material in this demo repository or prompt.

Run the local, dependency-free parser tests with `node --test scripts/render-trace.test.mjs`.

References: [CLI in Actions](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli-in-actions), [CLI tool permissions](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools), [Actions billing](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/copilot-cli-in-github-actions).
