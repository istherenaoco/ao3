# v47 Mobile Reader Update

- On mobile (viewport <= 640px), the reader uses a full-bleed canvas. The html/body/main background matches the selected Paper/Green/Dark reader theme, so outer gutters do not show a contrasting app background.
- Removed mobile-only reader outer margin, card radius, border, and shadow.
- Intermediate 16px horizontal content inset balances readable edge spacing and usable text width.
- Korean prose and displayed original paragraphs use justified alignment; last lines stay start-aligned and scene dividers remain centered.
- Desktop layout is unchanged. Reader canvas theme attributes are removed when leaving the reader.
- Versioned CSS/JS asset names are app-v47.css and app-v47.js to avoid stale browser asset caches.
