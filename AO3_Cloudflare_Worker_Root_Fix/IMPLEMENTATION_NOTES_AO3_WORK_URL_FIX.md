# AO3 작품 URL 입력 지원

- 링크 유효성 검사를 수정해 `/works/{workId}`와 `/works/{workId}/chapters/{chapterId}` 형식을 모두 허용합니다.
- 작품 URL을 입력했을 때 `/chapters/`가 없다는 이유만으로 추출 전에 거부되던 원인을 해결합니다.
- 개별 챕터 URL은 기존처럼 해당 챕터를 가져옵니다. 작품 URL은 AO3가 기본으로 표시하는 챕터를 대상으로 시도하며, 이 입력 모드는 한 번에 첫 번째로 파싱된 챕터만 번역합니다.
- AO3에 로그인해야 보이는 작품, 삭제/비공개 작품, AO3 또는 외부 추출 프록시의 접근 차단은 이 입력 형식 수정만으로 우회되지 않습니다.


## v10 — Bare work URL extraction fallback
- A bare `/works/ID` URL now also tries AO3's `view_full_work=true` page through AllOrigins/Jina.
- For bare work URLs only, the parser also attempts AO3's official static download HTML via AllOrigins, CodeTabs, and Jina Markdown because its HTML chapter layout differs from the regular web view.
- The existing caller still stores only the first parsed chapter for a bare work URL; explicit `/chapters/ID` links retain the existing chapter-specific route and do not trigger work-download fallbacks.
- This mitigates proxy responses that contain metadata but no recognized chapter body. External proxy availability and AO3 access restrictions can still cause failure.
