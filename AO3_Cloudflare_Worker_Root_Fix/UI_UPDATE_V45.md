# UI update v45

- Drive synchronizing indicator no longer uses `animate-ping`; the dot changes color by state only (green connected, amber syncing, gray disconnected).
- Toasts now suppress routine success/info messages, preserve actionable errors and validation warnings, keep a few critical backup/restore/completion confirmations, deduplicate identical notices for 8 seconds, and show at most two at a time.
- Existing translation, queue, shelf, reader, and Drive behavior is otherwise unchanged.
