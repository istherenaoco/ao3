# v110 — Import finished translations directly into the bookshelf

In the finished-translation panel, choose **번역본 파일 업로드 · 즉시 저장** for UTF-8 TXT, Markdown, or HTML (up to 25 MB). File selection saves immediately; pasted text uses the same parser when Save is clicked. No translation provider is called.

- Recognizes labeled title, author, source URL, Markdown H1 titles, Chapter N / 챕터 N / 제N장 headings, and AO3 HTML chapter/body metadata.
- Explicit author/chapter/end note headings exclude text until the next chapter or explicit body marker. AO3 HTML notes are removed structurally. Unmarked commentary cannot be reliably distinguished from prose.
- Manual metadata takes precedence. Missing titles fall back to the filename or 번역 소설; missing authors use Anonymous.
- Selected append targets take precedence; otherwise an existing AO3 work ID or exact title+author match receives the imported chapters in file order.
- Stores supplied text in `ko`, leaves `en` empty, and uses existing local persistence and Drive sync scheduling.

Validation: `npm run check`; `node tests/browser-translated-import-v110.cjs` with Playwright and system Chromium. Browser checks exercise upload, metadata extraction, multi-chapter persistence, note removal, reload, append matching, and AO3 HTML parsing.
