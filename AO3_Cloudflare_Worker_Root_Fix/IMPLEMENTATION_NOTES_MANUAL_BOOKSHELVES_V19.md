# Manual Bookshelves v19

## Added
- Added a separate `책장 관리` view without replacing the existing `내 책장` or `북마크 · 태그` views.
- The built-in `모든 번역 작품` shelf shows all saved novels and is not editable as a collection.
- Users can create any number of manually named `작가별 책장` and `주제별 책장` collections.
- Users manually check/uncheck each translated novel to add/remove it from a custom shelf. A novel may belong to multiple shelves.
- Opening a novel from this view opens the existing reader.
- Deleting a custom shelf removes only its membership metadata; it does not delete the novel, chapters, or bookmarks.
- Existing bookmark flags, tags, passage bookmarks, and bookmark manager are not repurposed.

## Persistence
- Shelf definitions are stored in localStorage and embedded in novel records so existing novel JSON / Google Drive sync and backup flows can carry the definitions.
- Membership is stored as `customShelfIds` on each novel record and therefore follows existing novel persistence/sync.
- No automatic author, fandom, or topic classification is performed.

## Validation
- Inline JavaScript syntax checked with Node.js `--check`.
- All four deployed HTML copies were updated consistently.
- No live browser or Google Drive end-to-end test was performed in this environment.
