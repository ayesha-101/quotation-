import { state, TRACKER_KEY } from './state.js';

export function loadTracker() {
    const raw = localStorage.getItem(TRACKER_KEY);
    state.trackerData = raw ? JSON.parse(raw) : [];
}

function saveTracker() {
    localStorage.setItem(TRACKER_KEY, JSON.stringify(state.trackerData));
}

export function addToTracker() {
    const ref = document.getElementById('submittalRef').value;
    if (state.trackerData.some(i => i.ref === ref)) {
        alert('This Ref. No. is already in the tracker. Please use a unique reference.');
        return;
    }
    state.trackerData.unshift({
        id: Date.now(),
        salesman: document.getElementById('salesmanName').value,
        date: new Date().toLocaleDateString(),
        ref,
        material: document.getElementById('materialName').value,
        brand: document.getElementById('brandName').value,
        contractor: document.getElementById('mainContractor').value,
        consultant: document.getElementById('consultantName').value,
        value: '',
        status: 'Pending Submission',
        remark: ''
    });
    saveTracker();
    renderTracker();
}

export function renderTracker() {
    const body = document.getElementById('tracker-table-body');
    if (state.trackerData.length === 0) {
        body.innerHTML = `<tr><td colspan="11" style="text-align:center;color:var(--muted);padding:30px;">No submittals tracked yet. Generate your first document.</td></tr>`;
        return;
    }
    const statuses = ['Pending Submission', 'Submitted', 'Approved', 'Approved with Comments', 'Rejected', 'Resubmitted'];
    body.innerHTML = state.trackerData.map(item => {
        const opts = statuses.map(s => `<option ${item.status === s ? 'selected' : ''} value="${s}">${s}</option>`).join('');
        return `<tr data-id="${item.id}">
            <td>${item.salesman || ''}</td>
            <td style="white-space:nowrap">${item.date}</td>
            <td><strong>${item.ref}</strong></td>
            <td>${item.material}</td>
            <td>${item.brand}</td>
            <td>${item.contractor || '—'}</td>
            <td>${item.consultant || '—'}</td>
            <td><input class="tracker-value-input" value="${item.value || ''}"></td>
            <td><select class="tracker-status-select">${opts}</select></td>
            <td><input class="tracker-remark-input" value="${item.remark || ''}" placeholder="Add remark..."></td>
            <td style="text-align:center"><button class="btn-icon tracker-delete-btn" title="Delete">🗑️</button></td>
        </tr>`;
    }).join('');
}

export function setupTrackerEvents() {
    const body = document.getElementById('tracker-table-body');
    body.addEventListener('change', e => {
        const id = parseInt(e.target.closest('tr')?.dataset.id);
        const item = state.trackerData.find(i => i.id === id);
        if (!item) return;
        if (e.target.classList.contains('tracker-status-select')) item.status = e.target.value;
        if (e.target.classList.contains('tracker-remark-input')) item.remark = e.target.value;
        if (e.target.classList.contains('tracker-value-input')) item.value = e.target.value;
        saveTracker();
    });
    body.addEventListener('click', e => {
        if (e.target.closest('.tracker-delete-btn')) {
            if (!confirm('Delete this entry?')) return;
            const id = parseInt(e.target.closest('tr').dataset.id);
            state.trackerData = state.trackerData.filter(i => i.id !== id);
            saveTracker();
            renderTracker();
        }
    });
    document.getElementById('clearTrackerBtn').addEventListener('click', () => {
        if (confirm('Delete ALL tracker entries? This cannot be undone.')) {
            state.trackerData = [];
            saveTracker();
            renderTracker();
        }
    });
    document.getElementById('exportTrackerBtn').addEventListener('click', exportTrackerExcel);
}

function exportTrackerExcel() {
    if (!window.XLSX) { alert('XLSX library not loaded.'); return; }
    const rows = state.trackerData.map(i => ({
        Salesman: i.salesman, Date: i.date, 'Ref No': i.ref,
        Material: i.material, Brand: i.brand, Contractor: i.contractor,
        Consultant: i.consultant, Value: i.value, Status: i.status, Remark: i.remark
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tracker');
    XLSX.writeFile(wb, `BMTC_Submittal_Tracker_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
