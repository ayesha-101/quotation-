import { claudeMock, chatgptMock, fuguMock, kimiMock } from '../mock.js';

// Each entry is a pluggable adapter over "each mind's" CLI: a binary that
// reads a prompt on stdin and prints its response on stdout. Point
// <NAME>_CLI / <NAME>_CLI_ARGS at whatever real tool implements that role;
// with nothing configured/installed the pipeline still runs end to end
// using the mock in ./src/mock.js.
export const AGENTS = [
  {
    name: 'Claude',
    role: 'implementer',
    summary: 'Main system: turns the task into a concrete implementation plan/artifact.',
    binEnv: 'CLAUDE_CLI',
    argsEnv: 'CLAUDE_CLI_ARGS',
    defaultBin: 'claude',
    defaultArgs: ['-p'],
    mock: claudeMock,
  },
  {
    name: 'ChatGPT',
    role: 'qa',
    summary: 'Quality assurance: reviews the implementation for correctness and gaps.',
    binEnv: 'CHATGPT_CLI',
    argsEnv: 'CHATGPT_CLI_ARGS',
    defaultBin: 'chatgpt',
    defaultArgs: [],
    mock: chatgptMock,
  },
  {
    name: 'Fugu',
    role: 'architect',
    summary: 'Developer of the system/idea: reviews and refines the overall architecture.',
    binEnv: 'FUGU_CLI',
    argsEnv: 'FUGU_CLI_ARGS',
    defaultBin: 'fugu',
    defaultArgs: [],
    mock: fuguMock,
  },
  {
    name: 'Kimi K3',
    role: 'designer',
    summary: 'Designer: produces the animated interface/design spec for the whole system.',
    binEnv: 'KIMI_CLI',
    argsEnv: 'KIMI_CLI_ARGS',
    defaultBin: 'kimi',
    defaultArgs: [],
    mock: kimiMock,
  },
];
