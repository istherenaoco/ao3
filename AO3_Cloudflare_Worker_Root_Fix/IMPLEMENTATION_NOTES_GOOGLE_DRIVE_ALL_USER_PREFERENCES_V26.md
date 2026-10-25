# AO3 v26 — Google Drive user preference sync

## Summary

Added automatic Google Drive synchronization for user-facing settings that previously only persisted in the browser. The file is `ao3_user_preferences.json` inside the existing `AO3서재` folder.

### Included in automatic preference sync

- Translation model instruction prompt (`translationPrompt`)
- Per-work character, relationship, and speech-style rules (`characterStyleRules`)
- Post-translation literal replacement rules (`textReplacements`)
- Translation engine/model choices and automatic fallback toggles
- Azure region (not the key) and Google OAuth client ID
- Reader theme, font size (8–26 px), bilingual display option
- Application dark/light theme

The preference document uses a monotonic local `updatedAt` timestamp to resolve changes between devices. A newer remote document is restored locally; newer local edits are uploaded. The regular Drive sync includes this file automatically, and settings/reader/theme edits schedule a debounced sync when a Drive token is available.

### Existing sync continued

- Novel records (including stored chapter/read/bookmark/tag data) continue to use the existing `ao3_novel_<id>.json` files.
- Custom author/topic shelf definitions continue to use `ao3_custom_bookshelves.json`, preserving empty shelves and deletions.

### Secrets

Gemini, Groq, and Azure API keys are deliberately NOT included in `ao3_user_preferences.json`. They remain in `ao3_settings_encrypted.json`, encrypted using WebCrypto AES-GCM with a passphrase-derived key. The existing **암호화해 Drive에 저장** feature is still required to make the secret-key backup initially; if the user elects to remember the passphrase for the current tab/session, future settings saves update that encrypted backup automatically. The passphrase and OAuth access token are never uploaded or persisted by this feature.

### Validation

- `src/index.js` and `src/shared.js` pass `node --check`.
- All inline scripts in `ao3.html`, `public/ao3.html`, `index.html`, and `public/index.html` pass `node --check`.
- ZIP integrity checked after packaging.
- Live Google Drive OAuth and cross-device sync were not tested against a real Google account; verify after deployment by changing the three translation settings, clicking Drive sync, and opening the app on another device logged into the same Drive account.
