import { API_KEY_STORAGE, CLAUDE_MODEL } from './state.js';

export function getApiKey() {
    return localStorage.getItem(API_KEY_STORAGE) || '';
}

export function setupApiKeyUI() {
    const input = document.getElementById('apiKeyInput');
    const toggleBtn = document.getElementById('toggleApiKeyVisibility');
    const saveBtn = document.getElementById('saveApiKeyBtn');
    const clearBtn = document.getElementById('clearApiKeyBtn');
    const statusWrap = document.getElementById('apikey-status');
    const statusText = document.getElementById('apikey-status-text');

    function refreshStatus() {
        const key = getApiKey();
        if (key) {
            statusWrap.classList.add('saved');
            statusText.textContent = 'Saved (' + key.slice(0, 10) + '…' + key.slice(-4) + ')';
            input.value = key;
        } else {
            statusWrap.classList.remove('saved');
            statusText.textContent = 'Not set';
            input.value = '';
        }
    }

    toggleBtn.addEventListener('click', () => {
        const isPwd = input.type === 'password';
        input.type = isPwd ? 'text' : 'password';
        toggleBtn.textContent = isPwd ? '🙈 Hide' : '👁️ Show';
    });

    saveBtn.addEventListener('click', () => {
        const val = input.value.trim();
        if (!val) { alert('Please enter an API Key first.'); return; }
        if (!val.startsWith('sk-ant-')) {
            if (!confirm('This doesn\'t look like a normal Anthropic API key (sk-ant-...). Save it anyway?')) return;
        }
        localStorage.setItem(API_KEY_STORAGE, val);
        refreshStatus();
        alert('✅ API Key saved in this browser.');
    });

    clearBtn.addEventListener('click', () => {
        if (!confirm('Remove the saved API Key?')) return;
        localStorage.removeItem(API_KEY_STORAGE);
        refreshStatus();
    });

    refreshStatus();
}

export function requireApiKey() {
    const key = getApiKey();
    if (!key) {
        alert('⚠️ Please add your Claude API Key above (API Key card) and click Save before using the Agent.');
        return null;
    }
    return key;
}

export async function callClaude({ model, max_tokens = 1000, messages, tools, system, tool_choice }) {
    const apiKey = requireApiKey();
    if (!apiKey) throw new Error('NO_API_KEY');

    const body = { model: model || CLAUDE_MODEL, max_tokens, messages };
    if (tools) body.tools = tools;
    if (system) body.system = system;
    if (tool_choice) body.tool_choice = tool_choice;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        if (response.status === 401) {
            alert('❌ The API Key is invalid or expired. Please check it and try again.');
        } else {
            alert('❌ Error from Anthropic API (' + response.status + '). ' + errText.slice(0, 200));
        }
        throw new Error('API_ERROR_' + response.status);
    }

    return response.json();
}
