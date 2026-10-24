Google Drive account reconnection improvements

- Removed the startup-time requestAccessToken() call. Loading/reloading the app no longer launches a Google popup automatically.
- Added the basic OpenID email scopes to remember a verified email address as a login_hint. The hint is used to preselect the previous account when the user clicks Drive connect/sync.
- Access tokens are still not persisted in browser storage. GIS token-model access tokens expire and must be requested from a user gesture; automatic background reauthorization across page reloads is not possible with the current browser-only token flow.
- Existing Google Drive drive.file scope, sync behavior, local IndexedDB/localStorage storage, and current token-only memory behavior remain.
