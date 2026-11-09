# v112 — Import public ChatGPT translations

The finished-translation panel accepts public `chatgpt.com/share/<UUID>` and `chatgpt.com/s/t_<ID>` links. A same-origin Worker endpoint retrieves only these HTTPS paths, without cookies, following no redirects, with a 20-second timeout and 10 MB response limit. Failures preserve the existing bookshelf and provide paste/file fallback guidance.

The client reads JSON/React Router hydration data without executing shared scripts. It follows the linear conversation/current branch, selects visible final assistant responses, and excludes hidden fragments when a merged response is present. User messages supply only explicitly labeled metadata. Translation introductions, leading chapter summaries/subtitles, duplicated bilingual chapter headings, chapter-end markers, and note notices are removed. Continuations are appended to their chapter. Missing authors remain Anonymous with a warning; no author is fabricated. Re-importing the same share URL skips chapters with identical titles and translated paragraphs.

Validation: `npm run check`; Chromium tests cover parser, bookshelf save, and repeated import. The supplied public conversation was fetched and parsed locally as BOGO, chapters 1–6, without fragmented duplicates or summary/footer notices. Its HTML is not committed. To repeat: `SHARE_HTML_PATH=/path/to/share.html TEST_BASE_URL=http://127.0.0.1:4174 node tests/browser-chatgpt-share-v112.cjs`. Existing PDF and TXT/Markdown/HTML browser tests pass with v112.

Shared page layouts and upstream access may change. An inaccessible or unrecognized page is not saved as a book; users can paste the finished translation instead.
