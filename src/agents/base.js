import { spawnSync } from 'node:child_process';

/**
 * Checks whether a binary exists on PATH without invoking it
 * (avoids hanging CLIs that block waiting on stdin).
 */
export function commandExists(cmd) {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  const res = spawnSync(finder, [cmd], { encoding: 'utf8' });
  return res.status === 0;
}

/**
 * Runs a configured agent CLI with a prompt piped over stdin and
 * returns its stdout. Falls back to the caller-supplied mock when the
 * binary isn't installed, exits non-zero, or times out — so the
 * pipeline always completes end to end even without every LLM CLI
 * present.
 */
export function invokeAgent(agent, prompt) {
  const start = Date.now();
  const binary = process.env[agent.binEnv] || agent.defaultBin;
  const argsRaw = process.env[agent.argsEnv];
  const args = argsRaw !== undefined ? argsRaw.split(' ').filter(Boolean) : agent.defaultArgs;

  const forceMock = process.env.MINDFORGE_MOCK === '1' || process.env.MINDFORGE_MOCK === 'true';

  if (!forceMock && commandExists(binary)) {
    const res = spawnSync(binary, args, {
      input: prompt,
      encoding: 'utf8',
      timeout: Number(process.env.MINDFORGE_TIMEOUT_MS) || 120000,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (!res.error && res.status === 0 && res.stdout && res.stdout.trim()) {
      return {
        agent: agent.name,
        role: agent.role,
        source: 'live',
        binary,
        text: res.stdout.trim(),
        durationMs: Date.now() - start,
      };
    }
  }

  return {
    agent: agent.name,
    role: agent.role,
    source: 'mock',
    binary,
    text: agent.mock(prompt),
    durationMs: Date.now() - start,
  };
}
