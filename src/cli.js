import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { runPipeline } from './pipeline.js';
import { renderMarkdown, renderHtml } from './report.js';
import { AGENTS } from './agents/registry.js';

const OUT_DIR = '.mindforge/reports';

function printUsage() {
  console.log(`mindforge — multi-LLM pipeline (Claude implements, ChatGPT QAs, Fugu architects, Kimi K3 designs)

Usage:
  mindforge run "<task description>"
  mindforge agents
  mindforge help

Environment (per agent, all optional — falls back to mock if unset/not installed):
  CLAUDE_CLI / CLAUDE_CLI_ARGS     (default: claude -p)
  CHATGPT_CLI / CHATGPT_CLI_ARGS   (default: chatgpt)
  FUGU_CLI / FUGU_CLI_ARGS         (default: fugu)
  KIMI_CLI / KIMI_CLI_ARGS         (default: kimi)
  MINDFORGE_MOCK=1                 force mock mode for every agent
`);
}

function cmdAgents() {
  for (const a of AGENTS) {
    console.log(`${a.name.padEnd(10)} ${a.role.padEnd(12)} ${a.summary}`);
  }
}

function cmdRun(task) {
  if (!task) {
    console.error('Error: "run" requires a task description, e.g. mindforge run "add PDF export"');
    process.exitCode = 1;
    return;
  }

  console.log(`Running pipeline for: ${task}\n`);
  const result = runPipeline(task);

  for (const stage of result.stages) {
    console.log(`--- ${stage.agent} (${stage.role}) [${stage.source}, ${stage.durationMs}ms] ---`);
    console.log(stage.text);
    console.log('');
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = result.startedAt.replace(/[:.]/g, '-');
  const mdPath = path.join(OUT_DIR, `${stamp}.md`);
  const htmlPath = path.join(OUT_DIR, `${stamp}.html`);

  writeFileSync(mdPath, renderMarkdown(result));
  writeFileSync(htmlPath, renderHtml(result));

  console.log(`Report written to:\n  ${mdPath}\n  ${htmlPath}`);
}

export function main(argv) {
  const [cmd, ...rest] = argv;

  switch (cmd) {
    case 'run':
      cmdRun(rest.join(' '));
      break;
    case 'agents':
      cmdAgents();
      break;
    case 'help':
    case undefined:
      printUsage();
      break;
    default:
      console.error(`Unknown command: ${cmd}\n`);
      printUsage();
      process.exitCode = 1;
  }
}
