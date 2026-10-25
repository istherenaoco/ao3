# Manual bookshelf search-to-add UI (v21)

- Replaced the full catalogue of unchecked checkboxes beneath custom shelves with a focused bookshelf contents list.
- Added an explicit “+ 작품 추가” action for author/topic shelves.
- The add panel starts empty and searches saved translated works by title, author, and summary; only matches are displayed.
- Each result has an explicit “이 책장에 추가” action. The action saves the novel's customShelfIds and does not change bookmarks or the source novel.
- Existing shelf entries are displayed as book-like rows with Open and Remove-from-shelf actions (no checkboxes). Removing an entry preserves the novel and all bookmarks.
- Existing tag filtering is retained and applies to both shelf contents and add-search results.
- Basic “all translated works” shelf remains browse-only and is not modified by shelf membership actions.
- All four HTML entry points were synchronized.
