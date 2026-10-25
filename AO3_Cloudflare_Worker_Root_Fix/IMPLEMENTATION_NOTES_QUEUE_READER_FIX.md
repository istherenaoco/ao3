# AO3 Queue Placement and Chapter Fetch Fix v5

- Moved the persistent link queue into normal document flow immediately below the "AO3 챕터 추가" header; it no longer floats over warnings or reader text.
- Kept the queue visible even when empty, but scoped it to the chapter-add panel where new URLs are submitted.
- The app stays in the translation studio while there are queued URLs, switching to the bookshelf only after the final queued item completes.
- Increased external extraction timeouts for slower AO3/proxy responses and preserved useful error details in the fetch log and warning toast instead of replacing every failure with the same generic message.
- Synced index.html, ao3.html, public/index.html, and public/ao3.html.

Validation note: script syntax and archive integrity are checked locally; live AO3 fetches still depend on the user's network, AO3 access, and external proxy availability.
