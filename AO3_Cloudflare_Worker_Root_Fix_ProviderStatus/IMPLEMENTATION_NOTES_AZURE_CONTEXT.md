# Azure context and dialogue-safety patch

## Changes
- Adjacent short paragraphs are sent as one Azure text with explicit newline-delimited paragraph sentinels, preserving nearby context during translation.
- The response parser tolerates Azure inserting whitespace between sentinel characters. If the boundary is missing or changed, the result is rejected and the existing fallback path is used instead of saving misaligned paragraphs.
- Azure post-processing no longer calls the generic `finalizeTranslatedParagraph()` routine, which applies regex-based narration-ending rewrites. Azure cannot identify dialogue speakers, so those global rewrites risk changing dialogue speech levels.
- Existing user-defined text replacements still run. Explicit spelling rules can be added in the character rules box as `표기: Illya => 일리야`.
- Gemini -> Groq -> Azure provider order is unchanged. No new API or paid service was added.

## Important limitation
Azure Translator does not accept a custom style prompt in this integration. The free-text character relationship rules are not interpreted as semantic instructions by Azure. This patch therefore avoids pretending it can reliably enforce character-specific banmal/honorifics; it protects dialogue from unsafe global rewriting and applies only explicit literal spelling replacements on Azure output.

## Suggested manual QA
1. Translate a short dialogue scene with at least 3 adjacent paragraphs.
2. Confirm each source paragraph still aligns with exactly one translated paragraph and the original-text comparison remains aligned.
3. Include a known explicit spelling replacement, e.g. `표기: Illya => 일리야`, and verify it applies to Azure output.
4. Compare dialogue ending forms before and after the patch; the Azure finalizer should not automatically rewrite `-습니다`/`-어요` to banmal.
5. Test a scene divider between paragraphs; groups should not cross the divider.

Static JavaScript syntax was checked with Node. Live Azure API behavior has not been tested in this environment.
