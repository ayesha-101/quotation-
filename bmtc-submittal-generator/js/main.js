import { state } from './state.js';
import { setupApiKeyUI } from './api.js';
import { setupFileInput } from './utils.js';
import { setupTabs } from './tabs.js';
import { setupFieldControls } from './fields.js';
import { setupIndexControls } from './indexItems.js';
import { generateDocument } from './documentGenerator.js';
import { showFolderPreview } from './folderPreview.js';
import { setupZipBtn } from './zip.js';
import { setupPrint } from './print.js';
import { loadTracker, renderTracker, setupTrackerEvents, addToTracker } from './tracker.js';
import { setupAgentView } from './agent.js';

document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('submittalRef').value = `BMTC-SUB-${ym}-001`;

    new Sortable(document.getElementById('index-items-container'), { handle: '.drag-handle', animation: 150 });

    setupFileInput('brandLogoInput', 'brandLogoFilename', url => state.brandLogoDataUrl = url);
    setupFileInput('logoFileInput', 'logoFilename', url => state.logoDataUrl = url);

    setupApiKeyUI();
    loadTracker();
    renderTracker();
    setupTabs();
    setupTrackerEvents();
    setupPrint();
    setupFieldControls();
    setupIndexControls();
    setupZipBtn();
    setupAgentView();

    document.getElementById('generateBtn').addEventListener('click', () => {
        generateDocument();
        addToTracker();
        showFolderPreview();
        document.getElementById('downloadZipBtn').disabled = false;
    });
});
