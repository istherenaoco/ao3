# AO3 Metadata Mapping Fix

## Changes
- Metadata parsing now scopes title, author, fandom, and summary extraction to AO3's work preface/metadata regions instead of collecting any `rel="author"` link from the whole document.
- Removed author and fandom inference from the browser `<title>` string. AO3 allows users to customize browser title ordering, so splitting it could put the wrong value into a different field. The browser title is now a title-only fallback.
- Added `og:title`, `twitter:title`, and author meta-tag fallbacks while keeping missing fields blank/Anonymous rather than guessing from another field.
- Summary extraction is restricted to summary elements associated with the work metadata, avoiding chapter/body content.
- When the summary is English-only, the bookshelf save flow translates it separately through the app's existing translation pipeline. It does not add the summary to the chapter queue. If translation fails, the original summary is preserved rather than silently lost.
- Applied the same changes to `index.html`, `ao3.html`, `public/index.html`, and `public/ao3.html` to prevent deployment copies from diverging.

## Validation
- All four HTML files contain the same parser and summary-translation changes.
- Extracted inline JavaScript passed `node --check`.
- ZIP integrity checked after packaging.

## Limitations
- AO3 pages that are locked, blocked by a Cloudflare challenge, or missing metadata in the fetched HTML may not expose the original author/summary. In those cases the app avoids guessing the author/fandom from the browser title.
- This environment did not run an authenticated/live AO3 import or a live translation API request. Please test with one public AO3 work and one downloaded/pasted AO3 HTML page after deployment.

## Chapter title extraction fix
- Chapter title lookup now checks chapter-preface heading selectors before broader heading fallbacks and rejects AO3's generic `Chapter Text` / `Work Text` labels as titles.
- AO3 downloaded HTML parsing now associates each chapter body with its nearby preceding `.meta.group` heading rather than pairing two independent query-selector lists by array index.
- Jina/Markdown parsing now preserves actual chapter headings (including custom titles) and strips the generic `Chapter Text` label from the saved title and body.
- If no usable chapter title is present, the chapter is named `Chapter 1`, `Chapter 2`, etc. It no longer uses `Chapter Text` or fabricates the work title as the chapter title.
- A chapter with only one extracted paragraph is retained; chapter body content is not dropped solely because it has fewer than two paragraphs.

## Sequential AO3 link translation queue
- Clicking the link button now always adds the URL to one queue; the worker serially fetches, translates, and saves one linked chapter before starting the next.
- The active URL is passed directly into the processing function instead of re-reading a shared input field. This prevents a newly typed link from replacing the link currently being processed.
- The queue lock stays active across the complete drain loop, closing the short hand-off window where two chapter jobs could start at once.
- Duplicate active or queued chapter URLs are rejected (query/hash variants are normalized for duplicate checks), and clearing the queue leaves the active chapter untouched.
- A failed import/translation is reported visibly; the worker then attempts the next queued link rather than silently treating an empty import as successful.
- Applied identically to all four HTML entry points.

## Validation for sequential link queue
- The main inline JavaScript in each HTML entry point passes `node --check`.
- The four HTML entry points are synchronized byte-for-byte.
- ZIP archive integrity was checked after packaging.
- Live AO3 fetching and provider API translation were not run in this environment.


## Persistent AO3 link translation queue UI

- The link queue panel is now always visible on the AO3 chapter-add screen, including when the queue is empty and when the user switches to pasted-text mode.
- The panel shows the active URL separately from waiting URLs, plus an empty-state message. The clear button only appears when there are waiting URLs; clearing the queue does not cancel the active translation.
- Incoming chapter URLs continue to be processed sequentially by the queue drain loop; duplicate links already active or waiting are rejected.
- Validation performed for this build: the four HTML entry points are synchronized and inline JavaScript syntax checks pass. Live AO3/network/API testing was not performed.
