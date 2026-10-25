# Novel translation quality v18

- Strengthened default literary translation prompt in all four HTML copies.
- Explicitly distinguishes narration from dialogue: narration defaults to Korean past-tense novel prose (-았다/-었다/-였다), while dialogue preserves character voice and speech level.
- Adds instructions for Korean syntax reconstruction, idioms/context-sensitive vocabulary, agency/tense/negation accuracy, and internal proofreading.
- Strengthened Groq system prompt and lowered temperature from 0.20 to 0.15.
- Azure Translator cannot follow custom literary prompts in this integration; context grouping and safe post-processing remain. A true Azure quality leap would require optional LLM post-editing, which is not added here because it costs extra latency/quota and changes fallback behavior.
- Static checks performed; live authenticated API tests not performed.
