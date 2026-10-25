# AO3 Queue Overlay Fix v8

- Root cause confirmed: the queue already existed inside the chapter-add card, but `ao3QueueWidgetBootV3` moved it to `document.body` and forced `position: fixed` at the bottom-right. This made the queue overlap warning/toast messages and reader content.
- Replaced that bootstrap with `ao3QueueWidgetBootV4`. It keeps/repositions the queue immediately after the “AO3 챕터 추가” heading row and explicitly applies normal-flow `position: relative`, full card width, and a bounded internal scroll area.
- Removed the fixed bottom/right positioning and high overlay z-index. Toasts and warning messages no longer share the queue's screen overlay layer.
- Kept the empty queue visible and retained the existing queue renderer/handlers, translation sequencing, dark-mode colors, and other app features.
- Synced `index.html`, `ao3.html`, `public/index.html`, and `public/ao3.html`.

Validation: JavaScript syntax checks, HTML copy consistency, and ZIP integrity are checked locally. The result has not been verified on the live Cloudflare deployment.
