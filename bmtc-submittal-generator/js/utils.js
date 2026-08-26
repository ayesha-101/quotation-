export function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Reads a <input type="file"> selection as a data URL and hands it to `callback`.
// `nameId` (a DOM id to write the chosen filename into) is optional.
export function setupFileInput(inputId, nameId, callback) {
    const input = document.getElementById(inputId);
    input.addEventListener('change', () => {
        if (input.files && input.files[0]) {
            if (nameId) document.getElementById(nameId).textContent = input.files[0].name;
            const reader = new FileReader();
            reader.onload = e => callback(e.target.result);
            reader.readAsDataURL(input.files[0]);
        }
    });
}
