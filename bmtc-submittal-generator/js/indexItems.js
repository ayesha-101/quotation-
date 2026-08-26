import { state } from './state.js';
import { callClaude, requireApiKey } from './api.js';

export function setupIndexControls() {
    document.getElementById('addIndexItemBtn').addEventListener('click', () => addIndexItem());
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

    const apiKey = requireApiKey();
    if (!apiKey) { e.target.value = ''; return; }

    const filenameSpan = document.getElementById('indexFileFilename');
    const btnLabel = document.getElementById('indexFileBtnLabel');
    const originalLabel = btnLabel.textContent;
    filenameSpan.textContent = file.name;
    btnLabel.textContent = '⏳ Reading...';
    btnLabel.style.pointerEvents = 'none';

    try {
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = ev => resolve(ev.target.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        const fileBlock = isPdf
            ? { type: 'document', source: { type: 'base64', media_type: file.type, data: base64 } }
            : { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } };

        const data = await callClaude({
            max_tokens: 1000,
            system: 'You extract table-of-contents / index lists from documents for a submittal preparation tool. Read the attached file and call the extract_index_items tool with the list of item titles, in the same order as shown in the file, with any leading numbering stripped and the wording preserved as written.',
            messages: [{
                role: 'user',
                content: [fileBlock, { type: 'text', text: 'Extract the table of contents / index items from this file, in order.' }]
            }],
            tools: [{
                name: 'extract_index_items',
                description: 'Return the extracted table-of-contents / index items, in order.',
                input_schema: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array', items: { type: 'string' },
                            description: 'Ordered list of index item titles, with leading numbers stripped.'
                        }
                    },
                    required: ['items']
                }
            }],
            tool_choice: { type: 'tool', name: 'extract_index_items' }
        });

        const toolUse = (data.content || []).find(b => b.type === 'tool_use' && b.name === 'extract_index_items');
        const items = (toolUse && Array.isArray(toolUse.input.items)) ? toolUse.input.items.map(s => String(s).trim()).filter(Boolean) : [];

        if (items.length === 0) {
            alert('⚠️ Could not find a table of contents / index list in this file. Please check the file or add items manually.');
        } else {
            document.getElementById('index-items-container').innerHTML = '';
            items.forEach(item => addIndexItem(item));
            alert(`✅ Added ${items.length} item(s) read from "${file.name}".`);
        }
    } catch (err) {
        // callClaude already shows an alert for API/auth errors
    } finally {
        btnLabel.textContent = originalLabel;
        btnLabel.style.pointerEvents = '';
        e.target.value = '';
        filenameSpan.textContent = 'No file chosen';
    }
}
