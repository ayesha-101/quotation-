export function showFolderPreview() {
    const section = document.getElementById('folder-preview-section');
    const tree = document.getElementById('folder-tree-display');
    const projectName = document.getElementById('projectName').value || 'Project';
    const material = document.getElementById('materialName').value || 'Material';
    const brand = document.getElementById('brandName').value || 'Brand';
    const folderName = `${projectName} — ${material} - ${brand}`;

    const items = Array.from(document.querySelectorAll('.index-item-row .index-item-desc'))
        .map(el => el.value.trim()).filter(Boolean);

    let html = `<div class="folder">📁 ${folderName}</div>`;
    items.forEach((item, i) => {
        html += `<div class="subfolder">${String(i + 1).padStart(2, '0')}. ${item}</div>`;
    });

    tree.innerHTML = html;
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
