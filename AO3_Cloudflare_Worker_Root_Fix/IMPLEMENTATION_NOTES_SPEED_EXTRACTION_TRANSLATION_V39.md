# v39 — Body Extraction and Translation Throughput Optimization

## Changes
- AO3 body extraction now returns the first valid, parsed chapter response from concurrently launched proxy paths and aborts the remaining requests instead of waiting for `Promise.allSettled` across slow/failed proxies. The current UI imports one explicitly linked chapter (or only the first chapter of a bare work URL), so later proxy responses were redundant.
- Queue title/author lookup uses abortable parallel candidates. A response with both title and author wins immediately; a title-only response gets a short 300 ms opportunity for author metadata and then returns. Requests are aborted when a candidate wins, the queue entry is deleted/cleared, or the item becomes active for extraction.
- Workers AI processes four paragraphs per request instead of two; Groq processes three paragraphs per request instead of two. If paragraph alignment breaks, only the affected batch is retried paragraph-by-paragraph.
- Translation chapter scheduling is adaptive: the first batch is serial. Only after a validated Gemini success are subsequent batches allowed to run two at a time. If any fallback provider is used, scheduling returns to serial mode to limit downstream pressure and reduce TPM/quota failures.
- Gemini key-pool attempts are bounded to 12 seconds total per paragraph batch, rather than multiplying a 9-second timeout by every configured key. Workers AI fetch timeout is 30 seconds for its now-bounded four-paragraph batch. Provider results carry an internal provider tag used by the scheduler; it is not written to novel data.
- The final Google Translate fallback now packs paragraphs into URL-safe batches of about 3,800 characters, and retries only the failed batch one paragraph at a time instead of switching the entire chapter to serial single-paragraph requests.

## Intentional trade-offs
- For the existing single-chapter import path, the first valid proxy response is selected rather than waiting for every proxy to compare chapter counts. Every caller of `fetchAndParseAo3Url` currently requests `fullWork=false`, and the workflow intentionally stores one explicitly linked chapter. This cuts tail latency; it does not change stored paragraph content after parsing.
- Concurrency is not blindly increased for all providers. Gemini can process two later chunks concurrently after a validated success; fallbacks remain sequential to avoid Groq TPM throttling and repeated lower-quality speculative calls.
- No provider is guaranteed to be fastest at all times; real latency depends on network, model load, quota, and request length.

## Validation
- Checked JavaScript syntax for Worker and extracted inline scripts in all four HTML entry points.
- Checked all four deployed HTML entry points are byte-identical.
- Checked zip integrity and ran mocked race/scheduler behavior tests.
- Did not perform live AO3/proxy or live provider calls in the user's Cloudflare account.
