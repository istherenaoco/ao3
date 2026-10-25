# v34 Reader Title Display Update

- The reader title header now visually separates a Korean translated title from a parenthesized English original title.
- The stored novel title remains unchanged, so library data, search, bookmarks, and Drive sync are not modified by this display-only behavior.
- A parenthetical suffix is split only when the leading title contains Hangul and the suffix contains Latin letters.
- The translated title keeps the stronger, larger style. The original title has no parentheses, appears on the next line, and uses smaller muted text.
- Updated all four HTML entry copies: `ao3.html`, `public/ao3.html`, `index.html`, `public/index.html`.
