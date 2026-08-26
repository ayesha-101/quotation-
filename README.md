# MindForge

A multi-LLM orchestration CLI. One task goes through four roles, each one a
pluggable adapter over "each mind's" own CLI:

| Role | Agent | Job |
|---|---|---|
| Implementer / main system | **Claude** | Turns the task into a concrete implementation plan or artifact. |
| Quality assurance | **ChatGPT** | Reviews Claude's output for correctness, gaps, and risk. |
| Architect / developer of the idea | **Fugu** | Refines the overall system architecture given the implementation and QA feedback. |
| Designer | **Kimi K3** | Produces the design spec (layout, motion, palette) for an animated interface representing the whole pipeline. |

Each stage sees every prior stage's output as context, so the four roles
build on each other rather than working in isolation. The final run
produces a Markdown report and a self-contained, animated HTML dashboard
(see `src/templates/dashboard.html`) that visualizes the four agents as
connected nodes with a pulse animation traveling along the pipeline as each
stage completes.

## Why "pluggable"

There's no single universal CLI for ChatGPT, Fugu, or Kimi K3 the way there
is for Claude Code. So each agent is a thin adapter: it shells out to a
configurable binary, piping the prompt on stdin and reading the response
from stdout. Point it at whatever CLI you actually have installed for that
role:

```
CLAUDE_CLI=claude         CLAUDE_CLI_ARGS="-p"     # default
CHATGPT_CLI=chatgpt       CHATGPT_CLI_ARGS=""      # e.g. point at your OpenAI/Codex CLI of choice
FUGU_CLI=fugu             FUGU_CLI_ARGS=""
KIMI_CLI=kimi             KIMI_CLI_ARGS=""
```

If a binary isn't found on `PATH` (or `MINDFORGE_MOCK=1` is set), that
agent's stage falls back to a clearly labeled mock response instead of
failing — the pipeline always completes end to end, which is what makes it
possible to develop and test the orchestration itself without every one of
these tools installed.

## Usage

```sh
node bin/mindforge.js agents          # list the four roles
node bin/mindforge.js run "Add a PDF export button to the quotation builder"
```

A run prints each stage to the terminal and writes both a report and the
animated dashboard to `.mindforge/reports/<timestamp>.{md,html}`. Open the
`.html` file in a browser to see the pipeline.

## Project layout

```
bin/mindforge.js          CLI entry point
src/agents/registry.js    the four role definitions (binary, args, mock)
src/agents/base.js        CLI invocation + mock fallback
src/pipeline.js           runs the four stages, threading context forward
src/report.js             renders the Markdown report and HTML dashboard
src/templates/dashboard.html   the animated pipeline visualization
src/mock.js               offline stand-ins used when a role's CLI isn't installed
test/pipeline.test.js     pipeline + report tests (node --test)
```

## Tests

```sh
npm test
```
