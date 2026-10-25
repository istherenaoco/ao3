# Green theme contrast fix v76

- Aligns the app header with the existing reader green canvas (`#bcd6c1`) so the top shell no longer looks like a separate white strip.
- Adds a `theme-color` meta tag and updates it whenever dark/light/green mode changes, including initial theme restoration, to better align supported mobile browser chrome.
- Gives reader spacing +/- controls light green surfaces, forest-green symbols, visible borders, and a distinct disabled state.
- Overrides the queue card's inline dark palette in green mode and explicitly sets readable text colors for all queue labels.
- Bumps CSS/JS asset query versions to `76.0` to avoid stale cached styles/scripts.
- Verified with `npm run check`; this is a source-level regression check, not a live iOS Safari deployment test.
