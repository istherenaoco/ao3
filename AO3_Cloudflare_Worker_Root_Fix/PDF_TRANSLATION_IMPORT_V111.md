# v111 — PDF finished-translation import

The finished-translation upload now accepts PDF alongside TXT, Markdown, and HTML. PDF.js 6.5.438 is bundled locally with its worker, CMaps, standard fonts, and Apache license; it loads only when a PDF is selected. The PDF stays in the browser and no translation API is called.

Extracted text uses the existing metadata/chapter/note parser. PDF document title and author provide fallbacks. Repeated marginal headers/footers and page numbers are omitted, while chapter headings remain. The upload button shows page progress and is restored after success or failure.

Text-selectable PDFs are supported. Image-only/scanned PDFs require OCR elsewhere, and encrypted files must be unlocked first; both show an error without saving an empty book. Existing 25 MB upload limit applies.

Validation: `npm run check`; browser PDF fixture checks for Korean CMap extraction, metadata, two chapters, note exclusion, reload persistence, scanned and encrypted errors; existing TXT/Markdown/HTML browser checks. Use `TEST_BASE_URL` to point browser tests at a local preview server and `CHROMIUM_PATH` when Chromium is installed elsewhere.
