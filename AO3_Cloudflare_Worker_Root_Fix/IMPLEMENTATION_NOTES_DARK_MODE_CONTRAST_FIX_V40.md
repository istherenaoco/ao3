# v40 — Forceful dark-mode provider settings contrast fix

## What changed
- Updated the existing v39 source as the baseline; extraction and translation scheduling are unchanged.
- Added highly specific ID-scoped dark-mode CSS for the Workers AI, Groq, and Azure panels, their enablement callouts, labels, help copy, and connection status messages.
- Added `applySettingsDarkPalette()` runtime styling with inline `!important` values after the settings modal opens, on initial initialization, and when the user changes the app theme. When switching to light mode, the runtime properties are removed so the original light theme remains in effect.
- The previous CSS rules already attempted to set dark surfaces and light text by Tailwind class tokens. The supplied screenshot still showed a near-white callout and dim text, meaning the rendered style did not match the intended palette. v40 now targets concrete provider IDs and reapplies colors at runtime instead of relying only on utility-class selectors.

## Dark palette values
- Settings modal surface: `#111a2b`; foreground `#f1f5fb`; border `#34435b`.
- Workers AI panel: `#2b2343`; title `#e8ddff`; helper text `#d5c8f7`; inner enablement callout `#202c40`.
- Groq panel: `#3b2a20`; title `#ffe6d1`; helper text `#ffd2b0`; inner enablement callout `#202c40`.
- Azure panel: `#1a2f49`; title `#deebff`; helper text `#c9def9`.
- Shared status text: Workers AI `#e8ddff`, Groq `#ffe1c7`, Azure `#deebff`.
- Input controls: background `#0e1727` (existing setting), foreground `#f1f5fb`, border `#465873`.

The foreground/background combinations used for the new main helper text are approximately 9:1 or better by WCAG relative-luminance contrast calculation, depending on the panel/callout pairing.

## Validation
- Applied identical HTML to `ao3.html`, `index.html`, `public/ao3.html`, and `public/index.html`.
- Checked inline JavaScript syntax and byte-for-byte identity of all four pages.
- Checked ZIP integrity.
- Did not visually inspect a live browser session; deploy and inspect the settings modal in dark and light modes.
