import { state } from './state.js';

export function getFormData() {
    const d = {};
    document.querySelectorAll('#generator-view input[id], #generator-view textarea[id]').forEach(el => {
        const field = el.closest('.removable-field');
        d[el.id] = { value: el.value, visible: field ? field.style.display !== 'none' : true };
    });
    return d;
}

export function generateDocument() {
    const preview = document.getElementById('document-preview');
    preview.innerHTML = '';
    const d = getFormData();
    const fullName = `${d.materialName?.value || ''} - ${d.brandName?.value || ''}`;
    const header = `<div class="page-header"><span>Ref: ${d.submittalRef?.value || ''}</span><span>${fullName}</span></div>`;
    const footer = `<div class="page-footer"><span></span></div>`;

    const brandLogo = state.brandLogoDataUrl ? `<img src="${state.brandLogoDataUrl}" class="cover-brand-logo">` : '<div class="cover-brand-logo" style="height:100px"></div>';

    const projectRows = [
        `<div class="section"><p class="section-title">PROJECT</p><p class="section-content">${d.projectName?.value || ''}</p></div>`,
        d.employerName?.visible ? `<div class="section"><p class="section-title">CLIENT</p><p class="section-content">${d.employerName.value}</p></div>` : '',
        d.consultantName?.visible ? `<div class="section"><p class="section-title">CONSULTANT</p><p class="section-content">${d.consultantName.value}</p></div>` : '',
        d.mainContractor?.visible ? `<div class="section"><p class="section-title">MAIN CONTRACTOR</p><p class="section-content">${d.mainContractor.value}</p></div>` : '',
        d.mepContractor?.visible ? `<div class="section"><p class="section-title">MEP CONTRACTOR</p><p class="section-content">${d.mepContractor.value}</p></div>` : '',
    ].join('');

    let customRows = '';
    document.querySelectorAll('.custom-field').forEach(f => {
        if (f.style.display === 'none') return;
        const t = f.querySelector('.custom-field-title')?.value;
        const v = f.querySelector('.custom-field-value')?.value;
        if (t && v) customRows += `<div class="section"><p class="section-title">${t.toUpperCase()}</p><p class="section-content">${v}</p></div>`;
    });

    const submitterLogo = state.logoDataUrl ? `<img src="${state.logoDataUrl}" class="submitter-logo">` : '<div class="submitter-logo" style="height:70px;border:1px dashed #ccc;"></div>';
    const submitter = `<div class="cover-submitter-details"><p class="section-title">Submitted By</p>${submitterLogo}<div class="submitter-contact-info"><p class="tagline">${d.submitterTagline?.value || ''}</p><p>${d.submitterAddress?.value || ''}</p><p>Tel: ${d.submitterTel?.value || ''} | Fax: ${d.submitterFax?.value || ''}</p><p class="web-email">Web: ${d.submitterWeb?.value || ''} | E-mail: ${d.submitterEmail?.value || ''}</p></div></div>`;

    preview.innerHTML += `<div class="page cover-page">${header}<div class="page-content"><div class="material-title-section"><p>Material Submittal for</p><h1>${fullName}</h1></div>${brandLogo}<div class="cover-project-details">${projectRows}${customRows}</div>${submitter}</div>${footer}</div>`;

    const items = Array.from(document.querySelectorAll('.index-item-row'));
    if (items.length > 0) {
        let rows = '';
        items.forEach((row, i) => {
            const desc = row.querySelector('.index-item-desc').value;
            const st = row.querySelector('input[type="radio"]:checked')?.value || '';
            rows += `<tr><td>${i + 1}.</td><td>${desc}</td><td>${st === 'yes' ? '✓' : ''}</td><td>${st === 'no' ? '✓' : ''}</td><td>${st === 'na' ? '✓' : ''}</td></tr>`;
        });
        preview.innerHTML += `<div class="page index-page">${header}<div class="page-content"><h1>INDEX</h1><table class="index-table"><thead><tr><th>No.</th><th>Description</th><th>Yes</th><th>No</th><th>N/A</th></tr></thead><tbody>${rows}</tbody></table></div>${footer}</div>`;
        items.forEach((row, i) => {
            const desc = row.querySelector('.index-item-desc').value;
            if (desc) preview.innerHTML += `<div class="page divider-page">${header}<div class="page-content"><h1>${i + 1}. ${desc}</h1></div>${footer}</div>`;
        });
    }
}
