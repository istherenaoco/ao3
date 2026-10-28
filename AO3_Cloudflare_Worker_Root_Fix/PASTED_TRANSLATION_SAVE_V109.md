# v109 — Paste already-translated text and save only

- Changed the paste panel from an English-source import/translation path to a direct save path for already-translated text.
- Pasted paragraphs are stored as `ko` with `en: ''`, so the reader shows the supplied translation and does not pretend it has an English original for paragraph comparison.
- The handler does not parse pasted content as AO3 HTML, create translation drafts, enqueue translation, or call any translation provider.
- Supports creating a new bookshelf work, appending to the selected work, or appending to an existing AO3 work when the provided source URL matches a saved work ID.
- Keeps title, author, chapter title, source URL, and bookmark/tag inputs; saves locally and follows the app's existing Drive sync scheduling.
- Updated the paste panel text and app cache/build version to v109.
- Added `tests/test-pasted-translated-save-v109.cjs` to guard the no-API path.
