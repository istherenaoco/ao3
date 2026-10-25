# AO3 Queue Metadata Retry — v38

- Queue title/author extraction no longer requires the chapter body to be successfully parsed. It reads AO3 work metadata independently from HTML or Jina Reader Markdown.
- Uses AllOrigins Raw, AllOrigins JSON, CodeTabs, and Jina Reader in parallel; prefers a result that includes both title and author.
- Automatically retries once after a short delay when all sources fail. A failed queue item shows a manual “다시 시도” button.
- Keeps the work ID fallback title and existing individual queue-delete behavior. Deleted queue items are not updated by late metadata responses.
- No AO3 summary extraction was added.
