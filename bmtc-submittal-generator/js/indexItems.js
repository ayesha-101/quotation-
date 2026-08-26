import { state, GENERAL_INDEX } from './state.js';
import { extractIndexItemsFromFile } from './ocr.js';

export function setupIndexControls() {
    document.getElementById('addIndexItemBtn').addEventListener('click', () => addIndexItem());
    document.getElementById('useStandardIndexBtn').addEventListener('click', () => {
        GENERAL_INDEX.forEach(item => addIndexItem(item));
    });
    document.getElementById('addFromListBtn').addEventListener('click', () => {
        const lines = document.getElementById('quickAddList').value.trim().split('\n').filter(Boolean);
        lines.forEach(l => addIndexItem(l.trim()));
        document.getElementById('quickAddList').value = '';
    });
    document.getElementById('index-items-container').addEventListener('click', e => {
        if (e.target.closest('.remove-item-btn')) e.target.closest('.index-item-row').remove();
    });
    document.getElementById('indexFileInput').addEventListener('change', handleIndexFileUpload);
}

export function addIndexItem(desc = '') {
    const name = `status-${state.indexItemCounter++}`;
    const el = document.createElement('div');
    el.className = 'index-item-row';
    el.innerHTML = `
        <span class="drag-handle">⠿</span>
        <input type="text" class="index-item-desc" placeholder="Item Description" value="${desc}">
        <div class="status-options">
            <label><input type="radio" name="${name}" value="yes"> Yes</label>
            <label><input type="radio" name="${name}" value="no"> No</label>
            <label><input type="radio" name="${name}" value="na"> N/A</label>
        </div>
        <button class="btn-icon remove-item-btn" title="Remove">✕</button>
    `;
    document.getElementById('index-items-container').appendChild(el);
}

async function handleIndexFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    const statusEl = document.getElementById('indexScanStatus');

    if (!isPdf && !isImage) {
        alert('Please choose an image (JPG/PNG) or a PDF file.');
        e.target.value = '';
        return;
    }
    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
        alert('File is too large (max 15MB). Please choose a smaller file.');
        e.target.value = '';
        return;
    }

    const filenameSpan = document.getElementById('indexFileFilename');
    const btnLabel = document.getElementById('indexFileBtnLabel');
    const originalLabel = btnLabel.textContent;
    filenameSpan.textContent = file.name;
    btnLabel.style.pointerEvents = 'none';
    statusEl.className = 'scan-status busy';

    try {
        const items = await extractIndexItemsFromFile(file, percent => {
            btnLabel.textContent = `🔎 Scanning...`;
            statusEl.textContent = `Reading locally in your browser… ${percent}%`;
        });

        if (items.length === 0) {
            statusEl.className = 'scan-status error';
            statusEl.textContent = 'Could not find a readable table of contents in this file. Try a clearer photo or add items manually.';
        } else {
            document.getElementById('index-items-container').innerHTML = '';
            items.forEach(item => addIndexItem(item));
            statusEl.className = 'scan-status';
            statusEl.textContent = `✅ Added ${items.length} item(s) read from "${file.name}".`;
        }
    } catch (err) {
        statusEl.className = 'scan-status error';
        statusEl.textContent = 'Could not read this file. Try a clearer image or a different PDF.';
    } finally {
        btnLabel.textContent = originalLabel;
        btnLabel.style.pointerEvents = '';
        e.target.value = '';
        filenameSpan.textContent = 'No file chosen';
    }
}
