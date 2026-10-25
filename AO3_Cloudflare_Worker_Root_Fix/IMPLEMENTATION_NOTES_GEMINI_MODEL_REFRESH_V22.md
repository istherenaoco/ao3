# Gemini model refresh (v22)

- Default Gemini model updated from Gemini 2.5 Flash to `gemini-3.8-flash`.
- Added current stable Flash options: `gemini-3.5-flash-lite`, `gemini-3.6-flash`, and `gemini-3.1-flash-lite`.
- Removed the shut-down `gemini-2.0-flash` option and old 2.5 options from the model selector.
- Added startup and Google Drive settings-restore normalization so old saved model IDs migrate to `gemini-3.8-flash`.
- Gemini 4 Argon was not added because it is not available on the Free tier and uses the Interactions API rather than the app's existing `models/{model}:generateContent` call.
- Synchronized root and `public/` HTML copies.
