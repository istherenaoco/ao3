# Reader theme palette and title/header contrast fix (v33)

- Reader background options are now `종이`, `그린`, and `다크`.
- Green reading canvas uses `#bcd6c1` with dark green text for readable contrast.
- Added per-reader-theme foreground, heading, muted metadata, border, and link colors.
- Overrode app-wide dark-mode `header` styling inside the reader. The chapter heading wrapper stays transparent and the title uses the theme's contrast-safe foreground, eliminating the dark rectangular strip seen over the paper canvas.
- Reader text colors now follow the reader canvas, independent of the surrounding app's light/dark mode.
- Previously saved `white` and `sepia` preferences migrate to `paper`; `dark` remains dark. The current palette is saved and synchronized through the existing reader preference settings.
- Updated the four full HTML copies identically.

Validation: JavaScript syntax checks are run on all inline scripts; ZIP integrity is checked before delivery. Cloudflare deployment and live browser rendering must still be verified in the user's environment.
