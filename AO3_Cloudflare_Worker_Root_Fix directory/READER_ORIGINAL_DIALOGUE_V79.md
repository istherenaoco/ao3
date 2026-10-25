# v79 — Reader original dialogue display

- The reader now replaces dialogue content inside matching straight double quotes ("...") or curly double quotes (“...”) with the corresponding source dialogue from the English paragraph.
- It is a display-only transformation: the saved Korean paragraph (`p.ko`) is not modified.
- To avoid mapping the wrong speech when translation and source quote counts differ, that paragraph is left unchanged in that case.
- No translation provider order, API invocation, or translation/polishing behavior was changed.
