# v74 — Remove unreliable reader retranslation button

- Removed the reader toolbar's AI retranslation button.
- Removed its delegated click handler and button-only CSS states.
- Kept normal translation flows (queue translation and chapter translation during import) intact.
- Updated asset cache query versions to v74.0.
- Updated the regression test to assert the reader button/handler/styles are absent.

Validation: `npm run check` passes. Real-device/browser deployment verification remains necessary.
