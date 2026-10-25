# Reader font-size adjustment (v24)

- Kept the reader default font size at 14px.
- Lowered the minimum selectable/persisted reader font size from 14px to 8px; the increase limit remains 26px and the step remains 1px.
- Removed the trailing `A` from the reader display-settings toggle, changing `가A` to `가` to prevent overflow on mobile.
- Applied to all four served HTML copies (`ao3.html`, `index.html`, `public/ao3.html`, `public/index.html`).
