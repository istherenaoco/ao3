# AO3 번역 서재 — Cloudflare Workers 전용 프로젝트

이 버전은 **Cloudflare Pages Functions가 아니라 Cloudflare Worker + Static Assets** 구성입니다. 주소 `https://ao3.acantos123.workers.dev` 같은 `workers.dev` 주소에서 `/api/*` API와 웹 화면을 한 Worker로 제공합니다. Netlify 연결은 필요하지 않습니다.

## 프로젝트 구조

- `wrangler.jsonc`: Worker 설정 및 public 정적 파일 바인딩
- `src/index.js`: `/api/status`, `/api/groq-translate`, `/api/azure-translate` 라우팅 및 API 중계
- `src/shared.js`: JSON/CORS 응답 도우미
- `public/index.html`: 사이트 루트 페이지
- `public/ao3.html`: 앱 HTML

## 기존 Worker를 GitHub 저장소에서 배포

1. ZIP의 내용을 GitHub 저장소 최상위에 올리고 커밋합니다. `wrangler.jsonc`, `package.json`, `src/`, `public/`가 저장소 루트에 있어야 합니다.
2. Cloudflare Dashboard → **Workers & Pages** → 기존 Worker `ao3` → **Settings → Builds**(또는 Build)에서 GitHub 저장소와 `main` 브랜치를 연결합니다. 기존 Worker를 유지하려면 새 Worker를 만들지 말고 기존 `ao3`를 연결하세요.
3. Build command: 비워 두거나 `npm install` (프로젝트가 빌드하지 않으므로 비워 둬도 됩니다)
4. Deploy command: `npx wrangler deploy`
5. Root directory: 비워 둡니다.
6. 저장한 뒤 **Retry build / Deploy**를 실행합니다. Wranger 설정의 `name`은 `ao3`여서 기존 `ao3.acantos123.workers.dev` Worker를 대상으로 합니다.

Cloudflare 공식 문서: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/

## API 키 Secret 등록 (권장)

Cloudflare Dashboard → Workers & Pages → `ao3` → Settings → Variables and Secrets에서 **Production** 환경에 다음 값을 등록하세요.

- `GROQ_API_KEY` (Secret)
- `AZURE_TRANSLATOR_KEY` (Secret)
- `AZURE_TRANSLATOR_REGION` (일반 변수 또는 Secret, 예: `koreacentral`)
- `GROQ_MODEL` (선택, 일반 변수, 예: `openai/gpt-oss-120b`)
- `AZURE_TRANSLATOR_ENDPOINT` (선택, 일반 변수, 기본값 `https://api.cognitive.microsofttranslator.com`)

브라우저 앱 설정의 API 키가 입력되어 있으면 해당 입력 키가 서버 Secret보다 우선합니다. 앱 설정 키를 비워두면 서버 Secret을 사용합니다. **실제 API 키를 GitHub 저장소에 작성하지 마세요.** Gemini는 기존 앱 코드가 브라우저에서 직접 호출하므로 앱 설정에 등록해야 합니다.

## 배포 확인

다음 주소를 브라우저에서 열면 JSON이 표시되어야 합니다.

`https://ao3.acantos123.workers.dev/api/status`

성공 예시:

```json
{
  "platform": "cloudflare-worker",
  "providers": { "groq": true, "azure": true }
}
```

값이 `false`이면 Worker Secret이 아직 등록되지 않았거나 이름이 다릅니다. 그 다음 앱 설정에서 Groq 연결 테스트와 Azure 연결 테스트를 각각 실행하세요.

## 참고

- Worker static assets는 `public/`에서 제공되고 `/api/*`만 Worker 코드에서 먼저 처리하도록 구성했습니다.
- Worker code runs on Cloudflare; any API keys typed into the app are still stored in that browser's local storage by the existing UI. Server Secrets are more appropriate for a single-user fixed setup.
- Google Drive OAuth를 계속 쓰려면 Google Cloud Console의 Authorized JavaScript origins에 `https://ao3.acantos123.workers.dev`가 있어야 합니다.
