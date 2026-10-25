# Google Drive custom bookshelf sync (v23)

- Added a dedicated `ao3_custom_bookshelves.json` metadata file inside the existing `AO3서재` Drive folder.
- Author/topic shelf definitions now sync independently of novel files, including empty shelves and renames/deletions.
- The metadata payload uses an `updatedAt` timestamp for last-writer-wins conflict handling.
- `persistCustomShelves()` triggers Drive sync immediately when connected; the normal bookshelf sync also reconciles the metadata file.
- Existing per-novel `customShelfIds` remain stored in each novel JSON, and the existing novel sync handles those assignments.
- No OAuth scope changes: uses the existing `drive.file` flow and files created/managed by this app.

After deployment, connect Google Drive and click sync once on the main bookshelf. Custom shelves will be stored in the same `AO3서재` folder.
