# v35 — Icon-only header navigation

- Removed the tagline under the AO3 app title.
- Converted the four primary view tabs and Drive/settings/backup utilities to icon-only visual controls.
- Kept count badges and Drive connection status indicator.
- Added `aria-label` and `title` values so controls remain identifiable for assistive technology and hover tooltips.
- Preserved the dynamic Drive status span as visually hidden so existing status updates continue to work.
- Applied the same HTML changes to `ao3.html`, `index.html`, `public/ao3.html`, and `public/index.html`.
