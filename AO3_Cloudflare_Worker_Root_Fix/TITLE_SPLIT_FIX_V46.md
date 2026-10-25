# v46 — Reader title split hardening

## Findings
- The served HTML references a versioned JavaScript asset, and the Worker already disables HTML caching. The title split helper in the prior asset could parse the sample string in isolation, but the split was only applied inside one render path. That left a gap if a later/legacy DOM update replaced the title node with raw text.
- The old diagnostic marker remained `42` in the v45 asset, so it did not prove that the newest title renderer ran.

## Changes
- Added a simpler final-parenthetical parser for ASCII/full-width parentheses and retained a balanced fallback.
- Centralized title rendering in `renderReaderTitle()`, using `textContent` and real DOM spans rather than interpolated `innerHTML`.
- Added a `MutationObserver` guard to re-split the visible title if any legacy path overwrites it after initial rendering.
- The title root now receives `data-title-split-version="46"`; the document references new `app-v46.js` and `app-v46.css` asset paths to avoid reusing old JS/CSS cache entries.
- Worker logic, stored novel title, translator pipelines and other functionality are unchanged.

## Verification
- Tested the exact displayed sample and variants with ASCII parentheses, full-width parentheses, no space before the parenthesis, and NBSP/zero-width characters.
- Checked JavaScript syntax and ZIP integrity. A live browser/session test against the deployed account was not available here.
