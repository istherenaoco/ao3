# Provider transition improvements v15

- Automatic provider order: Gemini → Azure Translator → Groq → free Google GTX. Groq is no longer a blocking preferred fallback.
- Azure requests have a 20-second fetch timeout. Azure HTTP 429 with Retry-After <= 5 seconds gets one short retry; longer waits are skipped so the request can fall through to Groq.
- Groq requests have a 12-second fetch timeout and no longer sleep/retry internally on HTTP 429. The failure is recorded, Groq cooldown is persisted, and the translation proceeds without waiting for the cooldown.
- If Azure returns valid translations, the batch completes immediately. If Azure fails, gets throttled, times out, or fails result validation, Groq is attempted. If Groq also fails or is cooling down, the free Google GTX fallback is attempted.
- Invalid paragraph mapping is never force-fit into the result.
- Existing Gemini-first behavior, Groq disable setting, Azure quota reservation, chapter queue, and no-partial-chapter commit behavior are retained.

Validation: static JavaScript syntax and file-copy consistency checked. Live Gemini/Groq/Azure requests were not run.
