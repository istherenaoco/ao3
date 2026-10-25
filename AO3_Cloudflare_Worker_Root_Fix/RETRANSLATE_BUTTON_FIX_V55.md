# v55 — Reader retranslation button fix

- Changed the chapter retranslation handler from a one-time listener on the initial button node to delegated document-level click handling.
- `renderReader()` recreates the reader toolbar; delegation keeps the button working after re-renders.
- Prevents duplicate clicks while a retranslation is already running.
- Progress/final state updates target the current button node, not a detached node.
- Preserves the existing translation pipeline and failure behavior.
