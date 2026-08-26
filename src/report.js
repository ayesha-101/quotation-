import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, 'templates', 'dashboard.html');

const ACCENT = {
  implementer: 'var(--claude)',
  qa: 'var(--chatgpt)',
  architect: 'var(--fugu)',
  designer: 'var(--kimi)',
};

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderMarkdown(result) {
  const lines = [
    `# MindForge run`,
    '',
    `**Task:** ${result.task}`,
    `**Started:** ${result.startedAt}`,
    '',
  ];
  for (const stage of result.stages) {
    lines.push(`## ${stage.agent} — ${stage.role} (${stage.source})`, '', stage.text, '');
  }
  return lines.join('\n');
}

export function renderHtml(result) {
  const template = readFileSync(TEMPLATE_PATH, 'utf8');

  const nodes = result.stages
    .map((stage, i) => {
      const node = `
        <div class="node" style="--accent: ${ACCENT[stage.role] || '#fff'}">
          <h2>${escapeHtml(stage.agent)}</h2>
          <div class="role">${escapeHtml(stage.role)}</div>
          <div class="source">${escapeHtml(stage.source)} · ${stage.durationMs}ms</div>
          <pre>${escapeHtml(stage.text)}</pre>
        </div>`;

      if (i === result.stages.length - 1) return node;

      const connector = `
        <div class="connector">
          <div class="pulse" style="--pulse-color: ${ACCENT[stage.role] || '#fff'}; --delay: ${i * 0.3}s"></div>
        </div>`;
      return node + connector;
    })
    .join('\n');

  return template
    .replace('__TASK__', escapeHtml(result.task))
    .replace('__NODES__', nodes);
}
