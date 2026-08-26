export function setupTabs() {
    document.querySelectorAll('.tab-nav button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-nav button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const viewId = btn.id.replace('tab-', '') + '-view';
            document.querySelectorAll('.view-content').forEach(v => {
                v.classList.toggle('active', v.id === viewId);
            });
        });
    });
}
