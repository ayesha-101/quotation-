# BMTC Submittal Generator

A static, client-only tool for preparing material submittal packages
(cover page, table of contents, divider pages) and tracking their approval
status. No backend, no API key, no account — everything runs in the
browser and persists to `localStorage`.

## Structure

```
index.html               markup only (two tabs: Generator, Tracker)
css/styles.css            all styling
js/
  state.js                shared state + constants (tracker key, default index)
  utils.js                 escapeHtml, generic file-input reader
  tabs.js                  tab switching
  fields.js                add/remove/restore project-detail fields
  indexItems.js            table-of-contents rows, quick-add, standard-index button,
                            scan-from-file (local OCR)
  ocr.js                   local document reading: Tesseract.js OCR for images
                            (and scanned PDF pages), pdf.js text extraction for
                            normal PDFs — no network call, no API key
  documentGenerator.js      builds the cover/index/divider page HTML
  folderPreview.js          renders the on-screen folder-tree preview
  zip.js                    ZIP export of the folder structure (JSZip)
  print.js                  print-to-PDF via the browser print dialog
  tracker.js                submittal tracker table + Excel export (SheetJS)
  main.js                   wires all of the above together on DOMContentLoaded
```

## Running it

It's static — no build step. Serve the folder and open it:

```sh
npx serve .
# or
python3 -m http.server 8080
```

Then open `index.html` in a browser.

## Scanning a table of contents

"Or Scan From a File" reads a photo/scan or PDF of a custom table of
contents and turns it into index rows automatically:

- **Images** are OCR'd in-browser with Tesseract.js.
- **PDFs** have their text layer pulled directly with pdf.js; if a PDF has
  no text layer (a scanned document saved as PDF), each page is rendered
  to a canvas and OCR'd the same way as an image.

All of this runs locally in the browser tab — nothing is uploaded anywhere,
and no API key or internet service is required. OCR accuracy depends on
image quality/clarity, same as any OCR tool; a clean, well-lit, straight-on
photo works much better than a blurry or skewed one.

## History

This was originally a single ~1500-line HTML file with an embedded chat
"Agent" that called the Anthropic API from the browser (a pasted-in API
key) to fill the form and to read table-of-contents files via Claude's
vision. It has since been:

- Split into the module layout above (same generator/tracker behavior,
  easier to review/edit).
- Redesigned visually (Inter font, refined palette, pill tabs, softer
  shadows) while leaving the generated A4 document pages untouched, since
  those are the actual printed deliverable.
- **De-API'd**: the chat Agent tab and the Claude API key card are gone.
  The one feature that depended on them — reading a table of contents out
  of an uploaded file — now runs fully locally via Tesseract.js/pdf.js
  instead (see above), so the tool needs no key and no network access.
- Fixed a few bugs found along the way: a submitter "Website" field that
  held a literal Markdown link instead of plain text, a dead
  `setupFileInput` monkey-patch, and some dead/duplicate DOM listeners.
