# Green-mode translation queue color fix (v81)

- Fixed the AO3 link translation queue's inline-styled row dividers and retry/delete buttons. Green mode now overrides the original cyan borders and navy button backgrounds.
- Improved author/URL text contrast in queued rows.
- Also themed the separate manual chapter-translation queue cards, count badge, and translated/untranslated status badges.
- Bumped the app CSS/JS cache keys and build marker to v81.0 so browsers do not keep serving the old colors.
- Added `tests/test-green-translation-queue-v81.cjs` and included it in `npm run check`.
