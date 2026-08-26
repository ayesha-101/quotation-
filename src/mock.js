// Offline stand-ins used when a role's real CLI isn't installed/configured.
// Clearly labeled as mock output — never passed off as a genuine model response.

function trimTask(prompt) {
  const firstLine = prompt.split('\n').find((l) => l.trim().length > 0) || prompt;
  return firstLine.slice(0, 140);
}

export function claudeMock(prompt) {
  const task = trimTask(prompt);
  return [
    `[MOCK] Implementation plan for: "${task}"`,
    '1. Break the task into the smallest shippable slice.',
    '2. Identify the files/modules that change and any new interfaces needed.',
    '3. Implement the slice with tests alongside the code.',
    '4. Note open questions for QA and architecture review below.',
    '',
    'Open questions: none blocking — proceeding with the straightforward approach.',
  ].join('\n');
}

export function chatgptMock(prompt) {
  return [
    '[MOCK] QA review',
    '- Correctness: no obvious defects found in the described implementation.',
    '- Edge cases: confirm empty-input and concurrent-write scenarios are covered by tests.',
    '- Verdict: PASS with the two follow-up checks above.',
  ].join('\n');
}

export function fuguMock(prompt) {
  return [
    '[MOCK] Architecture notes',
    '- Keep the pipeline stages loosely coupled: each role only depends on the prior stage\'s text output.',
    '- Prefer plain data (markdown/JSON) at stage boundaries over bespoke objects, so any CLI can slot in.',
    '- Recommend a single orchestrator process over a distributed one until there is a real scaling need.',
  ].join('\n');
}

export function kimiMock(prompt) {
  return [
    '[MOCK] Design spec',
    '- Layout: four role nodes (Claude, ChatGPT, Fugu, Kimi K3) arranged left-to-right in pipeline order.',
    '- Motion: a pulse travels node-to-node as each stage completes, easing in/out over 600ms.',
    '- Palette: neutral dark background, one accent color per role for quick visual identification.',
  ].join('\n');
}
