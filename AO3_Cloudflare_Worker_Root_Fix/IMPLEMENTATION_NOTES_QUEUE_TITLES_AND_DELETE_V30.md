# v30 — AO3 translation queue titles/authors and per-item removal

- The AO3 link translation queue now stores queue entries with a stable per-session ID, URL, title, author, and metadata status.
- Pending items show title, author, source URL, and a per-item Delete button; the existing Clear Queue action remains.
- Metadata is resolved in the background for links waiting behind an active translation. The chapter body is not retained in the queue metadata object; it is fetched normally when processing begins.
- Removing an item while metadata lookup is pending is safe: late metadata results are ignored if the item is no longer queued.
- Duplicate detection supports both legacy string items and new queue objects.
- The active item is not included in the pending list and cannot be deleted as a queued item; clearing/removing pending items does not cancel the in-progress translation.
- Updated all four full HTML copies: `ao3.html`, `public/ao3.html`, `index.html`, `public/index.html`.

Validation: JavaScript syntax checks and ZIP integrity checks passed. Live AO3 metadata retrieval was not tested from a logged-in account.
