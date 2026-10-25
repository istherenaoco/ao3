# 현재 구현 기준 (v48)

## 배포 구조
- `public/index.html`: 유일한 전체 앱 HTML
- `public/assets/app-v44.css`: 앱·뷰어 스타일의 단일 원본
- `public/assets/app-v45.js`: 앱 로직의 단일 원본
- `public/assets/queue-widget-v44.js`: 대기열 가시성 보조 초기화
- `public/ao3.html`: 기존 링크 호환 경로. 쿼리와 해시를 유지해 `/`로 이동
- `src/index.js`, `src/shared.js`: Cloudflare Worker API
- `wrangler.jsonc`: 정적 파일은 `./public`에서 제공하며 `/api/*`는 Worker가 처리

## 유지되는 주요 기능
- AO3 챕터 가져오기, 대기열 제목·작가 표시, 재시도 및 항목별 삭제
- 본문 추출 경로 병렬 처리와 최초 정상 응답 우선 채택
- Gemini → Workers AI → Groq → Azure Translator → Google 번역 대체 경로
- 문단 수 검증, 실패 묶음 복구, 요청 제한 대응, 번역 후 치환 및 인물별 규칙
- 번역 작품 책장, 사용자 정의 책장·태그, 문장 북마크, 독서 위치, 글자 크기와 테마
- 원제 분리 표시, 화면 표시 시 텍스트 치환 및 한국어 조사 보정
- Google Drive 동기화, 사용자 설정 동기화, 암호화 API 키 백업/복원
- 아이콘 중심의 상단 메뉴와 다크/라이트 모드

## 설정 및 보안
- Workers AI는 `wrangler.jsonc`의 `AI` 바인딩을 사용합니다.
- Groq/Azure 서버 Secret은 Cloudflare Workers의 Variables and Secrets에서 설정할 수 있습니다.
- 비밀 API 키를 저장소에 커밋하지 마세요.
- 앱의 Google Drive OAuth와 기존 데이터 저장 방식은 변경하지 않았습니다.

## 검사
`npm run check`는 Worker 모듈과 앱/대기열 JavaScript 자산의 구문을 검사합니다. 실제 AO3 접속 및 사용자 API로의 실시간 번역은 배포 환경에서 확인해야 합니다.


## v43 모바일 독서 화면 개선
- 모바일(화면 너비 640px 이하)에서만 독서 화면 좌우 여백을 줄입니다.
- 모바일에서 아래로 스크롤하면 앱 상단 탐색 헤더와 독서 도구막대를 숨기고, 위로 스크롤하면 다시 표시합니다.
- 데스크톱 레이아웃과 번역/저장 데이터 로직은 변경하지 않습니다.


## v44 책장 상단 UI 정리
- 책장 설명문과 중복된 “새 AO3 소설 가져오기 · 묶기” 버튼을 제거했습니다. 소설 가져오기는 기존 상단 내비게이션의 작업실 아이콘으로 계속 접근할 수 있습니다.
- 저장 상태 배지는 “저장됨”, Drive 상태 배지는 “동기화됨/동기화 중/미연결”으로 줄이고, 상세 상태는 툴팁에 남겼습니다.
- 북마크 태그 필터를 펼침/접힘 토글로 감싸고, 토글 상태를 로컬 설정에 저장합니다. 검색과 태그 필터 동작은 유지됩니다.


## v45 인터페이스 정리
- Drive 동기화 표시등은 상태에 따라 색상만 바뀌며, 반복 애니메이션을 사용하지 않습니다.
- 알림은 오류·경고 및 일부 중요한 작업 완료만 표시합니다. 반복적인 저장/동기화 성공 메시지는 숨기고 중복 알림은 8초 동안 억제합니다.


## v48 제목/원제 표시
- 메인 책장 카드와 사용자 정의 책장/검색 결과, 저장한 문장 목록에서 제목을 렌더링할 때만 한국어 번역 제목과 영문 원제를 별도 줄로 출력합니다.
- v47까지의 제목 수정은 뷰어 헤더에만 적용되어 책장 카드에서는 적용되지 않았습니다.


## v50 — Reader font weight

- Reader typography now has a separate weight selector with 300 Light, 400 Regular, and 500 Medium. Bold weights are intentionally not offered.
- The selected weight applies to reader body paragraphs and displayed original text.
- Weight preference is persisted in localStorage and the existing Google Drive user-preferences JSON; older preferences default to 400.
- Active assets: `public/assets/app-v50.css` and `public/assets/app-v50.js`.


## v52 API quota dashboard

- Translation settings contain one quota card per provider (Gemini, Cloudflare Workers AI, Groq, Azure Translator).
- Browser-local usage events store request counts and coarse character/token counts only; they do not store API keys or source text.
- Groq upstream rate-limit headers are forwarded through the Worker and displayed as observed RPD/TPM limits and remaining values.
- Gemini daily quota percentage is shown only when a single configured key's 429 response exposes a daily quota value; otherwise the UI reports the limit as unavailable instead of estimating. Google quotas are project-scoped and reset at Pacific midnight.
- Workers AI shows the documented 10,000 Neurons/day free allocation/reset at 00:00 UTC, but does not invent a consumed-neuron percentage when usage is not available via the binding response.
- Azure tier can be selected for the quota graph because API keys do not identify subscription tier; local successful translated characters are compared with published F0/month and tier/hour limits. Billing-cycle reset can differ from calendar month.
- Monthly or daily meters show an unknown pattern when a provider does not expose a fixed quota; monthly usage tracked by this browser remains visible.

## v53 reader spacing controls

The reader theme drawer now provides 1px-step controls for horizontal content padding (0–48px), line height in pixels (16–56px), paragraph spacing (0–48px), and first-line indentation (0–48px). Each control has a slider and a numeric field for exact values. Settings apply live without re-rendering the chapter, are saved to local reader preferences, and are included in Google Drive reader-preference synchronization. Defaults for older settings are 20px / 24px / 24px / 0px.
