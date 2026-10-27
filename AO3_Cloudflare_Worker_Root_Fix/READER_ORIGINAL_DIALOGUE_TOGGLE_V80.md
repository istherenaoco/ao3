# v80 — Reader original dialogue toggle

- Adds a toggle in the reader typography/settings drawer.
- When enabled, straight double-quoted (`"..."`) and curly double-quoted (`“...”`) dialogue snippets are shown from the corresponding English source paragraph.
- The underlying Korean translation is never modified; this is display-only.
- If quoted-segment counts differ between the source and translated paragraph, replacement is skipped for that paragraph to avoid mismatching dialogue.
- Preference is persisted with existing reader preferences.
