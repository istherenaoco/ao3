# ChatGPT → AO3 서재 Google Drive 수신함

## 배경과 원인
앱의 OAuth 범위는 `drive.file`입니다. 따라서 별도의 ChatGPT Google Drive 연결이 새로 업로드한 `ao3_novel_*.json` 파일은 같은 `AO3서재` 폴더에 있어도 앱의 `files.list` 결과에 보이지 않을 수 있습니다.

## 동작 방식
- 사이트의 첫 Drive 동기화에서 사이트 자신의 OAuth 토큰으로 `AO3서재/ao3_chatgpt_inbox.json`을 생성합니다. 초기 내용: `{"schemaVersion":1,"novels":[]}`
- ChatGPT는 이후 이 **기존 파일의 바이트를 제자리에서 업데이트**합니다. 새 파일로 대체하면 앱의 `drive.file` 접근 권한을 잃을 수 있습니다.
- 사이트는 메인 책장 동기화 시 해당 수신함을 다운로드하고, 유효한 신규 작품을 브라우저 서재에 추가합니다.
- 그러면 기존 `syncWithGoogleDrive` 업로드 경로가 해당 작품을 사이트 OAuth 앱이 생성한 `ao3_novel_<id>.json` 파일로 다시 저장합니다.
- 기존 작품 ID, 기존 AO3 작품 ID, 또는 동일한 제목+작가가 있거나 삭제 기록에 있는 작품은 자동으로 다시 가져오지 않습니다. 기존 작품을 덮어쓰지 않습니다.
- 수신함의 원본 항목은 데이터 유실 방지를 위해 자동으로 삭제하지 않습니다. 여러 작품을 등록할 때 `novels` 배열에 새 항목을 추가하고 기존 항목을 보존하세요.

## 최초 연동
1. 변경된 웹사이트를 배포합니다.
2. 사이트에서 **메인 책장**을 열고 Google Drive에 연결한 뒤 동기화를 실행합니다.
3. Drive의 `AO3서재` 폴더에서 `ao3_chatgpt_inbox.json`이 생성되었는지 확인합니다.
4. ChatGPT는 새 작품을 기존 사이트 작품 JSON 형식으로 생성하여 이 수신함의 `novels` 배열에 넣습니다. 기존 파일의 Drive ID를 보존한 상태로 **파일 내용을 업데이트**해야 합니다.
5. 다음 정상 Drive 동기화 시 사이트 서재에 신규 작품이 들어오고, 사이트가 자체 작품 JSON 파일을 만듭니다. 사이트 로그인이 만료되었다면 다시 연결이 필요합니다.

## 수신함 예시
```json
{
  "schemaVersion": 1,
  "novels": [
    {
      "id": "novel_example_unique_id",
      "ao3WorkId": null,
      "title": "Example Title",
      "author": "Example Author",
      "fandom": "",
      "summary": "",
      "createdAt": 1795012735202,
      "updatedAt": 1795012735202,
      "chapters": [
        {
          "id": "ch_example_0",
          "title": "Chapter 1",
          "sourceUrl": "",
          "paragraphs": [
            { "id": "para_example_0", "en": "", "ko": "예시 번역 문단입니다.", "bookmarked": false, "tags": [], "note": "" }
          ]
        }
      ]
    }
  ]
}
```

## 검증 및 제한
- JS 구문 검사는 통과했습니다. 실제 OAuth, 실계정 Drive 및 배포 웹사이트에서의 동작은 배포 후 확인해야 합니다.
- 수신함 파일이 생성되기 전에는 ChatGPT가 이 연동을 사용할 수 없습니다.
- 브라우저가 닫혀 있거나 Drive 토큰이 만료된 동안에는 사이트의 서재 화면이 자동으로 갱신되지 않습니다. 다음 정상 동기화 때 가져옵니다.
- 외부 변경 파일을 앱이 직접 발견하지 못하는 것은 JSON 이름 오류가 아니라 앱별 OAuth 파일 접근 제한입니다.
- Google Drive 폴더에 '링크가 있는 모든 사용자: 편집자' 등 과도한 공유 권한이 설정되어 있다면 제한을 권장합니다.
