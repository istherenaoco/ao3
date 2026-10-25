# v27 — Workers AI / Groq empty assistant content fix

## Changes
- Workers AI (`@cf/zai-org/glm-4.7-flash`) requests now explicitly disable thinking with `chat_template_kwargs.enable_thinking=false`, clear thinking context, and set `reasoning_effort: null`. This avoids spending the completion on reasoning while returning `choices[0].message.content = null`.
- Groq GPT-OSS requests now set `include_reasoning: false`, `reasoning_effort: low`, and use `max_completion_tokens` with a larger minimum budget.
- Both endpoints parse content strings and arrays of text blocks. The `reasoning` field is never used as translation text.
- Empty-output errors report safe metadata (e.g. finish reason, usage, presence of a reasoning field) without serializing the entire model response.

## Validation
- JavaScript syntax checked for Worker source and all inline application scripts.
- Mock-response tests cover `content: null` with a reasoning field, array-of-text content, and normal string content.
- Actual Cloudflare inference requires a deployed Worker and was not live-tested in this environment.
