# v113 — Browser-side shared conversation transfer

The Safari setup dialog at `/?setup=browser` provides a generated self-contained bookmarklet. After a one-time bookmark setup, the user opens a public ChatGPT share in Safari and runs “서재로 보내기”. The bookmarklet reads the shared page's JSON/hydration data, selects complete visible assistant messages, and submits the extracted book to this bookshelf using an ordinary top-level HTTPS form POST. It does not fetch ChatGPT from Cloudflare, require a PDF, or use the clipboard to move the book. Clipboard use is limited to copying the setup bookmark address once; manual copy is offered if that permission is unavailable.

The receiving Worker accepts bounded URL-encoded POSTs from the ChatGPT or same-site origin and renders the bookshelf with escaped inert JSON. Browser line ending normalization is handled before validating the transfer marker. The client validates the data, saves through the existing bookshelf flow, and waits for library hydration and durable IndexedDB persistence, then navigates to `/` with GET so refresh does not re-submit the POST. The server does not retain the book or log its contents. Titles/authors absent from a conversation are not fabricated, and unnumbered continuation responses are kept in one chapter. Existing source-based duplicate detection applies.

The importer also recognizes explicit body markers after front matter and removes AI continuation/footer menus. The existing server fetch route remains available but points to browser setup when ChatGPT returns 403.

Validation:
- `npm run check` includes bounded POST/origin validation, inert JSON escaping, and existing regression checks.
- Chromium transfer test with the user's first public conversation: BOGO, chapters 1–6, no duplicate message fragments.
- WebKit 26.5 mobile viewport opened the user's second public URL over HTTPS, extracted its title/author and nine continuation responses, submitted to the receiving Worker handler, persisted in the browser bookshelf, and retained the result after reload. No ChatGPT-server fetch, PDF, or clipboard permissions were used. Test target static assets and the receiving Worker handler were served locally under the target origin before deployment. This is WebKit automation, not a physical iPhone Safari test.
- The provided conversation contents are not committed. Optional test variables are documented in `tests/browser-share-transfer-v113.cjs`.

Regenerate the bookmarklet after editing the parser or transfer module with `npm run build:browser-import`. The generated text file is deployed as a static asset, with no external script dependency on the ChatGPT page.
