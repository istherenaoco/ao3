# Reader-time Text Replacements — v32

- The replacement table is applied when rendering translated paragraphs in the reader, including already-translated chapters.
- The reader transformation is display-only: stored `paragraph.ko` text is not modified by viewing. Updating/saving the replacement table refreshes the open reader immediately.
- Korean particle harmony is adjusted for common variable postpositions after replacement: 은/는, 이/가, 을/를, 과/와, 이랑/랑, 으로/로 (with the ㄹ-final exception), and 아/야.
- The same helper remains used by translation finalization so new translations keep the existing post-translation replacement behavior.
- English source toggles remain unchanged; replacement rules apply to translated Korean display text only, not original English text.
