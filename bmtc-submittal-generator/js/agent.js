import { state, GENERAL_INDEX } from './state.js';
import { callClaude, requireApiKey } from './api.js';
import { escapeHtml, setupFileInput } from './utils.js';
import { addIndexItem } from './indexItems.js';
import { generateDocument } from './documentGenerator.js';
import { showFolderPreview } from './folderPreview.js';

const AGENT_TOOL = {
    name: 'prepare_submittal',
    description: 'Fill in and generate a complete BMTC submittal document once enough information is known. Call this as soon as you have at least the brand and the material/product — fill any unknown field with an empty string, and use a sensible standard 11-item index unless the user specified otherwise.',
    input_schema: {
        type: 'object',
        properties: {
            material: { type: 'string', description: 'The actual product/material name, e.g. "GI Conduits & Accessories", "MCCB Circuit Breakers", "Cable Trays". This must be a real product name — never a generic phrase like "General Submittal" or "Submittal". If the user has not stated an actual product/material, do NOT call this tool yet; ask them what material/product the submittal is for first.' },
            brand: { type: 'string', description: 'Brand / manufacturer name' },
            project: { type: 'string', description: 'Project name' },
            client: { type: 'string', description: 'Client / employer name' },
            consultant: { type: 'string', description: 'Consultant name' },
            contractor: { type: 'string', description: 'Main contractor name' },
            mep: { type: 'string', description: 'MEP contractor name' },
            ref: { type: 'string', description: 'Submittal reference number, e.g. BMTC-SUB-202508-001. Generate one using the current year/month if not given.' },
            index_items: {
                type: 'array', items: { type: 'string' },
                description: 'Ordered list of index / table-of-contents items. If the user attached an image or PDF that is itself a table of contents / index (e.g. titled "Table of Content", a numbered list of required documents), use THOSE exact items, in the same order, as index_items — strip the leading numbers, keep the wording as written in the file. Otherwise default to the standard 11-item BMTC index (COMPANY PROFILE, TRADE LICENSE, ISO CERTIFICATE, AUTHORIZATION LETTER, COMPLIANCE STATEMENT, PROJECT SPECIFICATION, COUNTRY OF ORIGIN, TEST CERTIFICATES, PREVIOUS PROJECTS, PREVIOUS APPROVALS, CATALOGUE) unless the user typed a custom list instead.'
            },
            reply: { type: 'string', description: 'A short friendly confirmation message to show the user, written in the same language the user has been writing in (Arabic or English), summarizing what was prepared.' }
        },
        required: ['material', 'brand', 'index_items', 'reply']
    }
};

const AGENT_SYSTEM_PROMPT = `You are BMTC's submittal preparation agent, embedded in an internal tool used by an estimation engineer in Abu Dhabi, UAE. Reply in the same language the user writes in (Arabic or English).

Your job: gather what's needed (brand/manufacturer, material/product, and ideally project/client/consultant/contractor/MEP contractor/reference) then call the prepare_submittal tool to generate the actual document. Do not ask more than one round of clarifying questions — if the actual brand and material are known, proceed and call the tool even if some project fields are still missing (leave them blank). Default to the standard 11-item BMTC index unless told otherwise.

Never invent or fill "material" or "brand" with a generic placeholder such as "General Submittal", "Submittal", "N/A", "TBD", or similar — these are not real product names. The word "general" in a request like "prepare a general submittal" describes the TYPE of index/document (the standard 11-item index), not the material. If the user hasn't stated an actual product/material name (or brand), ask them for it directly in one short question instead of guessing or calling the tool.

The user may attach a product catalogue image or a PDF datasheet. When a file is attached, read it and extract the real material/product name, the brand/manufacturer, and any other relevant details (model numbers, standards, specifications) directly from the file — do not ask the user to retype what is already visible in the attachment. Briefly confirm in your reply what you read from the file before or as part of calling the tool.

If the attached file is itself a Table of Contents / index (a numbered or bulleted list of required submittal documents, often titled "Table of Content" or similar), do NOT treat it as a product catalogue. Instead, read the list items exactly as written (stripping only the leading numbers), preserve their order, and use them directly as index_items for this submittal instead of the default 11-item index. Confirm to the user that you used their custom index from the attached file.

Keep any chat replies short, and match the reply field of the tool call to the language of your chat reply.`;

export function setupAgentView() {
    setupFileInput('agentBrandLogoInput', null, url => {
        state.brandLogoDataUrl = url;
        const img = document.getElementById('agentBrandLogoPreview');
        img.src = url; img.style.display = 'block';
        document.getElementById('agentBrandLogoIcon').style.display = 'none';
        document.getElementById('agentBrandLogoName').textContent = '✅ Brand logo uploaded';
    });
    setupFileInput('agentCompanyLogoInput', null, url => {
        state.logoDataUrl = url;
        const img = document.getElementById('agentCompanyLogoPreview');
        img.src = url; img.style.display = 'block';
        document.getElementById('agentCompanyLogoIcon').style.display = 'none';
        document.getElementById('agentCompanyLogoName').textContent = '✅ Company logo uploaded';
    });

    const input = document.getElementById('agentInput');
    const sendBtn = document.getElementById('agentSendBtn');

    const fileInput = document.getElementById('agentFileInput');
    const attachBtn = document.getElementById('agentAttachBtn');
    const chip = document.getElementById('agentAttachmentChip');
    const chipIcon = document.getElementById('agentAttachmentIcon');
    const chipName = document.getElementById('agentAttachmentName');
    const chipRemove = document.getElementById('agentAttachmentRemove');

    attachBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;

        const isPdf = file.type === 'application/pdf';
        const isImage = file.type.startsWith('image/');
        if (!isPdf && !isImage) {
            alert('Please attach an image (JPG/PNG) or a PDF file.');
            fileInput.value = '';
            return;
        }
        const maxBytes = 15 * 1024 * 1024;
        if (file.size > maxBytes) {
            alert('File is too large (max 15MB). Please attach a smaller file.');
            fileInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = e => {
            const dataUrl = e.target.result;
            const base64 = dataUrl.split(',')[1];
            state.pendingAttachment = {
                mediaType: file.type,
                base64,
                name: file.name,
                kind: isPdf ? 'pdf' : 'image'
            };
            chipIcon.textContent = isPdf ? '📄' : '🖼️';
            chipName.textContent = file.name;
            chip.style.display = 'flex';
            attachBtn.classList.add('has-file');
        };
        reader.readAsDataURL(file);
    });

    chipRemove.addEventListener('click', () => {
        state.pendingAttachment = null;
        fileInput.value = '';
        chip.style.display = 'none';
        attachBtn.classList.remove('has-file');
    });

    function autoGrow() {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }
    input.addEventListener('input', autoGrow);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAgentMessage();
        }
    });
    sendBtn.addEventListener('click', sendAgentMessage);
}

function appendAgentMessage(role, html) {
    const chat = document.getElementById('agentChat');
    const wrap = document.createElement('div');
    wrap.className = 'agent-msg ' + (role === 'user' ? 'agent-msg-user' : 'agent-msg-bot');
    wrap.innerHTML = `<div class="agent-avatar">${role === 'user' ? '🧑' : '🤖'}</div><div class="agent-bubble">${html}</div>`;
    chat.appendChild(wrap);
    chat.scrollTop = chat.scrollHeight;
    return wrap;
}

async function sendAgentMessage() {
    const input = document.getElementById('agentInput');
    const text = input.value.trim();
    if (!text && !state.pendingAttachment) return;

    let displayHtml = '';
    if (state.pendingAttachment) {
        const tagIcon = state.pendingAttachment.kind === 'pdf' ? '📄' : '🖼️';
        displayHtml += `<span class="agent-msg-file-tag">${tagIcon} ${escapeHtml(state.pendingAttachment.name)}</span><br>`;
    }
    displayHtml += text
        ? escapeHtml(text).replace(/\n/g, '<br>')
        : (state.pendingAttachment ? '<i>Please read the attached file.</i>' : '');
    appendAgentMessage('user', displayHtml);

    let apiContent;
    if (state.pendingAttachment) {
        const fileBlock = state.pendingAttachment.kind === 'pdf'
            ? { type: 'document', source: { type: 'base64', media_type: state.pendingAttachment.mediaType, data: state.pendingAttachment.base64 } }
            : { type: 'image', source: { type: 'base64', media_type: state.pendingAttachment.mediaType, data: state.pendingAttachment.base64 } };
        apiContent = [
            fileBlock,
            { type: 'text', text: text || 'Please read the attached catalogue/document and extract the material, brand, and any other relevant details for the submittal.' }
        ];
    } else {
        apiContent = text;
    }
    state.agentHistory.push({ role: 'user', content: apiContent });

    input.value = '';
    input.style.height = 'auto';

    state.pendingAttachment = null;
    document.getElementById('agentFileInput').value = '';
    document.getElementById('agentAttachmentChip').style.display = 'none';
    document.getElementById('agentAttachBtn').classList.remove('has-file');

    const apiKey = requireApiKey();
    if (!apiKey) {
        appendAgentMessage('bot', '⚠️ Please add your Claude API Key above (API Key card) and click Save so I can work.');
        return;
    }

    document.getElementById('agentTyping').style.display = 'flex';
    document.getElementById('agentSendBtn').disabled = true;

    try {
        const data = await callClaude({
            max_tokens: 1500,
            system: AGENT_SYSTEM_PROMPT,
            messages: state.agentHistory,
            tools: [AGENT_TOOL]
        });

        const toolUse = (data.content || []).find(b => b.type === 'tool_use' && b.name === 'prepare_submittal');
        const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();

        if (toolUse) {
            state.agentHistory.push({ role: 'assistant', content: data.content });
            // Anthropic requires a tool_result immediately after any tool_use —
            // without this, the *next* message sent to the API fails with a 400
            // "tool_use ids were found without tool_result blocks" error.
            state.agentHistory.push({
                role: 'user',
                content: [{
                    type: 'tool_result',
                    tool_use_id: toolUse.id,
                    content: 'Document generated successfully and shown to the user in the Generator tab.'
                }]
            });
            applyAgentResult(toolUse.input);
        } else if (textBlocks) {
            state.agentHistory.push({ role: 'assistant', content: textBlocks });
            appendAgentMessage('bot', escapeHtml(textBlocks).replace(/\n/g, '<br>'));
        }
    } catch (e) {
        if (e.message !== 'NO_API_KEY' && !String(e.message).startsWith('API_ERROR_')) {
            appendAgentMessage('bot', '❌ Something went wrong. Please try again.');
        }
    } finally {
        document.getElementById('agentTyping').style.display = 'none';
        document.getElementById('agentSendBtn').disabled = false;
    }
}

function applyAgentResult(fields) {
    if (fields.material) document.getElementById('materialName').value = fields.material;
    if (fields.brand) document.getElementById('brandName').value = fields.brand;
    if (fields.project) document.getElementById('projectName').value = fields.project;
    if (fields.client) document.getElementById('employerName').value = fields.client;
    if (fields.consultant) document.getElementById('consultantName').value = fields.consultant;
    if (fields.contractor) document.getElementById('mainContractor').value = fields.contractor;
    if (fields.mep) document.getElementById('mepContractor').value = fields.mep;
    if (fields.ref) document.getElementById('submittalRef').value = fields.ref;

    document.getElementById('index-items-container').innerHTML = '';
    const items = (Array.isArray(fields.index_items) && fields.index_items.length) ? fields.index_items : GENERAL_INDEX;
    items.forEach(item => addIndexItem(item));

    generateDocument();
    showFolderPreview();
    document.getElementById('downloadZipBtn').disabled = false;

    const summaryRows = [
        fields.brand ? `<div><b>Brand:</b> ${escapeHtml(fields.brand)}</div>` : '',
        fields.material ? `<div><b>Material:</b> ${escapeHtml(fields.material)}</div>` : '',
        fields.project ? `<div><b>Project:</b> ${escapeHtml(fields.project)}</div>` : '',
        `<div><b>Index items:</b> ${items.length}</div>`
    ].filter(Boolean).join('');

    appendAgentMessage('bot',
        escapeHtml(fields.reply || 'Your submittal is ready ✅').replace(/\n/g, '<br>') +
        `<div class="agent-summary">${summaryRows}</div>
        <div style="margin-top:10px;font-size:12px;color:var(--blue);">➡️ You can see the full result under the ⚙️ Generator tab, and download files (Print / ZIP) from there.</div>`
    );

    document.querySelectorAll('.tab-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-generator').classList.add('active');
    document.querySelectorAll('.view-content').forEach(v => {
        v.classList.toggle('active', v.id === 'generator-view');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
