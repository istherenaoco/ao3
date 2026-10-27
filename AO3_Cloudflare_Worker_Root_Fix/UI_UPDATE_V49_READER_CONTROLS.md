# v49 Reader controls

- Removed the reader drawer's “챕터 이어붙이기” and “제목 수정” buttons and their click handlers. Other chapter and title-management paths remain untouched.
- Replaced the fixed gothic label with three reader font options: Noto Sans KR (default), IBM Plex Sans KR (clean/light), and Gothic A1 (lighter/narrower).
- Font choice is saved to local reader preferences and included in Google Drive user-preference sync payloads.
- New versioned assets: `public/assets/app-v49.css` and `app-v49.js`.
- Google Fonts stylesheet now loads IBM Plex Sans KR and Gothic A1 weights 300–700.
