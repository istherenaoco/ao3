# AO3 App Dark Mode Implementation Notes

- App theme defaults to dark unless `localStorage['ao3-app-theme']` is explicitly set to `light`.
- Theme selection is available in the existing Translation Settings modal as `다크모드` / `라이트모드` and persists between reloads.
- Added app-wide overrides for surface backgrounds, text, borders, form controls, modals, generated cards, and the persistent link queue.
- The reader's default theme is now dark for fresh preference profiles; existing reader theme preferences are preserved.
- All four HTML entrypoints (`index.html`, `ao3.html`, `public/index.html`, `public/ao3.html`) are synchronized.
- Prior metadata parsing, chapter-title handling, sequential link queue, and always-visible queue widget are retained.

- Queue visibility hardening (v4): moved the persistent queue widget immediately after the opening body tag, added inline fixed-position/display styles so it paints before JavaScript initialization, and made bootstrap remove both `hidden` class and the HTML `hidden` attribute. Queue remains fixed at the bottom-right on every app view.
- Added HTML build marker `data-ao3-build="ao3-dark-queue-v4"` for verifying that the updated HTML has actually been deployed. A local ZIP cannot update the live Cloudflare deployment by itself.
