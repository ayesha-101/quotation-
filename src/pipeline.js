import { AGENTS } from './agents/registry.js';
import { invokeAgent } from './agents/base.js';

function buildPrompt(agent, task, priorStages) {
  const context = priorStages
    .map((s) => `--- ${s.agent} (${s.role}) said ---\n${s.text}`)
    .join('\n\n');

  const roleBriefs = {
    implementer:
      'You are the lead implementer of a multi-LLM system. Produce a concrete implementation plan or artifact for the task below.',
    qa: 'You are quality assurance. Review the implementation above for correctness, missing edge cases, and risks. Give a clear verdict.',
    architect:
      'You are the system architect/developer of the overall idea. Given the task, implementation, and QA feedback above, refine the architecture and flag structural issues.',
    designer:
      'You are the designer of the whole system. Given everything above, produce a design spec for an animated interface that represents this system (layout, motion, palette).',
  };

  const parts = [roleBriefs[agent.role], '', `Task: ${task}`];
  if (context) parts.push('', context);
  return parts.join('\n');
}

/**
 * Runs the four roles in order — Claude implements, ChatGPT does QA,
 * Fugu architects, Kimi K3 designs — each stage receiving every prior
 * stage's output as context.
 */
export function runPipeline(task, { agents = AGENTS } = {}) {
  const stages = [];
  for (const agent of agents) {
    const prompt = buildPrompt(agent, task, stages);
    const result = invokeAgent(agent, prompt);
    stages.push(result);
  }
  return { task, startedAt: new Date().toISOString(), stages };
}
