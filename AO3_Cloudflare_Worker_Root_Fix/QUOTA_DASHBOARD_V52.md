# v52 API quota dashboard

- Adds one quota card each for Gemini, Cloudflare Workers AI, Groq, and Azure Translator.
- Stores only aggregate provider request/character/token counts in browser localStorage; it does not store API keys or source text.
- Groq rate-limit headers are passed through the Worker and displayed as authoritative org-level RPD/TPM snapshots.
- Gemini daily RPD is shown only if a 429 response includes a per-day quota value; otherwise the UI reports that the actual project/model limit is not queryable through this API. Gemini limits are project-based, not API-key-based; multiple registered keys are counted in one site panel and limits are not blindly summed.
- Workers AI displays the documented 10,000 Neurons/day free allocation but does not fabricate a consumed-neuron percentage because the binding response does not expose account-wide neuron usage. It links to Cloudflare's dashboard/docs.
- Azure tier selector (unknown, F0, S1-S4) controls quota visualizations. F0 monthly characters use the published 2,000,000-character monthly free allowance; hourly caps follow Microsoft's documented tier limits. Local usage excludes other apps/devices. Billing-cycle reset can differ from calendar-month estimate.
- Where a provider doesn't expose a fixed monthly cap or remaining balance, bars are deliberately marked as unknown instead of showing a misleading percentage.
- Official quota references: Google Gemini API rate limits (project based, RPD resets at Pacific midnight); Groq rate-limit headers and organization scope; Cloudflare Workers AI 10,000 Neurons/day free allocation/reset at UTC midnight; Microsoft Translator tier-based hourly limits and F0 monthly free characters.
