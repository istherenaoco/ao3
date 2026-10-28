# Translation Quality Toggles v103

- Added a Translation Quality tab to API settings.
- Added independent switches for paragraph-count alignment and English residue/incomplete-translation detection.
- English residue validation is now honored by Gemini, Workers AI, Groq, and Azure result checks.
- When paragraph-count checking is disabled, extra response segments can be merged into the final expected paragraph where safe. Missing segments still fail structural validation because the app cannot safely infer their translations.
- Both options default to enabled and persist in local settings, Google Drive safe preferences, and encrypted settings backup/restore.
- Added regression test `tests/test-translation-quality-toggles-v103.cjs`.
