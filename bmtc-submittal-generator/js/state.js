// Shared mutable state, imported by reference across modules.
export const state = {
    logoDataUrl: '',
    brandLogoDataUrl: '',
    indexItemCounter: 0,
    trackerData: []
};

export const TRACKER_KEY = 'bmtcSubmittalTrackerV4';

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
