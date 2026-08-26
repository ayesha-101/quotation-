export function setupFieldControls() {
    document.getElementById('incrementRefBtn').addEventListener('click', () => {
        const el = document.getElementById('submittalRef');
        el.value = el.value.replace(/-(\d+)$/, (_, n) => `-${String(+n + 1).padStart(n.length, '0')}`);
    });

    document.querySelectorAll('.section-card').forEach(card => card.addEventListener('click', handleRemove));

    document.getElementById('addFieldBtn').addEventListener('click', () => {
        const d = document.createElement('div');
        d.className = 'field removable-field custom-field';
        d.innerHTML = `<div class="label-row"><label>Custom Field</label><button class="btn-icon remove-btn">🗑️</button></div><div class="input-row"><input type="text" class="custom-field-title" placeholder="Field Title" style="flex:1"><input type="text" class="custom-field-value" placeholder="Field Value" style="flex:2"></div>`;
        document.getElementById('customFieldsContainer').appendChild(d);
    });

    document.getElementById('restoreFieldsBtn').addEventListener('click', () => {
        document.querySelectorAll('.removable-field:not(.custom-field)').forEach(f => f.style.display = '');
        document.getElementById('restoreFieldsBtn').style.display = 'none';
    });
}

function handleRemove(e) {
    const btn = e.target.closest('.remove-btn');
    if (!btn) return;
    const field = btn.closest('.removable-field');
    if (!field) return;
    if (field.classList.contains('custom-field')) {
        field.remove();
    } else {
        field.style.display = 'none';
        document.getElementById('restoreFieldsBtn').style.display = 'inline-block';
    }
}
