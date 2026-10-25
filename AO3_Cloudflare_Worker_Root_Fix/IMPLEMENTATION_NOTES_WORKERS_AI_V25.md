# v25 — Cloudflare Workers AI 추가

- 번역 공급자 순서를 Gemini → Cloudflare Workers AI → Groq → Azure Translator → 무료 번역으로 변경.
- Worker에 `AI` binding을 추가했고 `/api/workers-ai-translate` 프록시가 모델 호출, 프롬프트 구성, 문단 마커 검증, 오류 반환을 처리합니다.
- 기본 모델은 `@cf/zai-org/glm-4.7-flash`; `@cf/openai/gpt-oss-120b`도 선택 가능. 서버에서 모델 allowlist와 최대 요청 길이를 검사합니다.
- 설정 화면에 자동 사용 체크박스, 모델 선택, 연결 테스트를 추가했습니다. Workers AI는 Worker binding으로 동작하므로 브라우저 측 API 키가 필요하지 않습니다.
- 설정은 로컬 저장과 암호화된 Google Drive 설정 백업에 포함됩니다.
- 검증: ZIP 무결성, HTML 내장 JavaScript 문법 검사, Worker JS 문법 검사 및 JSON 설정 검증을 실행합니다. 실제 Cloudflare 계정에서의 AI 호출은 별도 테스트가 필요합니다.
