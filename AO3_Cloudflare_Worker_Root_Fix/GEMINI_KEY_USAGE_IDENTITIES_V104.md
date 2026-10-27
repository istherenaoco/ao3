# Gemini key usage and stable identities (v104)

- The API usage dashboard records every attempted Gemini API request per key, including failed/429 attempts.
- The daily per-key count follows the standard Google Gemini RPD reset boundary at midnight America/Los_Angeles and shows a countdown to the next reset. The UI does not claim this is an authoritative account quota; project/model quota policies may differ.
- Stable base key IDs are fingerprint-based, monotonically allocated, and persisted in settings, local storage, Google Drive user preferences, and the encrypted settings vault. Raw API key values are not shown in the dashboard.
- The default list displays `Gemini 키 N`. Special lists display `키 N-목록이름-M`, where `N` is the stable base identity and `M` is a per-list stable slot. Removing a key does not free its slot; new keys receive the next slot number.
- Special key lists and their names, slot assignments, and active selection remain part of encrypted Drive settings backup/restore.
