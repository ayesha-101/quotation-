# BMTC Submittal Generator

A static, client-only tool for preparing material submittal packages
(cover page, table of contents, divider pages) and tracking their approval
status. No backend — everything runs in the browser and persists to
`localStorage`.

## Structure

Previously a single ~1500-line HTML file; now split by concern:

```
index.html              markup only (three tabs: Agent, Generator, Tracker)
css/styles.css           all styling
js/
  state.js               shared state + constants (tracker key, model id, default index)
  utils.js                escapeHtml, generic file-input reader
  api.js                  Claude API key storage + Messages API call
  tabs.js                 tab switching
  fields.js               add/remove/restore project-detail fields
  indexItems.js           table-of-contents rows, quick-add, read-from-file (Claude vision)
  documentGenerator.js     builds the cover/index/divider page HTML
  folderPreview.js         renders the on-screen folder-tree preview
  zip.js                   ZIP export of the folder structure (JSZip)
  print.js                 print-to-PDF via the browser print dialog
  tracker.js               submittal tracker table + Excel export (SheetJS)
  agent.js                 chat agent: gathers project info, calls Claude with
                            a `prepare_submittal` tool, fills the Generator tab
  main.js                  wires all of the above together on DOMContentLoaded
```

## Running it

It's static — no build step. Serve the folder and open it:

```sh
npx serve .
# or
python3 -m http.server 8080
```

Then open `index.html` in a browser.

## Claude API key

The Agent tab and the "read index from file" feature call the Anthropic
Messages API directly from the browser. Paste an API key into the "Claude
API Key" card at the top — it's stored only in that browser's
`localStorage` and sent only to `api.anthropic.com`. This is a deliberate
trade-off for a small internal tool with no backend; don't share this app
with a saved key in it, and don't point it at a key with more access than
you're comfortable exposing client-side.

## What changed from the old single-file version

- Split into the module layout above (same behavior, easier to review/edit).
- Fixed the submitter "Website" field, which held a literal Markdown link
  (`[www.bmtc.ae](https://www.bmtc.ae)`) instead of plain text.
- Updated the hardcoded Claude model id to a currently-served model.
- Removed a dead `setupFileInput` monkey-patch (the function now takes an
  optional `nameId` from the start) and a couple of dead/duplicate DOM
  listeners left over from earlier edits.
- Resolved a contradiction between the agent's system prompt ("always
  reply in English") and its tool schema ("reply in Arabic or English
  matching the user") — it now consistently replies in whichever language
  the user is writing in.
