# OpenXML Viewer

Minimal Chrome extension for inspecting OpenXML packages directly in the browser.

## What it does

- Opens from the Chrome toolbar into a new tab
- Accepts `.docx`, `.xlsx`, `.pptx`, related OpenXML variants, and `.zip`
- Unpacks the package locally in the browser with no upload step
- Shows a file and directory tree on the left
- Shows the selected file on the right in a foldable code viewer
- Formats XML and JSON for readability
- Highlights matching brackets with rainbow colors
- Renders whitespace markers as muted middle dots
- Adds quick links for common package parts like `document.xml`, `workbook.xml`, and `presentation.xml`
- Supports copying the current selection or the full open file
- Falls back to a hex preview for binary parts

## Stack

- React
- Vite
- Tailwind CSS
- Mantine 9
- Monaco Editor
- JSZip

## Development

Install dependencies and start the app:

- `npm install`
- `npm run dev`

## Build the extension

- `npm run build`

This produces the unpacked extension in `dist`.

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` folder from this workspace
5. Click the extension icon to open the viewer in a new tab

## Permissions

The extension requests no extra Chrome permissions.

## Notes

- Everything is processed locally in the browser.
- Common OpenXML text parts are formatted automatically when opened.
- Binary files are shown as a readable hex preview instead of raw gibberish. That is a technical term. More or less.
