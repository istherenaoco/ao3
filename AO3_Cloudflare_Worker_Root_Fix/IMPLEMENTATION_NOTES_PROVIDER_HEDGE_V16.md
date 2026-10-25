# Provider hedge optimization v16

- Keeps priority order Gemini → Groq → Azure → free Google Translate.
- Gemini remains the first provider; each key request is bounded to 9 seconds, and after it fails/has no available key, Groq starts first.
- Azure starts immediately if Groq fails/returns no result, or after a 3.5-second hedge delay if Groq is still running.
- Only fully validated provider results can win. If one provider wins, the shared AbortController is used to cancel the losing in-flight provider request where supported.
- Groq cooldown/429 handling remains in place; cooldown means Groq is skipped and Azure is started without waiting.
- Azure remains bounded by its 20-second request timeout; Groq by its 12-second request timeout. Existing paragraph count/output checks remain required.

Validation: static JavaScript syntax and HTML copy consistency checked. Live API tests not performed. Parallel hedging can incur a second provider request when Groq exceeds 3.5 seconds; this trades some additional quota use for lower latency.
