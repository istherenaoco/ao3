# AO3 Metadata Mapping Fix

## Changes
- Metadata parsing now scopes title, author, fandom, and summary extraction to AO3's work preface/metadata regions instead of collecting any `rel="author"` link from the whole document.
- Removed author and fandom inference from the browser `<title>` string. AO3 allows users to customize browser title ordering, so splitting it could put the wrong value into a different field. The browser title is now a title-only fallback.
- Added `og:title`, `twitter:title`, and author meta-tag fallbacks while keeping missing fields blank/Anonymous rather than guessing from another field.
- Summary extraction is restricted to summary elements associated with the work metadata, avoiding chapter/body content.
- When the summary is English-only, the bookshelf save flow translates it separately through the app's existing translation pipeline. It does not add the summary to the chapter queue. If translation fails, the original summary is preserved rather than silently lost.
- Applied the same changes to `index.html`, `ao3.html`, `public/index.html`, and `public/ao3.html` to prevent deployment copies from diverging.

## Validation
- All four HTML files contain the same parser and summary-translation changes.
- Extracted inline JavaScript passed `node --check`.
- ZIP integrity checked after packaging.

## Limitations
- AO3 pages that are locked, blocked by a Cloudflare challenge, or missing metadata in the fetched HTML may not expose the original author/summary. In those cases the app avoids guessing the author/fandom from the browser title.
- This environment did not run an authenticated/live AO3 import or a live translation API request. Please test with one public AO3 work and one downloaded/pasted AO3 HTML page after deployment.

## Chapter title extraction fix
- Chapter title lookup now checks chapter-preface heading selectors before broader heading fallbacks and rejects AO3's generic `Chapter Text` / `Work Text` labels as titles.
- AO3 downloaded HTML parsing now associates each chapter body with its nearby preceding `.meta.group` heading rather than pairing two independent query-selector lists by array index.
- Jina/Markdown parsing now preserves actual chapter headings (including custom titles) and strips the generic `Chapter Text` label from the saved title and body.
- If no usable chapter title is present, the chapter is named `Chapter 1`, `Chapter 2`, etc. It no longer uses `Chapter Text` or fabricates the work title as the chapter title.
- A chapter with only one extracted paragraph is retained; chapter body content is not dropped solely because it has fewer than two paragraphs.

## Sequential AO3 link translation queue
- Clicking the link button now always adds the URL to one queue; the worker serially fetches, translates, and saves one linked chapter before starting the next.
- The active URL is passed directly into the processing function instead of re-reading a shared input field. This prevents a newly typed link from replacing the link currently being processed.
- The queue lock stays active across the complete drain loop, closing the short hand-off window where two chapter jobs could start at once.
- Duplicate active or queued chapter URLs are rejected (query/hash variants are normalized for duplicate checks), and clearing the queue leaves the active chapter untouched.
- A failed import/translation is reported visibly; the worker then attempts the next queued link rather than silently treating an empty import as successful.
- Applied identically to all four HTML entry points.

## Validation for sequential link queue
- The main inline JavaScript in each HTML entry point passes `node --check`.
- The four HTML entry points are synchronized byte-for-byte.
- ZIP archive integrity was checked after packaging.
- Live AO3 fetching and provider API translation were not run in this environment.


## Persistent AO3 link translation queue UI

- The link queue panel is now always visible on the AO3 chapter-add screen, including when the queue is empty and when the user switches to pasted-text mode.
- The panel shows the active URL separately from waiting URLs, plus an empty-state message. The clear button only appears when there are waiting URLs; clearing the queue does not cancel the active translation.
- Incoming chapter URLs continue to be processed sequentially by the queue drain loop; duplicate links already active or waiting are rejected.
- Validation performed for this build: the four HTML entry points are synchronized and inline JavaScript syntax checks pass. Live AO3/network/API testing was not performed.

## 고정형 AO3 링크 번역 대기열 UI 보완
- 링크 대기열 패널을 `main` 내부의 챕터 추가 입력 영역에서 분리해 `</main>` 바로 뒤의 전역 문서 레벨로 이동했습니다. 따라서 책장/번역 작업실/리더 등 화면 전환 시 부모 뷰의 `hidden` 클래스에 의해 사라지지 않습니다.
- 패널에 `position: fixed`와 높은 `z-index`를 지정해 뷰포트 오른쪽 아래에 고정했습니다. 대기 항목이 0개여도 상태와 빈 대기 안내 문구가 계속 표시됩니다.
- 대기 링크가 많아도 화면을 과도하게 가리지 않도록 패널과 목록에 최대 높이 및 내부 스크롤을 지정했습니다.


## 대기열 상시 표시 보강 v3
- 기존 HTML의 대기열 패널을 앱 초기화 스크립트와 분리된 독립 부트 스크립트에서도 확인하도록 했습니다.
- 패널이 없으면 DOM에서 생성하고, 존재하면 `document.body` 바로 아래로 이동해 화면별 부모 컨테이너의 `hidden`/transform 영향을 피합니다.
- `position: fixed`, `display`, `visibility`, `opacity`, `z-index` 등을 inline `!important`로 강제해 화면 오른쪽 아래에 항상 표시되도록 했습니다.
- 루트/`public`의 `index.html`, `ao3.html` 모두 동일하게 반영했습니다.


## Summary translation and author cleanup v13
- AO3 summary is extracted from scoped work metadata selectors and paragraph boundaries are preserved.
- Jina Markdown summary headings are also parsed when present.
- The summary passes through the existing Korean translation pipeline before being copied into the bookshelf memo field. If translation fails, the English source is not placed in that field.
- The automatic `(AO3)` author suffix has been removed from imports and existing saved author fields are normalized during load/save.
