# AO3 Cloudflare Worker

## 프로젝트 위치
이 ZIP은 기존 Cloudflare 빌드 로그에 표시된 경로와 맞추기 위해 `AO3_Cloudflare_Worker_Root_Fix/` 폴더를 포함합니다. GitHub 저장소 안에 이 이름의 폴더를 유지할 경우 Cloudflare Workers Builds의 **Root directory**도 `AO3_Cloudflare_Worker_Root_Fix`로 설정하세요. 폴더 안의 `wrangler.jsonc`, `package.json`, `src/`, `public/`이 한 단계 더 중첩되지 않도록 하세요.

Cloudflare Build 설정:
- Production branch: `main`
- Root directory: `AO3_Cloudflare_Worker_Root_Fix` (이 프로젝트 폴더를 유지할 경우)
- Build command: `exit 0`
- Deploy command: `npx wrangler deploy`

`wrangler.jsonc`는 정적 파일을 `./public`에서 제공하고 `/api/*` 요청을 Worker로 전달합니다. 호환성 날짜는 `2026-10-01`로 설정되어 있습니다.

## API Secret
API 키를 GitHub 저장소에 커밋하지 마세요. Cloudflare Worker의 **Settings → Variables and Secrets**에서 다음 Secret/변수를 설정할 수 있습니다.
- `GROQ_API_KEY`
- `GROQ_MODEL` (선택; 기본값은 `openai/gpt-oss-120b`)
- `AZURE_TRANSLATOR_KEY`
- `AZURE_TRANSLATOR_REGION`
- `AZURE_TRANSLATOR_ENDPOINT` (선택)

Gemini 키는 현재 앱의 번역 설정에서 관리합니다. 서버 Secret을 이용하는 경우 앱 설정의 해당 키 입력은 비워둘 수 있습니다.

## 기능
- 번역 엔진 순서: Gemini → Groq → Azure Translator → 무료 Google 번역 fallback
- 번역 입력 방식: `링크` 또는 `붙여넣기` 버튼으로 전환. 붙여넣기는 로그인 필요한 AO3 챕터의 복사한 본문을 한 챕터로 처리하며, 제목·작가·챕터·원문 URL을 선택 입력할 수 있습니다.
- 독서 뷰어: 번역 문단을 한 번 탭/클릭하면 해당 문단의 영어 원문이 보이고 다시 탭/클릭하면 숨겨집니다.
- 문장 책갈피: 기존 문장 더블탭/더블클릭 저장 기능 유지.
- 입력 버튼은 아이콘 + 짧은 라벨 중심으로 정리했습니다.

## 확인
배포 후 `https://YOUR-WORKER.workers.dev/api/status`를 열어 Worker API가 응답하는지 확인하세요. 그다음 붙여넣기 번역과 문단별 원문 보기를 테스트하세요. 코드는 로컬 구문 검사 대상이며, 실제 사용자 API 키로 외부 번역 호출은 테스트하지 않았습니다.

## 챕터별 삭제

뷰어 상단 챕터 선택기 옆의 휴지통 아이콘을 누르면 현재 챕터 삭제 확인 창이 표시됩니다. 삭제하면 해당 챕터와 그 챕터의 문장 책갈피가 함께 제거되고 책장 데이터에 저장됩니다.


## 이번 수정: 번역 API 표시

번역 진행 배너 오른쪽에 현재 실제 호출 중인 API가 표시됩니다: Gemini, Groq, Azure Translator, 또는 최후 대체 Google 번역. 엔진 전환·요청 제한·성공 상태도 표시됩니다.

## Translation fallback / error visibility fix
- Translation providers are tried in configured fallback order for each paragraph batch: Gemini key pool, Groq, Azure Translator, then Google GTX as the last-resort fallback.
- A provider may be retried or skipped if it is rate-limited. This is intentional fallback behavior, not simultaneous translation.
- Provider failures and HTTP/quota details are shown in the translation progress panel.
- The Google GTX last-resort path now throttles paragraph requests sequentially to reduce 429s.
- If every provider fails, the chapter batch is rejected instead of silently using English source text as Korean output.
- Translation results are staged and committed only when every paragraph in the chapter succeeds, preventing mixed/half-translated chapters.


## Chapter link translation queue

While a chapter URL is being fetched and translated, paste another AO3 chapter URL into the URL field and press **번역 / 대기열**. The new URL is queued and processed in order after the current chapter finishes successfully. The queue is session-only; it is cleared if the page is refreshed. If a translation fails, the queue pauses rather than silently saving English source text as a completed translation.

## Azure context + character style rules update

- Azure now groups up to three adjacent short paragraphs (up to about 3,500 source characters) into one translation request to provide nearby context. A stable paragraph marker is checked before restoring the original paragraph boundaries. If the marker is changed or missing, the Azure result is rejected and the existing free fallback path is used.
- The translation settings modal includes a persistent `작품별 인물·관계·말투 규칙` field. Rules are added to Gemini/Groq prompts. Azure Translator does not support custom prompts, so Azure only applies explicit literal spelling rules entered as `표기: source => target` after translation. The app deliberately does not force automatic banmal/jondaetmal conversion on Azure dialogue.
- This update uses the existing translation providers only; it adds no paid provider or new API call type. Test a short chapter first, especially where Azure may alter the paragraph marker.
