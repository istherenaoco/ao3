# v69 — Reader retranslation reliability

- Moved the delegated `#readerRetranslateChapterBtn` click handler out of `initEvents()` and register it at bootstrap before `initEvents()` is invoked.
- This prevents an unrelated event-binding exception earlier in `initEvents()` from silently leaving the reader retranslation button inert. Delegation still supports `renderReader()` replacing toolbar DOM.
- The handler invokes `translateDraftChapter()` on the current chapter source paragraphs, stages translations before committing, saves only after full success, and preserves the old translation on failure.
- Updated static asset cache version to 69.0 and strengthened the retranslation regression check.
- Validation: `npm run check` passes. Real API/iPhone interaction was not available in this environment.
