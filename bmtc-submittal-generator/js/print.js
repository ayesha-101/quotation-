export function setupPrint() {
    document.getElementById('printBtn').addEventListener('click', () => {
        if (!document.getElementById('document-preview').innerHTML.trim()) {
            alert('Please generate the document first.');
            return;
        }
        document.body.classList.add('printing-active');
        setTimeout(() => window.print(), 100);
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('printing-active'));
}
