# AO3 Cloudflare Worker — current source v107

## Cloudflare Workers Builds
- 프로젝트 폴더를 유지한다면 Root directory: `AO3_Cloudflare_Worker_Root_Fix`
- Build command: `npm run check`
- Deploy command: `npx wrangler deploy`
- `wrangler.jsonc`가 정적 파일 폴더 `./public`와 `AI` 바인딩을 설정합니다.

## 번역 엔진
번역 공급자 우선순위는 Gemini → Cloudflare Workers AI → Groq → Azure Translator입니다. 공급자 체인을 최대 2회 순환한 뒤에도 실패하면 작업을 중단하고 오류 알림과 다운로드 가능한 실패 보고서를 제공합니다. Google 번역 fallback은 사용하지 않습니다. 잘못되거나 비어 있는 번역 결과는 저장하지 않습니다.

AO3 본문 가져오기는 같은 Worker의 `/api/ao3-fetch` 경로를 먼저 사용하고, 실패 시 AllOrigins·CodeTabs·Jina Reader 경로를 보조로 시도합니다. Worker는 AO3 HTTPS 작품/챕터 URL만 허용하고 fragment(`#workskin`)를 제거하며, 성인 콘텐츠 동의 URL과 다운로드 HTML 경로를 함께 사용합니다. 로그인 전용 작품이나 AO3/Cloudflare 확인 화면은 우회하지 않고 명확한 오류로 표시합니다.

Workers AI를 사용하려면 `wrangler.jsonc`의 `"ai": { "binding": "AI" }` 설정을 유지하고 배포한 뒤 앱 설정의 Workers AI 연결 테스트를 실행하세요. 별도의 Workers AI API 키를 앱에 입력할 필요는 없습니다.

## Secret 설정
Cloudflare Workers의 Settings → Variables and Secrets에서 필요에 따라 다음 항목을 설정할 수 있습니다.
- `GROQ_API_KEY`
- `GROQ_MODEL` (선택, 기본 `openai/gpt-oss-120b`)
- `AZURE_TRANSLATOR_KEY`
- `AZURE_TRANSLATOR_REGION`
- `AZURE_TRANSLATOR_ENDPOINT` (선택)

Gemini 키는 앱 번역 설정에서 관리할 수 있습니다. API 키를 GitHub 저장소에 커밋하지 마세요. Drive 백업 기능을 통한 키 보관은 앱의 기존 암호화 절차를 사용합니다.

## 현재 코드 배치
- `public/index.html`: 전체 앱 구조
- `public/assets/app.css`: 앱/뷰어 CSS
- `public/assets/app.js`: 앱 동작 및 번역·저장·동기화 로직
- `public/assets/queue-widget-v44.js`: 대기열 표시 보조 초기화
- `public/ao3.html`: 기존 링크 호환용 별칭이며 `/`로 이동합니다.
- `src/index.js`, `src/shared.js`: Worker API 처리

## API 확인
`https://YOUR-WORKER.workers.dev/api/status`를 열어 Worker가 응답하는지 확인하고, 배포 후 AO3 본문 가져오기·대기열·짧은 번역·API 실패 보고서·Google Drive 동기화를 직접 확인하세요. 자동화된 구문 검사는 실제 계정의 네트워크 동작을 대신하지 않습니다.


## v48 제목 표시
- 책장 카드 및 사용자 정의 책장 목록의 제목을 렌더링할 때 번역 제목과 원제를 별도 줄로 표시합니다. 저장된 제목 문자열 자체는 변경하지 않습니다.


### Reader font weight (v50)

The reader provides 300/400/500 font-weight options (Light/Regular/Medium; no bold option). The setting is included in local and Google Drive reader preferences.


## v107 Gemini 품질 검사 예외 및 회귀 테스트

Gemini는 HTTP 성공 응답을 받으면 결과물 품질 검사로 응답을 거부하거나 다음 키를 재호출하지 않습니다. 문단 수·영어 잔존·미완성 문장 토글은 Workers AI/Groq/Azure 경로에만 적용됩니다.

## v106 코드 감사 및 회귀 테스트
- Gemini 요청은 각 번역 묶음에서 등록 키 목록을 두 번 순회합니다. 냉각 설정이 켜져 있으면 HTTP 429로 냉각 중인 키는 각 순회에서 고려하되 실제 요청은 생략합니다. 냉각을 끄면 냉각 기록으로 요청을 제외하지 않습니다.
- 번역 시작 시 활성 키 목록의 이름·키·고유번호를 스냅샷으로 보관하므로 번역 중 목록을 바꾸거나 수정해도 작업실의 `키-특별 목록 이름-번호` 표시가 해당 요청과 일치합니다.
- 여러 특별 목록과 목록 번호, 활성 목록, 번역 품질 검사 및 냉각 설정은 암호화 설정 백업의 복원 대상입니다.
- `npm run check`는 구문 검사, 기존 회귀 테스트, 두 차례 Gemini 키 순회/냉각 모의 API 테스트, 암호화 Drive 백업·복원 왕복 테스트를 실행합니다.
- 테스트는 실제 Gemini API, Google Drive 계정 또는 Cloudflare 배포를 대신하지 않습니다. 배포 전 실제 계정과 Worker에서 짧은 번역·실패 보고서·Drive 복원을 확인하세요.
