# Live reader translation fix — v108

## Root cause

`translateDraftChapter()` already passed a completed response batch (`batch.start`, `batch.translated`) to its progress callback. However, `autoTranslateAndSaveWorkToBookshelf()`'s `updateLiveShelfReader()` ignored that batch payload and copied `draftChapter.paragraphs`, whose `ko` fields are committed only after all chapter batches succeed. As a result, the viewer progress panel had no translated text until the entire chapter finished, and a later-batch failure could prevent any batch result from appearing live.

## Fix

- Added `applyLiveTranslationBatchToChapter()` to write only the just-completed batch to its exact paragraph indexes.
- `updateLiveShelfReader()` applies that payload before cloning paragraph data into the bookshelf novel and rendering the reader.
- Final chapter completion checks remain unchanged: an incomplete/failed chapter is not marked translated and is not considered complete merely because earlier batches were shown live.
- Bumped the app build marker/cache-busting path to v108.

## Validation

- `npm run check` passed, including all existing regression tests.
- Added `tests/test-reader-live-translation-v108.cjs`: runs the actual `translateDraftChapter()` function with a successful first batch and a simulated subsequent-batch failure, applies the live payload through the actual helper, and verifies completed paragraphs are available in the live shelf copy before full-chapter completion.
- `node --check` passed for the app and the new regression test.
- This is code-level/mocked API validation; no live Gemini/Azure API call or Cloudflare deployment was performed.
