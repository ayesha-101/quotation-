// Shared mutable state, imported by reference across modules.
export const state = {
    logoDataUrl: '',
    brandLogoDataUrl: '',
    indexItemCounter: 0,
    trackerData: [],
    agentHistory: [],       // Claude message history (role/content)
    pendingAttachment: null // { mediaType, base64, name, kind: 'image'|'pdf' } — cleared after each send
};

export const TRACKER_KEY = 'bmtcSubmittalTrackerV4';
export const API_KEY_STORAGE = 'bmtcClaudeApiKey';
// Update this if Anthropic retires the model — see console for 4xx errors naming the model.
export const CLAUDE_MODEL = 'claude-sonnet-5';

export const GENERAL_INDEX = [
    'COMPANY PROFILE',
    'TRADE LICENSE',
    'ISO CERTIFICATE',
    'AUTHORIZATION LETTER',
    'COMPLIANCE STATEMENT',
    'PROJECT SPECIFICATION',
    'COUNTRY OF ORIGIN',
    'TEST CERTIFICATES',
    'PREVIOUS PROJECTS',
    'PREVIOUS APPROVALS',
    'CATALOGUE'
];
