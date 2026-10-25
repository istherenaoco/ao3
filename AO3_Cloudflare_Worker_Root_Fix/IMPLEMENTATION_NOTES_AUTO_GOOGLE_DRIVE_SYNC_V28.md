# v28 — Automatic Google Drive Sync

## Changes
- After the user connects Google Drive once, save the short-lived OAuth access token and expiry only in `sessionStorage` for the current browser tab. The token is not stored in `localStorage` and is cleared on disconnect or HTTP 401.
- On reload, restore a still-valid token from the same tab session, wait for IndexedDB bookshelf hydration, and automatically run Drive sync without requiring another button click.
- If the token has expired or the user opens a new browser session, the app explains that one click is needed to re-authorize; Google Identity Services browser token flow requires a user gesture to request a new token. After that, syncing is automatic again.
- Existing autosync on local data changes, settings changes, custom bookshelf changes, and return to the main bookshelf remains intact. No aggressive polling interval was added because the current full sync reads each novel JSON individually and a frequent timer could create unnecessary Drive API traffic.

## Validation
- All four full HTML app copies were updated identically.
- JavaScript syntax check and ZIP integrity verification performed.
- Actual Google account/OAuth behavior still needs confirmation after deployment.
