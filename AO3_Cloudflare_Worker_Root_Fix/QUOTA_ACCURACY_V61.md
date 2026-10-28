# v61 — API quota/usage accuracy

- Captures structured provider error responses for Gemini, Groq, Cloudflare Workers AI, and Azure Translator.
- Classifies 429 as token/request/daily/unspecified limits when the error text supports that distinction; keeps 400, auth/permission, and 5xx separate.
- Stores recent error category, HTTP status, model, message, observation time, and Retry-After timestamp in the existing local quota snapshot store.
- Dashboard explanatory notes show recent observed error state and retry countdown.
- Continues to use authoritative Groq rate-limit headers when available; does not invent daily/monthly limits for providers that do not expose them.
- Azure failed calls do not count translated characters; attempted calls remain in request observations for request-rate visibility.

Limitations: the snapshot is browser-local; errors do not reveal total account usage or reliably expose all quota windows. Actual provider API integrations were not exercised with live credentials.
