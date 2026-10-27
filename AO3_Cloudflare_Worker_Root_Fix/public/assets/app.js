
    (function() {
      'use strict';
      window.__AO3_BUILD_VERSION__ = '107';

      const STORAGE_KEY = 'ao3_korean_bookshelf_v1';
      const SETTINGS_KEY = 'ao3_korean_settings_v1';
      const READER_PREFS_KEY = 'ao3_korean_reader_preferences_v1';
      const DELETED_IDS_KEY = 'ao3_korean_deleted_ids_v1';
      const DEFAULT_GOOGLE_CLIENT_ID = '821952251109-upebojq1da9ep7cmrjg18hlukdppmjru.apps.googleusercontent.com';
      const DRIVE_FOLDER_NAME = 'AO3서재';
      const TRANSLATION_FAILURE_REPORTS_KEY = 'ao3_translation_failure_reports_v1';
      const DRIVE_FAILURE_REPORTS_FOLDER_NAME = '번역 실패 리포트';
      const MAX_PENDING_TRANSLATION_FAILURE_REPORTS = 50;
      let translationFailureReportFlushTimer = null;
      let translationFailureReportFlushBusy = false;
      // Cloudflare Worker API routes run on this same origin under /api/*.
      const DRIVE_RECONNECT_KEY = 'ao3_google_drive_reconnect_v1';
      // Session-scoped token cache lets a connected tab auto-sync after reload without persisting OAuth credentials across browser sessions.
      const DRIVE_ACCESS_TOKEN_SESSION_KEY = 'ao3_google_drive_access_token_session_v1';
      const DRIVE_ACCESS_TOKEN_EXPIRY_SESSION_KEY = 'ao3_google_drive_access_token_expiry_session_v1';
      let libraryHydrationPromise = Promise.resolve();
      const DRIVE_LOGIN_HINT_KEY = 'ao3_google_drive_login_hint_v1';
      const DRIVE_SETTINGS_VAULT_FILE = 'ao3_settings_encrypted.json';
      const DRIVE_USER_PREFERENCES_FILE = 'ao3_user_preferences.json';
      const DRIVE_PROVIDER_QUOTA_FILE = 'ao3_provider_quota_usage.json';
      const DRIVE_USER_PREFERENCES_TS_KEY = 'ao3_user_preferences_drive_updated_at_v1';
      const DRIVE_SETTINGS_VAULT_SESSION_KEY = 'ao3_drive_settings_vault_passphrase_session_v1';
      const IDB_NAME = 'ao3_korean_library_idb_v1';
      const CUSTOM_SHELVES_KEY = 'ao3_custom_bookshelves_v1';
      const DRIVE_CUSTOM_SHELVES_FILE = 'ao3_custom_bookshelves.json';
      const DRIVE_SYNC_INDEX_KEY = 'ao3_google_drive_sync_index_v1';
      const CUSTOM_SHELVES_SYNC_TS_KEY = 'ao3_custom_bookshelves_drive_updated_at_v1';
      const IDB_STORE = 'novels_store';

      // One source of truth for the default literary translation prompt.
      const DEFAULT_TRANSLATION_PROMPT = '한국어로 번역한다. 목표는 요약이나 기계적 직역이 아니라 출판 가능한 자연스러운 한국어 장편소설 문장이다. [서술 문체] 대사와 생각이 직접 인용된 부분을 제외한 일반 서술은 일관된 소설 문어체로 쓰고, 기본 종결은 과거형 -았다/-었다/-였다 및 필요한 연결형으로 유지한다. 서술문에 -해/-야/-거야/-했어요/-습니다 같은 구어체·대화체 종결을 섞지 않는다. 단, 인물의 실제 대사와 직접 인용된 내면 독백은 화자의 말투를 유지한다. 원문이 현재형이거나 의도적으로 단문을 반복할 때는 효과를 살리되, 문체를 기계적으로 통일하지 않는다. [한국어 재구성] 영어 어순과 수식어 순서를 그대로 따라가지 말고, 한국어에서 자연스러운 주어·목적어·수식어 순서로 문장을 다시 구성한다. 영어 관계절·분사구문·생략된 주어는 문맥에 맞게 자연스럽게 옮긴다. 원문 자체가 미완성한 문장 조각, 말줄임표·대시로 끊긴 말, 의도적 반복은 완성하거나 삭제하지 말고 그 호흡을 보존한다. 원문에서 완결된 문장은 의미를 빠짐없이 완결된 한국어로 번역한다. [정확성] 모든 문장을 빠짐없이 번역하고 의미를 추가·삭제·완화하지 않는다. 관용구, 구동사, 신체·의학 용어, 성적 용어는 철자 유사성으로 추측하지 말고 문맥상 의미를 정확히 고른다. 인물의 성별·대명사·행위 주체·대상·시제·부정·인과관계를 유지한다. [문학성] 감정의 미묘함, 시점, 인물별 어휘와 말투, 반복과 리듬을 보존한다. 같은 표현을 문맥 없이 반복하지 말고, 한국어에서 어색한 명사화·피동·중복 주어·영어식 추상명사를 자연스럽게 고친다. [형식] 원문의 문단 순서와 문단 수, 장면 구분선을 유지한다. 대사는 따옴표 안에 두고 서술문과 대사의 말투 규칙을 혼동하지 않는다. 고유명사는 작품 내 통용 표기를 우선하고 지정 표기를 따른다. 원문에 있는 이탤릭은 강조 의미를 보존하되 마크다운 기호를 출력하지 않는다. 번역문만 출력하고 설명이나 주석을 붙이지 않는다. 출력 전 내부적으로 문장별 누락 여부, 원문에 없는 미완성·누락 여부, 한국어 어순, 조사, 용어, 서술 종결, 대사 말투를 검수한다.';

      // Keep the selected model compatible with the current Gemini generateContent endpoint.
      // Gemini 4 Argon is intentionally not listed here: it is paid-only and uses the Interactions API.
      const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
      const GEMINI_REQUEST_TIMEOUT_MS = 30000;
      const SUPPORTED_GEMINI_MODELS = new Set([
        'gemini-3.8-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite'
      ]);
      const GEMINI_MODEL_FALLBACKS = {
        'gemini-3.8-flash': ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'],
        'gemini-3.6-flash': ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'],
        'gemini-3.5-flash-lite': ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash'],
        'gemini-3.1-flash-lite': ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash']
      };
      function normalizeGeminiModel(model) {
        const value = String(model || '').trim();
        if (SUPPORTED_GEMINI_MODELS.has(value)) return value;
        // Older saved choices include models that are shut down or no longer recommended.
        return DEFAULT_GEMINI_MODEL;
      }


      // Provider quota dashboard. Metrics are local browser observations unless a provider
      // returns an authoritative rate-limit header. Never present unavailable account limits as exact.
      const AO3_PROVIDER_QUOTA_STORAGE_KEY = 'ao3_provider_quota_usage_v1';
      const AO3_PROVIDER_QUOTA_MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000;
      const AO3_PROVIDER_QUOTA_DRIVE_DEBOUNCE_MS = 5000;
      let driveProviderQuotaSyncPromise = null;
      let driveProviderQuotaSyncTimer = null;
      let driveProviderQuotaRevision = 0;
      let providerQuotaBoundaryRefreshTimer = null;
      function ao3LoadQuotaStore() {
        try {
          const value = JSON.parse(localStorage.getItem(AO3_PROVIDER_QUOTA_STORAGE_KEY) || '{}');
          return { events: Array.isArray(value.events) ? value.events : [], snapshots: value.snapshots && typeof value.snapshots === 'object' ? value.snapshots : {} };
        } catch (ignoreQuotaStoreRead) { return { events: [], snapshots: {} }; }
      }
      function ao3SaveQuotaStore(store) {
        try { localStorage.setItem(AO3_PROVIDER_QUOTA_STORAGE_KEY, JSON.stringify(store)); } catch (ignoreQuotaStoreWrite) {}
        driveProviderQuotaRevision++;
        ao3ScheduleProviderQuotaDriveSync();
      }
      function ao3MergeQuotaStores(localStore, remoteStore) {
        const eventsById = new Map();
        [remoteStore, localStore].forEach(function(source) {
          (source && Array.isArray(source.events) ? source.events : []).forEach(function(event, index) {
            if (!event || !event.provider || !Number.isFinite(Number(event.at))) return;
            const id = String(event.id || (event.provider + ':' + event.at + ':' + index));
            const current = eventsById.get(id);
            const version = Number(event.updatedAt || event.at);
            if (!current || version >= Number(current.updatedAt || current.at)) eventsById.set(id, Object.assign({}, event, { id: id }));
          });
        });
        const cutoff = Date.now() - AO3_PROVIDER_QUOTA_MAX_AGE_MS;
        const events = Array.from(eventsById.values()).filter(function(event) { return Number(event.at) >= cutoff; })
          .sort(function(a, b) { return Number(a.at) - Number(b.at); }).slice(-5000);
        const snapshots = {};
        [remoteStore, localStore].forEach(function(source) {
          const sourceSnapshots = source && source.snapshots || {};
          Object.keys(sourceSnapshots).forEach(function(provider) {
            const candidate = sourceSnapshots[provider];
            const current = snapshots[provider];
            if (candidate && (!current || Number(candidate.observedAt || 0) >= Number(current.observedAt || 0))) {
              snapshots[provider] = Object.assign({}, candidate);
            }
          });
        });
        return { events: events, snapshots: snapshots };
      }
      function ao3UpdateProviderQuotaStorageNote() {
        const note = document.getElementById('providerQuotaStorageNote');
        if (!note) return;
        if (!isDriveTokenValid()) {
          note.textContent = '사용량 기록은 이 브라우저에 저장 중입니다. Drive에 연결하면 다른 기기와 동기화됩니다.';
        } else if (window._ao3DriveNeedsQuotaSync) {
          note.textContent = '사용량 기록을 브라우저에 저장했고 Google Drive에 동기화하고 있습니다.';
        } else {
          note.textContent = '사용량 기록은 브라우저와 연결된 Google Drive에 저장되며, 다른 기기와 합쳐집니다.';
        }
      }
      function ao3ScheduleProviderQuotaDriveSync() {
        window._ao3DriveNeedsQuotaSync = true;
        ao3UpdateProviderQuotaStorageNote();
        if (!isDriveTokenValid()) return;
        if (driveProviderQuotaSyncTimer) clearTimeout(driveProviderQuotaSyncTimer);
        driveProviderQuotaSyncTimer = setTimeout(function() {
          driveProviderQuotaSyncTimer = null;
          ensureDriveBookshelfFolder().then(function(folderId) {
            return syncProviderQuotaWithGoogleDrive(folderId);
          }).catch(function(error) {
            window._ao3DriveNeedsQuotaSync = true;
            ao3UpdateProviderQuotaStorageNote();
            console.warn('Provider quota Drive sync failed:', error);
          });
        }, AO3_PROVIDER_QUOTA_DRIVE_DEBOUNCE_MS);
      }
      async function findProviderQuotaDriveFile(folderId) {
        const q = "'" + folderId + "' in parents and name = '" + DRIVE_PROVIDER_QUOTA_FILE + "' and trashed = false";
        const res = await driveApiFetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name,modifiedTime)');
        if (!res.ok) throw new Error('Google Drive usage file lookup failed (HTTP ' + res.status + ')');
        const data = await res.json();
        return data.files && data.files.length ? data.files[0] : null;
      }
      async function writeProviderQuotaDriveFile(folderId, file, payload) {
        const boundary = '-------ao3quota' + Date.now();
        const metadata = file ? { name: DRIVE_PROVIDER_QUOTA_FILE, mimeType: 'application/json' }
          : { name: DRIVE_PROVIDER_QUOTA_FILE, mimeType: 'application/json', parents: [folderId] };
        const body = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + '\r\n' +
          '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(payload) + '\r\n--' + boundary + '--';
        const url = file ? 'https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(file.id) + '?uploadType=multipart&fields=id'
          : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
        const res = await driveApiFetch(url, { method: file ? 'PATCH' : 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body: body });
        if (!res.ok) throw new Error('Google Drive usage file write failed (HTTP ' + res.status + ')');
        return res.json();
      }
      function syncProviderQuotaWithGoogleDrive(folderId) {
        if (!isDriveTokenValid()) return Promise.resolve();
        if (driveProviderQuotaSyncPromise) return driveProviderQuotaSyncPromise;
        const revisionAtStart = driveProviderQuotaRevision;
        driveProviderQuotaSyncPromise = (async function() {
          const file = await findProviderQuotaDriveFile(folderId);
          let remoteStore = { events: [], snapshots: {} };
          let remoteUpdatedAt = 0;
          if (file) {
            const res = await driveApiFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(file.id) + '?alt=media');
            if (!res.ok) throw new Error('Google Drive usage file read failed (HTTP ' + res.status + ')');
            const remote = await res.json();
            if (remote && remote.kind === 'ao3-provider-quota-usage' && remote.schemaVersion === 1) {
              remoteStore = remote.usage || remoteStore;
              remoteUpdatedAt = Number(remote.updatedAt || 0);
            }
          }
          const localStore = ao3LoadQuotaStore();
          const merged = ao3MergeQuotaStores(localStore, remoteStore);
          const remoteJson = JSON.stringify(remoteStore);
          const mergedJson = JSON.stringify(merged);
          if (!file || mergedJson !== remoteJson) {
            await writeProviderQuotaDriveFile(folderId, file, {
              kind: 'ao3-provider-quota-usage', schemaVersion: 1,
              updatedAt: Math.max(Date.now(), remoteUpdatedAt + 1), usage: merged
            });
          }
          try { localStorage.setItem(AO3_PROVIDER_QUOTA_STORAGE_KEY, mergedJson); } catch (ignoreQuotaMergedWrite) {}
          window._ao3DriveNeedsQuotaSync = driveProviderQuotaRevision !== revisionAtStart;
          if (!window._ao3DriveNeedsQuotaSync) window._ao3DriveQuotaSyncedAt = Date.now();
          ao3UpdateProviderQuotaStorageNote();
          ao3RefreshProviderQuotaDashboard();
        })().finally(function() {
          driveProviderQuotaSyncPromise = null;
          if (driveProviderQuotaRevision !== revisionAtStart) ao3ScheduleProviderQuotaDriveSync();
        });
        return driveProviderQuotaSyncPromise;
      }
      function ao3RecordQuotaUsage(provider, chars, extra) {
        const now = Date.now();
        const store = ao3LoadQuotaStore();
        const event = {
          id: now.toString(36) + Math.random().toString(36).slice(2, 8),
          provider: String(provider || ''), at: now, updatedAt: now,
          chars: Math.max(0, Number(chars) || 0), requests: 1,
          inputTokens: 0, outputTokens: 0,
          model: String(extra && extra.model || '').slice(0, 100),
          keyFingerprint: String(extra && extra.keyFingerprint || ''),
          keyId: Number(extra && extra.keyId) || 0,
          keyLabel: String(extra && extra.keyLabel || '').slice(0, 120),
          status: 'attempted'
        };
        store.events = store.events.filter(function(item) { return item && Number(item.at) >= now - AO3_PROVIDER_QUOTA_MAX_AGE_MS; });
        store.events.push(event);
        if (store.events.length > 5000) store.events = store.events.slice(-5000);
        ao3SaveQuotaStore(store);
        ao3RefreshProviderQuotaDashboard();
        return event.id;
      }
      function ao3UpdateQuotaEvent(eventId, details) {
        if (!eventId) return;
        const store = ao3LoadQuotaStore();
        const item = store.events.find(function(event) { return event.id === eventId; });
        if (!item) return;
        item.updatedAt = Date.now();
        if (details && Number.isFinite(Number(details.inputTokens))) item.inputTokens = Math.max(0, Number(details.inputTokens));
        if (details && Number.isFinite(Number(details.outputTokens))) item.outputTokens = Math.max(0, Number(details.outputTokens));
        if (details && details.status) item.status = String(details.status).slice(0, 30);
        ao3SaveQuotaStore(store);
        ao3RefreshProviderQuotaDashboard();
      }
      function ao3SaveQuotaSnapshot(provider, snapshot) {
        const store = ao3LoadQuotaStore();
        store.snapshots[provider] = Object.assign({}, snapshot || {}, { observedAt: Date.now() });
        ao3SaveQuotaStore(store);
        ao3RefreshProviderQuotaDashboard();
      }
      function ao3CaptureQuotaResponse(provider, status, payload, headers, model) {
        const code = Number(status) || 0;
        const header = function(name) { try { return headers && headers.get ? headers.get(name) : null; } catch (ignoreHeaderRead) { return null; } };
        const raw = payload && payload.error;
        const message = String((payload && (payload.message || payload.detail)) || (raw && (raw.message || raw.status)) || (typeof raw === 'string' ? raw : '') || '').slice(0, 500);
        const retryRaw = header('Retry-After');
        let retryAt = null;
        if (retryRaw) {
          const seconds = Number(retryRaw);
          if (Number.isFinite(seconds) && seconds >= 0) retryAt = Date.now() + Math.min(seconds * 1000, 7 * 86400000);
          else { const parsedDate = Date.parse(retryRaw); if (Number.isFinite(parsedDate)) retryAt = parsedDate; }
        }
        let category = 'other-error';
        if (code === 429) {
          category = /token|TPM|tokens per minute/i.test(message) ? 'token-rate-limit' : (/request|RPM|requests per minute/i.test(message) ? 'request-rate-limit' : 'rate-limit-unspecified');
          if (/per.?day|daily|requests.?per.?day|RPD/i.test(message)) category = 'daily-limit';
        } else if (code === 401 || code === 403) category = 'auth-or-permission';
        else if (code >= 500) category = 'provider-server-error';
        else if (code === 400) category = 'bad-request';
        const store = ao3LoadQuotaStore();
        const previous = store.snapshots[provider] || {};
        store.snapshots[provider] = Object.assign({}, previous, {
          lastStatus: code || null, lastCategory: category, lastError: message,
          lastErrorAt: Date.now(), lastRetryAt: retryAt, lastErrorModel: String(model || '').slice(0,100), observedAt: Date.now()
        });
        ao3SaveQuotaStore(store);
        ao3RefreshProviderQuotaDashboard();
      }
      function ao3QuotaErrorNote(provider) {
        const snapshot = ao3LoadQuotaStore().snapshots[provider] || {};
        if (!snapshot.lastErrorAt || Date.now() - Number(snapshot.lastErrorAt) > 7 * 86400000) return '';
        const labels = { 'token-rate-limit': '토큰 한도 초과', 'request-rate-limit': '요청 한도 초과', 'daily-limit': '일일 한도 초과', 'rate-limit-unspecified': '429 한도 응답', 'auth-or-permission': '인증/권한 오류', 'provider-server-error': '공급자 서버 오류', 'bad-request': '요청 형식 오류', 'other-error': 'API 오류' };
        const when = new Date(Number(snapshot.lastErrorAt)).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
        const reset = Number(snapshot.lastRetryAt) > Date.now() ? ' · 재시도 ' + ao3QuotaCountdown(snapshot.lastRetryAt) : '';
        return '최근 응답: ' + (labels[snapshot.lastCategory] || 'API 응답') + ' (' + (snapshot.lastStatus || '?') + ', ' + when + ')' + reset + (snapshot.lastError ? ' · ' + String(snapshot.lastError).slice(0,140) : '');
      }
      function ao3CaptureGroqQuotaHeaders(headers, model) {
        if (!headers || typeof headers.get !== 'function') return;
        const modelKey = 'groq:' + String(model || '').trim();
        const read = function(name) { const value = headers.get('X-Groq-' + name); return value == null || value === '' ? null : value; };
        const parseHeaderNumber = function(value) { return value === null ? NaN : Number(value); };
        const limitRequests = parseHeaderNumber(read('RateLimit-Limit-Requests'));
        const remainingRequests = parseHeaderNumber(read('RateLimit-Remaining-Requests'));
        const limitTokens = parseHeaderNumber(read('RateLimit-Limit-Tokens'));
        const remainingTokens = parseHeaderNumber(read('RateLimit-Remaining-Tokens'));
        const parseReset = function(value) {
          if (!value) return null;
          let ms = 0; const re = /(\d+(?:\.\d+)?)(ms|d|h|m|s)/g; let match;
          while ((match = re.exec(String(value)))) {
            const unit = match[2]; const multiplier = unit === 'd' ? 86400000 : unit === 'h' ? 3600000 : unit === 'm' ? 60000 : unit === 's' ? 1000 : 1;
            ms += Number(match[1]) * multiplier;
          }
          if (!ms && Number.isFinite(Number(value))) ms = Number(value) * 1000;
          return ms > 0 ? Date.now() + Math.min(ms, 7 * 86400000) : null;
        };
        if (Number.isFinite(limitRequests) && limitRequests > 0 && Number.isFinite(remainingRequests)) {
          const store = ao3LoadQuotaStore();
          const previous = store.snapshots[modelKey] || {};
          const snapshot = Object.assign({}, previous, {
            requestLimit: limitRequests, requestsRemaining: Math.max(0, remainingRequests),
            requestResetAt: parseReset(read('RateLimit-Reset-Requests')),
            tokenLimit: Number.isFinite(limitTokens) && limitTokens > 0 ? limitTokens : null,
            tokensRemaining: Number.isFinite(remainingTokens) ? Math.max(0, remainingTokens) : null,
            tokenResetAt: parseReset(read('RateLimit-Reset-Tokens')),
            model: String(model || '').trim(), observedAt: Date.now()
          });
          store.snapshots[modelKey] = snapshot;
          store.snapshots.groq = Object.assign({}, snapshot);
          ao3SaveQuotaStore(store);
          ao3RefreshProviderQuotaDashboard();
        }
      }
      function ao3CaptureGeminiQuotaFailure(payload, model, keyIndex) {
        const details = payload && payload.error && Array.isArray(payload.error.details) ? payload.error.details : [];
        let dailyLimit = null;
        let quotaId = '';
        details.forEach(function(detail) {
          const violations = detail && Array.isArray(detail.violations) ? detail.violations : [];
          violations.forEach(function(violation) {
            const id = String(violation.quotaId || violation.quotaMetric || '');
            const value = Number(violation.quotaValue || violation.limit || 0);
            if (/per.?day|perday|requests.?per.?day|daily/i.test(id) && Number.isFinite(value) && value > 0) { dailyLimit = value; quotaId = id; }
          });
        });
        if (dailyLimit) ao3SaveQuotaSnapshot('gemini', { model: String(model || ''), dailyLimit: dailyLimit, quotaId: quotaId, quotaHitAt: Date.now(), keySlot: Number(keyIndex) + 1 });
      }
      function ao3GeminiCooldownStorageKey(apiKey, model) {
        let fingerprint = 2166136261;
        String(apiKey || '').split('').forEach(function(character) { fingerprint = Math.imul(fingerprint ^ character.charCodeAt(0), 16777619); });
        return String(model || '') + ':' + (fingerprint >>> 0).toString(36);
      }
      const AO3_GEMINI_KEY_IDENTITIES_KEY = 'ao3-gemini-key-identities-v1';
      function ao3GeminiKeyFingerprint(apiKey) {
        let hash = 2166136261;
        String(apiKey || '').trim().split('').forEach(function(character) { hash = Math.imul(hash ^ character.charCodeAt(0), 16777619); });
        return 'gk-' + (hash >>> 0).toString(36);
      }
      function ao3GetGeminiKeyIdentity(apiKey) {
        const fingerprint = ao3GeminiKeyFingerprint(apiKey);
        let registry = state.settings.geminiKeyIdentityRegistry && typeof state.settings.geminiKeyIdentityRegistry === 'object' ? state.settings.geminiKeyIdentityRegistry : {};
        let changed = false;
        try {
          const localRegistry = JSON.parse(localStorage.getItem(AO3_GEMINI_KEY_IDENTITIES_KEY) || '{}') || {};
          if (!registry.ids && localRegistry.ids) { registry = localRegistry; changed = true; }
          else if (localRegistry.ids) Object.keys(localRegistry.ids).forEach(function(key) { if (!registry.ids || !registry.ids[key]) { registry.ids = registry.ids || {}; registry.ids[key] = localRegistry.ids[key]; changed = true; } });
        } catch (ignoreGeminiIdentityRead) {}
        if (!registry.ids || typeof registry.ids !== 'object') { registry.ids = {}; changed = true; }
        if (!Number.isFinite(Number(registry.nextId)) || Number(registry.nextId) < 1) { registry.nextId = 1; changed = true; }
        Object.keys(registry.ids).forEach(function(key) {
          const nextId = Math.max(Number(registry.nextId) || 1, Number(registry.ids[key]) + 1 || 1);
          if (nextId !== Number(registry.nextId)) { registry.nextId = nextId; changed = true; }
        });
        if (!registry.ids[fingerprint]) { registry.ids[fingerprint] = Number(registry.nextId++); changed = true; }
        state.settings.geminiKeyIdentityRegistry = registry;
        try { localStorage.setItem(AO3_GEMINI_KEY_IDENTITIES_KEY, JSON.stringify(registry)); } catch (ignoreGeminiIdentityWrite) {}
        if (changed) {
          try { saveSettingsToStorage(); if (typeof scheduleDriveUserPreferencesSync === 'function') scheduleDriveUserPreferencesSync(); } catch (ignoreGeminiIdentityPersist) {}
        }
        return { fingerprint: fingerprint, id: Number(registry.ids[fingerprint]) };
      }
      function ao3EnsureGeminiSpecialListSlots(list) {
        if (!list || String(list.id) === 'gemini-list-default') return;
        if (!list.keySlots || typeof list.keySlots !== 'object') list.keySlots = {};
        let nextSlot = Number(list.nextKeySlot);
        if (!Number.isInteger(nextSlot) || nextSlot < 1) nextSlot = 1;
        // Keep slot numbers unique and never reuse a slot that still exists in the
        // persisted map, including keys removed from the visible list.
        Object.keys(list.keySlots).forEach(function(fingerprint) {
          const storedSlot = Number(list.keySlots[fingerprint]);
          if (Number.isInteger(storedSlot) && storedSlot > 0) nextSlot = Math.max(nextSlot, storedSlot + 1);
        });
        const usedSlots = new Set();
        (Array.isArray(list.keys) ? list.keys : []).forEach(function(key) {
          const fingerprint = ao3GeminiKeyFingerprint(key);
          const storedSlot = Number(list.keySlots[fingerprint]);
          if (Number.isInteger(storedSlot) && storedSlot > 0 && !usedSlots.has(storedSlot)) {
            usedSlots.add(storedSlot);
            nextSlot = Math.max(nextSlot, storedSlot + 1);
            return;
          }
          while (usedSlots.has(nextSlot)) nextSlot++;
          list.keySlots[fingerprint] = nextSlot;
          usedSlots.add(nextSlot);
          nextSlot++;
        });
        list.nextKeySlot = Math.max(nextSlot, Number(list.nextKeySlot) || 1);
      }
      function ao3NormalizeGeminiKeyLists() {
        let lists = Array.isArray(state.settings.geminiKeyLists) ? state.settings.geminiKeyLists : [];
        const usedIds = new Set();
        lists = lists.filter(function(list) { return list && typeof list === 'object'; }).map(function(list, index) {
          const keys = Array.isArray(list.keys) ? list.keys : String(list.keys || '').split(/[\r\n,;]+/);
          let id = String(list.id || ('gemini-list-' + (index + 1)));
          // IDs are embedded into option value attributes. Normalize imported IDs to a
          // safe stable alphabet and repair duplicates so lists cannot cross-edit.
          if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) id = 'gemini-list-' + (index + 1);
          if (usedIds.has(id)) id = 'gemini-list-' + Date.now().toString(36) + '-' + (index + 1);
          while (usedIds.has(id)) id += '-x';
          usedIds.add(id);
          const normalized = { id: id, name: String(list.name || ('키 목록 ' + (index + 1))).trim() || ('키 목록 ' + (index + 1)), keys: Array.from(new Set(keys.map(function(item) { return typeof item === 'string' ? item.trim() : String(item && item.key || '').trim(); }).filter(Boolean))), keySlots: list.keySlots && typeof list.keySlots === 'object' ? list.keySlots : {}, nextKeySlot: Number(list.nextKeySlot) || 1 };
          ao3EnsureGeminiSpecialListSlots(normalized);
          return normalized;
        });
        if (!lists.length) {
          const legacy = String(state.settings.geminiApiKeys || state.settings.geminiApiKey || '').split(/[\r\n,;]+/).map(function(key) { return key.trim(); }).filter(Boolean);
          lists = [{ id: 'gemini-list-default', name: '기본 목록', keys: Array.from(new Set(legacy)) }];
        }
        // A list name is part of the visible key label, so duplicate names would make
        // labels ambiguous (for example, key 20-Backup-1 in two different lists).
        const usedNames = new Set();
        lists.forEach(function(list) {
          const baseName = String(list.name || 'Gemini 키 목록').trim() || 'Gemini 키 목록';
          let uniqueName = baseName;
          let suffix = 2;
          while (usedNames.has(uniqueName.toLocaleLowerCase())) uniqueName = baseName + ' (' + suffix++ + ')';
          list.name = uniqueName;
          usedNames.add(uniqueName.toLocaleLowerCase());
        });
        let activeId = String(state.settings.activeGeminiKeyListId || '');
        if (!lists.some(function(list) { return list.id === activeId; })) activeId = lists[0].id;
        state.settings.geminiKeyLists = lists;
        state.settings.activeGeminiKeyListId = activeId;
        const active = lists.find(function(list) { return list.id === activeId; }) || lists[0];
        state.settings.geminiApiKeys = active.keys.join('\n');
        state.settings.geminiApiKey = active.keys[0] || '';
        return lists;
      }
      function ao3ActiveGeminiKeyList() {
        const lists = ao3NormalizeGeminiKeyLists();
        return lists.find(function(list) { return list.id === state.settings.activeGeminiKeyListId; }) || lists[0];
      }
      function ao3SnapshotGeminiKeyList(list) {
        if (!list || typeof list !== 'object') return null;
        return {
          id: String(list.id || ''),
          name: String(list.name || ''),
          keys: Array.isArray(list.keys) ? list.keys.slice() : [],
          keySlots: Object.assign({}, list.keySlots || {}),
          nextKeySlot: Number(list.nextKeySlot) || 1
        };
      }
      function ao3GeminiKeyDisplayLabel(apiKey, activeList) {
        const identity = ao3GetGeminiKeyIdentity(apiKey);
        const lists = ao3NormalizeGeminiKeyLists();
        const list = activeList || lists.find(function(candidate) { return candidate.id === state.settings.activeGeminiKeyListId; });
        const key = String(apiKey || '').trim();
        const keys = list && Array.isArray(list.keys) ? list.keys : [];
        const index = keys.indexOf(key);
        const isDefault = !list || String(list.id) === 'gemini-list-default';
        if (isDefault || index < 0) return { fingerprint: identity.fingerprint, id: identity.id, label: 'Gemini 키 ' + identity.id, baseLabel: '키 ' + identity.id };
        ao3EnsureGeminiSpecialListSlots(list);
        const slot = Number(list.keySlots[identity.fingerprint]) || index + 1;
        return { fingerprint: identity.fingerprint, id: identity.id, label: '키 ' + identity.id + '-' + list.name + '-' + slot, baseLabel: '키 ' + identity.id, listSlot: slot };
      }
      function ao3RenderGeminiKeyListManager() {
        const select = document.getElementById('geminiKeyListSelect');
        const nameInput = document.getElementById('geminiKeyListNameInput');
        const keysInput = document.getElementById('geminiKeyListKeysInput');
        const list = ao3ActiveGeminiKeyList();
        if (!select || !nameInput || !keysInput || !list) return;
        select.innerHTML = state.settings.geminiKeyLists.map(function(item) { return '<option value="' + item.id.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;') + '">' + item.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</option>'; }).join('');
        select.value = list.id; nameInput.value = list.name; keysInput.value = list.keys.join('\n');
        window._ao3GeminiEditingListId = list.id;
        const count = document.getElementById('geminiKeyListCount');
        if (count) count.textContent = list.keys.length + '개 키 · 특별 목록에서는 키 고유번호-' + list.name + '-목록 내 고정 번호 형식으로 표시';
      }
      function ao3WriteGeminiKeyListInputsToList(list) {
        const nameInput = document.getElementById('geminiKeyListNameInput');
        const keysInput = document.getElementById('geminiKeyListKeysInput');
        if (!list || !nameInput || !keysInput) return false;
        list.name = nameInput.value.trim() || 'Gemini 키 목록';
        list.keys = Array.from(new Set(keysInput.value.split(/[\r\n,;]+/).map(function(key) { return key.trim(); }).filter(Boolean)));
        ao3EnsureGeminiSpecialListSlots(list);
        return true;
      }
      function ao3SaveActiveGeminiKeyListFromInputs(silent) {
        const editingId = window._ao3GeminiEditingListId || state.settings.activeGeminiKeyListId;
        const list = (state.settings.geminiKeyLists || []).find(function(item) { return item.id === editingId; });
        if (!ao3WriteGeminiKeyListInputsToList(list)) return false;
        state.settings.activeGeminiKeyListId = list.id;
        ao3NormalizeGeminiKeyLists(); saveSettingsToStorage();
        syncSettingsDriveVaultBackup(); ao3RenderGeminiKeyListManager();
        const apiKeysInput = document.getElementById('geminiApiKeysInput');
        if (apiKeysInput) apiKeysInput.value = state.settings.geminiApiKeys;
        ao3RefreshGeminiCooldownPanel(); ao3RefreshProviderQuotaDashboard();
        if (!silent) showToast('Gemini 키 목록을 저장했습니다. 암호화 Drive 백업이 잠금 해제되어 있으면 자동 갱신됩니다.');
        return true;
      }
      function ao3SetGeminiNextKeyIndex(index, keyCount) {
        const count = Math.max(1, Number(keyCount) || 1);
        const next = ((Math.floor(Number(index) || 0) % count) + count) % count;
        window._ao3GeminiNextKeyIndex = next;
        try { localStorage.setItem('ao3-gemini-next-key-index-v1', String(next)); } catch (ignoreGeminiCursorWrite) {}
      }
      function ao3FormatGeminiCooldownRemaining(milliseconds) {
        let seconds = Math.max(0, Math.ceil(Number(milliseconds || 0) / 1000));
        const days = Math.floor(seconds / 86400); seconds %= 86400;
        const hours = Math.floor(seconds / 3600); seconds %= 3600;
        const minutes = Math.floor(seconds / 60); seconds %= 60;
        const pieces = [];
        if (days) pieces.push(days + '일');
        if (hours || days) pieces.push(hours + '시간');
        if (minutes || hours || days) pieces.push(minutes + '분');
        pieces.push(seconds + '초');
        return pieces.join(' ');
      }
      function ao3RefreshGeminiCooldownPanel() {
        const host = document.getElementById('geminiCooldownKeyRows');
        if (!host) return;
        const modal = document.getElementById('apiSettingsModal');
        const isOpen = Boolean(modal && !modal.classList.contains('hidden'));
        const keysControl = document.getElementById('geminiApiKeysInput');
        const modelControl = document.getElementById('geminiModelSelect');
        const rawKeys = String((isOpen && keysControl ? keysControl.value : (state.settings.geminiApiKeys || state.settings.geminiApiKey || '')) || '');
        const keys = Array.from(new Set(rawKeys.split(/[\r\n,;]+/).map(function(key) { return key.trim(); }).filter(Boolean)));
        const model = normalizeGeminiModel((isOpen && modelControl ? modelControl.value : state.settings.geminiModel) || DEFAULT_GEMINI_MODEL);
        const enabledControl = document.getElementById('geminiCooldownEnabledInput');
        const enabled = enabledControl ? enabledControl.checked : state.settings.geminiCooldownEnabled !== false;
        const summary = document.getElementById('geminiCooldownSummary');
        const store = ao3GetGeminiCooldownStore();
        const now = Date.now();
        const activeCount = keys.reduce(function(count, key) { return count + (Number(store[ao3GeminiCooldownStorageKey(key, model)] || 0) > now ? 1 : 0); }, 0);
        if (summary) {
          summary.textContent = !enabled
            ? '냉각 꺼짐 · 키 제한 기록을 우회합니다. 모델 과부하 보호는 별도로 유지됩니다.'
            : activeCount ? activeCount + ' / ' + keys.length + '개 키가 냉각 중 · 남은 시간이 1초마다 갱신됩니다.'
            : '현재 모델 기준으로 냉각 중인 키가 없습니다.';
        }
        if (!keys.length) {
          host.innerHTML = '<p class="rounded-lg border border-slate-200 bg-white/80 p-3 text-xs text-slate-600">등록된 Gemini 키가 없습니다. API 설정 탭에서 키를 추가하세요.</p>';
          return;
        }
        host.innerHTML = keys.map(function(key, index) {
          const until = Number(store[ao3GeminiCooldownStorageKey(key, model)] || 0);
          const remaining = until - now;
          let status;
          let subtext;
          let statusClass;
          if (remaining > 0 && enabled) {
            status = '냉각 중';
            subtext = '재사용까지 ' + ao3FormatGeminiCooldownRemaining(remaining) + ' · ' + new Date(until).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
            statusClass = 'text-rose-700 bg-rose-50 border-rose-200';
          } else if (remaining > 0) {
            status = '냉각 우회 중';
            subtext = '기록상 남은 시간 ' + ao3FormatGeminiCooldownRemaining(remaining) + ' · 설정이 꺼져 있어 자동 제외하지 않음';
            statusClass = 'text-amber-800 bg-amber-50 border-amber-200';
          } else {
            status = '사용 가능';
            subtext = until ? '이전 냉각 시간이 끝났습니다.' : '활성 냉각 기록 없음';
            statusClass = 'text-emerald-800 bg-emerald-50 border-emerald-200';
          }
          const keyDisplay = ao3GeminiKeyDisplayLabel(key, ao3ActiveGeminiKeyList());
          return '<div class="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">' +
            '<div class="min-w-0"><div class="text-xs font-bold text-slate-900">' + keyDisplay.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div><div class="mt-1 text-[11px] leading-relaxed text-slate-500">' + subtext + '</div></div>' +
            '<span class="shrink-0 rounded-lg border px-2 py-1 text-[10px] font-bold ' + statusClass + '">' + status + '</span></div>';
        }).join('');
      }
      function ao3GeminiQuotaCooldown(apiKey, model, payload, headers) {
        const error = payload && payload.error || {};
        const details = Array.isArray(error.details) ? error.details : [];
        const violations = [];
        details.forEach(function(detail) {
          (Array.isArray(detail && detail.violations) ? detail.violations : []).forEach(function(violation) { violations.push(violation); });
        });
        const descriptors = [error.status, error.message].concat(violations.map(function(item) {
          return [item.quotaId, item.quotaMetric, item.description].filter(Boolean).join(' ');
        })).join(' ');
        const isDaily = /per.?day|perday|requests.?per.?day|daily|requests_per_day|quota_exceeded/i.test(descriptors);
        let retryMs = 0;
        const retryHeader = headers && headers.get ? headers.get('Retry-After') : null;
        if (retryHeader) {
          const seconds = Number(retryHeader);
          if (Number.isFinite(seconds) && seconds > 0) retryMs = seconds * 1000;
          else {
            const retryDate = Date.parse(retryHeader);
            if (Number.isFinite(retryDate)) retryMs = retryDate - Date.now();
          }
        }
        if (!retryMs) {
          const retryDetail = details.find(function(detail) { return detail && detail.retryDelay; });
          const rawDelay = retryDetail && String(retryDetail.retryDelay);
          const delayMatch = rawDelay && rawDelay.match(/([0-9]+(?:\.[0-9]+)?)(ms|s|m|h)/i);
          if (delayMatch) retryMs = Number(delayMatch[1]) * ({ ms: 1, s: 1000, m: 60000, h: 3600000 }[delayMatch[2].toLowerCase()]);
        }
        if (!retryMs) {
          const messageDelay = String(error.message || '').match(/retry\s+(?:in\s+)?([0-9]+(?:\.[0-9]+)?)\s*s(?:ec(?:ond)?s?)?/i);
          if (messageDelay) retryMs = Number(messageDelay[1]) * 1000;
        }
        if (isDaily) {
          // Gemini documents RPD reset at midnight Pacific; calculate that boundary with DST.
          const now = Date.now();
          const zone = 'America/Los_Angeles';
          const local = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(now));
          const part = function(type) { return Number(local.find(function(entry) { return entry.type === type; }).value); };
          const nextDay = new Date(Date.UTC(part('year'), part('month') - 1, part('day') + 1));
          const targetUtc = Date.UTC(nextDay.getUTCFullYear(), nextDay.getUTCMonth(), nextDay.getUTCDate());
          const offsetParts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(targetUtc));
          const getPart = function(type) { return Number(offsetParts.find(function(entry) { return entry.type === type; }).value); };
          const representedUtc = Date.UTC(getPart('year'), getPart('month') - 1, getPart('day'), getPart('hour'), getPart('minute'), getPart('second'));
          const dailyResetMs = Math.max(60000, targetUtc - (representedUtc - targetUtc) - now);
          retryMs = Math.max(retryMs, dailyResetMs);
        }
        if (!retryMs) retryMs = 60000;
        // A 429 is an explicit rate/quota signal. Scope it to this key and model only;
        // timeout, abort, network, auth, and server errors never create a cooldown.
        retryMs = Math.max(1000, Math.min(retryMs, 7 * 86400000));
        const cooldownKey = ao3GeminiCooldownStorageKey(apiKey, model);
        return { key: cooldownKey, until: Date.now() + retryMs, retryMs: retryMs, daily: isDaily };
      }
      function ao3GetGeminiCooldownStore() {
        if (window._ao3GeminiKeyCooldownUntil) return window._ao3GeminiKeyCooldownUntil;
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem('ao3-gemini-explicit-quota-cooldowns-v1') || '{}') || {}; } catch (ignoreGeminiCooldownRead) {}
        Object.keys(saved).forEach(function(key) { if (Number(saved[key]) <= Date.now()) delete saved[key]; });
        window._ao3GeminiKeyCooldownUntil = saved;
        return saved;
      }
      function ao3SaveGeminiCooldownStore(cooldowns) {
        try { localStorage.setItem('ao3-gemini-explicit-quota-cooldowns-v1', JSON.stringify(cooldowns || {})); } catch (ignoreGeminiCooldownWrite) {}
      }
      function ao3GetGeminiModelHealthStore() {
        if (window._ao3GeminiModelHealth) return window._ao3GeminiModelHealth;
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem('ao3-gemini-model-health-v1') || '{}') || {}; } catch (ignoreGeminiHealthRead) {}
        window._ao3GeminiModelHealth = saved;
        return saved;
      }
      function ao3SaveGeminiModelHealthStore(health) {
        try { localStorage.setItem('ao3-gemini-model-health-v1', JSON.stringify(health || {})); } catch (ignoreGeminiHealthWrite) {}
      }
      function ao3IsGeminiHighDemand(status, payload) {
        if (Number(status) === 429) return false;
        const error = payload && payload.error || {};
        const signal = [error.status, error.message, payload && payload.message].join(' ').toLowerCase();
        return Number(status) === 503 || /\bUNAVAILABLE\b|experiencing high demand|temporarily overloaded|service unavailable/i.test(signal);
      }
      function ao3MarkGeminiModelOverloaded(model, payload, headers) {
        const health = ao3GetGeminiModelHealthStore();
        const previous = health[model] || {};
        const failures = Math.min(8, Number(previous.overloadFailures || 0) + 1);
        const fallbackMs = Math.min(60 * 60 * 1000, 5 * 60 * 1000 * Math.pow(2, failures - 1));
        const error = payload && payload.error || {};
        const retryHeader = headers && headers.get ? headers.get('Retry-After') : null;
        let retryMs = 0;
        if (retryHeader) {
          const seconds = Number(retryHeader);
          if (Number.isFinite(seconds) && seconds > 0) retryMs = seconds * 1000;
          else { const retryAt = Date.parse(retryHeader); if (Number.isFinite(retryAt)) retryMs = retryAt - Date.now(); }
        }
        if (!retryMs && Array.isArray(error.details)) {
          const retryDetail = error.details.find(function(detail) { return detail && detail.retryDelay; });
          const match = retryDetail && String(retryDetail.retryDelay).match(/([0-9]+(?:\.[0-9]+)?)(ms|s|m|h)/i);
          if (match) retryMs = Number(match[1]) * ({ ms: 1, s: 1000, m: 60000, h: 3600000 }[match[2].toLowerCase()]);
        }
        const cooldownMs = Math.max(fallbackMs, Math.min(retryMs, 60 * 60 * 1000));
        const entry = { until: Date.now() + cooldownMs, overloadFailures: failures, lastOverloadAt: Date.now(), reason: String(error.message || '').slice(0, 220) };
        health[model] = entry;
        ao3SaveGeminiModelHealthStore(health);
        return entry;
      }
      function ao3NextAvailableGeminiModel(model, triedModels) {
        const health = ao3GetGeminiModelHealthStore();
        const tried = new Set(Array.isArray(triedModels) ? triedModels : []);
        const candidates = GEMINI_MODEL_FALLBACKS[model] || Array.from(SUPPORTED_GEMINI_MODELS).filter(function(candidate) { return candidate !== model; });
        return candidates.find(function(candidate) {
          return !tried.has(candidate) && SUPPORTED_GEMINI_MODELS.has(candidate) && Number(health[candidate] && health[candidate].until || 0) <= Date.now();
        }) || '';
      }
      function ao3QuotaCount(provider, startAt, endAt) {
        const store = ao3LoadQuotaStore();
        const events = store.events.filter(function(event) { return event.provider === provider && Number(event.at) >= startAt && Number(event.at) < endAt; });
        return events.reduce(function(result, event) {
          result.requests += Number(event.requests || 0); result.chars += Number(event.chars || 0);
          result.inputTokens += Number(event.inputTokens || 0); result.outputTokens += Number(event.outputTokens || 0);
          return result;
        }, { requests: 0, chars: 0, inputTokens: 0, outputTokens: 0 });
      }
      function ao3QuotaCountModel(provider, model, startAt, endAt) {
        const store = ao3LoadQuotaStore();
        const events = store.events.filter(function(event) { return event.provider === provider && (!model || event.model === model) && Number(event.at) >= startAt && Number(event.at) < endAt; });
        return events.reduce(function(result, event) {
          result.requests += Number(event.requests || 0); result.chars += Number(event.chars || 0);
          result.inputTokens += Number(event.inputTokens || 0); result.outputTokens += Number(event.outputTokens || 0);
          return result;
        }, { requests: 0, chars: 0, inputTokens: 0, outputTokens: 0 });
      }
      function ao3QuotaCountZonedDay(provider, timeZone) {
        const store = ao3LoadQuotaStore(); const today = ao3QuotaDateKey(Date.now(), timeZone);
        const events = store.events.filter(function(event) { return event.provider === provider && ao3QuotaDateKey(Number(event.at), timeZone) === today; });
        return events.reduce(function(result, event) {
          result.requests += Number(event.requests || 0); result.chars += Number(event.chars || 0);
          result.inputTokens += Number(event.inputTokens || 0); result.outputTokens += Number(event.outputTokens || 0);
          return result;
        }, { requests: 0, chars: 0, inputTokens: 0, outputTokens: 0 });
      }
      function ao3QuotaDayStart() { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); }
      function ao3QuotaMonthStart() { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1).getTime(); }
      function ao3QuotaDateKey(timestamp, timeZone) {
        try { return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(timestamp)); }
        catch (ignoreTimezoneFormat) { return new Date(timestamp).toISOString().slice(0, 10); }
      }
      function ao3NextZonedMidnight(timeZone) {
        const now = Date.now(); const currentDay = ao3QuotaDateKey(now, timeZone); let high = now + 36 * 60 * 60 * 1000;
        for (let probe = now + 5 * 60 * 1000; probe <= high; probe += 5 * 60 * 1000) {
          if (ao3QuotaDateKey(probe, timeZone) !== currentDay) { high = probe; break; }
        }
        let low = now;
        while (high - low > 1000) {
          const mid = Math.floor((low + high) / 2);
          if (ao3QuotaDateKey(mid, timeZone) === currentDay) low = mid; else high = mid;
        }
        return high;
      }
      function ao3QuotaCountdown(target) {
        const ms = Number(target) - Date.now();
        if (!Number.isFinite(ms) || ms <= 0) return '곧 리셋';
        const totalMinutes = Math.ceil(ms / 60000); const days = Math.floor(totalMinutes / 1440); const hours = Math.floor((totalMinutes % 1440) / 60); const mins = totalMinutes % 60;
        return (days ? days + '일 ' : '') + (hours ? hours + '시간 ' : '') + mins + '분 후';
      }
      function ao3QuotaFmt(value) { return Math.max(0, Number(value) || 0).toLocaleString('ko-KR'); }
      function ao3QuotaPct(used, limit) { return Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.max(0, Math.min(100, (Number(used) / Number(limit)) * 100)) : null; }
      function ao3QuotaMeter(label, valueText, percent, note) {
        const known = percent !== null && Number.isFinite(Number(percent));
        const pct = known ? Math.max(0, Math.min(100, Number(percent))) : 0;
        return '<div class="quota-meter"><div class="quota-meter-head"><span>' + label + '</span><strong>' + valueText + '</strong></div><div class="quota-meter-track ' + (known ? '' : 'is-unknown') + '" role="img" aria-label="' + label + ': ' + valueText + '"><div class="quota-meter-fill" style="width:' + pct + '%"></div></div><p class="quota-meter-note">' + note + '</p></div>';
      }
      function ao3ProviderQuotaCard(name, configuredText, meters, resetText, note) {
        return '<article class="quota-provider-card"><div class="quota-provider-head"><h5>' + name + '</h5><span>' + configuredText + '</span></div>' + meters + '<div class="quota-reset"><span>리셋</span><strong>' + resetText + '</strong></div><p class="quota-provider-note">' + note + '</p></article>';
      }
      function ao3NextProviderQuotaRefreshAt() {
        const now = Date.now(); const store = ao3LoadQuotaStore(); const candidates = [ao3NextZonedMidnight('America/Los_Angeles'), ao3NextZonedMidnight('UTC'), new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getTime()]; const groq = store.snapshots.groq || {}; [groq.requestResetAt, groq.tokenResetAt].forEach(function(v) { if (Number(v) > now) candidates.push(Number(v)); }); store.events.forEach(function(event) { if (event.provider === 'azure' && Number(event.at) > now - 3600000) candidates.push(Number(event.at) + 3600000); }); return candidates.filter(function(v) { return Number(v) > now; }).sort(function(a,b) { return a-b; })[0] || now + 60000;
      }
      function ao3ScheduleProviderQuotaBoundaryRefresh() { if (providerQuotaBoundaryRefreshTimer) clearTimeout(providerQuotaBoundaryRefreshTimer); const target = ao3NextProviderQuotaRefreshAt(); providerQuotaBoundaryRefreshTimer = setTimeout(function() { providerQuotaBoundaryRefreshTimer = null; const modal = document.getElementById('apiSettingsModal'); if (modal && !modal.classList.contains('hidden')) ao3RefreshProviderQuotaDashboard(); }, Math.max(1000, Math.min(2147483000, target - Date.now() + 150))); }
      function ao3RefreshProviderQuotaDashboard() {
        const host = document.getElementById('providerQuotaCards');
        ao3UpdateProviderQuotaStorageNote();
        if (!host) return;
        const store = ao3LoadQuotaStore();
        const now = Date.now(); const dayStart = ao3QuotaDayStart(); const monthStart = ao3QuotaMonthStart();
        const endFuture = now + 86400000;
        const getStats = function(provider) {
          const resetZone = provider === 'gemini' ? 'America/Los_Angeles' : (provider === 'workers-ai' ? 'UTC' : null);
          return { day: resetZone ? ao3QuotaCountZonedDay(provider, resetZone) : ao3QuotaCount(provider, dayStart, endFuture), month: ao3QuotaCount(provider, monthStart, endFuture), hour: ao3QuotaCount(provider, now - 3600000, endFuture) };
        };
        const apiModal = document.getElementById('apiSettingsModal');
        const apiSettingsOpen = apiModal && !apiModal.classList.contains('hidden');
        const geminiInput = document.getElementById('geminiApiKeysInput');
        const geminiKeys = String((apiSettingsOpen && geminiInput ? geminiInput.value : (state.settings.geminiApiKeys || state.settings.geminiApiKey || '')) || '').split(/[\r\n,;]+/).map(function(value) { return value.trim(); }).filter(Boolean);
        const groqInput = document.getElementById('groqApiKeyInput');
        const groqModelInput = document.getElementById('groqModelInput');
        const groqModel = String((apiSettingsOpen && groqModelInput ? groqModelInput.value : state.settings.groqModel) || 'openai/gpt-oss-120b').trim();
        const groqHasKey = Boolean(String((apiSettingsOpen && groqInput ? groqInput.value : state.settings.groqApiKey) || '').trim() || (window._ao3CloudflareServerProviders && window._ao3CloudflareServerProviders.groq));
        const azureInput = document.getElementById('azureApiKeyInput');
        const azureHasKey = Boolean(String((apiSettingsOpen && azureInput ? azureInput.value : state.settings.azureApiKey) || '').trim() || (window._ao3CloudflareServerProviders && window._ao3CloudflareServerProviders.azure));
        const workersReady = Boolean(window._ao3CloudflareServerProviders && window._ao3CloudflareServerProviders.workersAI);
        const model = String((document.getElementById('geminiModelSelect') && apiSettingsOpen ? document.getElementById('geminiModelSelect').value : state.settings.geminiModel) || DEFAULT_GEMINI_MODEL);
        const gemini = getStats('gemini'); const workers = getStats('workers-ai'); const groq = getStats('groq'); const groqModelDay = ao3QuotaCountModel('groq', groqModel, dayStart, endFuture); const groqModelMonth = ao3QuotaCountModel('groq', groqModel, monthStart, endFuture); const azure = getStats('azure');
        const geminiSnap = store.snapshots.gemini || {};
        const geminiLimit = geminiKeys.length === 1 && geminiSnap.model === model && Number(geminiSnap.dailyLimit) > 0 && Number(geminiSnap.observedAt) > now - 30 * 86400000 ? Number(geminiSnap.dailyLimit) : null;
        const geminiPct = geminiLimit ? ao3QuotaPct(gemini.day.requests, geminiLimit) : null;
        const geminiDailyValue = geminiLimit ? ao3QuotaFmt(gemini.day.requests) + ' / ' + ao3QuotaFmt(geminiLimit) + '건 사용 · 앱 기준 잔여 상한 ' + ao3QuotaFmt(Math.max(0, geminiLimit - gemini.day.requests)) : ao3QuotaFmt(gemini.day.requests) + '건 관측 · 한도 미조회';
        const geminiDailyNote = (geminiLimit ? '마지막 429 응답에서 확인한 프로젝트 모델 한도입니다. 앱 밖 사용량은 빠질 수 있습니다.' : (geminiKeys.length > 1 ? '여러 키가 같은 Google 프로젝트인지 자동 판별할 수 없어 전체 한도의 비율은 표시하지 않습니다.' : '정확한 RPD는 모델·프로젝트 등급별로 다르며 API에서 조회할 수 없습니다. AI Studio에서 확인하세요.')) + ' ' + ao3QuotaErrorNote('gemini');
        const geminiCard = ao3ProviderQuotaCard('Gemini', geminiKeys.length ? '등록 키 ' + geminiKeys.length + '개' : '키 미등록',
          ao3QuotaMeter('일일 요청(RPD)', geminiDailyValue, geminiPct, geminiDailyNote) + ao3QuotaMeter('월간 앱 사용량', ao3QuotaFmt(gemini.month.requests) + '회 · ' + ao3QuotaFmt(gemini.month.chars) + '자', null, '월간 할당량은 API에서 제공되지 않음 · 요청은 프로젝트 단위로 제한됩니다.'),
          '태평양 자정까지 ' + ao3QuotaCountdown(ao3NextZonedMidnight('America/Los_Angeles')),
          '<a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">Google AI Studio에서 실시간 한도 확인 ↗</a>');

        const workersCard = ao3ProviderQuotaCard('Cloudflare Workers AI', workersReady ? '바인딩 연결됨' : '바인딩 상태 확인 필요',
          ao3QuotaMeter('일일 무료 할당량', '10,000 Neurons/일 · 앱 요청 ' + ao3QuotaFmt(workers.day.requests) + '회 · 실제 Neurons 미조회', null, 'Worker AI 바인딩은 계정 전체에서 사용된 Neurons 수를 응답하지 않습니다. 막대 퍼센트와 잔여량은 임의로 추정하지 않습니다. ' + ao3QuotaErrorNote('workers-ai')) + ao3QuotaMeter('월간 앱 사용량', ao3QuotaFmt(workers.month.requests) + '회 · ' + ao3QuotaFmt(workers.month.chars) + '자', null, '월간 고정 Neurons 한도 없음 · 유료 계정은 무료 일일 할당량 초과 사용분이 과금될 수 있습니다.'),
          'UTC 자정까지 ' + ao3QuotaCountdown(ao3NextZonedMidnight('UTC')),
          '<a href="https://developers.cloudflare.com/workers-ai/platform/pricing/" target="_blank" rel="noopener noreferrer">공식 할당량·요금 확인 ↗</a>');

        const groqSnap = store.snapshots['groq:' + groqModel] || store.snapshots.groq || {};
        const groqSnapFresh = Number(groqSnap.observedAt) > now - 7 * 86400000;
        const groqLimit = groqSnapFresh && Number(groqSnap.requestLimit) > 0 ? Number(groqSnap.requestLimit) : null;
        const groqRemain = groqLimit !== null ? Number(groqSnap.requestsRemaining) : null;
        const groqDailyUsed = groqLimit !== null ? Math.max(0, groqLimit - groqRemain) : groqModelDay.requests;
        const groqDailyText = groqLimit !== null ? ao3QuotaFmt(groqRemain) + ' / ' + ao3QuotaFmt(groqLimit) + '회 남음' : ao3QuotaFmt(groqModelDay.requests) + '회 관측 · 모델 한도 미수신';
        const groqDailyNote = groqLimit !== null ? '선택 모델의 마지막 Groq 응답에서 받은 RPD 헤더입니다. 조직의 다른 사용량이 포함될 수 있습니다. 마지막 관측 ' + ao3QuotaCountdown(now + Math.max(0, 7 * 86400000 - (now - Number(groqSnap.observedAt)))) + ' 만료.' : '번역 요청 응답에 한도 헤더가 포함되면 선택 모델 기준으로 자동 표시됩니다. 현재는 이 앱의 요청 수만 집계합니다.';
        const groqReset = groqSnapFresh && Number(groqSnap.requestResetAt) > now ? ao3QuotaCountdown(groqSnap.requestResetAt) : '다음 Groq 응답 헤더에서 확인';
        const groqCard = ao3ProviderQuotaCard('Groq', groqHasKey ? '키 등록됨' : '키 미등록',
          ao3QuotaMeter('일일 요청(RPD)', groqDailyText, groqLimit !== null ? ao3QuotaPct(groqDailyUsed, groqLimit) : null, groqDailyNote) + ao3QuotaMeter('분당 토큰(TPM)', groqSnapFresh && Number(groqSnap.tokenLimit) > 0 ? ao3QuotaFmt(groqSnap.tokensRemaining) + ' / ' + ao3QuotaFmt(groqSnap.tokenLimit) + ' 토큰 남음' : '한도 헤더 미수신', groqSnapFresh && Number(groqSnap.tokenLimit) > 0 ? ao3QuotaPct(Number(groqSnap.tokenLimit) - Number(groqSnap.tokensRemaining), Number(groqSnap.tokenLimit)) : null, 'TPM 제한은 RPD와 별도로 적용됩니다. ' + ao3QuotaErrorNote('groq')) + ao3QuotaMeter('월간 앱 사용량', ao3QuotaFmt(groqModelMonth.requests) + '회 · ' + ao3QuotaFmt(groqModelMonth.chars) + '자', null, '선택 모델(' + groqModel + ')의 월간 앱 관측량입니다. 모델별 제한과 조직 전체 한도를 함께 확인하세요.'),
          groqReset,
          '<a href="https://console.groq.com/settings/limits" target="_blank" rel="noopener noreferrer">Groq 한도 ↗</a>');

        const tierSelect = document.getElementById('azureQuotaTierInput');
        let tier = String((tierSelect && apiSettingsOpen ? tierSelect.value : state.settings.azureQuotaTier) || 'unknown');
        const tierConfig = {
          F0: { hour: 2000000, month: 2000000, label: 'F0 무료' },
          S1: { hour: 40000000, month: null, label: 'S1 종량제' },
          S2: { hour: 40000000, month: 250000000, label: 'S2 약정' },
          S3: { hour: 120000000, month: 1000000000, label: 'S3 약정' },
          S4: { hour: 200000000, month: 10000000000, label: 'S4 약정' }
        };
        const tierInfo = tierConfig[tier] || null;
        const azureHour = ao3QuotaCount('azure', now - 3600000, endFuture);
        const azureDailyPct = tierInfo ? ao3QuotaPct(azureHour.chars, tierInfo.hour) : null;
        const azureMonthlyPct = tierInfo && tierInfo.month ? ao3QuotaPct(azure.month.chars, tierInfo.month) : null;
        const azureHourOldest = ao3LoadQuotaStore().events.filter(function(event) { return event.provider === 'azure' && Number(event.at) > now - 3600000 && Number(event.chars) > 0; }).sort(function(a, b) { return Number(a.at) - Number(b.at); })[0];
        const azureHourReset = azureHourOldest ? '기록이 빠지는 데 최대 ' + ao3QuotaCountdown(Number(azureHourOldest.at) + 3600000) : '활성 시간 기록 없음';
        const azureMonthReset = '달력월 기준 ' + ao3QuotaCountdown(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getTime()) + ' (청구 주기와 다를 수 있음)';
        const azureDailyText = tierInfo ? ao3QuotaFmt(azureHour.chars) + ' / ' + ao3QuotaFmt(tierInfo.hour) + '자 사용 · 앱 기준 잔여 상한 ' + ao3QuotaFmt(Math.max(0, tierInfo.hour - azureHour.chars)) : ao3QuotaFmt(azureHour.chars) + '자 관측 · 계층 미선택';
        const azureMonthlyText = tierInfo && tierInfo.month ? ao3QuotaFmt(azure.month.chars) + ' / ' + ao3QuotaFmt(tierInfo.month) + '자 사용 · 앱 기준 잔여 상한 ' + ao3QuotaFmt(Math.max(0, tierInfo.month - azure.month.chars)) : ao3QuotaFmt(azure.month.chars) + '자 관측 · 월 한도 미정';
        const azureNote = tierInfo ? '선택한 계층: ' + tierInfo.label + '. 잔여 상한은 이 브라우저에서 관측한 사용량만 뺀 값입니다. 실제 계정 잔여량은 청구/다른 앱 사용 때문에 더 적을 수 있습니다.' : 'Azure 키만으로 계층을 판별할 수 없습니다. 위 Azure 카드에서 정확한 계층을 선택해야 막대 비율을 계산합니다.';
        const azureCard = ao3ProviderQuotaCard('Azure Translator', azureHasKey ? '키 등록됨' : '키 미등록',
          ao3QuotaMeter('시간당 문자 제한', azureDailyText, azureDailyPct, azureNote) + ao3QuotaMeter('월간 문자 할당량', azureMonthlyText, azureMonthlyPct, tierInfo && tierInfo.month ? '월간 무료/약정 포함량 기준. 사용량은 이 브라우저에서 성공한 Azure 번역 요청만 집계합니다. ' + ao3QuotaErrorNote('azure') : 'S1 종량제는 고정 월간 무료 할당량이 없습니다. 선택 계층에 따른 별도 청구가 적용됩니다. ' + ao3QuotaErrorNote('azure')),
          (tierInfo && tierInfo.month ? azureMonthReset + ' · ' : '') + azureHourReset,
          '<a href="https://learn.microsoft.com/ko-kr/azure/ai-services/Translator/service-limits" target="_blank" rel="noopener noreferrer">Azure 시간당 한도 ↗</a> · <a href="https://azure.microsoft.com/ko-kr/pricing/details/translator/" target="_blank" rel="noopener noreferrer">가격·월간 포함량 ↗</a>');
        host.innerHTML = geminiCard + workersCard + groqCard + azureCard;
        const keyUsageHost = document.getElementById('geminiKeyUsageRows');
        if (keyUsageHost) {
          const activeList = ao3ActiveGeminiKeyList();
          const activeKeys = activeList && Array.isArray(activeList.keys) ? activeList.keys : geminiKeys;
          const events = store.events.filter(function(event) { return event.provider === 'gemini'; });
          if (!activeKeys.length) keyUsageHost.innerHTML = '<p class="text-xs text-slate-500">Gemini 키가 등록되지 않았습니다.</p>';
          else keyUsageHost.innerHTML = activeKeys.map(function(key) {
            const identity = ao3GetGeminiKeyIdentity(key);
            const display = ao3GeminiKeyDisplayLabel(key, activeList);
            const mine = events.filter(function(event) { return event.keyFingerprint === identity.fingerprint; });
            const resetZone = 'America/Los_Angeles';
            const todayKey = ao3QuotaDateKey(now, resetZone);
            const today = mine.filter(function(event) { return ao3QuotaDateKey(Number(event.at), resetZone) === todayKey; }).length;
            const month = mine.filter(function(event) { return Number(event.at) >= monthStart; }).length;
            const resetAt = ao3NextZonedMidnight(resetZone);
            return '<div class="flex items-center justify-between gap-3 rounded-lg border border-rose-100 bg-white p-2.5"><div class="min-w-0"><div class="text-xs font-bold text-slate-900">' + display.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + ' <span class="font-normal text-slate-500">(기본 번호 ' + identity.id + ')</span></div><div class="mt-1 text-[10px] text-slate-500">할당량 일일 요청 ' + ao3QuotaFmt(today) + '회 · 리셋까지 ' + ao3QuotaCountdown(resetAt) + ' · 이번 달 ' + ao3QuotaFmt(month) + '회</div></div><strong class="shrink-0 text-sm text-rose-800">' + ao3QuotaFmt(mine.length) + '회 누적</strong></div>';
          }).join('');
        }
        ao3ScheduleProviderQuotaBoundaryRefresh();
      }

      // Default starter novel so the user can immediately test the viewer, bookmarks, tags, and chapter binding
      const DEFAULT_NOVELS = [
        {
          id: 'novel_sample_1',
          title: '[샘플] 별빛이 머무는 도서관의 기록',
          author: 'Astoria_Writes',
          fandom: '오리지널 판타지 · 단편선',
          summary: 'AO3에서 가져와 한국어로 번역하고 두 개의 챕터를 한 권의 소설로 묶은 예시 작품입니다. 클릭해서 웹 뷰어와 문단별 북마크·태그 기능을 체험해 보세요.',
          bookmarked: false,
          bookmarkTags: [],
          bookmarkNote: '언제든 삭제하거나 새 챕터를 이어붙일 수 있습니다.',
          createdAt: Date.now() - 86400000,
          lastReadAt: Date.now() - 3600000,
          lastReadChapterIndex: 0,
          chapters: [
            {
              id: 'ch_sample_101',
              title: 'Chapter 1: 자정에 열리는 서가',
              sourceUrl: 'https://archiveofourown.org/works/0000001',
              paragraphs: [
                {
                  id: 'p_101_1',
                  en: 'The rain had been tapping against the tall arched windows of the archive for three hours before Julian finally found the ledger.',
                  ko: '줄리언이 마침내 그 장부를 찾아내기 전까지, 빗방울은 세 시간째 기록보관소의 높다란 아치형 창문을 두드리고 있었다.',
                  bookmarked: false,
                  tags: [],
                  note: ''
                },
                {
                  id: 'p_101_2',
                  en: 'Every book on the third-floor gallery was bound in faded linen, unmarked on the spine, waiting for a reader who knew the proper title to call it by.',
                  ko: '3층 회랑에 꽂힌 모든 책은 빛바랜 리넨으로 제본되어 있었고 책등에는 아무런 표식도 없었으며, 오직 올바른 제목을 불러줄 독자만을 기다리고 있었다.',
                  bookmarked: false,
                  tags: [],
                  note: ''
                },
                {
                  id: 'p_101_3',
                  en: '"You are late," said the archivist without looking up from her lantern. "The ink dries faster on nights like this."',
                  ko: '"늦었군요." 기록관이 랜턴에서 눈을 떼지 않은 채 말했다. "이런 밤에는 잉크가 평소보다 더 빨리 마른답니다."',
                  bookmarked: false,
                  tags: [],
                  note: ''
                }
              ]
            },
            {
              id: 'ch_sample_102',
              title: 'Chapter 2: 이름이 붙여진 페이지',
              sourceUrl: 'https://archiveofourown.org/works/0000001/chapters/2',
              paragraphs: [
                {
                  id: 'p_102_1',
                  en: 'When the loose chapters were gathered and stitched into a single volume, the scattered memories began to make sense as one continuous story.',
                  ko: '흩어져 있던 챕터들을 모아 한 권의 책으로 엮어내자, 조각나 있던 기억들이 비로소 하나의 이어진 이야기로 의미를 갖기 시작했다.',
                  bookmarked: false,
                  tags: [],
                  note: ''
                },
                {
                  id: 'p_102_2',
                  en: 'He placed a small brass bookmark between the pages and wrote a single tag on the margin so he could always return to this exact moment.',
                  ko: '그는 페이지 사이에 작은 황동 책갈피를 끼워 넣고, 언제든 이 순간으로 다시 돌아올 수 있도록 여백에 짧은 태그 하나를 적어 두었다.',
                  bookmarked: false,
                  tags: [],
                  note: ''
                }
              ]
            }
          ]
        }
      ];

      // Application State
      const state = {
        currentView: 'bookshelf', // 'bookshelf' | 'customBookshelves' | 'studio' | 'bookmarks' | 'reader'
        customShelves: [],
        selectedCustomShelfId: 'all',
        novels: [],
        draftChapters: [], // Chapters staged in Studio before binding into a novel
        studioInputMethod: 'url', // 'url' | 'paste'
        studioBindMode: 'new', // 'new' | 'append'
        shelfFilter: {
          search: '',
          onlyBookmarked: false,
          selectedTag: null,
          sortBy: 'recentRead'
        },
        bookmarkManagerFilter: {
          subTab: 'all',
          selectedTag: null
        },
        customShelfTagFilter: null,
        customShelfSearchQuery: '',
        reader: {
          novelId: null,
          chapterIndex: 0,
          bilingual: false,
          showOriginalDialogue: false,
          theme: 'dark', // default reading canvas is deep navy dark
          font: 'sans', // 독서 글꼴은 고딕으로 고정
          fontSize: 14,
          fontFamily: 'noto',
          fontWeight: 400,
          horizontalPadding: 25,
          lineHeightPx: 20,
          paragraphSpacingPx: 5,
          firstLineIndentPx: 0
        },
        settings: {
          engine: 'gemini_api',
          geminiModel: DEFAULT_GEMINI_MODEL,
          geminiApiKey: '',
          geminiApiKeys: '',
          geminiKeyLists: [],
          activeGeminiKeyListId: '',
          geminiKeyIdentityRegistry: { ids: {}, nextId: 1 },
          geminiCooldownEnabled: true,
          qualityParagraphCountEnabled: true,
          qualityEnglishResidueEnabled: true,
          azureApiKey: '',
          azureRegion: '',
          azureEnabled: true,
          groqApiKey: '',
          groqModel: 'openai/gpt-oss-120b',
          groqEnabled: true,
          workersAiEnabled: true,
          workersAiModel: '@cf/zai-org/glm-4.7-flash',
          translationPrompt: DEFAULT_TRANSLATION_PROMPT,
          glossary: 'AO3=AO3\nArchive=기록보관소',
          textReplacements: '',
          characterStyleRules: '',
          googleClientId: DEFAULT_GOOGLE_CLIENT_ID
        },
        deletedNovelIds: {},
        drive: {
          accessToken: '',
          tokenExpiresAt: 0,
          folderId: '',
          syncing: false,
          lastSyncAt: 0
        },
        // Modal targets
        bookmarkModalTarget: null, // novel | paragraph | sentence bookmark target
        modalTempTags: [],
        editingNovelId: null,
        editingChapterTarget: null,
        deleteTarget: null // { type: 'novel', novelId } | { type: 'chapter', novelId, chapterId, chapterIndex }
      };

      function ao3FunctionUrl(name) {
        const safeName = String(name || '').replace(/^\/+|\/+$/g, '');
        const allowed = ['groq-translate', 'azure-translate', 'workers-ai-translate', 'status', 'ao3-fetch'];
        if (allowed.indexOf(safeName) === -1) throw new Error('Unknown API route.');
        return '/api/' + safeName;
      }

      window._ao3CloudflareServerProviders = { groq: false, azure: false, workersAI: false };
      window._ao3CloudflareProviderConfigReady = false;
      let _ao3CloudflareConfigPromise = null;
      async function refreshCloudflareProviderConfig(force) {
        if (window._ao3CloudflareProviderConfigReady && !force) return window._ao3CloudflareServerProviders;
        if (_ao3CloudflareConfigPromise && !force) return _ao3CloudflareConfigPromise;
        _ao3CloudflareConfigPromise = fetch(ao3FunctionUrl('status'), { cache: 'no-store' })
          .then(function(response) { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); })
          .then(function(data) {
            const providers = data && data.providers || {};
            window._ao3CloudflareServerProviders = { groq: Boolean(providers.groq), azure: Boolean(providers.azure), workersAI: Boolean(providers.workersAI) };
            window._ao3CloudflareProviderConfigReady = true;
            return window._ao3CloudflareServerProviders;
          })
          .catch(function() {
            window._ao3CloudflareServerProviders = { groq: false, azure: false, workersAI: false };
            window._ao3CloudflareProviderConfigReady = true;
            return window._ao3CloudflareServerProviders;
          })
          .finally(function() { _ao3CloudflareConfigPromise = null; });
        return _ao3CloudflareConfigPromise;
      }

      // IndexedDB + localStorage Hybrid Persistence & Google Drive Sync
      function openLibraryIdb() {
        return new Promise(function(resolve, reject) {
          if (!window.indexedDB) {
            reject(new Error('IndexedDB not supported'));
            return;
          }
          const req = window.indexedDB.open(IDB_NAME, 1);
          req.onupgradeneeded = function(e) {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
              db.createObjectStore(IDB_STORE);
            }
          };
          req.onsuccess = function(e) { resolve(e.target.result); };
          req.onerror = function(e) { reject(e.target.error); };
        });
      }

      async function idbGetNovels() {
        const db = await openLibraryIdb();
        return new Promise(function(resolve, reject) {
          const tx = db.transaction(IDB_STORE, 'readonly');
          const store = tx.objectStore(IDB_STORE);
          const req = store.get('novels_list');
          req.onsuccess = function() { resolve(req.result || null); };
          req.onerror = function() { reject(req.error); };
        });
      }

      async function idbSetNovels(novelsArr) {
        const db = await openLibraryIdb();
        return new Promise(function(resolve, reject) {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          const store = tx.objectStore(IDB_STORE);
          const req = store.put(novelsArr, 'novels_list');
          req.onsuccess = function() { resolve(true); };
          req.onerror = function() { reject(req.error); };
        });
      }

      function loadFromStorage() {
        try {
          const savedCustomShelves = JSON.parse(localStorage.getItem(CUSTOM_SHELVES_KEY) || '[]');
          if (Array.isArray(savedCustomShelves)) state.customShelves = savedCustomShelves.filter(function(x) { return x && x.id && (x.type === 'author' || x.type === 'topic') && x.name; });
        } catch (e) { state.customShelves = []; }
        // Request persistent storage (helps prevent iOS/mobile cache eviction)
        try {
          if (navigator.storage && navigator.storage.persist) {
            navigator.storage.persist().catch(function() {});
          }
        } catch (e) {}

        try {
          const rawDeleted = localStorage.getItem(DELETED_IDS_KEY);
          if (rawDeleted) {
            state.deletedNovelIds = JSON.parse(rawDeleted) || {};
          }
        } catch (e) {
          state.deletedNovelIds = {};
        }

        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              state.novels = parsed;
            } else {
              state.novels = DEFAULT_NOVELS;
            }
          } else {
            state.novels = DEFAULT_NOVELS;
          }
        } catch (err) {
          state.novels = DEFAULT_NOVELS;
        }

        // Recover custom bookshelf definitions embedded in novel records (Google Drive sync compatibility).
        hydrateCustomShelvesFromNovels();
        // Remove the old display-only (AO3) suffix from author names already in storage.
        normalizeAo3AuthorNamesInLibrary();

        // Asynchronous IndexedDB hydration (seamless migration from localStorage)
        libraryHydrationPromise = idbGetNovels().then(function(idbNovels) {
          if (Array.isArray(idbNovels) && idbNovels.length > 0) {
            state.novels = idbNovels;
            hydrateCustomShelvesFromNovels();
            normalizeAo3AuthorNamesInLibrary();
            updateHeaderBadges();
            if (state.currentView === 'bookshelf') renderBookshelf();
            if (state.currentView === 'bookmarks') renderBookmarksManager();
          } else if (Array.isArray(state.novels) && state.novels.length > 0) {
            idbSetNovels(state.novels).catch(function() {});
          }
        }).catch(function() {});

        try {
          const rawSettings = localStorage.getItem(SETTINGS_KEY);
          if (rawSettings) {
            const parsedSettings = JSON.parse(rawSettings);
            state.settings = Object.assign({}, state.settings, parsedSettings);
            delete state.settings.functionBackendUrl; // remove legacy external-backend setting

            if (!state.settings.googleClientId) state.settings.googleClientId = DEFAULT_GOOGLE_CLIENT_ID;
            if (!state.settings.geminiApiKeys && state.settings.geminiApiKey) state.settings.geminiApiKeys = state.settings.geminiApiKey;
            ao3NormalizeGeminiKeyLists();
            if (typeof state.settings.geminiCooldownEnabled !== 'boolean') state.settings.geminiCooldownEnabled = true;
            if (typeof state.settings.qualityParagraphCountEnabled !== 'boolean') state.settings.qualityParagraphCountEnabled = true;
            if (typeof state.settings.qualityEnglishResidueEnabled !== 'boolean') state.settings.qualityEnglishResidueEnabled = true;
            if (!state.settings.translationPrompt) state.settings.translationPrompt = DEFAULT_TRANSLATION_PROMPT;
            state.settings.geminiModel = normalizeGeminiModel(state.settings.geminiModel);
            if (!state.settings.groqModel || state.settings.groqModel === 'llama-3.3-70b-versatile') state.settings.groqModel = 'openai/gpt-oss-120b';
            if (typeof state.settings.azureEnabled !== 'boolean') state.settings.azureEnabled = true;
            if (typeof state.settings.groqEnabled !== 'boolean') state.settings.groqEnabled = true;
            if (typeof state.settings.workersAiEnabled !== 'boolean') state.settings.workersAiEnabled = true;
            if (!['@cf/zai-org/glm-4.7-flash', '@cf/openai/gpt-oss-120b'].includes(state.settings.workersAiModel)) state.settings.workersAiModel = '@cf/zai-org/glm-4.7-flash';
            state.settings.engine = 'gemini_api';
            delete state.settings.deeplApiKey;
            delete state.settings.mistralApiKey;
            delete state.settings.mistralModel;
            saveSettingsToStorage(true);
          }
        } catch (err) {
          // Ignore storage read error
        }

        // Reader display preferences survive leaving the reader or reloading the page.
        try {
          const rawReaderPrefs = localStorage.getItem(READER_PREFS_KEY);
          if (rawReaderPrefs) {
            const prefs = JSON.parse(rawReaderPrefs) || {};
            if (['paper', 'green', 'dark', 'white', 'sepia'].includes(prefs.theme)) state.reader.theme = normalizeReaderTheme(prefs.theme);
            if (typeof prefs.fontSize === 'number' && Number.isFinite(prefs.fontSize)) {
              state.reader.fontSize = Math.max(8, Math.min(26, Math.round(prefs.fontSize)));
            }
            state.reader.bilingual = Boolean(prefs.bilingual);
            state.reader.showOriginalDialogue = prefs.showOriginalDialogue === true;
            if (['noto', 'plex', 'gothic', 'pretendard'].includes(prefs.fontFamily)) state.reader.fontFamily = prefs.fontFamily;
            if ([300, 400, 500].includes(Number(prefs.fontWeight))) state.reader.fontWeight = Number(prefs.fontWeight);
            state.reader.horizontalPadding = clampReaderSpacing(prefs.horizontalPadding, 0, 48, 20);
            state.reader.lineHeightPx = clampReaderSpacing(prefs.lineHeightPx, 10, 25, 20);
            state.reader.paragraphSpacingPx = clampReaderSpacing(prefs.paragraphSpacingPx, 0, 48, 24);
            state.reader.firstLineIndentPx = clampReaderSpacing(prefs.firstLineIndentPx, 0, 48, 0);
          }
        } catch (err) {
          // If preferences are invalid, keep the accessible defaults.
        }
        state.reader.font = 'sans';
      }

      function saveToStorage(changedNovelId) {
        embedCustomShelvesInNovels();
        normalizeAo3AuthorNamesInLibrary();
        const now = Date.now();
        if (changedNovelId) {
          const target = state.novels.find(function(n) { return n.id === changedNovelId; });
          if (target) target.updatedAt = now;
        }
        // Save to IndexedDB (unlimited book storage)
        idbSetNovels(state.novels).then(function() {
          const badge = document.getElementById('shelfStorageBadge');
          if (badge) { badge.textContent = '저장됨'; badge.title = 'IndexedDB에 자동 저장됩니다'; }
        }).catch(function() {});

        // Also mirror to localStorage as fallback if within quota
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state.novels));
          localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(state.deletedNovelIds || {}));
        } catch (err) {
          // Quota exceeded in localStorage is fine because IndexedDB holds full data
        }

        // Google Drive I/O is intentionally limited to the main bookshelf view.
        // Edits made in the reader/studio/bookmarks stay local and sync when the user returns to the bookshelf.
        if (state.currentView !== 'bookshelf') {
          if (isDriveTokenValid()) window._ao3DriveNeedsSync = true;
          return;
        }
        if (changedNovelId) {
          const activeTranslationNovel = state.novels.find(function(n) { return n.id === changedNovelId; });
          if (activeTranslationNovel && activeTranslationNovel.translationProgress && activeTranslationNovel.translationProgress.status === 'translating') {
            if (isDriveTokenValid()) window._ao3DriveNeedsSync = true;
            return;
          }
        }
        if (isDriveTokenValid() && !state.drive.syncing) {
          if (changedNovelId) {
            const changedNovel = state.novels.find(function(n) { return n.id === changedNovelId; });
            if (changedNovel) uploadSingleNovelToDrive(changedNovel).catch(function() { window._ao3DriveNeedsSync = true; });
          } else {
            syncWithGoogleDrive(true).catch(function() { window._ao3DriveNeedsSync = true; });
          }
        }
      }

      // ==================== GOOGLE DRIVE API SYNC (drive.file, "AO3서재") ====================
      let gisTokenClient = null;
      let gisScriptLoadingPromise = null;

      function isDriveTokenValid() {
        return Boolean(state.drive.accessToken && Date.now() < (state.drive.tokenExpiresAt - 30000));
      }

      function getGoogleDriveLoginHint() {
        try { return (localStorage.getItem(DRIVE_LOGIN_HINT_KEY) || '').trim(); } catch (e) { return ''; }
      }

      async function rememberGoogleDriveAccountHint(accessToken) {
        // Email is used only as an OAuth login hint; no access token is persisted.
        try {
          const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: { Authorization: 'Bearer ' + accessToken },
            cache: 'no-store'
          });
          if (!response.ok) return;
          const userInfo = await response.json();
          if (userInfo && userInfo.email && userInfo.email_verified) {
            localStorage.setItem(DRIVE_LOGIN_HINT_KEY, String(userInfo.email));
          }
        } catch (e) {
          // Account hint is optional; authentication and syncing should still work.
        }
      }

      function updateDriveUiStatus(statusText, statusMode) {
        if (statusMode === 'syncing' && state.currentView !== 'bookshelf') {
          statusMode = isDriveTokenValid() ? 'connected' : 'disconnected';
          statusText = isDriveTokenValid() ? 'Google Drive 연결됨' : 'Google Drive 미연결';
        }
        const dot = document.getElementById('driveSyncDot');
        const btnText = document.getElementById('driveSyncBtnText');
        const shelfBadge = document.getElementById('shelfDriveStatusBadge');
        const lastSyncLabel = document.getElementById('driveLastSyncLabel');
        const disconnectBtn = document.getElementById('driveDisconnectBtn');

        if (statusMode === 'connected') {
          if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-500';
          if (btnText) btnText.textContent = 'Drive 동기화됨';
          if (shelfBadge) {
            shelfBadge.textContent = '☁ 동기화됨';
            shelfBadge.title = statusText || 'Google Drive 동기화 완료';
            shelfBadge.className = 'text-xs font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200';
          }
          if (disconnectBtn) disconnectBtn.classList.remove('hidden');
        } else if (statusMode === 'syncing') {
          if (dot) dot.className = 'w-2 h-2 rounded-full bg-amber-500';
          if (btnText) btnText.textContent = '동기화 중...';
          if (shelfBadge) {
            shelfBadge.textContent = '☁ 동기화 중';
            shelfBadge.title = statusText || 'Google Drive 동기화 중';
            shelfBadge.className = 'text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200';
          }
        } else {
          if (dot) dot.className = 'w-2 h-2 rounded-full bg-slate-400';
          if (btnText) btnText.textContent = 'Drive 연결';
          if (shelfBadge) {
            shelfBadge.textContent = '☁ 미연결';
            shelfBadge.title = statusText || 'Google Drive 미연결';
            shelfBadge.className = 'text-xs font-medium px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200';
          }
          if (disconnectBtn) disconnectBtn.classList.add('hidden');
        }

        if (lastSyncLabel) {
          if (state.drive.lastSyncAt) {
            const d = new Date(state.drive.lastSyncAt);
            lastSyncLabel.textContent = '최근 동기화: ' + d.toLocaleTimeString('ko-KR') + ' (폴더: ' + DRIVE_FOLDER_NAME + ')';
          } else {
            lastSyncLabel.textContent = statusText || '아직 동기화되지 않음';
          }
        }
      }

      function loadGoogleIdentityScript() {
        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
          return Promise.resolve();
        }
        if (gisScriptLoadingPromise) return gisScriptLoadingPromise;
        gisScriptLoadingPromise = new Promise(function(resolve, reject) {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = function() { resolve(); };
          script.onerror = function() {
            gisScriptLoadingPromise = null;
            reject(new Error('Google Identity Services 스크립트를 불러오지 못했습니다.'));
          };
          document.head.appendChild(script);
        });
        return gisScriptLoadingPromise;
      }

      async function connectAndSyncGoogleDrive() {
        if (state.currentView !== 'bookshelf') {
          showToast('Google Drive 연결과 동기화는 메인 책장에서만 실행됩니다.', 'info');
          return;
        }
        if (isDriveTokenValid()) {
          await syncWithGoogleDrive(false);
          await flushPendingTranslationFailureReports();
          return;
        }
        const clientId = (state.settings.googleClientId || DEFAULT_GOOGLE_CLIENT_ID).trim();
        if (!clientId) {
          showToast('Google OAuth 클라이언트 ID를 입력해 주세요.', 'warning');
          return;
        }
        try {
          updateDriveUiStatus('구글 로그인 창 준비 중...', 'syncing');
          await loadGoogleIdentityScript();
          gisTokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.file openid email',
            login_hint: getGoogleDriveLoginHint() || undefined,
            callback: async function(tokenResponse) {
              if (tokenResponse && tokenResponse.access_token) {
                state.drive.accessToken = tokenResponse.access_token;
                const expiresInSec = Number(tokenResponse.expires_in || 3599);
                state.drive.tokenExpiresAt = Date.now() + (expiresInSec * 1000);
                try {
                  localStorage.setItem(DRIVE_RECONNECT_KEY, '1');
                  sessionStorage.setItem(DRIVE_ACCESS_TOKEN_SESSION_KEY, state.drive.accessToken);
                  sessionStorage.setItem(DRIVE_ACCESS_TOKEN_EXPIRY_SESSION_KEY, String(state.drive.tokenExpiresAt));
                } catch (e) {}
                await rememberGoogleDriveAccountHint(tokenResponse.access_token);
                await flushPendingTranslationFailureReports();
                if (state.currentView !== 'bookshelf') {
                  window._ao3DriveNeedsSync = true;
                  updateDriveUiStatus('Google Drive 연결됨', 'connected');
                  return;
                }
                await syncWithGoogleDrive(false);
                await autoRestoreEncryptedSettingsAfterDriveConnect();
              } else {
                updateDriveUiStatus('Google Drive 로그인 취소됨', 'disconnected');
              }
            }
          });
          gisTokenClient.requestAccessToken({ prompt: '', login_hint: getGoogleDriveLoginHint() || undefined });
        } catch (err) {
          updateDriveUiStatus('Google Drive 연결 실패', 'disconnected');
          showToast('구글 로그인 초기화 중 오류가 발생했습니다: ' + (err.message || err), 'error');
        }
      }

      // Browser token-model access tokens expire and must be requested from a user gesture.
      // Do not trigger requestAccessToken() on startup: that was opening repeated Google popups.
      // We remember a login hint to preselect the same account when the user clicks Drive.
      async function restoreGoogleDriveSession() {
        let shouldReconnect = false;
        let cachedToken = '';
        let cachedExpiry = 0;
        try {
          shouldReconnect = localStorage.getItem(DRIVE_RECONNECT_KEY) === '1';
          cachedToken = sessionStorage.getItem(DRIVE_ACCESS_TOKEN_SESSION_KEY) || '';
          cachedExpiry = Number(sessionStorage.getItem(DRIVE_ACCESS_TOKEN_EXPIRY_SESSION_KEY) || 0);
        } catch (e) {}

        // The token is only cached in this tab's session storage, never localStorage.
        // Google access tokens are short-lived; if it has expired, ask for one explicit re-auth click.
        if (cachedToken && cachedExpiry > Date.now() + 30000) {
          state.drive.accessToken = cachedToken;
          state.drive.tokenExpiresAt = cachedExpiry;
          updateDriveUiStatus('이전 Google Drive 세션 복원 중...', 'syncing');
          try {
            // Wait for the local IndexedDB library to finish loading before comparing/uploading data.
            await libraryHydrationPromise;
            if (isDriveTokenValid()) {
              await flushPendingTranslationFailureReports();
              try {
                const quotaFolderId = await ensureDriveBookshelfFolder();
                await syncProviderQuotaWithGoogleDrive(quotaFolderId);
              } catch (quotaSyncError) {
                window._ao3DriveNeedsQuotaSync = true;
                console.warn('Automatic provider quota Drive sync failed:', quotaSyncError);
              }
              await syncWithGoogleDrive(true);
              if (isDriveTokenValid() && state.drive.lastSyncAt) {
                await autoRestoreEncryptedSettingsAfterDriveConnect();
                return;
              }
              // Keep a still-valid token cached if a temporary network/API failure prevented sync.
              // syncWithGoogleDrive already updates the visible status and marks sync as pending.
              if (isDriveTokenValid()) return;
            }
          } catch (err) {
            console.warn('Automatic Google Drive sync failed:', err);
            if (isDriveTokenValid()) return;
          }
        }

        try {
          sessionStorage.removeItem(DRIVE_ACCESS_TOKEN_SESSION_KEY);
          sessionStorage.removeItem(DRIVE_ACCESS_TOKEN_EXPIRY_SESSION_KEY);
        } catch (e) {}
        state.drive.accessToken = '';
        state.drive.tokenExpiresAt = 0;
        if (shouldReconnect) {
          updateDriveUiStatus('Google Drive 세션이 만료되었습니다. Drive 버튼을 한 번 눌러 다시 연결하면 이후 자동 동기화됩니다.', 'disconnected');
        } else {
          updateDriveUiStatus('Google Drive 미연결', 'disconnected');
        }
      }

      async function driveApiFetch(url, options) {
        const headers = Object.assign({}, (options && options.headers) || {}, {
          'Authorization': 'Bearer ' + state.drive.accessToken
        });
        const res = await fetch(url, Object.assign({}, options || {}, { headers: headers }));
        if (res.status === 401) {
          state.drive.accessToken = '';
          state.drive.tokenExpiresAt = 0;
          try { sessionStorage.removeItem(DRIVE_ACCESS_TOKEN_SESSION_KEY); sessionStorage.removeItem(DRIVE_ACCESS_TOKEN_EXPIRY_SESSION_KEY); } catch (e) {}
          updateDriveUiStatus('토큰 만료됨 (다시 클릭해 로그인)', 'disconnected');
          throw new Error('DRIVE_AUTH_EXPIRED');
        }
        return res;
      }

      // Dedicated Google Drive document for author/topic shelf definitions.
      // Keeping this separate from novel JSON ensures empty shelves and deletions sync too.
      let customShelvesDriveSyncPromise = null;
      function getCustomShelvesLocalTimestamp() {
        try { return Number(localStorage.getItem(CUSTOM_SHELVES_SYNC_TS_KEY) || 0); } catch (e) { return 0; }
      }
      function setCustomShelvesLocalTimestamp(ts) {
        try { localStorage.setItem(CUSTOM_SHELVES_SYNC_TS_KEY, String(Number(ts) || 0)); } catch (e) {}
      }
      async function findCustomShelvesDriveFile(folderId) {
        const q = "'" + folderId + "' in parents and name = '" + DRIVE_CUSTOM_SHELVES_FILE + "' and trashed = false";
        const res = await driveApiFetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name,modifiedTime)');
        if (!res.ok) throw new Error('Google Drive 책장 목록 조회에 실패했습니다.');
        const data = await res.json();
        return data.files && data.files.length ? data.files[0] : null;
      }
      async function writeCustomShelvesDriveFile(folderId, existingFile, payload) {
        const boundary = '-------ao3customshelves' + Date.now();
        const metadata = existingFile
          ? { name: DRIVE_CUSTOM_SHELVES_FILE, mimeType: 'application/json' }
          : { name: DRIVE_CUSTOM_SHELVES_FILE, mimeType: 'application/json', parents: [folderId] };
        const body = '--' + boundary + '\r\n' +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + '\r\n' +
          '--' + boundary + '\r\n' +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(payload) + '\r\n' +
          '--' + boundary + '--';
        const url = existingFile
          ? 'https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(existingFile.id) + '?uploadType=multipart&fields=id'
          : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
        const res = await driveApiFetch(url, { method: existingFile ? 'PATCH' : 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body: body });
        if (!res.ok) throw new Error('Google Drive 작가별/주제별 책장 저장 실패 (HTTP ' + res.status + ')');
        return res.json();
      }
      async function syncCustomShelvesWithGoogleDrive(folderId, forceUpload) {
        if (!isDriveTokenValid()) return;
        if (customShelvesDriveSyncPromise) return customShelvesDriveSyncPromise;
        customShelvesDriveSyncPromise = (async function() {
          const file = await findCustomShelvesDriveFile(folderId);
          const localTs = getCustomShelvesLocalTimestamp();
          if (file) {
            const dl = await driveApiFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(file.id) + '?alt=media');
            if (!dl.ok) throw new Error('Google Drive 책장 파일을 읽지 못했습니다.');
            const remote = await dl.json();
            const remoteTs = Number(remote.updatedAt || 0);
            const hasLocalShelves = Array.isArray(state.customShelves) && state.customShelves.length > 0;
            // Newer remote data wins; otherwise push local edits. On first connection, prefer
            // remote if available, but don't lose local definitions if Drive file is absent.
            if (!forceUpload && remoteTs > localTs) {
              state.customShelves = Array.isArray(remote.shelves) ? remote.shelves.filter(function(x) { return x && x.id && (x.type === 'author' || x.type === 'topic') && x.name; }) : [];
              setCustomShelvesLocalTimestamp(remoteTs);
              try { localStorage.setItem(CUSTOM_SHELVES_KEY, JSON.stringify(state.customShelves)); } catch (e) {}
              const validIds = new Set(state.customShelves.map(function(x) { return x.id; }));
              (state.novels || []).forEach(function(n) { n.customShelfIds = (Array.isArray(n.customShelfIds) ? n.customShelfIds : []).filter(function(id) { return validIds.has(id); }); });
              embedCustomShelvesInNovels();
              await idbSetNovels(state.novels).catch(function() {});
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.novels)); } catch (e) {}
              if (state.currentView === 'customBookshelves') renderCustomBookshelves();
              return;
            }
            if (!forceUpload && remoteTs === localTs && remoteTs > 0) return;
          } else if (!state.customShelves.length) {
            // No metadata to upload yet; keep the file absent until the user creates a shelf.
            return;
          }
          const updatedAt = Math.max(Date.now(), localTs + 1);
          const payload = { schemaVersion: 1, updatedAt: updatedAt, shelves: (state.customShelves || []).map(function(x) { return { id: x.id, type: x.type, name: x.name, createdAt: x.createdAt || 0 }; }) };
          await writeCustomShelvesDriveFile(folderId, file, payload);
          setCustomShelvesLocalTimestamp(updatedAt);
        })();
        try { return await customShelvesDriveSyncPromise; }
        finally { customShelvesDriveSyncPromise = null; }
      }
      function scheduleCustomShelvesDriveSync() {
        if (!isDriveTokenValid()) { window._ao3DriveNeedsSync = true; return; }
        ensureDriveBookshelfFolder().then(function(folderId) {
          return syncCustomShelvesWithGoogleDrive(folderId, true);
        }).catch(function(err) {
          window._ao3DriveNeedsSync = true;
          console.warn('Custom bookshelf Drive sync failed:', err);
        });
      }

      // Sync user-facing preferences independently from novel records and custom shelves.
      // API keys are intentionally excluded here; they remain in the encrypted settings vault.
      let driveUserPreferencesSyncPromise = null;
      let driveUserPreferencesSyncTimer = null;
      function getDriveUserPreferencesLocalTimestamp() {
        try { return Number(localStorage.getItem(DRIVE_USER_PREFERENCES_TS_KEY) || 0); } catch (e) { return 0; }
      }
      function setDriveUserPreferencesLocalTimestamp(ts) {
        try { localStorage.setItem(DRIVE_USER_PREFERENCES_TS_KEY, String(Number(ts) || 0)); } catch (e) {}
      }
      function getDriveSafeTranslationSettings() {
        const s = state.settings || {};
        return {
          engine: String(s.engine || 'gemini_api'),
          geminiModel: String(s.geminiModel || DEFAULT_GEMINI_MODEL),
          geminiCooldownEnabled: s.geminiCooldownEnabled !== false,
          geminiKeyIdentityRegistry: s.geminiKeyIdentityRegistry && typeof s.geminiKeyIdentityRegistry === 'object' ? s.geminiKeyIdentityRegistry : { ids: {}, nextId: 1 },
          qualityParagraphCountEnabled: s.qualityParagraphCountEnabled !== false,
          qualityEnglishResidueEnabled: s.qualityEnglishResidueEnabled !== false,
          azureRegion: String(s.azureRegion || ''),
          azureEnabled: s.azureEnabled !== false,
          groqModel: String(s.groqModel || 'openai/gpt-oss-120b'),
          groqEnabled: s.groqEnabled !== false,
          workersAiEnabled: s.workersAiEnabled !== false,
          workersAiModel: String(s.workersAiModel || '@cf/zai-org/glm-4.7-flash'),
          translationPrompt: String(s.translationPrompt == null ? '' : s.translationPrompt),
          glossary: String(s.glossary == null ? '' : s.glossary),
          textReplacements: String(s.textReplacements == null ? '' : s.textReplacements),
          characterStyleRules: String(s.characterStyleRules == null ? '' : s.characterStyleRules),
          googleClientId: String(s.googleClientId || DEFAULT_GOOGLE_CLIENT_ID)
        };
      }
      function getDriveUserPreferencesPayload(updatedAt) {
        return {
          kind: 'ao3-user-preferences',
          schemaVersion: 1,
          updatedAt: Number(updatedAt || Date.now()),
          settings: getDriveSafeTranslationSettings(),
          readerPreferences: {
            theme: state.reader.theme,
            fontSize: state.reader.fontSize,
            fontFamily: state.reader.fontFamily || 'noto',
            fontWeight: [300, 400, 500].includes(Number(state.reader.fontWeight)) ? Number(state.reader.fontWeight) : 400,
            horizontalPadding: clampReaderSpacing(state.reader.horizontalPadding, 20, 30, 25),
            lineHeightPx: clampReaderSpacing(state.reader.lineHeightPx, 10, 25, 20),
            paragraphSpacingPx: clampReaderSpacing(state.reader.paragraphSpacingPx, 2, 10, 5),
            firstLineIndentPx: clampReaderSpacing(state.reader.firstLineIndentPx, 0, 10, 0),
            bilingual: Boolean(state.reader.bilingual)
          },
          appTheme: (function() {
            try { const saved = localStorage.getItem('ao3-app-theme'); return ['light', 'green'].includes(saved) ? saved : 'dark'; }
            catch (e) { const current = document.documentElement.getAttribute('data-app-theme'); return ['light', 'green'].includes(current) ? current : 'dark'; }
          })()
        };
      }
      async function findDriveUserPreferencesFile(folderId) {
        const q = "'" + folderId + "' in parents and name = '" + DRIVE_USER_PREFERENCES_FILE + "' and trashed = false";
        const res = await driveApiFetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name,modifiedTime)');
        if (!res.ok) throw new Error('Google Drive 설정 파일 조회 실패 (HTTP ' + res.status + ')');
        const data = await res.json();
        return data.files && data.files.length ? data.files[0] : null;
      }
      async function writeDriveUserPreferencesFile(folderId, existingFile, payload) {
        const boundary = '-------ao3userprefs' + Date.now();
        const metadata = existingFile
          ? { name: DRIVE_USER_PREFERENCES_FILE, mimeType: 'application/json' }
          : { name: DRIVE_USER_PREFERENCES_FILE, mimeType: 'application/json', parents: [folderId] };
        const body = '--' + boundary + '\r\n' +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + '\r\n' +
          '--' + boundary + '\r\n' +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(payload) + '\r\n' +
          '--' + boundary + '--';
        const url = existingFile
          ? 'https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(existingFile.id) + '?uploadType=multipart&fields=id'
          : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
        const res = await driveApiFetch(url, {
          method: existingFile ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
          body: body
        });
        if (!res.ok) throw new Error('Google Drive 설정 저장 실패 (HTTP ' + res.status + ')');
        return res.json();
      }
      function applyDriveUserPreferencesPayload(remote) {
        if (!remote || remote.kind !== 'ao3-user-preferences' || remote.schemaVersion !== 1) {
          throw new Error('Google Drive 설정 파일 형식이 올바르지 않습니다.');
        }
        const rs = remote.settings || {};
        const stringKeys = ['engine', 'geminiModel', 'azureRegion', 'groqModel', 'workersAiModel', 'translationPrompt', 'glossary', 'textReplacements', 'characterStyleRules', 'googleClientId'];
        stringKeys.forEach(function(key) { if (typeof rs[key] === 'string') state.settings[key] = rs[key]; });
        ['groqEnabled', 'workersAiEnabled', 'azureEnabled', 'geminiCooldownEnabled'].forEach(function(key) { if (typeof rs[key] === 'boolean') state.settings[key] = rs[key]; });
        ['qualityParagraphCountEnabled', 'qualityEnglishResidueEnabled'].forEach(function(key) { if (typeof rs[key] === 'boolean') state.settings[key] = rs[key]; });
        if (rs.geminiKeyIdentityRegistry && typeof rs.geminiKeyIdentityRegistry === 'object') state.settings.geminiKeyIdentityRegistry = rs.geminiKeyIdentityRegistry;
        state.settings.engine = 'gemini_api';
        state.settings.geminiModel = normalizeGeminiModel(state.settings.geminiModel);
        if (!state.settings.groqModel || state.settings.groqModel === 'llama-3.3-70b-versatile') state.settings.groqModel = 'openai/gpt-oss-120b';
        if (!['@cf/zai-org/glm-4.7-flash', '@cf/openai/gpt-oss-120b'].includes(state.settings.workersAiModel)) state.settings.workersAiModel = '@cf/zai-org/glm-4.7-flash';

        const rp = remote.readerPreferences || {};
        if (['paper', 'green', 'dark', 'white', 'sepia'].includes(rp.theme)) state.reader.theme = normalizeReaderTheme(rp.theme);
        state.reader.showOriginalDialogue = rp.showOriginalDialogue === true;
        if (typeof rp.fontSize === 'number' && Number.isFinite(rp.fontSize)) state.reader.fontSize = Math.max(8, Math.min(26, Math.round(rp.fontSize)));
        if (typeof rp.bilingual === 'boolean') state.reader.bilingual = rp.bilingual;
        if (['noto', 'plex', 'gothic', 'pretendard'].includes(rp.fontFamily)) state.reader.fontFamily = rp.fontFamily;
        if ([300, 400, 500].includes(Number(rp.fontWeight))) state.reader.fontWeight = Number(rp.fontWeight);
        state.reader.horizontalPadding = clampReaderSpacing(rp.horizontalPadding, 0, 48, state.reader.horizontalPadding);
        state.reader.lineHeightPx = clampReaderSpacing(rp.lineHeightPx, 10, 25, state.reader.lineHeightPx);
        state.reader.paragraphSpacingPx = clampReaderSpacing(rp.paragraphSpacingPx, 0, 48, state.reader.paragraphSpacingPx);
        state.reader.firstLineIndentPx = clampReaderSpacing(rp.firstLineIndentPx, 0, 48, state.reader.firstLineIndentPx);
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
          localStorage.setItem(READER_PREFS_KEY, JSON.stringify({ theme: state.reader.theme, fontSize: state.reader.fontSize, fontFamily: state.reader.fontFamily || 'noto', fontWeight: [300, 400, 500].includes(Number(state.reader.fontWeight)) ? Number(state.reader.fontWeight) : 400, horizontalPadding: state.reader.horizontalPadding, lineHeightPx: state.reader.lineHeightPx, paragraphSpacingPx: state.reader.paragraphSpacingPx, firstLineIndentPx: state.reader.firstLineIndentPx, bilingual: state.reader.bilingual }));
        } catch (e) {}

        const theme = ['light', 'green'].includes(remote.appTheme) ? remote.appTheme : 'dark';
        try { localStorage.setItem('ao3-app-theme', theme); } catch (e) {}
        document.documentElement.setAttribute('data-app-theme', theme);
        document.documentElement.style.colorScheme = theme;
        const darkBtn = document.getElementById('appThemeDarkBtn');
        const lightBtn = document.getElementById('appThemeLightBtn');
        const greenBtn = document.getElementById('appThemeGreenBtn');
        if (darkBtn) darkBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
        if (lightBtn) lightBtn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
        if (greenBtn) greenBtn.setAttribute('aria-pressed', theme === 'green' ? 'true' : 'false');
      }
      async function syncDriveUserPreferencesWithGoogleDrive(folderId) {
        if (!isDriveTokenValid()) return;
        if (driveUserPreferencesSyncPromise) return driveUserPreferencesSyncPromise;
        driveUserPreferencesSyncPromise = (async function() {
          const file = await findDriveUserPreferencesFile(folderId);
          let localTs = getDriveUserPreferencesLocalTimestamp();
          let remoteTs = 0;
          if (file) {
            const dl = await driveApiFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(file.id) + '?alt=media');
            if (!dl.ok) throw new Error('Google Drive 설정 파일 읽기 실패 (HTTP ' + dl.status + ')');
            const remote = await dl.json();
            remoteTs = Number(remote && remote.updatedAt || 0);
            // Re-read after network I/O so a save made while downloading is not overwritten.
            localTs = getDriveUserPreferencesLocalTimestamp();
            if (remoteTs > localTs) {
              applyDriveUserPreferencesPayload(remote);
              setDriveUserPreferencesLocalTimestamp(remoteTs);
              return;
            }
            if (remoteTs > 0 && remoteTs === localTs) return;
          }
          localTs = getDriveUserPreferencesLocalTimestamp();
          const updatedAt = Math.max(Date.now(), localTs + 1, remoteTs + 1);
          const payload = getDriveUserPreferencesPayload(updatedAt);
          await writeDriveUserPreferencesFile(folderId, file, payload);
          setDriveUserPreferencesLocalTimestamp(updatedAt);
        })();
        try { return await driveUserPreferencesSyncPromise; }
        finally { driveUserPreferencesSyncPromise = null; }
      }
      function scheduleDriveUserPreferencesSync() {
        const nextTs = Math.max(Date.now(), getDriveUserPreferencesLocalTimestamp() + 1);
        setDriveUserPreferencesLocalTimestamp(nextTs);
        window._ao3DriveNeedsPreferencesSync = true;
        if (!isDriveTokenValid()) return;
        if (driveUserPreferencesSyncTimer) clearTimeout(driveUserPreferencesSyncTimer);
        driveUserPreferencesSyncTimer = setTimeout(function() {
          driveUserPreferencesSyncTimer = null;
          if (!isDriveTokenValid()) return;
          ensureDriveBookshelfFolder().then(function(folderId) {
            return syncDriveUserPreferencesWithGoogleDrive(folderId);
          }).then(function() {
            window._ao3DriveNeedsPreferencesSync = false;
          }).catch(function(err) {
            window._ao3DriveNeedsPreferencesSync = true;
            console.warn('User preferences Drive sync failed:', err);
          });
        }, 900);
      }

      async function ensureDriveBookshelfFolder() {
        if (state.drive.folderId) return state.drive.folderId;
        const q = "name = '" + DRIVE_FOLDER_NAME + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
        const listUrl = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name)&spaces=drive';
        const res = await driveApiFetch(listUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.files && data.files.length > 0) {
            state.drive.folderId = data.files[0].id;
            return state.drive.folderId;
          }
        }
        // Create folder "AO3서재"
        const createRes = await driveApiFetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: DRIVE_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder'
          })
        });
        if (!createRes.ok) {
          throw new Error('드라이브 폴더 생성 실패 (HTTP ' + createRes.status + ')');
        }
        const created = await createRes.json();
        state.drive.folderId = created.id;
        return state.drive.folderId;
      }

      async function ensureDriveFailureReportsFolder() {
        const bookshelfFolderId = await ensureDriveBookshelfFolder();
        const q = "'" + bookshelfFolderId + "' in parents and name = '" + DRIVE_FAILURE_REPORTS_FOLDER_NAME + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
        const listResponse = await driveApiFetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name)&spaces=drive');
        if (!listResponse.ok) throw new Error('Drive failure report folder lookup failed (HTTP ' + listResponse.status + ').');
        const data = await listResponse.json();
        if (data.files && data.files.length) return data.files[0].id;

        const createResponse = await driveApiFetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: DRIVE_FAILURE_REPORTS_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [bookshelfFolderId]
          })
        });
        if (!createResponse.ok) throw new Error('Drive failure report folder creation failed (HTTP ' + createResponse.status + ').');
        const created = await createResponse.json();
        if (!created || !created.id) throw new Error('Drive did not return a failure report folder ID.');
        return created.id;
      }

      function getNovelTimestamp(novel) {
        return Number(novel.updatedAt || novel.lastReadAt || novel.createdAt || 0);
      }

      async function uploadSingleNovelToDrive(novel, existingFileId) {
        if (!isDriveTokenValid()) return;
        const folderId = await ensureDriveBookshelfFolder();
        const fileName = 'ao3_novel_' + novel.id + '.json';

        let targetFileId = existingFileId || novel.driveFileId || '';
        if (!targetFileId) {
          const q = "'" + folderId + "' in parents and name = '" + fileName + "' and trashed = false";
          const findRes = await driveApiFetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name)');
          if (findRes.ok) {
            const findData = await findRes.json();
            if (findData.files && findData.files.length > 0) {
              targetFileId = findData.files[0].id;
            }
          }
        }

        // Strip any device-specific fields if any, keep only novel data
        const cleanNovelPayload = Object.assign({}, novel, {
          updatedAt: getNovelTimestamp(novel) || Date.now()
        });

        const metadata = targetFileId
          ? { name: fileName, mimeType: 'application/json' }
          : { name: fileName, mimeType: 'application/json', parents: [folderId] };

        const boundary = '-------ao3bookshelfboundary' + Date.now();
        const multipartBody =
          '--' + boundary + '\r\n' +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) + '\r\n' +
          '--' + boundary + '\r\n' +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(cleanNovelPayload) + '\r\n' +
          '--' + boundary + '--';

        const uploadUrl = targetFileId
          ? ('https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(targetFileId) + '?uploadType=multipart&fields=id,modifiedTime,md5Checksum,size')
          : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';

        let upRes = await driveApiFetch(uploadUrl, {
          method: targetFileId ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'multipart/related; boundary=' + boundary
          },
          body: multipartBody
        });

        // A stale cached Drive file ID can return 404. Re-query by filename and
        // retry as an update if found, otherwise create a fresh file in the folder.
        if (upRes.status === 404 && targetFileId) {
          let recoveredFileId = '';
          try {
            const recoveryQuery = "'" + folderId + "' in parents and name = '" + fileName + "' and trashed = false";
            const recoveryRes = await driveApiFetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(recoveryQuery) + '&fields=files(id,name)');
            if (recoveryRes.ok) {
              const recoveryData = await recoveryRes.json();
              if (recoveryData.files && recoveryData.files.length) recoveredFileId = recoveryData.files[0].id || '';
            }
          } catch (recoveryError) {
            console.warn('Drive file ID recovery failed; trying to create a replacement file.');
          }

          const retryBoundary = '-------ao3bookshelfretry' + Date.now();
          const retryTargetId = recoveredFileId;
          const retryMetadata = retryTargetId
            ? { name: fileName, mimeType: 'application/json' }
            : { name: fileName, mimeType: 'application/json', parents: [folderId] };
          const retryBody =
            '--' + retryBoundary + '\r\n' +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(retryMetadata) + '\r\n' +
            '--' + retryBoundary + '\r\n' +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(cleanNovelPayload) + '\r\n' +
            '--' + retryBoundary + '--';
          const retryUrl = retryTargetId
            ? 'https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(retryTargetId) + '?uploadType=multipart&fields=id'
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
          upRes = await driveApiFetch(retryUrl, {
            method: retryTargetId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'multipart/related; boundary=' + retryBoundary },
            body: retryBody
          });
        }

        if (upRes.ok) {
          const upData = await upRes.json();
          if (upData && upData.id) {
            novel.driveFileId = upData.id;
            novel._driveUploadMetadata = { modifiedTime: upData.modifiedTime || '', md5Checksum: upData.md5Checksum || '', size: upData.size || '' };
          }
        } else {
          throw new Error('Drive 소설 업로드 실패 (HTTP ' + upRes.status + ')');
        }
      }

      async function deleteNovelFromDrive(novelId, knownDriveFileId) {
        if (!isDriveTokenValid()) return;
        try {
          let fileId = knownDriveFileId || '';
          if (!fileId) {
            const folderId = await ensureDriveBookshelfFolder();
            const fileName = 'ao3_novel_' + novelId + '.json';
            const q = "'" + folderId + "' in parents and name = '" + fileName + "' and trashed = false";
            const findRes = await driveApiFetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id)');
            if (findRes.ok) {
              const data = await findRes.json();
              if (data.files && data.files.length > 0) fileId = data.files[0].id;
            }
          }
          if (fileId) {
            await driveApiFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId), {
              method: 'DELETE'
            });
          }
        } catch (err) {
          // Ignore delete errors
        }
      }

      // API keys/settings cloud backup uses WebCrypto AES-GCM. The passphrase is never uploaded.
      function vaultBytesToBase64(bytes) {
        let binary = '';
        const arr = new Uint8Array(bytes);
        for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
        return btoa(binary);
      }

      function vaultBase64ToBytes(value) {
        const binary = atob(String(value || ''));
        const arr = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
        return arr;
      }

      async function deriveDriveVaultCryptoKey(passphrase, salt) {
        if (!window.crypto || !crypto.subtle) throw new Error('이 브라우저에서 암호화 기능을 사용할 수 없습니다. HTTPS 주소로 접속해 주세요.');
        const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: 250000, hash: 'SHA-256' },
          material,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
      }

      function getSettingsForEncryptedDriveBackup() {
        const s = state.settings || {};
        return {
          engine: String(s.engine || 'gemini_api'),
          geminiModel: String(s.geminiModel || DEFAULT_GEMINI_MODEL),
          geminiApiKey: String(s.geminiApiKey || ''),
          geminiApiKeys: String(s.geminiApiKeys || s.geminiApiKey || ''),
          geminiKeyLists: Array.isArray(s.geminiKeyLists) ? s.geminiKeyLists : [],
          activeGeminiKeyListId: String(s.activeGeminiKeyListId || ''),
          geminiKeyIdentityRegistry: s.geminiKeyIdentityRegistry && typeof s.geminiKeyIdentityRegistry === 'object' ? s.geminiKeyIdentityRegistry : { ids: {}, nextId: 1 },
          geminiCooldownEnabled: s.geminiCooldownEnabled !== false,
          qualityParagraphCountEnabled: s.qualityParagraphCountEnabled !== false,
          qualityEnglishResidueEnabled: s.qualityEnglishResidueEnabled !== false,
          azureApiKey: String(s.azureApiKey || ''),
          azureRegion: String(s.azureRegion || ''),
          azureEnabled: s.azureEnabled !== false,
          groqApiKey: String(s.groqApiKey || ''),
          groqModel: String(s.groqModel || 'openai/gpt-oss-120b'),
          groqEnabled: s.groqEnabled !== false,
          workersAiEnabled: s.workersAiEnabled !== false,
          workersAiModel: String(s.workersAiModel || '@cf/zai-org/glm-4.7-flash'),
          translationPrompt: String(s.translationPrompt || ''),
          glossary: String(s.glossary || ''),
          textReplacements: String(s.textReplacements || ''),
          characterStyleRules: String(s.characterStyleRules || '')
        };
      }

      async function encryptSettingsForDrive(passphrase) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveDriveVaultCryptoKey(passphrase, salt);
        const plaintext = new TextEncoder().encode(JSON.stringify({ version: 1, settings: getSettingsForEncryptedDriveBackup() }));
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plaintext);
        return {
          kind: 'ao3-encrypted-settings-vault',
          version: 1,
          kdf: 'PBKDF2-SHA-256',
          iterations: 250000,
          cipher: 'AES-256-GCM',
          salt: vaultBytesToBase64(salt),
          iv: vaultBytesToBase64(iv),
          ciphertext: vaultBytesToBase64(encrypted),
          updatedAt: new Date().toISOString()
        };
      }

      async function decryptSettingsFromDriveVault(payload, passphrase) {
        if (!payload || payload.kind !== 'ao3-encrypted-settings-vault' || payload.version !== 1) {
          throw new Error('Drive 파일 형식이 올바르지 않습니다.');
        }
        const salt = vaultBase64ToBytes(payload.salt);
        const iv = vaultBase64ToBytes(payload.iv);
        const ciphertext = vaultBase64ToBytes(payload.ciphertext);
        const key = await deriveDriveVaultCryptoKey(passphrase, salt);
        let plaintext;
        try {
          plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ciphertext);
        } catch (err) {
          throw new Error('암호가 틀렸거나 백업 파일이 손상되었습니다.');
        }
        const decoded = JSON.parse(new TextDecoder().decode(plaintext));
        if (!decoded || decoded.version !== 1 || !decoded.settings || typeof decoded.settings !== 'object') {
          throw new Error('백업 안의 설정 데이터가 올바르지 않습니다.');
        }
        const allowed = ['engine', 'geminiModel', 'geminiApiKey', 'geminiApiKeys', 'azureApiKey', 'azureRegion', 'groqApiKey', 'groqModel', 'workersAiModel', 'translationPrompt', 'glossary', 'textReplacements', 'characterStyleRules'];
        allowed.forEach(function(k) {
          if (typeof decoded.settings[k] === 'string') state.settings[k] = decoded.settings[k];
        });
        if (Array.isArray(decoded.settings.geminiKeyLists)) state.settings.geminiKeyLists = decoded.settings.geminiKeyLists;
        if (decoded.settings.geminiKeyIdentityRegistry && typeof decoded.settings.geminiKeyIdentityRegistry === 'object') state.settings.geminiKeyIdentityRegistry = decoded.settings.geminiKeyIdentityRegistry;
        if (typeof decoded.settings.activeGeminiKeyListId === 'string') state.settings.activeGeminiKeyListId = decoded.settings.activeGeminiKeyListId;
        ao3NormalizeGeminiKeyLists();
        if (typeof decoded.settings.groqEnabled === 'boolean') state.settings.groqEnabled = decoded.settings.groqEnabled;
        if (typeof decoded.settings.workersAiEnabled === 'boolean') state.settings.workersAiEnabled = decoded.settings.workersAiEnabled;
        if (typeof decoded.settings.azureEnabled === 'boolean') state.settings.azureEnabled = decoded.settings.azureEnabled;
        if (typeof decoded.settings.geminiCooldownEnabled === 'boolean') state.settings.geminiCooldownEnabled = decoded.settings.geminiCooldownEnabled;
        if (typeof decoded.settings.qualityParagraphCountEnabled === 'boolean') state.settings.qualityParagraphCountEnabled = decoded.settings.qualityParagraphCountEnabled;
        if (typeof decoded.settings.qualityEnglishResidueEnabled === 'boolean') state.settings.qualityEnglishResidueEnabled = decoded.settings.qualityEnglishResidueEnabled;
        if (!state.settings.geminiApiKeys && state.settings.geminiApiKey) state.settings.geminiApiKeys = state.settings.geminiApiKey;
        state.settings.geminiModel = normalizeGeminiModel(state.settings.geminiModel);
        if (state.settings.groqModel === 'llama-3.3-70b-versatile') state.settings.groqModel = 'openai/gpt-oss-120b';
        state.settings.engine = 'gemini_api';
        delete state.settings.deeplApiKey;
        delete state.settings.mistralApiKey;
        delete state.settings.mistralModel;
        return true;
      }

      async function findDriveSettingsVaultFile(folderId) {
        const q = "'" + folderId + "' in parents and name = '" + DRIVE_SETTINGS_VAULT_FILE + "' and trashed = false";
        const res = await driveApiFetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name,modifiedTime)');
        if (!res.ok) throw new Error('Drive 백업 파일 검색에 실패했습니다.');
        const data = await res.json();
        return (data.files && data.files.length) ? data.files[0] : null;
      }

      async function saveEncryptedSettingsToDrive(passphrase, silent) {
        if (!isDriveTokenValid()) throw new Error('먼저 Google Drive를 연결해 주세요.');
        if (!passphrase || passphrase.length < 10) throw new Error('백업 암호는 10자 이상 입력해 주세요.');
        const folderId = await ensureDriveBookshelfFolder();
        const encryptedPayload = await encryptSettingsForDrive(passphrase);
        let existing = await findDriveSettingsVaultFile(folderId);

        async function uploadVaultFile(targetFile) {
          const boundary = '-------ao3settingsvault' + Date.now();
          const metadata = targetFile
            ? { name: DRIVE_SETTINGS_VAULT_FILE, mimeType: 'application/json' }
            : { name: DRIVE_SETTINGS_VAULT_FILE, mimeType: 'application/json', parents: [folderId] };
          const body = '--' + boundary + '\r\n' +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + '\r\n' +
            '--' + boundary + '\r\n' +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(encryptedPayload) + '\r\n' +
            '--' + boundary + '--';
          const url = targetFile
            ? 'https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(targetFile.id) + '?uploadType=multipart&fields=id'
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
          return driveApiFetch(url, {
            method: targetFile ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
            body: body
          });
        }

        let res = await uploadVaultFile(existing);
        if (res.status === 404 && existing) {
          // The vault file may have been deleted between list and update. Re-query;
          // update the current file if found, otherwise recreate it.
          existing = await findDriveSettingsVaultFile(folderId);
          res = await uploadVaultFile(existing);
        }
        if (!res.ok) {
          let detail = '';
          try { detail = (await res.text()).slice(0, 240); } catch (ignoreVaultError) {}
          throw new Error('암호화 설정을 Drive에 저장하지 못했습니다 (HTTP ' + res.status + ')' + (detail ? ': ' + detail : ''));
        }
        if (!silent) showToast('번역 설정과 API 키를 암호화해 Google Drive에 저장했습니다.');
        return true;
      }

      async function restoreEncryptedSettingsFromDrive(passphrase, silent) {
        if (!isDriveTokenValid()) throw new Error('먼저 Google Drive를 연결해 주세요.');
        if (!passphrase) throw new Error('백업 암호를 입력해 주세요.');
        const folderId = await ensureDriveBookshelfFolder();
        const file = await findDriveSettingsVaultFile(folderId);
        if (!file) throw new Error('Drive에 암호화 설정 백업이 없습니다. 먼저 암호화 백업을 저장해 주세요.');
        const res = await driveApiFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(file.id) + '?alt=media');
        if (!res.ok) throw new Error('Drive 설정 백업을 내려받지 못했습니다.');
        const payload = await res.json();
        await decryptSettingsFromDriveVault(payload, passphrase);
        saveSettingsToStorage();
        updateTranslationSettingsInputsFromState();
        if (!silent) showToast('Google Drive에서 번역 설정과 API 키를 복원했습니다.');
        return true;
      }

      function updateTranslationSettingsInputsFromState() {
        state.settings.geminiModel = normalizeGeminiModel(state.settings.geminiModel);
        const pairs = {
          translationEngineSelect: state.settings.engine || 'gemini_api',
          geminiModelSelect: state.settings.geminiModel || DEFAULT_GEMINI_MODEL,
          geminiApiKeysInput: state.settings.geminiApiKeys || state.settings.geminiApiKey || '',
          azureApiKeyInput: state.settings.azureApiKey || '',
          azureRegionInput: state.settings.azureRegion || '',
          groqApiKeyInput: state.settings.groqApiKey || '',
          groqModelInput: state.settings.groqModel || 'openai/gpt-oss-120b',
          translationPromptTextarea: state.settings.translationPrompt || '',
          glossaryTextarea: state.settings.textReplacements || '',
          characterStyleRulesTextarea: state.settings.characterStyleRules || ''
        };
        Object.keys(pairs).forEach(function(id) {
          const el = document.getElementById(id);
          if (el) el.value = pairs[id];
        });
        const groqEnabledInput = document.getElementById('groqAutoEnabledInput');
        if (groqEnabledInput) groqEnabledInput.checked = state.settings.groqEnabled !== false;
        const azureEnabledInput = document.getElementById('azureAutoEnabledInput');
        if (azureEnabledInput) azureEnabledInput.checked = state.settings.azureEnabled !== false;
        const workersAiEnabledInput = document.getElementById('workersAiAutoEnabledInput');
        if (workersAiEnabledInput) workersAiEnabledInput.checked = state.settings.workersAiEnabled !== false;
        const workersAiModelInput = document.getElementById('workersAiModelInput');
        if (workersAiModelInput) workersAiModelInput.value = state.settings.workersAiModel || '@cf/zai-org/glm-4.7-flash';
        const cooldownInput = document.getElementById('geminiCooldownEnabledInput');
        if (cooldownInput) cooldownInput.checked = state.settings.geminiCooldownEnabled !== false;
        const paragraphCheckInput = document.getElementById('qualityParagraphCountEnabledInput');
        if (paragraphCheckInput) paragraphCheckInput.checked = state.settings.qualityParagraphCountEnabled !== false;
        const englishCheckInput = document.getElementById('qualityEnglishResidueEnabledInput');
        if (englishCheckInput) englishCheckInput.checked = state.settings.qualityEnglishResidueEnabled !== false;
        ao3NormalizeGeminiKeyLists();
        ao3RenderGeminiKeyListManager();
        ao3RefreshGeminiCooldownPanel();
        if (typeof syncSettingsEngineBoxes === 'function') syncSettingsEngineBoxes(state.settings.engine || 'gemini_api');
      }

      async function autoRestoreEncryptedSettingsAfterDriveConnect() {
        if (window._ao3VaultAutoRestoreDone || !isDriveTokenValid()) return;
        let passphrase = '';
        try { passphrase = sessionStorage.getItem(DRIVE_SETTINGS_VAULT_SESSION_KEY) || ''; } catch (e) {}
        if (!passphrase) return;
        window._ao3VaultAutoRestoreDone = true;
        try {
          await restoreEncryptedSettingsFromDrive(passphrase, true);
        } catch (err) {
          // Missing backups and wrong passwords should not break normal bookshelf sync.
          if (String(err && err.message || '').indexOf('암호가 틀렸') >= 0) {
            showToast('Drive 설정 백업을 자동 복원하지 못했습니다. 백업 암호를 다시 확인해 주세요.', 'warning');
          }
        }
      }


      // Fast incremental sync: cache Drive metadata and local timestamps so unchanged
      // novel files do not need to be downloaded on every bookshelf visit.
      function readDriveSyncIndex() {
        try {
          const parsed = JSON.parse(localStorage.getItem(DRIVE_SYNC_INDEX_KEY) || '{}');
          return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) { return {}; }
      }
      function writeDriveSyncIndex(index) {
        try { localStorage.setItem(DRIVE_SYNC_INDEX_KEY, JSON.stringify(index || {})); } catch (e) {}
      }
      function driveMetadataFingerprint(file) {
        return String(file && file.modifiedTime || '') + '|' + String(file && file.md5Checksum || '') + '|' + String(file && file.size || '');
      }
      async function driveMapLimit(items, limit, worker) {
        const results = new Array(items.length);
        let next = 0;
        async function runWorker() {
          while (true) {
            const index = next++;
            if (index >= items.length) return;
            try { results[index] = { ok: true, value: await worker(items[index], index) }; }
            catch (error) { results[index] = { ok: false, error: error }; }
          }
        }
        const workers = [];
        for (let i = 0; i < Math.min(Math.max(1, limit), items.length); i++) workers.push(runWorker());
        await Promise.all(workers);
        return results;
      }
      async function listDriveFolderJsonFiles(folderId) {
        const all = [];
        let pageToken = '';
        do {
          const params = new URLSearchParams({
            q: "'" + folderId + "' in parents and trashed = false and mimeType = 'application/json'",
            pageSize: '1000',
            fields: 'nextPageToken,files(id,name,modifiedTime,md5Checksum,size)'
          });
          if (pageToken) params.set('pageToken', pageToken);
          const res = await driveApiFetch('https://www.googleapis.com/drive/v3/files?' + params.toString());
          if (!res.ok) throw new Error('드라이브 파일 목록 조회 실패 (HTTP ' + res.status + ')');
          const data = await res.json();
          all.push.apply(all, data.files || []);
          pageToken = data.nextPageToken || '';
        } while (pageToken);
        return all;
      }

      async function syncWithGoogleDrive(silent) {
        if (state.currentView !== 'bookshelf') {
          if (!silent) showToast('Google Drive 동기화는 메인 책장에서만 실행됩니다.', 'info');
          if (isDriveTokenValid()) window._ao3DriveNeedsSync = true;
          return;
        }
        if (!isDriveTokenValid() || state.drive.syncing) return;
        state.drive.syncing = true;
        updateDriveUiStatus('“AO3서재” 폴더 동기화 중...', 'syncing');

        try {
          const folderId = await ensureDriveBookshelfFolder();
          // Independent small metadata documents stay first so settings/shelves are current.
          await Promise.all([
            syncDriveUserPreferencesWithGoogleDrive(folderId),
            syncCustomShelvesWithGoogleDrive(folderId, false),
            syncProviderQuotaWithGoogleDrive(folderId).catch(function(error) {
              window._ao3DriveNeedsQuotaSync = true;
              console.warn('Provider quota Drive sync failed:', error);
            })
          ]);
          window._ao3DriveNeedsPreferencesSync = false;
          const remoteFiles = await listDriveFolderJsonFiles(folderId);
          const localMap = {};
          state.novels.forEach(function(n) { if (n && n.id) localMap[n.id] = n; });
          const seenIds = {};
          const index = readDriveSyncIndex();
          const downloadTasks = [];
          const uploadTasks = [];
          const deleteTasks = [];
          let downloadedCount = 0;
          let uploadedCount = 0;
          let skippedCount = 0;

          remoteFiles.forEach(function(rf) {
            const match = (rf.name || '').match(/^ao3_novel_(.+)\.json$/);
            if (!match) return;
            const novelId = match[1];
            seenIds[novelId] = rf.id;
            if (state.deletedNovelIds && state.deletedNovelIds[novelId]) {
              deleteTasks.push({ novelId: novelId, fileId: rf.id });
              return;
            }
            const localNovel = localMap[novelId];
            const localTs = localNovel ? getNovelTimestamp(localNovel) : 0;
            const cached = index[novelId];
            const fingerprint = driveMetadataFingerprint(rf);
            const sameRemoteVersion = Boolean(cached && cached.fileId === rf.id && cached.fingerprint === fingerprint);
            if (localNovel && sameRemoteVersion) {
              if (localTs > Number(cached.localTs || 0)) {
                uploadTasks.push({ novel: localNovel, fileId: rf.id, novelId: novelId });
              } else {
                skippedCount++;
              }
              return;
            }
            downloadTasks.push({ file: rf, novelId: novelId, localTs: localTs, localNovel: localNovel, fingerprint: fingerprint });
          });

          // Download changed/new remote files in small parallel batches, not serially.
          const downloaded = await driveMapLimit(downloadTasks, 4, async function(task) {
            const res = await driveApiFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(task.file.id) + '?alt=media');
            if (!res.ok) throw new Error('소설 파일 다운로드 실패 (HTTP ' + res.status + ')');
            const novel = await res.json();
            if (!novel || !novel.id) throw new Error('소설 파일 형식이 올바르지 않습니다.');
            novel.driveFileId = task.file.id;
            return { task: task, novel: novel };
          });
          let downloadFailed = false;
          downloaded.forEach(function(result) {
            if (!result || !result.ok) { downloadFailed = true; return; }
            const task = result.value.task;
            const remoteNovel = result.value.novel;
            const currentLocal = localMap[task.novelId];
            const remoteTs = getNovelTimestamp(remoteNovel);
            const currentLocalTs = currentLocal ? getNovelTimestamp(currentLocal) : 0;
            if (!currentLocal) {
              state.novels.push(remoteNovel);
              localMap[task.novelId] = remoteNovel;
              downloadedCount++;
              index[task.novelId] = { fileId: task.file.id, fingerprint: task.fingerprint, localTs: remoteTs };
            } else if (remoteTs > currentLocalTs) {
              const idx = state.novels.findIndex(function(x) { return x.id === task.novelId; });
              if (idx !== -1) state.novels[idx] = remoteNovel;
              localMap[task.novelId] = remoteNovel;
              downloadedCount++;
              index[task.novelId] = { fileId: task.file.id, fingerprint: task.fingerprint, localTs: remoteTs };
            } else if (currentLocalTs > remoteTs) {
              uploadTasks.push({ novel: currentLocal, fileId: task.file.id, novelId: task.novelId });
            } else {
              index[task.novelId] = { fileId: task.file.id, fingerprint: task.fingerprint, localTs: currentLocalTs };
            }
          });

          // Upload changed and newly-created novels concurrently; each item still updates its own file.
          for (let j = 0; j < state.novels.length; j++) {
            const ln = state.novels[j];
            if (ln && ln.id && !seenIds[ln.id]) uploadTasks.push({ novel: ln, fileId: '', novelId: ln.id });
          }
          // Deduplicate uploads if the same novel was queued by both comparison paths.
          const uniqueUploads = [];
          const queuedIds = new Set();
          uploadTasks.forEach(function(task) {
            if (!task.novel || !task.novel.id || queuedIds.has(task.novel.id)) return;
            queuedIds.add(task.novel.id); uniqueUploads.push(task);
          });
          const uploadResults = await driveMapLimit(uniqueUploads, 3, async function(task) {
            const beforeTs = getNovelTimestamp(task.novel);
            await uploadSingleNovelToDrive(task.novel, task.fileId);
            return { task: task, beforeTs: beforeTs, fileId: task.novel.driveFileId || task.fileId || '' };
          });
          uploadResults.forEach(function(result) {
            if (!result || !result.ok) { downloadFailed = true; return; }
            const item = result.value;
            const task = item.task;
            const uploadedId = item.fileId;
            if (!uploadedId) { downloadFailed = true; return; }
            // No extra metadata request: mark this entry for a lightweight metadata comparison
            // on the next sync. The upload's content is already current locally.
            const uploadedMeta = task.novel._driveUploadMetadata || {};
            const uploadedFingerprint = driveMetadataFingerprint({ modifiedTime: uploadedMeta.modifiedTime, md5Checksum: uploadedMeta.md5Checksum, size: uploadedMeta.size });
            index[task.novelId] = { fileId: uploadedId, fingerprint: uploadedMeta.modifiedTime ? uploadedFingerprint : '', localTs: getNovelTimestamp(task.novel) || item.beforeTs };
            try { delete task.novel._driveUploadMetadata; } catch (e) {}
            uploadedCount++;
          });
          const deleteResults = await driveMapLimit(deleteTasks, 3, async function(task) {
            await deleteNovelFromDrive(task.novelId, task.fileId);
            delete index[task.novelId];
            return true;
          });
          deleteResults.forEach(function(result) { if (!result || !result.ok) downloadFailed = true; });

          state.drive.lastSyncAt = Date.now();
          state.drive.syncing = false;
          await idbSetNovels(state.novels).catch(function() {});
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.novels)); } catch (e) {}
          writeDriveSyncIndex(index);
          window._ao3DriveNeedsSync = downloadFailed;
          updateDriveUiStatus('AO3서재 동기화 완료 (' + state.novels.length + '권)', 'connected');
          updateHeaderBadges();
          if (state.currentView === 'bookshelf') renderBookshelf();
          if (!silent) {
            showToast('Google Drive 동기화 완료 · 내려받기 ' + downloadedCount + '권 · 업로드 ' + uploadedCount + '권 · 변경 없음 ' + skippedCount + '권' + (downloadFailed ? ' · 일부 항목 재확인 필요' : ''));
          }
        } catch (err) {
          state.drive.syncing = false;
          window._ao3DriveNeedsSync = true;
          if (err && err.message !== 'DRIVE_AUTH_EXPIRED') {
            updateDriveUiStatus('동기화 오류 발생', 'disconnected');
            if (!silent) showToast('Google Drive 동기화 오류: ' + (err.message || err), 'error');
          }
        }
      }

      function saveSettingsToStorage(suppressDriveSync) {
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
        } catch (err) {
          // Ignore
        }
        if (!suppressDriveSync) scheduleDriveUserPreferencesSync();
      }

      function clampReaderSpacing(value, min, max, fallback) {
        const n = Number(value);
        return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
      }

      function normalizeReaderTheme(theme) {
        if (theme === 'green') return 'green';
        if (theme === 'dark') return 'dark';
        // Migrate old white/sepia settings to the familiar paper palette.
        if (theme === 'paper' || theme === 'white' || theme === 'sepia') return 'paper';
        return 'dark';
      }

      function saveReaderPreferences(suppressDriveSync) {
        try {
          localStorage.setItem(READER_PREFS_KEY, JSON.stringify({
            theme: state.reader.theme,
            fontSize: state.reader.fontSize,
            fontFamily: state.reader.fontFamily || 'noto',
            fontWeight: [300, 400, 500].includes(Number(state.reader.fontWeight)) ? Number(state.reader.fontWeight) : 400,
            horizontalPadding: clampReaderSpacing(state.reader.horizontalPadding, 20, 30, 25),
            lineHeightPx: clampReaderSpacing(state.reader.lineHeightPx, 10, 25, 20),
            paragraphSpacingPx: clampReaderSpacing(state.reader.paragraphSpacingPx, 2, 10, 5),
            firstLineIndentPx: clampReaderSpacing(state.reader.firstLineIndentPx, 0, 10, 0),
            bilingual: state.reader.bilingual,
            showOriginalDialogue: state.reader.showOriginalDialogue === true
          }));
        } catch (err) {
          // Private browsing or storage restrictions must not block reading.
        }
        if (!suppressDriveSync) scheduleDriveUserPreferencesSync();
      }

      // Toast notifications are reserved for actionable warnings/errors and a few important completions.
      const toastLastShownAt = new Map();
      function showToast(message, type) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const text = String(message == null ? '' : message).trim();
        if (!text) return;

        const failurePattern = /오류|실패|불러오지 못|찾지 못|인식하지 못|입력해 주세요|선택해 주세요|먼저 .*|잘못된|올바른|필수|비어 있|중단|권한|만료|연결이 필요|필요합니다|초과|한도|거부|재시도|저장하지 못|동기화하지 못|복원하지 못|처리하지 못/i;
        const criticalSuccessPattern = /모든 챕터의 한국어 번역이 완료되었습니다|백업 파일.*내려받았습니다|총 \d+권의 소설 데이터가 서재에 복원되었습니다|Google Drive에서 번역 설정과 API 키를 복원했습니다|번역 설정과 API 키를 암호화해 Google Drive에 저장했습니다/i;
        const importantInfoPattern = /메인 책장에서만 실행됩니다|백업 암호를 다시 확인해 주세요/i;
        let kind = type || 'success';

        // Some older call sites did not classify validation failures; preserve those notices.
        if (kind === 'success' && failurePattern.test(text)) {
          kind = /오류|실패|못|초과|한도|거부/i.test(text) ? 'error' : 'warning';
        }
        if (kind === 'info') {
          if (importantInfoPattern.test(text)) kind = 'warning';
          else return;
        }
        // Avoid routine background-save, per-chapter, queue and sync-success chatter.
        if (kind === 'success' && !criticalSuccessPattern.test(text)) return;

        const now = Date.now();
        const dedupeKey = kind + ':' + text;
        const previous = toastLastShownAt.get(dedupeKey) || 0;
        if (now - previous < 8000) return;
        toastLastShownAt.set(dedupeKey, now);
        if (toastLastShownAt.size > 80) {
          toastLastShownAt.forEach((time, key) => { if (now - time > 60000) toastLastShownAt.delete(key); });
        }

        const bgClass = kind === 'error'
          ? 'bg-rose-700 text-white'
          : kind === 'warning'
            ? 'bg-amber-600 text-white'
            : 'bg-slate-900 text-white';
        const toast = document.createElement('div');
        toast.className = 'pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-xs sm:text-sm font-medium flex items-center justify-between gap-3 transition-all ' + bgClass;
        toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
        toast.innerHTML = '<span></span><button type="button" aria-label="알림 닫기" class="opacity-75 hover:opacity-100 font-bold">✕</button>';
        toast.querySelector('span').textContent = text;
        toast.querySelector('button').addEventListener('click', function() { toast.remove(); });

        // Keep the notification area quiet: at most two high-priority notices at once.
        while (container.children.length >= 2) container.firstElementChild.remove();
        container.appendChild(toast);
        const lifetime = kind === 'error' ? 8000 : kind === 'warning' ? 6000 : 4000;
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, lifetime);
      }

      // Escape HTML helper
      function escapeHtml(str) {
        return String(str || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      // Collect all unique bookmark tags across novels and paragraphs
      function getAllBookmarkTagsWithCounts() {
        const tagMap = {};
        state.novels.forEach(function(novel) {
          if (novel.bookmarked && Array.isArray(novel.bookmarkTags)) {
            novel.bookmarkTags.forEach(function(t) {
              const clean = t.trim();
              if (clean) tagMap[clean] = (tagMap[clean] || 0) + 1;
            });
          }
          (novel.chapters || []).forEach(function(ch) {
            (ch.paragraphs || []).forEach(function(p) {
              if (p.bookmarked && Array.isArray(p.tags)) {
                p.tags.forEach(function(t) {
                  const clean = t.trim();
                  if (clean) tagMap[clean] = (tagMap[clean] || 0) + 1;
                });
              }
            });
          });
          (novel.sentenceBookmarks || []).forEach(function(b) {
            if (b.bookmarked !== false && Array.isArray(b.tags)) {
              b.tags.forEach(function(t) {
                const clean = String(t || '').trim();
                if (clean) tagMap[clean] = (tagMap[clean] || 0) + 1;
              });
            }
          });
        });
        return tagMap;
      }

      // Count total bookmarks (novels + passages)
      function getTotalBookmarkCount() {
        let count = 0;
        state.novels.forEach(function(n) {
          if (n.bookmarked) count += 1;
          (n.chapters || []).forEach(function(ch) {
            (ch.paragraphs || []).forEach(function(p) {
              if (p.bookmarked) count += 1;
            });
          });
          count += (n.sentenceBookmarks || []).filter(function(b) { return b.bookmarked !== false; }).length;
        });
        return count;
      }

      // Update header badges
      function updateHeaderBadges() {
        document.getElementById('navNovelCountBadge').textContent = String(state.novels.length);
        document.getElementById('navBookmarkCountBadge').textContent = String(getTotalBookmarkCount());
        const draftBadge = document.getElementById('navDraftCountBadge');
        if (state.draftChapters.length > 0) {
          draftBadge.textContent = String(state.draftChapters.length);
          draftBadge.classList.remove('hidden');
        } else {
          draftBadge.classList.add('hidden');
        }
      }

      // Switch active view
      function switchView(viewName) {
        state.currentView = viewName;
        document.body.classList.toggle('reader-reading', viewName === 'reader');
        if (viewName !== 'reader') {
          document.body.removeAttribute('data-reader-canvas-theme');
          document.documentElement.removeAttribute('data-reader-canvas-theme');
        }
        const appHeader = document.querySelector('body > header');
        if (appHeader) appHeader.classList.remove('reader-app-header-hidden');
        document.documentElement.classList.remove('reader-app-header-hidden');
        const views = {
          bookshelf: document.getElementById('viewBookshelf'),
          customBookshelves: document.getElementById('viewCustomBookshelves'),
          studio: document.getElementById('viewStudio'),
          bookmarks: document.getElementById('viewBookmarks'),
          reader: document.getElementById('viewReader')
        };
        Object.keys(views).forEach(function(k) {
          if (k === viewName) {
            views[k].classList.remove('hidden');
          } else {
            views[k].classList.add('hidden');
          }
        });

        // Show Google Drive quick sync only on the main bookshelf.
        const driveQuickSyncButton = document.getElementById('driveSyncBtn');
        if (driveQuickSyncButton) driveQuickSyncButton.classList.toggle('hidden', viewName !== 'bookshelf');

        // Update nav tab styles
        document.querySelectorAll('.nav-tab-btn').forEach(function(btn) {
          const target = btn.getAttribute('data-view');
          if (target === viewName) {
            btn.setAttribute('aria-current', 'page');
            btn.className = 'nav-tab-btn px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 bg-white text-slate-900 shadow-sm';
          } else {
            btn.removeAttribute('aria-current');
            btn.className = 'nav-tab-btn px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 text-slate-600 hover:text-slate-900';
          }
        });

        updateHeaderBadges();
        if (viewName === 'bookshelf') {
          renderBookshelf();
          if (isDriveTokenValid() && !state.drive.syncing) {
            const vaultPassphrase = (function() { try { return sessionStorage.getItem(DRIVE_SETTINGS_VAULT_SESSION_KEY) || ''; } catch (e) { return ''; } })();
            if (window._ao3DriveNeedsSettingsBackup && vaultPassphrase) {
              window._ao3DriveNeedsSettingsBackup = false;
              saveEncryptedSettingsToDrive(vaultPassphrase, true).catch(function() { window._ao3DriveNeedsSettingsBackup = true; });
            }
            if (window._ao3DriveNeedsSync || !state.drive.lastSyncAt || Date.now() - Number(state.drive.lastSyncAt || 0) > 5 * 60 * 1000) {
              syncWithGoogleDrive(true).catch(function() { window._ao3DriveNeedsSync = true; });
            }
          }
        }
        if (viewName === 'customBookshelves') renderCustomBookshelves();
        if (viewName === 'studio') renderStudio();
        if (viewName === 'bookmarks') renderBookmarksManager();
        if (viewName === 'reader') renderReader();
        if (viewName !== 'bookshelf' && state.drive.syncing) updateDriveUiStatus('Google Drive 연결됨', 'connected');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // ==================== BOOKSHELF RENDERING ====================
      function renderBookshelf() {
        updateHeaderBadges();
        const tagBar = document.getElementById('shelfTagFilterBar');
        const tagCounts = getAllBookmarkTagsWithCounts();
        const tags = Object.keys(tagCounts).sort();

        // Render tag filter bar
        let tagHtml = '';
        const activeAllClass = !state.shelfFilter.selectedTag
          ? 'bg-rose-700 text-white border-rose-700'
          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
        tagHtml += '<button type="button" data-shelf-tag="" class="shelf-tag-pill px-2.5 py-1 rounded-full text-xs font-semibold border transition ' + activeAllClass + '">전체 태그</button>';

        tags.forEach(function(t) {
          const isSelected = state.shelfFilter.selectedTag === t;
          const cls = isSelected
            ? 'bg-amber-500 text-white border-amber-500'
            : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100';
          tagHtml += '<button type="button" data-shelf-tag="' + escapeHtml(t) + '" class="shelf-tag-pill px-2.5 py-1 rounded-full text-xs font-semibold border transition ' + cls + '">#' + escapeHtml(t) + ' <span class="opacity-75">(' + tagCounts[t] + ')</span></button>';
        });
        tagBar.innerHTML = tagHtml;
        const tagCountBadge = document.getElementById('shelfTagFilterTagCount');
        if (tagCountBadge) tagCountBadge.textContent = String(tags.length);

        tagBar.querySelectorAll('.shelf-tag-pill').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const val = btn.getAttribute('data-shelf-tag');
            state.shelfFilter.selectedTag = val ? val : null;
            renderBookshelf();
          });
        });

        // Filter novels
        const q = state.shelfFilter.search.trim().toLowerCase();
        let filtered = state.novels.filter(function(novel) {
          if (state.shelfFilter.onlyBookmarked && !novel.bookmarked) {
            const hasBookmarkedPassage = (novel.chapters || []).some(function(ch) {
              return (ch.paragraphs || []).some(function(p) { return p.bookmarked; });
            });
            if (!hasBookmarkedPassage) return false;
          }

          if (state.shelfFilter.selectedTag) {
            const targetTag = state.shelfFilter.selectedTag;
            const onNovel = novel.bookmarked && Array.isArray(novel.bookmarkTags) && novel.bookmarkTags.includes(targetTag);
            const onPassage = (novel.chapters || []).some(function(ch) {
              return (ch.paragraphs || []).some(function(p) {
                return p.bookmarked && Array.isArray(p.tags) && p.tags.includes(targetTag);
              });
            });
            if (!onNovel && !onPassage) return false;
          }

          if (q) {
            const inTitle = (novel.title || '').toLowerCase().includes(q);
            const inAuthor = (novel.author || '').toLowerCase().includes(q);
            const inFandom = (novel.fandom || '').toLowerCase().includes(q);
            const inSummary = (novel.summary || '').toLowerCase().includes(q);
            const inTags = (novel.bookmarkTags || []).some(function(t) { return t.toLowerCase().includes(q); });
            const inChapters = (novel.chapters || []).some(function(ch) {
              if ((ch.title || '').toLowerCase().includes(q)) return true;
              return (ch.paragraphs || []).some(function(p) {
                return (p.ko || '').toLowerCase().includes(q) || (p.en || '').toLowerCase().includes(q) || (p.tags || []).some(function(pt) { return pt.toLowerCase().includes(q); });
              });
            });
            return inTitle || inAuthor || inFandom || inSummary || inTags || inChapters;
          }
          return true;
        });

        // Sort novels
        const sortBy = state.shelfFilter.sortBy;
        filtered.sort(function(a, b) {
          if (sortBy === 'recentRead') return (b.lastReadAt || b.createdAt || 0) - (a.lastReadAt || a.createdAt || 0);
          if (sortBy === 'createdDesc') return (b.createdAt || 0) - (a.createdAt || 0);
          if (sortBy === 'chaptersAsc') return (a.chapters ? a.chapters.length : 0) - (b.chapters ? b.chapters.length : 0);
          if (sortBy === 'chaptersDesc') return (b.chapters ? b.chapters.length : 0) - (a.chapters ? a.chapters.length : 0);
          return 0;
        });

        const grid = document.getElementById('bookshelfGrid');
        if (filtered.length === 0) {
          grid.innerHTML = '' +
            '<div class="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">' +
              '<p class="text-base font-bold text-slate-800">조건에 맞는 소설이 책장에 없습니다</p>' +
              '<p class="text-xs sm:text-sm text-slate-500">번역 · 묶기 작업실에서 AO3 영문 소설을 가져와 한국어로 번역하고 첫 단행본을 책장에 저장해 보세요.</p>' +
              '<button id="emptyShelfGoStudioBtn" type="button" class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs sm:text-sm font-semibold transition">+ 새 AO3 소설 번역 및 책장 저장하기</button>' +
            '</div>';
          const emptyBtn = document.getElementById('emptyShelfGoStudioBtn');
          if (emptyBtn) {
            emptyBtn.addEventListener('click', function() { switchView('studio'); });
          }
          return;
        }

        grid.innerHTML = filtered.map(function(novel) {
          const chCount = (novel.chapters || []).length;
          const liveTranslation = novel.translationProgress && novel.translationProgress.status === 'translating'
            ? '<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[11px]" aria-label="번역 진행률 ' + Math.max(0, Math.min(100, Number(novel.translationProgress.percentage || 0))) + '%">번역 중 · ' + Math.max(0, Math.min(100, Number(novel.translationProgress.percentage || 0))) + '%</span>'
            : '';
          let totalParagraphs = 0;
          let passageBookmarkCount = 0;
          const passageTagSet = new Set();
          (novel.chapters || []).forEach(function(ch) {
            (ch.paragraphs || []).forEach(function(p) {
              totalParagraphs += 1;
              if (p.bookmarked) {
                passageBookmarkCount += 1;
                (p.tags || []).forEach(function(pt) { passageTagSet.add(pt); });
              }
            });
          });

          const lastChIdx = Math.min(novel.lastReadChapterIndex || 0, Math.max(0, chCount - 1));
          const lastChTitle = novel.chapters && novel.chapters[lastChIdx] ? novel.chapters[lastChIdx].title : '챕터 1';

          const allTags = [];
          (novel.bookmarkTags || []).forEach(function(t) { allTags.push({ tag: t, kind: 'novel' }); });
          Array.from(passageTagSet).forEach(function(t) {
            if (!(novel.bookmarkTags || []).includes(t)) {
              allTags.push({ tag: t, kind: 'passage' });
            }
          });

          const tagsMarkup = allTags.length > 0
            ? allTags.map(function(item) {
                return '<button type="button" data-card-tag="' + escapeHtml(item.tag) + '" class="card-tag-filter-btn px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition">#' + escapeHtml(item.tag) + '</button>';
              }).join('')
            : '<span class="text-[11px] text-slate-400">등록된 북마크 태그 없음</span>';

          const bookmarkBtnClass = novel.bookmarked
            ? 'text-amber-500 bg-amber-50 border-amber-200'
            : 'text-slate-400 bg-white border-slate-200 hover:text-amber-500';

          return '' +
            '<article class="shelf-card bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between gap-4">' +
              '<div class="shelf-card-main space-y-2.5">' +
                '<div class="flex items-start justify-between gap-2">' +
                  '<div class="shelf-card-title-block min-w-0">' +
                    '<div class="shelf-card-badges flex items-center gap-1.5 flex-wrap mb-1">' +
                      '<span class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 font-bold text-[11px]">단행본 · ' + chCount + '개 챕터</span>' +
                      liveTranslation +
                      (novel.fandom ? '<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">' + escapeHtml(novel.fandom) + '</span>' : '') +
                      (passageBookmarkCount > 0 ? '<span class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold text-[11px]">문단 책갈피 ' + passageBookmarkCount + '개</span>' : '') +
                    '</div>' +
                    '<h3 data-title-split-version="48" class="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words cursor-pointer hover:text-rose-700 transition card-open-reader" data-novel-id="' + escapeHtml(novel.id) + '">' +
                      renderNovelTitleMarkup(novel.title) +
                    '</h3>' +
                    '<p class="text-xs text-slate-500 mt-0.5">' + escapeHtml(novel.author || '작자 미상') + ' · 총 ' + totalParagraphs + '문단</p>' +
                  '</div>' +
                '</div>' +
                (novel.summary ? '<p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">' + escapeHtml(novel.summary) + '</p>' : '') +
                '<div class="shelf-card-tags flex items-center gap-1.5 flex-wrap pt-1">' +
                  tagsMarkup +
                  '<button type="button" data-bm-novel-id="' + escapeHtml(novel.id) + '" class="card-bookmark-btn shelf-card-tag-edit text-[11px] font-semibold text-amber-800 hover:underline ml-1">+ 태그 편집</button>' +
                '</div>' +
              '</div>' +

              '<div class="shelf-card-actions pt-2 border-t border-slate-100 flex items-center justify-between gap-2">' +
                '<div class="flex items-center gap-1.5 shrink-0">' +
                  '<button type="button" data-bm-novel-id="' + escapeHtml(novel.id) + '" title="북마크 및 태그 설정" aria-label="북마크 및 태그 설정" class="card-bookmark-btn p-2 rounded-xl border transition ' + bookmarkBtnClass + '">' +
                    '<svg class="w-4 h-4 ' + (novel.bookmarked ? 'fill-amber-500' : '') + '" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"/></svg>' +
                  '</button>' +
                  '<button type="button" data-edit-novel-id="' + escapeHtml(novel.id) + '" title="제목 및 정보 수정" aria-label="제목 및 정보 수정" class="card-edit-btn p-2 rounded-xl border border-slate-200 text-slate-500 transition">' +
                    '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.14l-2.812.938.938-2.812a4.5 4.5 0 011.14-1.89l12.654-12.654z"/></svg>' +
                  '</button>' +
                  '<button type="button" data-delete-novel-id="' + escapeHtml(novel.id) + '" title="소설 삭제" aria-label="소설 삭제" class="card-delete-btn p-2 rounded-xl border border-slate-200 text-slate-400 transition">' +
                    '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>' +
                  '</button>' +
                '</div>' +
                '<button type="button" data-append-novel-id="' + escapeHtml(novel.id) + '" class="card-append-btn px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition">+ 챕터 추가</button>' +
              '</div>' +
            '</article>';
        }).join('');

        // Bind events on rendered cards
        grid.querySelectorAll('.card-open-reader').forEach(function(el) {
          el.addEventListener('click', function() {
            const novelId = el.getAttribute('data-novel-id');
            openNovelInReader(novelId);
          });
        });

        grid.querySelectorAll('.card-bookmark-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const novelId = btn.getAttribute('data-bm-novel-id');
            openBookmarkModalForNovel(novelId);
          });
        });

        grid.querySelectorAll('.card-edit-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const novelId = btn.getAttribute('data-edit-novel-id');
            openEditNovelModal(novelId);
          });
        });

        grid.querySelectorAll('.card-delete-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const novelId = btn.getAttribute('data-delete-novel-id');
            openDeleteNovelModal(novelId);
          });
        });

        grid.querySelectorAll('.card-append-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const novelId = btn.getAttribute('data-append-novel-id');
            state.studioBindMode = 'append';
            switchView('studio');
            const select = document.getElementById('appendTargetNovelSelect');
            if (select) select.value = novelId;
          });
        });

        grid.querySelectorAll('.card-tag-filter-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const tag = btn.getAttribute('data-card-tag');
            state.shelfFilter.selectedTag = tag;
            renderBookshelf();
          });
        });
      }

      // ==================== STUDIO (FETCH, TRANSLATE, BIND) ====================
      function splitLongParagraphIfNeeded(text) {
        const cleaned = String(text || '').trim();
        if (!cleaned) return [];
        if (cleaned.length <= 850) return [cleaned];
        // Split long paragraphs on sentence boundaries so translation APIs never fail
        const sentences = cleaned.match(/[^.!?]+[.!?]+["'”’)]*\s*|[^.!?]+$/g) || [cleaned];
        const chunks = [];
        let current = '';
        sentences.forEach(function(s) {
          if ((current + ' ' + s).trim().length > 850 && current) {
            chunks.push(current.trim());
            current = s.trim();
          } else {
            current = (current + ' ' + s).trim();
          }
        });
        if (current) chunks.push(current.trim());
        return chunks;
      }

      function isSceneDividerLine(str) {
        const s = String(str || '').trim();
        if (!s) return false;
        return /^(\*\s*\*\s*\*+|-{3,}|~{3,}|—{2,}|={3,}|#\s*#\s*#|[\*\-~—•·]{3,})$/.test(s);
      }

      // Remove accidental duplicate source text before translation. AO3 proxy responses can
      // occasionally expose overlapping chapter blocks. Keep short repeated dialogue, which
      // is often intentional, but remove repeated long paragraphs and repeated 3+ paragraph runs.
      function dedupeRepeatedSourceParagraphs(blocks) {
        const source = (Array.isArray(blocks) ? blocks : []).map(function(value) {
          return String(value || '').trim();
        });
        const fingerprint = function(value) {
          return String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
        };
        const output = [];
        const seenLong = new Set();
        let removed = 0;
        for (let i = 0; i < source.length;) {
          const current = source[i];
          if (!current) { i += 1; continue; }
          const currentKey = fingerprint(current);
          let repeatedRun = 0;
          if (current !== '* * *' && currentKey.length >= 12) {
            for (let j = 0; j < output.length; j++) {
              let run = 0;
              let chars = 0;
              while (i + run < source.length && j + run < output.length &&
                source[i + run] !== '* * *' && fingerprint(source[i + run]) === fingerprint(output[j + run])) {
                chars += source[i + run].length;
                run += 1;
              }
              if (run >= 3 && chars >= 100) { repeatedRun = run; break; }
            }
          }
          if (repeatedRun) {
            removed += repeatedRun;
            i += repeatedRun;
            continue;
          }
          // Only dedupe standalone paragraphs when they are long enough to be unambiguous;
          // short dialogue and common phrases may legitimately recur in a story.
          if (current !== '* * *' && currentKey.length >= 100) {
            if (seenLong.has(currentKey)) { removed += 1; i += 1; continue; }
            seenLong.add(currentKey);
          }
          output.push(current);
          i += 1;
        }
        if (removed > 0) {
          console.info('[AO3 import] Removed ' + removed + ' duplicated source paragraph(s) before translation.');
        }
        return output;
      }

      function stripAo3ImagePlaceholderText(value) {
        return String(value || '')
          .replace(/!\[\s*image\s*#?\s*\d+\s*\](?:\([^)]*\))?/gi, ' ')
          .replace(/\[\s*image\s*#?\s*\d+\s*\]\([^)]*\)/gi, ' ')
          .replace(/!\s*image\s*#?\s*\d+\b/gi, ' ')
          .replace(/[ \t]{2,}/g, ' ');
      }

      function normalizeAndMergeBrokenParagraphs(rawBlocks) {
        const cleanedBlocks = [];
        rawBlocks.forEach(function(raw) {
          const s = stripAo3ImagePlaceholderText(raw).replace(/\r/g, '').trim();
          if (!s || s === 'Chapter Text' || s === 'Notes:' || s === 'Summary:') return;
          if (isSceneDividerLine(s)) {
            if (cleanedBlocks[cleanedBlocks.length - 1] !== '* * *') {
              cleanedBlocks.push('* * *');
            }
            return;
          }
          // Split on double blank lines, while joining accidental single linewraps inside the same paragraph
          const subParagraphs = s.split(/\n\s*\n+/);
          subParagraphs.forEach(function(sub) {
            const singleLineMerged = sub.replace(/\s*\n\s*/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();
            if (!singleLineMerged) return;
            if (isSceneDividerLine(singleLineMerged)) {
              if (cleanedBlocks[cleanedBlocks.length - 1] !== '* * *') {
                cleanedBlocks.push('* * *');
              }
              return;
            }
            // If previous paragraph was broken mid-sentence (no terminal punctuation) and current starts with lowercase, merge them
            if (cleanedBlocks.length > 0) {
              const prev = cleanedBlocks[cleanedBlocks.length - 1];
              if (
                prev !== '* * *' &&
                !/[.!?…"”’'")\]\-—:]$/.test(prev) &&
                /^[a-z]/.test(singleLineMerged)
              ) {
                cleanedBlocks[cleanedBlocks.length - 1] = prev + ' ' + singleLineMerged;
                return;
              }
            }
            splitLongParagraphIfNeeded(singleLineMerged).forEach(function(chunk) {
              cleanedBlocks.push(chunk);
            });
          });
        });
        return dedupeRepeatedSourceParagraphs(cleanedBlocks);
      }

      function extractParagraphsFromElement(containerEl) {
        const clone = containerEl.cloneNode(true);
        clone.querySelectorAll('h3.landmark.heading, script, style, .landmark, #preface, .meta').forEach(function(el) {
          el.remove();
        });
        clone.querySelectorAll('nav, .actions, #feedback, .comments, .comment').forEach(function(el) { el.remove(); });
        clone.querySelectorAll('img, picture, source').forEach(function(el) { el.remove(); });

        clone.querySelectorAll('br').forEach(function(br) {
          br.replaceWith('\n');
        });

        const blockNodes = clone.querySelectorAll('p, blockquote, h2, h3, h4, hr, li');
        const rawList = [];

        if (blockNodes.length > 0) {
          blockNodes.forEach(function(node) {
            if (node.tagName === 'HR') {
              rawList.push('* * *');
              return;
            }
            if (node.tagName === 'BLOCKQUOTE' && node.querySelector('p')) {
              return;
            }
            rawList.push(node.textContent || '');
          });
        } else {
          const fallbackLines = (clone.textContent || '').split(/\n\s*\n+/);
          fallbackLines.forEach(function(line) {
            rawList.push(line);
          });
        }
        return normalizeAndMergeBrokenParagraphs(rawList);
      }

      // Normalize the author/source field. AO3 is the import source, not part of the author's name.
      function cleanAo3AuthorName(value) {
        return String(value || '')
          .replace(/\s*\(\s*AO3\s*\)\s*$/i, '')
          .replace(/\s+/g, ' ')
          .trim();
      }


      function normalizeAo3AuthorNamesInLibrary() {
        if (!Array.isArray(state.novels)) return false;
        let changed = false;
        state.novels.forEach(function(novel) {
          if (!novel || typeof novel.author !== 'string') return;
          const cleaned = cleanAo3AuthorName(novel.author);
          if (cleaned !== novel.author) {
            novel.author = cleaned;
            changed = true;
          }
        });
        if (changed) {
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.novels)); } catch (e) {}
          if (typeof idbSetNovels === 'function') idbSetNovels(state.novels).catch(function() {});
        }
        return changed;
      }

      function parseAo3HtmlDocument(htmlText, fallbackSourceUrl, options) {
        if (!htmlText || typeof htmlText !== 'string') {
          return { meta: {}, chapters: [], reason: 'empty' };
        }
        const includeTags = !(options && options.includeTags === false);

        // Detect Cloudflare challenge and AO3 access interstitials before extracting metadata.
        if (
          /just a moment\.\.\.|cf-browser-verification|attention required!\s*\|\s*cloudflare|shields are up!?\s*\|\s*archive of our own|_cf_chl_opt|cf-chl-/i.test(htmlText)
        ) {
          return { meta: {}, chapters: [], reason: 'cloudflare' };
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const pageText = String(doc.body && doc.body.textContent || '').replace(/\s+/g, ' ').trim();
        if (/this work is only available to registered users of the archive/i.test(pageText) ||
          (/new_user_session/i.test(htmlText) && !doc.querySelector('#workskin, #chapters, .userstuff'))) {
          return { meta: {}, chapters: [], reason: 'locked' };
        }

        const adultWarning = doc.querySelector('#adult_warning, #adult-warning, .adult-warning') ||
          (/this work could have adult content|this work may contain adult content/i.test(pageText) &&
            /yes\s*,?\s*continue|if you continue,? you have agreed/i.test(pageText));
        if (adultWarning) return { meta: {}, chapters: [], reason: 'adult_gate' };

        // Read each metadata field only from its own AO3 metadata region. Never infer
        // author/fandom by splitting <title>: AO3 lets users customize that order.
        const workTitleEl =
          doc.querySelector('#workskin .preface.group h2.title.heading') ||
          doc.querySelector('#workskin .preface h2.title.heading') ||
          doc.querySelector('#preface h2.title.heading') ||
          doc.querySelector('#preface h2.title') ||
          doc.querySelector('h2.title.heading') ||
          doc.querySelector('h2.title');

        const workPreface = doc.querySelector('#workskin .preface.group') ||
          doc.querySelector('#workskin .preface') || doc.querySelector('#preface') ||
          doc.querySelector('.work.meta.group');
        const authorLinks = workPreface
          ? Array.from(workPreface.querySelectorAll('.byline a[rel="author"], h3.byline a[rel="author"]'))
              .map(function(a) { return a.textContent.replace(/\s+/g, ' ').trim(); }).filter(Boolean)
          : [];
        const workAuthorEl = workPreface ? workPreface.querySelector('h3.byline.heading, .byline') : null;
        const authorMetaEl = doc.querySelector('meta[name="author"], meta[property="article:author"]');

        const workFandomEls = Array.from(doc.querySelectorAll('#workskin .preface dd.fandom.tags a.tag, #preface dd.fandom.tags a.tag, dd.fandom.tags a.tag'));
        const workCategoryEls = Array.from(doc.querySelectorAll('#workskin .preface dd.category.tags a.tag, #preface dd.category.tags a.tag, dd.category.tags a.tag'));
        const workTagEls = includeTags ? Array.from(doc.querySelectorAll('#workskin .preface dd.relationship.tags a.tag, #workskin .preface dd.character.tags a.tag, #workskin .preface dd.freeform.tags a.tag, #workskin .preface dd.warning.tags a.tag, #preface dd.relationship.tags a.tag, #preface dd.character.tags a.tag, #preface dd.freeform.tags a.tag, #preface dd.warning.tags a.tag, dd.relationship.tags a.tag, dd.character.tags a.tag, dd.freeform.tags a.tag, dd.warning.tags a.tag')) : [];

        const cleanMetaText = function(value) {
          return String(value || '').replace(/\s+/g, ' ').trim();
        };
        const metadataTagsForLabels = function(labels) {
          const values = [];
          Array.from(doc.querySelectorAll('dt')).forEach(function(term) {
            const label = cleanMetaText(term.textContent).replace(/:$/, '').toLowerCase();
            if (labels.indexOf(label) === -1) return;
            const valueNode = term.nextElementSibling;
            if (!valueNode || valueNode.tagName !== 'DD') return;
            const linkedTags = Array.from(valueNode.querySelectorAll('a.tag')).map(function(el) { return cleanMetaText(el.textContent); }).filter(Boolean);
            const plainText = cleanMetaText(valueNode.textContent);
            (linkedTags.length ? linkedTags : plainText.split(/,\s*/)).forEach(function(value) { if (value) values.push(value); });
          });
          return Array.from(new Set(values));
        };
        const pageTitleRaw = cleanMetaText(doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
          doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
          (doc.querySelector('title') ? doc.querySelector('title').textContent : ''))
          .replace(/\s*\[Archive of Our Own\]\s*$/i, '')
          .replace(/\s*-\s*Archive of Our Own\s*$/i, '').trim();
        // Title fallback only. Do not derive author or fandom from the browser title.
        const fallbackTitle = pageTitleRaw ? pageTitleRaw.split(/\s+-\s+/)[0].trim() : '';
        const rawTitle = cleanMetaText(workTitleEl ? workTitleEl.textContent : '') || fallbackTitle;
        const rawAuthor = authorLinks.length > 0
          ? Array.from(new Set(authorLinks)).join(', ')
          : cleanMetaText(workAuthorEl ? workAuthorEl.textContent.replace(/^by\s+/i, '') :
              (authorMetaEl ? authorMetaEl.getAttribute('content') : ''));

        const fandoms = Array.from(new Set(workFandomEls.map(function(el) { return cleanMetaText(el.textContent); }).filter(Boolean).concat(metadataTagsForLabels(['fandom', 'fandoms']))));
        const categories = Array.from(new Set(workCategoryEls.map(function(el) { return cleanMetaText(el.textContent); }).filter(Boolean).concat(metadataTagsForLabels(['category', 'categories']))));
        const tags = includeTags
          ? Array.from(new Set(workTagEls.map(function(el) { return cleanMetaText(el.textContent); }).filter(Boolean).concat(metadataTagsForLabels(['archive warning', 'archive warnings', 'relationship', 'relationships', 'character', 'characters', 'additional tags']))))
          : [];
        const extractedMeta = {
          title: rawTitle || 'AO3 추출 작품',
          author: cleanAo3AuthorName(rawAuthor) || 'Anonymous',
          fandom: fandoms.join(', '),
          categories: categories,
          tags: tags,
          genre: Array.from(new Set(fandoms.concat(categories))).join(' · '),
          summary: ''
        };

        const extractedChapters = [];
        const cleanChapterTitle = function(value, index) {
          let title = cleanMetaText(value)
            .replace(/^chapter\s+text$/i, '')
            .replace(/^chapter\s+content$/i, '')
            .replace(/^(?:chapter\s+)?(?:start|end)$/i, '')
            .replace(/^[-–—:|\s]+|[-–—:|\s]+$/g, '');
          // AO3's generic body heading is a label, not the chapter's title.
          if (!title || /^(?:chapter text|work text|main content|contents?)$/i.test(title)) {
            return 'Chapter ' + (index + 1);
          }
          return title;
        };
        const getChapterTitle = function(chNode, index) {
          const candidates = [
            '.chapter.preface h3.title.heading', '.chapter.preface h2.title.heading',
            '.chapter.preface .title', '.preface h3.title.heading', '.preface h2.title.heading',
            'h3.title.heading', 'h2.title.heading', 'h3.title', 'h2.title',
            '.meta.group h2.heading', '.meta.group h3.heading', '.chapter-title'
          ];
          for (let i = 0; i < candidates.length; i++) {
            const el = chNode.querySelector(candidates[i]);
            if (!el) continue;
            // Don't mistake navigation/landmark labels for a real chapter title.
            if (el.classList && el.classList.contains('landmark')) continue;
            const candidate = cleanChapterTitle(el.textContent, index);
            if (candidate !== 'Chapter ' + (index + 1)) return candidate;
          }
          return 'Chapter ' + (index + 1);
        };

        // Layout 1: Standard AO3 Web View multi-chapter (#chapters > .chapter or div.chapter[id^="chapter-"])
        const chapterNodes = doc.querySelectorAll('#chapters > .chapter, #chapters div.chapter[id^="chapter-"], div.chapter[id^="chapter-"]');
        if (chapterNodes && chapterNodes.length > 0) {
          chapterNodes.forEach(function(chNode, idx) {
            const rawChTitle = getChapterTitle(chNode, idx);
            const articleEl =
              chNode.querySelector('div.userstuff[role="article"]') ||
              chNode.querySelector('.module.userstuff') ||
              chNode.querySelector('.userstuff[role="article"]') ||
              chNode.querySelector('div.userstuff');
            if (articleEl) {
              const paragraphs = extractParagraphsFromElement(articleEl);
              if (paragraphs.length > 0) {
                extractedChapters.push({
                  title: rawChTitle,
                  sourceUrl: fallbackSourceUrl || '',
                  sourceChapterIndex: idx,
                  paragraphs: paragraphs
                });
              }
            }
          });
        }

        // Layout 2: AO3 Static Download HTML format (#chapters > .meta.group + div.userstuff)
        if (extractedChapters.length === 0) {
          const dlChaptersContainer = doc.querySelector('#chapters');
          if (dlChaptersContainer) {
            const dlUserstuffs = Array.from(dlChaptersContainer.querySelectorAll(':scope > div.userstuff, :scope > div.chapter > div.userstuff'));
            if (dlUserstuffs.length > 0) {
              dlUserstuffs.forEach(function(uNode, idx) {
                const chapterContainer = uNode.closest('div.chapter');
                let rawChTitle = chapterContainer ? getChapterTitle(chapterContainer, idx) : '';
                if (!chapterContainer) {
                  // In AO3's downloaded HTML, a chapter's heading is often the
                  // nearest preceding .meta.group sibling rather than a child of userstuff.
                  let previous = uNode.previousElementSibling;
                  while (previous) {
                    if (previous.matches('.meta.group, .meta, h2.toc-heading')) {
                      const heading = previous.querySelector('h2.heading, h3.heading, h2, h3') || previous;
                      rawChTitle = cleanChapterTitle(heading.textContent, idx);
                      break;
                    }
                    previous = previous.previousElementSibling;
                  }
                  if (!rawChTitle) rawChTitle = 'Chapter ' + (idx + 1);
                }
                const paragraphs = extractParagraphsFromElement(uNode);
                if (paragraphs.length > 0) {
                  extractedChapters.push({
                    title: rawChTitle,
                    sourceUrl: fallbackSourceUrl || '',
                    sourceChapterIndex: idx,
                    paragraphs: paragraphs
                  });
                }
              });
            }
          }
        }

        // Layout 3: Single chapter work web view fallback
        if (extractedChapters.length === 0) {
        const singleArticle =
            doc.querySelector('#chapters.userstuff[role="article"]') ||
            doc.querySelector('#chapters.userstuff') ||
            doc.querySelector('#workskin.userstuff[role="article"]') ||
            doc.querySelector('#workskin.userstuff') ||
            doc.querySelector('#chapters div.userstuff[role="article"]') ||
            doc.querySelector('#chapters div.userstuff') ||
            doc.querySelector('#workskin div.userstuff[role="article"]') ||
            doc.querySelector('#workskin .userstuff') ||
            doc.querySelector('div.userstuff[role="article"]') ||
            doc.querySelector('#chapters');
          if (singleArticle) {
            const paragraphs = extractParagraphsFromElement(singleArticle);
            if (paragraphs.length > 0) {
              extractedChapters.push({
                title: getChapterTitle(singleArticle.closest('div.chapter') || singleArticle.parentElement || singleArticle, 0),
                sourceUrl: fallbackSourceUrl || '',
                sourceChapterIndex: 0,
                paragraphs: paragraphs
              });
            }
          }
        }

        return { meta: extractedMeta, chapters: extractedChapters, reason: extractedChapters.length > 0 ? 'ok' : 'no_content' };
      }

      // Parse Jina Reader Markdown output when raw HTML proxies are blocked by Cloudflare
      function parseAo3JinaMarkdown(mdText, fallbackSourceUrl) {
        if (!mdText || mdText.length < 200) return { meta: {}, chapters: [] };
        if (/Just a moment\.\.\.|Attention Required!|Shields are up!?\s*\|\s*Archive of Our Own/i.test(mdText)) {
          return { meta: {}, chapters: [], reason: 'cloudflare' };
        }

        let title = '';
        let author = '';
        let fandom = '';
        const titleMatch = mdText.match(/^Title:\s*(.+)$/m);
        if (titleMatch) {
          const cleanT = titleMatch[1]
            .replace(/\s*\[Archive of Our Own\].*$/i, '')
            .replace(/\s*-\s*Archive of Our Own.*$/i, '')
            .trim();
          const tParts = cleanT.split(/\s+-\s+/);
          if (tParts.length >= 3) {
            title = tParts[0].trim();
            author = tParts[tParts.length - 2].trim();
            fandom = tParts[tParts.length - 1].trim();
          } else if (tParts.length === 2) {
            title = tParts[0].trim();
            author = tParts[1].trim();
          } else {
            title = cleanT;
          }
        }
        if (!author) {
          const byMatch = mdText.match(/###\s+by\s+\[([^\]]+)\]|by\s+\[([^\]]+)\]\(https?:\/\/archiveofourown\.org\/users\//i);
          if (byMatch) {
            author = (byMatch[1] || byMatch[2] || '').trim();
          }
        }

        // Strip Jina header block up to Markdown Content:
        let body = mdText;
        const mdMarkerIdx = body.indexOf('Markdown Content:');
        if (mdMarkerIdx !== -1) {
          body = body.slice(mdMarkerIdx + 'Markdown Content:'.length);
        }

        // Keep a real chapter heading when present. "Chapter Text" is AO3's
        // generic content label and must never be saved as the chapter title.
        const footerIdx = body.search(/\n###\s+(Actions|Kudos|Comments|Afterword)|\n\*\s+\[↑\s*Top\]/i);
        if (footerIdx !== -1) body = body.slice(0, footerIdx);

        const cleanChapterTitleForMarkdown = function(value, index) {
          const cleaned = String(value || '').replace(/^#+\s*/, '').replace(/\s+/g, ' ').trim();
          if (!cleaned || /^(Chapter Text|Work Text|Main Content|Contents?)$/i.test(cleaned)) return 'Chapter ' + (index + 1);
          return cleaned;
        };
        const chapterHeadingRe = /^#{2,4}\s+((?:(?:Chapter|Part|Book|Prologue|Epilogue)\b[^\n]*|[^\n]+))\s*$/gim;
        const headingMatches = [];
        let headingMatch;
        while ((headingMatch = chapterHeadingRe.exec(body)) !== null) {
          const headingText = headingMatch[1].trim();
          if (/^(Chapter Text|Work Text|Main Content|Actions|Kudos|Comments|Afterword)$/i.test(headingText)) continue;
          // AO3-generated Chapter N headings and custom titles are both valid.
          headingMatches.push({ index: headingMatch.index, end: chapterHeadingRe.lastIndex, title: headingText });
        }

        let chapters = [];
        if (headingMatches.length > 0) {
          headingMatches.forEach(function(h, idx) {
            const end = idx + 1 < headingMatches.length ? headingMatches[idx + 1].index : body.length;
            let section = body.slice(h.end, end);
            // If the section begins with the generic Chapter Text marker, remove it.
            section = section.replace(/^\s*#{2,4}\s*Chapter Text\s*\n?/i, '');
            const paragraphs = [];
            section.split(/\n\s*\n/).forEach(function(b) {
              const clean = stripAo3ImagePlaceholderText(stripInlineTranslationMarkup(b
                .replace(/^#{1,6}\s*Chapter Text\s*$/gim, '')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/[ \t]+/g, ' ')
                .trim()));
              if (!clean || /^(Skip header|Archive of Our Own|Main Content|Work Header|Chapter Text)$/i.test(clean)) return;
              splitLongParagraphIfNeeded(clean).forEach(function(c) { paragraphs.push(c); });
            });
            if (paragraphs.length >= 1) {
              chapters.push({ title: cleanChapterTitleForMarkdown(h.title, chapters.length), sourceUrl: fallbackSourceUrl || '', paragraphs: paragraphs });
            }
          });
        }

        // Some reader mirrors expose only "Chapter Text" and no chapter heading.
        // Preserve the text, but use deterministic numbering rather than that label.
        if (chapters.length === 0) {
          let story = body;
          const marker = story.search(/^#{2,4}\s+Chapter Text\s*$/im);
          if (marker !== -1) story = story.slice(marker).replace(/^#{2,4}\s+Chapter Text\s*\n?/i, '');
          const paragraphs = [];
          story.split(/\n\s*\n/).forEach(function(b) {
            const clean = stripAo3ImagePlaceholderText(stripInlineTranslationMarkup(b.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[ \t]+/g, ' ').trim()));
            if (!clean || /^(Skip header|Archive of Our Own|Main Content|Work Header|Chapter Text)$/i.test(clean)) return;
            splitLongParagraphIfNeeded(clean).forEach(function(c) { paragraphs.push(c); });
          });
          if (paragraphs.length >= 1) chapters.push({ title: 'Chapter 1', sourceUrl: fallbackSourceUrl || '', paragraphs: paragraphs });
        }

        return {
          meta: { title: title || 'AO3 추출 작품', author: cleanAo3AuthorName(author) || 'Anonymous', fandom: fandom, summary: '' },
          chapters: chapters
        };
      }

      // Extract AO3 workId and build candidate URLs (Download HTML endpoint + Web view URL)
      function extractAo3WorkInfo(rawUrl, fullWork) {
        const originalUrl = String(rawUrl || '').trim();
        if (!originalUrl) return null;
        let parsed;
        try {
          parsed = new URL(/^https?:\/\//i.test(originalUrl) ? originalUrl : 'https://' + originalUrl);
        } catch (e) { return null; }
        const host = parsed.hostname.toLowerCase();
        const allowedHosts = ['archiveofourown.org', 'www.archiveofourown.org', 'secure.archiveofourown.org', 'ao3.org', 'www.ao3.org', 'secure.ao3.org'];
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
        if (allowedHosts.indexOf(host) === -1) return null;
        parsed.protocol = 'https:';
        const routeMatch = parsed.pathname.match(/(?:^|\/)(?:collections\/[^/]+\/)?works\/(\d+)(?:\/chapters\/(\d+))?\/?$/i);
        if (!routeMatch) return null;
        const workId = routeMatch[1];
        const chapterId = routeMatch[2] || null;
        parsed.hostname = 'archiveofourown.org';
        parsed.pathname = '/works/' + workId + (chapterId ? '/chapters/' + chapterId : '');
        parsed.hash = '';
        parsed.search = '';
        parsed.searchParams.set('view_adult', 'true');
        if (fullWork && workId) {
          parsed.pathname = '/works/' + workId;
          parsed.searchParams.set('view_full_work', 'true');
        }
        const webUrl = parsed.toString();

        // Preserve the adult-content acceptance parameter for AO3's alternate download view too.
        const downloadHtmlUrl = workId
          ? ('https://archiveofourown.org/downloads/' + workId + '/work.html?view_adult=true')
          : null;

        return {
          originalUrl: originalUrl,
          workId: workId,
          chapterId: chapterId,
          fullWork: Boolean(fullWork),
          webUrl: webUrl,
          downloadHtmlUrl: downloadHtmlUrl
        };
      }

      function fetchAo3ThroughWorker(targetUrl, signal) {
        const endpoint = ao3FunctionUrl('ao3-fetch') + '?url=' + encodeURIComponent(targetUrl);
        return fetch(endpoint, { headers: { 'Accept': 'text/html,application/xhtml+xml' }, signal: signal })
          .then(async function(response) {
            if (!response.ok) {
              const detail = await response.text().catch(function() { return ''; });
              throw new Error('Cloudflare Worker AO3 HTTP ' + response.status + (detail ? ': ' + detail.slice(0, 240) : ''));
            }
            return response.text();
          });
      }

      async function fetchWithTimeout(url, options, timeoutMs) {
        const controller = new AbortController();
        const timer = setTimeout(function() { controller.abort(); }, timeoutMs || 10000);
        try {
          const res = await fetch(url, Object.assign({}, options || {}, { signal: controller.signal }));
          clearTimeout(timer);
          return res;
        } catch (err) {
          clearTimeout(timer);
          throw err;
        }
      }

      // Parallel AO3 extraction pipeline; compare candidate results to prefer the fullest chapter set.
      async function fetchAndParseAo3Url(rawUrl, fullWork, logFn) {
        const info = extractAo3WorkInfo(rawUrl, fullWork);
        if (!info) throw new Error('유효하지 않은 URL입니다.');

        // This compact UI intentionally imports one explicitly linked chapter at a time.
        // Do not use AO3's whole-work download endpoint as a fallback.
        const primaryUrl = info.webUrl;
        const secondaryUrl = null;

        if (logFn) {
          logFn('챕터 본문을 가져오는 중…');
        }

        const controllers = [];
        function createTrackedSignal(timeoutMs) {
          const ctrl = new AbortController();
          controllers.push(ctrl);
          const timer = setTimeout(function() { ctrl.abort(); }, timeoutMs || 6500);
          return {
            signal: ctrl.signal,
            done: function() { clearTimeout(timer); }
          };
        }

        function abortAllPending() {
          controllers.forEach(function(c) {
            try { c.abort(); } catch (e) {}
          });
        }

        async function tryHtmlTask(engineName, targetUrl, fetcherFn) {
          const tracker = createTrackedSignal(15000);
          try {
            const rawText = await fetcherFn(targetUrl, tracker.signal);
            tracker.done();
            const parsed = parseAo3HtmlDocument(rawText, info.originalUrl);
            if (parsed && parsed.chapters && parsed.chapters.length > 0) {
              if (logFn) logFn('본문 확인 완료');
              return parsed;
            }
            throw new Error(engineName + ': ' + (parsed.reason || 'no_content'));
          } catch (err) {
            tracker.done();
            throw err;
          }
        }

        async function tryJinaMarkdownTask(targetUrl) {
          const tracker = createTrackedSignal(17000);
          try {
            const res = await fetch('https://r.jina.ai/' + targetUrl, {
              headers: { 'X-Set-Cookie': 'view_adult=true; accepted_tos=20180523' },
              signal: tracker.signal
            });
            tracker.done();
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const mdText = await res.text();
            const mdParsed = parseAo3JinaMarkdown(mdText, info.originalUrl);
            if (mdParsed && mdParsed.chapters && mdParsed.chapters.length > 0) {
              if (logFn) logFn('본문 확인 완료');
              return mdParsed;
            }
            throw new Error('no_md_content');
          } catch (err) {
            tracker.done();
            throw err;
          }
        }

        // Build parallel race tasks for the requested page.
        const raceTasks = [
          tryHtmlTask('Cloudflare Worker 직접 AO3', primaryUrl, fetchAo3ThroughWorker),
          tryHtmlTask('AllOrigins Raw', primaryUrl, async function(u, sig) {
            const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(u), { signal: sig });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return await r.text();
          }),
          tryHtmlTask('CodeTabs 프록시', primaryUrl, async function(u, sig) {
            const r = await fetch('https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u), { signal: sig });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return await r.text();
          }),
          tryHtmlTask('AllOrigins JSON', primaryUrl, async function(u, sig) {
            const r = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(u), { signal: sig });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const d = await r.json();
            return (d && d.contents) ? String(d.contents) : '';
          }),
          tryHtmlTask('Jina HTML 엔진', info.webUrl, async function(u, sig) {
            const r = await fetch('https://r.jina.ai/' + u, {
              headers: {
                'X-Return-Format': 'html',
                'X-Set-Cookie': 'view_adult=true; accepted_tos=20180523'
              },
              signal: sig
            });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return await r.text();
          }),
          tryJinaMarkdownTask(info.webUrl)
        ];

        // A bare /works/ID URL is not always served as a chapter page by every proxy.
        // Try AO3's full-work view as an additional source; the caller intentionally
        // keeps only the first chapter for a bare work URL.
        if (!info.chapterId && info.workId) {
          const fullWorkInfo = extractAo3WorkInfo(info.originalUrl, true);
          const fullWorkUrl = fullWorkInfo && fullWorkInfo.webUrl;
          if (fullWorkUrl && fullWorkUrl !== primaryUrl) {
            raceTasks.push(
              tryHtmlTask('Cloudflare Worker 전체 보기', fullWorkUrl, fetchAo3ThroughWorker),
              tryHtmlTask('전체 보기 AllOrigins Raw', fullWorkUrl, async function(u, sig) {
                const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(u), { signal: sig });
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return await r.text();
              }),
              tryJinaMarkdownTask(fullWorkUrl)
            );
          }

          // AO3's official static download HTML uses a different chapter layout and can
          // succeed when the web-view HTML omits the actual chapter body.
          if (info.downloadHtmlUrl) {
            raceTasks.push(
              tryHtmlTask('Cloudflare Worker 다운로드 HTML', info.downloadHtmlUrl, fetchAo3ThroughWorker),
              tryHtmlTask('다운로드 HTML AllOrigins', info.downloadHtmlUrl, async function(u, sig) {
                const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(u), { signal: sig });
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return await r.text();
              }),
              tryHtmlTask('다운로드 HTML CodeTabs', info.downloadHtmlUrl, async function(u, sig) {
                const r = await fetch('https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u), { signal: sig });
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return await r.text();
              }),
              tryJinaMarkdownTask(info.downloadHtmlUrl)
            );
          }
        }

        if (secondaryUrl && secondaryUrl !== primaryUrl) {
          raceTasks.push(
            tryHtmlTask('CodeTabs 백업', secondaryUrl, async function(u, sig) {
              const r = await fetch('https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u), { signal: sig });
              if (!r.ok) throw new Error('HTTP ' + r.status);
              return await r.text();
            })
          );
        }

        try {
          // This interface imports only the explicitly requested chapter (or the first
          // chapter for a bare /works/ link). The first fully parsed, non-empty body is
          // therefore sufficient; do not wait for slower, redundant proxy responses.
          // All proxies are launched concurrently above, and the first valid parser wins.
          const failures = [];
          let pending = raceTasks.length;
          let finished = false;
          const winner = await new Promise(function(resolve, reject) {
            if (!pending) { reject(new Error('모든 본문 추출 경로가 비어 있습니다.')); return; }
            raceTasks.forEach(function(task) {
              Promise.resolve(task).then(function(value) {
                if (finished) return;
                if (value && value.chapters && value.chapters.length > 0) {
                  finished = true;
                  resolve(value);
                  return;
                }
                failures.push('빈 본문 응답');
                pending -= 1;
                if (pending <= 0 && !finished) {
                  finished = true;
                  reject(new Error(Array.from(new Set(failures)).slice(0, 4).join(' / ') || '모든 본문 추출 경로가 빈 응답을 반환했습니다.'));
                }
              }, function(error) {
                if (finished) return;
                failures.push(error && error.message ? error.message : String(error || '알 수 없는 오류'));
                pending -= 1;
                if (pending <= 0 && !finished) {
                  finished = true;
                  reject(new Error(Array.from(new Set(failures)).slice(0, 4).join(' / ') || '모든 본문 추출 경로가 실패했습니다.'));
                }
              });
            });
          }).catch(function(error) {
            const diagnostic = String(error && error.message || error || '모든 본문 추출 경로가 실패했습니다.');
            if (logFn) logFn('본문 추출 경로 실패: ' + diagnostic);
            throw new Error('ALL_PROXIES_BLOCKED: ' + diagnostic);
          });

          winner.meta = winner.meta || {};
          // AO3 Summary discovery is intentionally disabled. Import only the work
          // metadata needed for identification and the chapter body.
          winner.meta.summary = '';
          if (logFn) logFn('본문 추출 완료 · 가장 먼저 확인된 유효한 응답 사용');
          abortAllPending();
          return winner;
        } catch (aggErr) {
          abortAllPending();
          throw aggErr instanceof Error ? aggErr : new Error(String(aggErr || 'AO3 본문 추출에 실패했습니다.'));
        }
      }


      // Literal post-translation replacements are never passed to the AI prompt.
      // Format per line: find text => replacement text. Matching is case-sensitive and literal.
      function parseTextReplacementRules() {
        const raw = String(state.settings.textReplacements || '');
        const rules = [];
        raw.split(/\r?\n/).forEach(function(line) {
          if (!line.trim() || /^\s*#/.test(line)) return;
          let delimiter = line.indexOf('=>');
          let delimiterLength = 2;
          if (delimiter < 0) {
            delimiter = line.indexOf('/');
            delimiterLength = 1;
          }
          if (delimiter < 0) return;
          const from = line.slice(0, delimiter).trim();
          const to = line.slice(delimiter + delimiterLength).trim();
          if (from && to) rules.push({ from: from, to: to });
        });
        return rules.sort(function(a, b) { return b.from.length - a.from.length; });
      }

      // Resolve Korean postpositions after a spelling replacement. This keeps the
      // visible text grammatical when a corrected character name changes its final
      // consonant (받침), without modifying the stored translation paragraph.
      function getKoreanFinalConsonantInfo(word) {
        const value = String(word == null ? '' : word).trim();
        if (!value) return null;
        const last = value.charAt(value.length - 1);
        const code = last.charCodeAt(0);
        if (code < 0xAC00 || code > 0xD7A3) return null;
        const jong = (code - 0xAC00) % 28;
        return { hasFinal: jong !== 0, isRieul: jong === 8 };
      }

      function selectKoreanPostposition(targetName, observedParticle) {
        const info = getKoreanFinalConsonantInfo(targetName);
        if (!info) return observedParticle;
        const particle = String(observedParticle || '');
        if (particle === '은' || particle === '는') return info.hasFinal ? '은' : '는';
        if (particle === '이' || particle === '가') return info.hasFinal ? '이' : '가';
        if (particle === '을' || particle === '를') return info.hasFinal ? '을' : '를';
        if (particle === '과' || particle === '와') return info.hasFinal ? '과' : '와';
        if (particle === '이랑' || particle === '랑') return info.hasFinal ? '이랑' : '랑';
        if (particle === '으로' || particle === '로') return info.hasFinal && !info.isRieul ? '으로' : '로';
        if (particle === '아' || particle === '야') return info.hasFinal ? '아' : '야';
        return particle;
      }

      function applyTextReplacements(text) {
        let result = String(text == null ? '' : text);
        parseTextReplacementRules().forEach(function(rule) {
          if (!rule.from || result.indexOf(rule.from) === -1) return;
          const escaped = rule.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // Capture only particles that vary according to 받침; longer forms must
          // precede short forms so "이랑" is not consumed as just "이".
          const particlePattern = '(이랑|으로|은|는|이|가|을|를|과|와|랑|로|아|야)?';
          const regex = new RegExp(escaped + particlePattern, 'g');
          result = result.replace(regex, function(match, particle) {
            const matchedParticle = particle || '';
            return rule.to + (matchedParticle ? selectKoreanPostposition(rule.to, matchedParticle) : '');
          });
        });
        return result;
      }

      function finalizeTranslatedParagraph(text) {
        const cleaned = stripInlineTranslationMarkup(text);
        if (!cleaned || isSceneDividerLine(cleaned)) return '* * *';
        return applyTextReplacements(enforceNovelNarrationStyle(cleaned));
      }

      // Azure-specific conservative post-processing. This intentionally avoids
      // rewriting sentence endings globally: that can turn a character's polite
      // dialogue into banmal and make the scene less natural.
      function finalizeAzureTranslatedParagraph(text) {
        // Do NOT call finalizeTranslatedParagraph here: that function applies
        // regex-based narration-ending rewrites. Azure cannot identify speakers,
        // so those rewrites can accidentally change a character's speech level.
        let value = stripInlineTranslationMarkup(text);
        if (!value || isSceneDividerLine(value)) return '* * *';
        // Keep the existing user-authored literal replacements, then apply the
        // explicitly labeled spelling rules. No inferred banmal/honorific edits.
        value = applyTextReplacements(value);
        String(state.settings.characterStyleRules || '').split(/\r?\n/).forEach(function(line) {
          const match = line.match(/^\s*표기\s*:\s*(.+?)\s*=>\s*(.+?)\s*$/);
          if (match && match[1] && match[2]) value = value.split(match[1]).join(match[2]);
        });
        return value
          .replace(/[\t\u00a0]+/g, ' ')
          .replace(/\s+([,，.。!?！？:;])/g, '$1')
          .replace(/([.!?]){2,}/g, '$1')
          .replace(/([。！？]){2,}/g, '$1')
          .replace(/ {2,}/g, ' ')
          .trim();
      }

      function enforceNovelNarrationStyle(koParagraph) {
        const s = String(koParagraph || '').trim();
        if (!s || isSceneDividerLine(s)) return '* * *';
        // Preserve dialogue speech levels inside quotes while converting narration (-습니다/-ㅂ니다) to novel prose (-했다/-였다)
        const segments = s.split(/("[^"]*"|“[^”]*”|'[^']*'|‘[^’]*’)/g);
        return segments.map(function(seg, idx) {
          if (idx % 2 === 1) return seg;
          return seg
            .replace(/했습니다([.!?\s]|$)/g, '했다$1')
            .replace(/하였습니다([.!?\s]|$)/g, '하였다$1')
            .replace(/있었습니다([.!?\s]|$)/g, '있었다$1')
            .replace(/없었습니다([.!?\s]|$)/g, '없었다$1')
            .replace(/되었습니다([.!?\s]|$)/g, '되었다$1')
            .replace(/왔습니다([.!?\s]|$)/g, '왔다$1')
            .replace(/갔습니다([.!?\s]|$)/g, '갔다$1')
            .replace(/보았습니다([.!?\s]|$)/g, '보았다$1')
            .replace(/봤습니다([.!?\s]|$)/g, '봤다$1')
            .replace(/말했습니다([.!?\s]|$)/g, '말했다$1')
            .replace(/생각했습니다([.!?\s]|$)/g, '생각했다$1')
            .replace(/느꼈습니다([.!?\s]|$)/g, '느꼈다$1')
            .replace(/였습니다([.!?\s]|$)/g, '였다$1')
            .replace(/이었습니다([.!?\s]|$)/g, '이었다$1')
            .replace(/입니다([.!?\s]|$)/g, '이다$1')
            .replace(/습니다([.!?\s]|$)/g, '다$1');
        }).join('');
      }


      // Clean Markdown artifacts that can leak from Jina/LLM output and detect
      // clearly incomplete English fragments before saving a translated paragraph.
      function stripInlineTranslationMarkup(value) {
        return String(value == null ? '' : value).split(/\r?\n/).map(function(line) {
          if (isSceneDividerLine(line)) return '* * *';
          return line
            .replace(/```(?:[a-z0-9_-]+)?/gi, '')
            .replace(/_{2,}/g, ' ')
            .replace(/\*\*([^*\n]+)\*\*/g, '$1')
            .replace(/_([^_\n]+)_/g, '$1')
            .replace(/\*([^*\n]+)\*/g, '$1')
            .replace(/`([^`\n]+)`/g, '$1')
            .replace(/^\s*(?:번역문|한국어 번역|translation|korean translation)\s*[:：]\s*/i, '')
            .replace(/[ \t]+([,.;:!?。！？、])/g, '$1');
        }).join('\n').trim();
      }

      const AO3_ENGLISH_FUNCTION_WORDS = new Set(('the and or but if then when where what who why how i you your with from that this these those have has had was were are is am be been being will would could should not dont didnt doesnt isnt arent wasnt werent for of to in on at as by into through because although while than can cannot do does did').split(/\s+/));

      function ao3QualityCheckEnabled(name) {
        if (name === 'paragraphCount') return state.settings.qualityParagraphCountEnabled !== false;
        if (name === 'englishResidue') return state.settings.qualityEnglishResidueEnabled !== false;
        return true;
      }

      function ao3FitExtraTranslationParts(parts, expectedCount) {
        const result = Array.isArray(parts) ? parts.slice() : [];
        if (!ao3QualityCheckEnabled('paragraphCount') && result.length > expectedCount && expectedCount > 0) {
          const extras = result.splice(expectedCount - 1);
          result.push(extras.join('\n'));
        }
        return result;
      }

      function ao3HasTranslationQualityIssue(source, translated) {
        const clean = stripInlineTranslationMarkup(translated);
        if (!clean || /<<<P_SEP>>>|\[번역 대기\]|\[오프라인 원문\]/i.test(clean)) return true;
        if (isSceneDividerLine(source)) return !isSceneDividerLine(clean);
        // This setting jointly controls English source leakage and the incomplete-sentence
        // heuristics inside hasUntranslatedEnglishResidue. Blank/malformed output stays blocked.
        if (!ao3QualityCheckEnabled('englishResidue')) return false;
        return hasUntranslatedEnglishResidue(source, clean);
      }

      function hasUntranslatedEnglishResidue(source, translated) {
        const clean = stripInlineTranslationMarkup(translated);
        if (!clean || /<<<P_SEP>>>|\[번역 대기\]|\[오프라인 원문\]/i.test(clean)) return true;
        const src = String(source || '').trim();
        if (isSceneDividerLine(src)) return !isSceneDividerLine(clean);
        const sourceTail = src.replace(/[\"'”’)}\]]+$/g, '').trim();
        const sourceIsDeliberatelyOpen = /(?:…|\.{2,}|—|–|--|[,;:]|\b(?:and|but|or|if|when|because|although|while|though|to|of|with|for|as|than))$/i.test(sourceTail);
        const sourceHasTerminal = /[.!?][\"'”’)}\]]?$/.test(src) && !sourceIsDeliberatelyOpen;
        if (/[A-Za-z]/.test(src) && !/[가-힣]/.test(clean) && sourceHasTerminal) {
          const sourceWords = src.match(/\b[A-Za-z][A-Za-z'-]*\b/g) || [];
          const sourceGrammarCount = sourceWords.filter(function(word) { return AO3_ENGLISH_FUNCTION_WORDS.has(word.toLowerCase().replace(/['’]/g, '')); }).length;
          // Short titles, names, and deliberately open fragments are ambiguous;
          // reject only complete English text with sentence-like structure.
          if ((sourceWords.length >= 4 && sourceGrammarCount >= 1) || (sourceWords.length >= 3 && sourceGrammarCount >= 2)) return true;
        }

        // Preserve short phrases, names, and code switches. Only flag a Latin run when
        // it has enough English grammar words to look like untranslated prose.
        const latinRuns = clean.match(/\b[A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*){2,}\b/g) || [];
        if (latinRuns.some(function(run) {
          const words = run.toLowerCase().split(/\s+/).map(function(word) { return word.replace(/['’]/g, ''); });
          const grammarCount = words.filter(function(word) { return AO3_ENGLISH_FUNCTION_WORDS.has(word); }).length;
          return (words.length >= 6 && grammarCount >= 1) || (words.length >= 4 && grammarCount >= 2);
        })) return true;

        // Punctuation alone cannot establish truncation: AO3 deliberately uses
        // fragments, ellipses, and interrupted dialogue. Require a full source
        // sentence plus a Korean ending that is grammatically left hanging.
        const translationHasTerminal = /[.!?。！？…][\"'”’)}\]]?$/.test(clean);
        const translationLooksDangling = /(?:은|는|이|가|을|를|의|에|에서|으로|로|와|과|에게|까지|부터|처럼|보다|며|고|지만|는데|려고|해서|때문에|그리고|그러나|하지만|그런데|그가|그녀가|그것을|그것은|나는|우리는)$/u.test(clean);
        if (src.length > 80 && clean.length > 35 && sourceHasTerminal && !translationHasTerminal && translationLooksDangling) return true;
        if (src.length > 220 && clean.length < Math.max(40, src.length * 0.2)) return true;
        return false;
      }

      // Azure F0 has a rolling hourly character quota. Keep a conservative
      // per-browser rolling window so fallback bursts do not all hit Azure at once.
      const AO3_AZURE_CHAR_WINDOW_MS = 60 * 1000;
      const AO3_AZURE_SAFE_CHARS_PER_WINDOW = 24000;
      const AO3_AZURE_SEGMENT_CHARS = 8000;
      const AO3_AZURE_REQUEST_CHARS = 10000;
      const AO3_AZURE_RATE_STORAGE_KEY = 'ao3AzureCharWindowV1';

      function ao3Sleep(ms) {
        return new Promise(function(resolve) { setTimeout(resolve, Math.max(0, ms)); });
      }

      function ao3ReadAzureRateEntries() {
        let entries = window._ao3AzureRateEntries || [];
        try {
          const stored = localStorage.getItem(AO3_AZURE_RATE_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) entries = parsed;
          }
        } catch (ignoreStorageRead) {}
        const cutoff = Date.now() - AO3_AZURE_CHAR_WINDOW_MS;
        entries = entries.filter(function(entry) {
          return entry && Number(entry.at) >= cutoff && Number(entry.chars) > 0;
        }).sort(function(a, b) { return Number(a.at) - Number(b.at); });
        window._ao3AzureRateEntries = entries;
        return entries;
      }

      function ao3WriteAzureRateEntries(entries) {
        window._ao3AzureRateEntries = entries;
        try { localStorage.setItem(AO3_AZURE_RATE_STORAGE_KEY, JSON.stringify(entries)); } catch (ignoreStorageWrite) {}
      }

      async function ao3ReserveAzureCharacterBudget(chars) {
        const requestedChars = Math.max(1, Number(chars) || 1);
        while (true) {
          const now = Date.now();
          const entries = ao3ReadAzureRateEntries();
          const used = entries.reduce(function(sum, entry) { return sum + Number(entry.chars || 0); }, 0);
          if (used + requestedChars <= AO3_AZURE_SAFE_CHARS_PER_WINDOW) {
            const reservation = {
              id: now.toString(36) + '-' + Math.random().toString(36).slice(2),
              at: now,
              chars: requestedChars
            };
            entries.push(reservation);
            ao3WriteAzureRateEntries(entries);
            return reservation.id;
          }
          let releaseAt = now + 1000;
          let remainingToFree = used + requestedChars - AO3_AZURE_SAFE_CHARS_PER_WINDOW;
          for (let i = 0; i < entries.length; i++) {
            remainingToFree -= Number(entries[i].chars || 0);
            if (remainingToFree <= 0) {
              releaseAt = Number(entries[i].at) + AO3_AZURE_CHAR_WINDOW_MS + 150;
              break;
            }
          }
          const waitMs = Math.max(1000, Math.min(AO3_AZURE_CHAR_WINDOW_MS, releaseAt - now));
          console.info('Azure character-rate guard: waiting ' + Math.ceil(waitMs / 1000) + 's to stay below ' + AO3_AZURE_SAFE_CHARS_PER_WINDOW.toLocaleString() + ' characters/minute.');
          await ao3Sleep(waitMs);
        }
      }

      function ao3ReleaseAzureReservation(id) {
        const entries = ao3ReadAzureRateEntries().filter(function(entry) { return entry.id !== id; });
        ao3WriteAzureRateEntries(entries);
      }

      function ao3SplitAzureLongText(value, maxChars) {
        const text = String(value || '');
        if (text.length <= maxChars) return text ? [text] : [''];
        const parts = [];
        let remaining = text;
        while (remaining.length > maxChars) {
          let cut = maxChars;
          const minPreferred = Math.floor(maxChars * 0.65);
          const sentenceBreaks = [remaining.lastIndexOf('. ', maxChars), remaining.lastIndexOf('! ', maxChars), remaining.lastIndexOf('? ', maxChars), remaining.lastIndexOf('。', maxChars), remaining.lastIndexOf('！', maxChars), remaining.lastIndexOf('？', maxChars)];
          const sentenceCut = Math.max.apply(null, sentenceBreaks);
          const wordCut = remaining.lastIndexOf(' ', maxChars);
          if (sentenceCut >= minPreferred) cut = sentenceCut + 1;
          else if (wordCut >= minPreferred) cut = wordCut;
          parts.push(remaining.slice(0, cut).trim());
          remaining = remaining.slice(cut).trim();
        }
        if (remaining) parts.push(remaining);
        return parts.length ? parts : [text];
      }

      function ao3BuildAzureRequestBatches(texts) {
        const records = [];
        const translatedByOriginal = texts.map(function(text) { return isSceneDividerLine(text) ? '* * *' : ''; });
        // Azure has no prompt/context parameter. Translate adjacent short paragraphs
        // together so its statistical context includes nearby dialogue and narration.
        // The stable sentinel is verified on return; if Azure alters it, fail safely.
        let group = [];
        let groupChars = 0;
        const flushGroup = function() {
          if (!group.length) return;
          if (group.length === 1) {
            ao3SplitAzureLongText(group[0].text, AO3_AZURE_SEGMENT_CHARS).forEach(function(segment) {
              records.push({ originalIndex: group[0].originalIndex, text: segment, pieces: [{ originalIndex: group[0].originalIndex, marker: null }] });
            });
          } else {
            const marker = 'AO3PARASEPZXQ';
            records.push({
              originalIndex: group[0].originalIndex,
              text: group.map(function(item) { return item.text; }).join('\n' + marker + '\n'),
              pieces: group.map(function(item) { return { originalIndex: item.originalIndex, marker: marker }; })
            });
          }
          group = []; groupChars = 0;
        };
        texts.forEach(function(text, originalIndex) {
          if (isSceneDividerLine(text)) { flushGroup(); return; }
          const value = String(text || '').trim();
          if (value.length > 1400) {
            flushGroup();
            ao3SplitAzureLongText(value, AO3_AZURE_SEGMENT_CHARS).forEach(function(segment) {
              records.push({ originalIndex: originalIndex, text: segment, pieces: [{ originalIndex: originalIndex, marker: null }] });
            });
            return;
          }
          if (group.length && (group.length >= 3 || groupChars + value.length > 3500)) flushGroup();
          group.push({ originalIndex: originalIndex, text: value });
          groupChars += value.length;
        });
        flushGroup();
        const batches = [];
        let batch = [];
        let batchChars = 0;
        records.forEach(function(record) {
          const size = record.text.length;
          if (batch.length && (batchChars + size > AO3_AZURE_REQUEST_CHARS || batch.length >= 50)) {
            batches.push(batch); batch = []; batchChars = 0;
          }
          batch.push(record); batchChars += size;
        });
        if (batch.length) batches.push(batch);
        return { batches: batches, translatedByOriginal: translatedByOriginal };
      }

      function ao3RetryAfterMs(response) {
        const value = response && response.headers ? response.headers.get('Retry-After') : null;
        if (!value) return 60000;
        const seconds = Number(value);
        if (Number.isFinite(seconds) && seconds > 0) return Math.min(5 * 60 * 1000, Math.max(1000, seconds * 1000));
        const dateMs = Date.parse(value);
        if (Number.isFinite(dateMs)) return Math.min(5 * 60 * 1000, Math.max(1000, dateMs - Date.now()));
        return 60000;
      }

      async function ao3FetchAzureBatch(apiKey, region, batch, sharedController) {
        const texts = batch.map(function(record) { return record.text; });
        const chars = texts.reduce(function(sum, text) { return sum + text.length; }, 0);
        let attempt = 0;
        while (true) {
          const reservationId = await ao3ReserveAzureCharacterBudget(chars);
          let response;
          const controller = sharedController || new AbortController();
          const manualControllers = window._ao3ManualProviderControllers || (window._ao3ManualProviderControllers = new Set());
          manualControllers.add(controller);
          const timeoutId = setTimeout(function() { controller.abort(); }, 20000);
          try {
            response = await fetch(ao3FunctionUrl('azure-translate'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: apiKey, region: region, texts: texts }),
              signal: controller.signal
            });
          } catch (networkError) {
            // A network failure may not have reached Azure. Release the reserved budget.
            ao3ReleaseAzureReservation(reservationId);
            throw networkError;
          } finally {
            clearTimeout(timeoutId);
            manualControllers.delete(controller);
          }
          ao3RecordQuotaUsage('azure', response.ok ? chars : 0, { model: 'Translator', status: 'HTTP ' + response.status });
          if (!response.ok) ao3CaptureQuotaResponse('azure', response.status, null, response.headers, 'Translator');
          if (response.status === 429 && attempt < 1) {
            const waitMs = ao3RetryAfterMs(response);
            if (waitMs <= 5000) {
              ao3ReleaseAzureReservation(reservationId);
              console.warn('Azure returned HTTP 429; doing one short retry after ' + Math.ceil(waitMs / 1000) + 's.');
              await ao3Sleep(waitMs);
              attempt++;
              continue;
            }
            // Long Retry-After: release the reservation and move to Groq instead of blocking the queue.
            ao3ReleaseAzureReservation(reservationId);
            console.warn('Azure returned HTTP 429 with a long cooldown; skipping the wait and switching provider.');
          }
          return response;
        }
      }

      async function ao3TranslateWithPromptProvider(endpoint, provider, apiKey, model, texts, context) {
        const providerDisplayName = provider === 'groq' ? 'Groq' : (provider === 'workers-ai' ? 'Cloudflare Workers AI' : provider);
        setTranslationProviderStatus(providerDisplayName, '요청 중');
        const cooldowns = window._ao3ProviderCooldownUntil || (window._ao3ProviderCooldownUntil = Object.create(null));
        if (Number(cooldowns[provider] || 0) > Date.now()) return null;
        const requestController = (provider === 'groq' || provider === 'workers-ai') ? new AbortController() : null;
        const manualControllers = window._ao3ManualProviderControllers || (window._ao3ManualProviderControllers = new Set());
        if (requestController) manualControllers.add(requestController);
        const parentSignal = provider === 'groq' && context && context.signalController ? context.signalController.signal : null;
        let parentAbortHandler = null;
        if (requestController && parentSignal) {
          parentAbortHandler = function() { try { requestController.abort('fallback_provider_won'); } catch (ignoreParentAbort) {} };
          if (parentSignal.aborted) parentAbortHandler();
          else parentSignal.addEventListener('abort', parentAbortHandler, { once: true });
        }
        let requestTimedOut = false;
        const requestTimeoutId = requestController ? setTimeout(function() {
          requestTimedOut = true;
          try { requestController.abort('provider_request_timeout'); } catch (ignoreTimeoutAbort) {}
        }, provider === 'workers-ai' ? 45000 : 12000) : null;
        let response;
        const quotaProviderId = provider === 'workers-ai' ? 'workers-ai' : (provider === 'groq' ? 'groq' : '');
        const quotaEventId = quotaProviderId ? ao3RecordQuotaUsage(quotaProviderId, texts.join('\n').length, { model: model }) : null;
        try {
          response = await fetch(ao3FunctionUrl(endpoint), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: apiKey,
              model: model,
              texts: texts,
              prompt: ((context && context.prompt) || (state.settings.translationPrompt || '').trim()) + (String(state.settings.characterStyleRules || '').trim() ? '\n\n[추가 프롬프트]\n' + String(state.settings.characterStyleRules).trim() + '\n기본 번역 지침과 충돌하면 원문의 의미와 문맥을 우선하고, 추가 지침은 해당 문맥에 맞게 적용하세요.' : ''),
              fandom: (context && context.fandom) || '',
              prevContext: (context && context.prevContext) || '',
              qualityParagraphCountEnabled: ao3QualityCheckEnabled('paragraphCount')
            }),
            ...(requestController ? { signal: requestController.signal } : {})
          });
        } catch (fetchError) {
          if (parentSignal && parentSignal.aborted) {
            const cancelled = new Error('Groq request cancelled because Azure fallback won the provider race.');
            cancelled.name = 'AbortError';
            cancelled.cancelledByFallback = true;
            throw cancelled;
          }
          if (requestTimedOut) {
            const timeoutError = new Error(providerDisplayName + ' request timed out.');
            timeoutError.name = 'TimeoutError';
            throw timeoutError;
          }
          throw fetchError;
        } finally {
          if (requestTimeoutId) clearTimeout(requestTimeoutId);
          if (parentSignal && parentAbortHandler) parentSignal.removeEventListener('abort', parentAbortHandler);
          if (requestController) manualControllers.delete(requestController);
        }
        if (provider === 'groq') ao3CaptureGroqQuotaHeaders(response.headers, model);
        const retryAfterHeader = response.headers.get('Retry-After');
        let retrySeconds = Number(retryAfterHeader || 0);
        let payload = null;
        try { payload = await response.json(); } catch (ignoreJson) {}
        ao3CaptureQuotaResponse(provider === 'groq' ? 'groq' : 'workers-ai', response.status, payload, response.headers, model);
        if (quotaEventId) ao3UpdateQuotaEvent(quotaEventId, { status: response.ok ? 'success' : ('HTTP ' + response.status), inputTokens: payload && payload.usage && (payload.usage.prompt_tokens || payload.usage.input_tokens) || 0, outputTokens: payload && payload.usage && (payload.usage.completion_tokens || payload.usage.output_tokens) || 0 });
        if (!retrySeconds || retrySeconds <= 0) {
          const rawMessage = String(payload && (payload.message || payload.error || payload.detail) || '');
          // Groq often puts the precise cooldown in its error body, e.g. "try again in 27.472s".
          const retryMatch = rawMessage.match(/(?:try again|retry)\s+(?:in\s+)?([0-9]+(?:\.[0-9]+)?)\s*s(?:ec(?:ond)?s?)?/i);
          if (retryMatch) retrySeconds = Number(retryMatch[1]);
        }
        const retryAfterMs = retrySeconds > 0 ? Math.min(5 * 60 * 1000, Math.max(1000, retrySeconds * 1000)) : 60000;
        if (!response.ok) {
          const message = payload && (payload.message || payload.error || payload.detail) || ('HTTP ' + response.status);
          const error = new Error(provider.toUpperCase() + ' HTTP ' + response.status + ': ' + String(message).slice(0, 700));
          error.status = response.status;
          error.retryAfterMs = retryAfterMs;
          error.reason = payload && payload.reason ? String(payload.reason) : '';
          error.expectedParagraphs = Number(payload && payload.expectedParagraphs || 0);
          error.receivedParagraphs = Number(payload && payload.receivedParagraphs || 0);
          error.emptyParagraphIndexes = Array.isArray(payload && payload.emptyParagraphIndexes) ? payload.emptyParagraphIndexes : [];
          throw error;
        }
        if (!payload || !Array.isArray(payload.translations) || payload.translations.some(function(value) { return typeof value !== 'string'; })) {
          throw new Error(provider.toUpperCase() + ' returned an unexpected translation response format.');
        }
        const alignedTranslations = ao3FitExtraTranslationParts(payload.translations, texts.length);
        if (alignedTranslations.length !== texts.length) {
          throw new Error(provider.toUpperCase() + ' returned an unexpected translation paragraph count.');
        }
        return alignedTranslations;
      }

      function setTranslationProviderStatus(provider, detail) {
        // Small live status pill in the translation-add progress panel.
        const pill = document.getElementById('translationProviderStatus');
        const text = document.getElementById('translationProviderStatusText');
        if (!pill || !text) return;
        const name = String(provider || 'API').trim();
        const phase = String(detail || '').trim();
        const key = name.toLowerCase();
        const statusLabel = phase ? name + ' · ' + phase : name;
        pill.dataset.provider = key;
        text.textContent = statusLabel;
        pill.title = statusLabel;
        pill.setAttribute('aria-label', statusLabel);
        const dot = pill.querySelector('span');
        pill.className = 'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold min-w-0 max-w-full';
        pill.style.maxWidth = 'min(72vw, 520px)';
        pill.style.flex = '0 1 auto';
        text.style.minWidth = '0';
        text.style.whiteSpace = 'normal';
        text.style.overflowWrap = 'anywhere';
        let dotClass = 'bg-slate-400';
        if (key.indexOf('gemini') >= 0) {
          pill.classList.add('bg-violet-50', 'border-violet-200', 'text-violet-800'); dotClass = 'bg-violet-500';
        } else if (key.indexOf('groq') >= 0) {
          pill.classList.add('bg-orange-50', 'border-orange-200', 'text-orange-800'); dotClass = 'bg-orange-500';
        } else if (key.indexOf('workers ai') >= 0 || key.indexOf('workers-ai') >= 0) {
          pill.classList.add('bg-violet-50', 'border-violet-200', 'text-violet-800'); dotClass = 'bg-violet-500';
        } else if (key.indexOf('azure') >= 0) {
          pill.classList.add('bg-sky-50', 'border-sky-200', 'text-sky-800'); dotClass = 'bg-sky-500';
        } else {
          pill.classList.add('bg-white', 'border-slate-200', 'text-slate-700');
        }
        if (dot) dot.className = 'inline-block w-1.5 h-1.5 rounded-full ' + dotClass;
        window._ao3LastTranslationProvider = name;
      }

      function resetTranslationProviderErrors() {
        window._ao3TranslationProviderErrors = [];
        const box = document.getElementById('translationProviderErrors');
        if (box) { box.textContent = ''; box.classList.add('hidden'); }
      }

      function recordTranslationProviderError(provider, message) {
        const safeProvider = String(provider || 'API');
        const safeMessage = String(message || '원인을 알 수 없는 오류').replace(/\s+/g, ' ').slice(0, 360);
        const list = window._ao3TranslationProviderErrors || (window._ao3TranslationProviderErrors = []);
        const entry = safeProvider + ': ' + safeMessage;
        if (!list.includes(entry)) list.push(entry);
        const box = document.getElementById('translationProviderErrors');
        if (box) {
          box.textContent = 'API 오류 / 대체 기록\n' + list.slice(-5).join('\n');
          box.classList.remove('hidden');
          box.hidden = false;
          box.removeAttribute('hidden');
        }
      }

      function getTranslationProviderErrorSummary() {
        const list = window._ao3TranslationProviderErrors || [];
        return list.slice(-5).join(' | ');
      }

      function loadPendingTranslationFailureReports() {
        try {
          const value = JSON.parse(localStorage.getItem(TRANSLATION_FAILURE_REPORTS_KEY) || '[]');
          return Array.isArray(value) ? value.filter(function(item) { return item && item.id && item.report; }) : [];
        } catch (e) { return []; }
      }

      function savePendingTranslationFailureReports(reports) {
        try {
          localStorage.setItem(TRANSLATION_FAILURE_REPORTS_KEY, JSON.stringify((reports || []).slice(-MAX_PENDING_TRANSLATION_FAILURE_REPORTS)));
          return true;
        } catch (e) {
          console.warn('Could not persist the pending translation failure report queue.');
          return false;
        }
      }

      function redactTranslationFailureSecrets(value) {
        let safe = String(value || '');
        const settings = state && state.settings ? state.settings : {};
        const configuredGeminiListKeys = (Array.isArray(settings.geminiKeyLists) ? settings.geminiKeyLists : []).reduce(function(all, list) {
          return all.concat(Array.isArray(list && list.keys) ? list.keys : []);
        }, []);
        [settings.geminiApiKey, settings.geminiApiKeys].concat(configuredGeminiListKeys, [settings.groqApiKey, settings.azureApiKey]).forEach(function(secret) {
          String(secret || '').split(/[\s,;]+/).filter(function(part) { return part.length >= 8; }).forEach(function(part) {
            safe = safe.split(part).join('[REDACTED API KEY]');
          });
        });
        return safe
          .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED GOOGLE API KEY]')
          .replace(/\b(?:gsk_|sk-)[A-Za-z0-9_-]{16,}/g, '[REDACTED API KEY]')
          .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [REDACTED]');
      }

      function showTranslationFailurePopup(chapterTitle, error, reportStatus) {
        const title = String(chapterTitle || '(제목 없음)');
        const reason = redactTranslationFailureSecrets(String(error && error.message || error || '알 수 없는 오류')).slice(0, 900);
        const rawDetails = Array.isArray(error && error.providerErrors) ? error.providerErrors.slice(-5).join(' | ') : getTranslationProviderErrorSummary();
        const details = redactTranslationFailureSecrets(rawDetails);
        const reportPersisted = !reportStatus || reportStatus.persisted !== false;
        const driveConnected = reportStatus && typeof reportStatus.driveConnected === 'boolean' ? reportStatus.driveConnected : isDriveTokenValid();
        const driveNote = !reportPersisted
          ? '오류 보고서를 브라우저 저장소에 저장하지 못했습니다. 저장 공간이 가득 찼거나 브라우저 저장 기능이 차단되었을 수 있습니다. 아래 원인과 오류 기록을 복사해 보관하세요.'
          : driveConnected
            ? '오류 보고서는 Drive 업로드 대기열에 저장되었고 업로드를 시도했습니다. 업로드 실패 시 로컬 대기열에 남아 재시도됩니다.'
            : '오류 보고서는 로컬 대기열에 저장되었습니다. Google Drive에 연결하면 자동 업로드됩니다.';
        const report = '번역 작업 중단\n\n챕터: ' + title + '\n원인: ' + reason +
          (details ? '\n\n공급자별 오류 기록:\n' + details.slice(0, 1800) : '') +
          '\n\n오류 보고서: ' + driveNote;
        window.alert(report);
      }

      function reportTranslationFailureToDrive(chapterTitle, error) {
        const errors = Array.isArray(error && error.providerErrors) ? error.providerErrors.slice() : (window._ao3TranslationProviderErrors || []).slice();
        const report = redactTranslationFailureSecrets([
          'AO3 번역 실패 보고서',
          '앱 빌드: ' + String(window.__AO3_BUILD_VERSION__ || 'unknown'),
          '시각: ' + new Date().toISOString(),
          '챕터: ' + String(chapterTitle || '(제목 없음)'),
          '결과: API 공급자 순환 ' + Number(error && error.translationRoundsUsed || 1) + '회 후 중단. 원문은 번역 완료로 저장되지 않았습니다.',
          '최종 오류: ' + String(error && error.message || error || '알 수 없는 오류'),
          '', '공급자 시도 및 오류:', errors.length ? errors.join('\n') : '(기록 없음)'
        ].join('\n'));
        const reportItem = {
          id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9),
          chapterTitle: String(chapterTitle || '(제목 없음)').slice(0, 180),
          createdAt: Date.now(), attempts: 0, report: report
        };
        const pending = loadPendingTranslationFailureReports();
        pending.push(reportItem);
        const persisted = savePendingTranslationFailureReports(pending);
        const driveConnected = isDriveTokenValid();
        if (persisted && driveConnected) flushPendingTranslationFailureReports();
        return { reportItem: reportItem, persisted: persisted, driveConnected: driveConnected };
      }

      function scheduleTranslationFailureReportRetry(attempts) {
        if (translationFailureReportFlushTimer) clearTimeout(translationFailureReportFlushTimer);
        const delay = Math.min(30 * 60 * 1000, 15000 * Math.pow(2, Math.min(6, Math.max(0, Number(attempts || 0)))));
        translationFailureReportFlushTimer = setTimeout(function() {
          translationFailureReportFlushTimer = null;
          flushPendingTranslationFailureReports();
        }, delay);
      }

      async function uploadTranslationFailureReportToDrive(reportItem) {
        if (!isDriveTokenValid()) throw new Error('Google Drive is not connected.');
        const folderId = await ensureDriveFailureReportsFolder();
        const fileName = 'ao3-translation-failure-' + reportItem.id + '.txt';
        const query = "'" + folderId + "' in parents and name = '" + fileName + "' and trashed = false";
        const findResponse = await driveApiFetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query) + '&fields=files(id,name)');
        if (!findResponse.ok) throw new Error('Drive report lookup failed (HTTP ' + findResponse.status + ').');
        const existingFiles = (await findResponse.json()).files || [];
        if (existingFiles.length) return existingFiles[0].id;

        const boundary = '-------ao3failure' + reportItem.id.replace(/[^a-z0-9]/gi, '');
        const metadata = { name: fileName, mimeType: 'text/plain', parents: [folderId] };
        const body = '--' + boundary + '\r\n' +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + '\r\n' +
          '--' + boundary + '\r\n' +
          'Content-Type: text/plain; charset=UTF-8\r\n\r\n' + reportItem.report + '\r\n' +
          '--' + boundary + '--';
        const response = await driveApiFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
          method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body: body
        });
        if (!response.ok) throw new Error('Drive report upload failed (HTTP ' + response.status + ').');
        const uploaded = await response.json();
        if (!uploaded || !uploaded.id) throw new Error('Drive did not return an uploaded report ID.');
        return uploaded.id;
      }

      async function flushPendingTranslationFailureReports() {
        if (!isDriveTokenValid() || translationFailureReportFlushBusy) return 0;
        if (translationFailureReportFlushTimer) {
          clearTimeout(translationFailureReportFlushTimer);
          translationFailureReportFlushTimer = null;
        }
        translationFailureReportFlushBusy = true;
        let uploadedCount = 0;
        try {
          const pending = loadPendingTranslationFailureReports();
          for (let index = 0; index < pending.length; index++) {
            try {
              await uploadTranslationFailureReportToDrive(pending[index]);
              pending.splice(index, 1);
              index--;
              uploadedCount++;
              savePendingTranslationFailureReports(pending);
            } catch (error) {
              pending[index].attempts = Number(pending[index].attempts || 0) + 1;
              pending[index].lastUploadError = String(error && error.message || error).slice(0, 180);
              savePendingTranslationFailureReports(pending);
              if (isDriveTokenValid()) scheduleTranslationFailureReportRetry(pending[index].attempts);
              break;
            }
          }
        } finally {
          translationFailureReportFlushBusy = false;
        }
        return uploadedCount;
      }

      function shouldRetryTranslationRound(error, batchRoundErrors) {
        // Classify only the current batch round. The visible error panel is shared by
        // concurrent chunks and can contain an unrelated 429 from an earlier request.
        const diagnostic = [error && error.message || error, (Array.isArray(batchRoundErrors) ? batchRoundErrors : []).join(' ')].join(' ').toLowerCase();
        const transientFailure = /(?:\b408\b|\b50[0234]\b|failed to fetch|network(?:error| request failed)|connection (?:reset|closed|refused)|temporarily unavailable|service unavailable)/i;
        if (transientFailure.test(diagnostic)) return true;
        // Repeating a chain that only failed due to invalid credentials/request,
        // quota/rate limits, cancellation, or local timeout is not useful.
        return false;
      }

      function ao3ShouldAttemptGeminiForBatch(batchState, forcedProvider, geminiModelOverride) {
        return !batchState || !batchState.geminiPoolExhausted || forcedProvider === 'gemini' || Boolean(geminiModelOverride);
      }

      async function translateParagraphBatch(enStrings, contextMeta) {
        const maxRounds = 2;
        // Keep exhaustion state isolated per translation batch. Multiple Gemini batches can
        // run concurrently; a shared window flag allowed one batch to skip another's keys.
        const batchState = { geminiPoolExhausted: false, providerErrors: [] };
        let roundsUsed = 0;
        let lastError = null;
        window._ao3TranslationBatchActiveCount = Number(window._ao3TranslationBatchActiveCount || 0) + 1;
        const manualButton = document.getElementById('translationManualProviderBtn');
        if (manualButton) manualButton.disabled = false;
        for (let round = 1; round <= maxRounds; round++) {
          roundsUsed = round;
          const roundErrorStart = batchState.providerErrors.length;
          setTranslationProviderStatus('API', '공급자 순환 ' + round + '/' + maxRounds);
          try {
            const result = await translateParagraphBatchOnce(enStrings, contextMeta, '', undefined, undefined, batchState);
            window._ao3TranslationBatchActiveCount = Math.max(0, Number(window._ao3TranslationBatchActiveCount || 1) - 1);
            if (manualButton && !window._ao3TranslationBatchActiveCount) manualButton.disabled = true;
            return result;
          } catch (error) {
            lastError = error;
            if (round >= maxRounds || !shouldRetryTranslationRound(error, batchState.providerErrors.slice(roundErrorStart))) break;
            await ao3Sleep(800);
          }
        }
        const batchErrorSummary = batchState.providerErrors.slice(-10).join(' | ');
        const message = 'Gemini 키 목록은 등록된 모든 키를 최대 2회 순회했고, 나머지 설정된 API 공급자도 시도했지만 번역에 성공하지 못해 작업을 중단했습니다. ' +
          String(lastError && lastError.message || lastError || '') +
          (batchErrorSummary ? ' · ' + batchErrorSummary : '');
        recordTranslationProviderError('작업 중단', message);
        const exhausted = new Error(message);
        exhausted.translationRoundsExhausted = true;
        exhausted.translationRoundsUsed = roundsUsed;
        exhausted.providerErrors = batchState.providerErrors.slice();
        window._ao3TranslationBatchActiveCount = Math.max(0, Number(window._ao3TranslationBatchActiveCount || 1) - 1);
        if (manualButton && !window._ao3TranslationBatchActiveCount) manualButton.disabled = true;
        throw exhausted;
      }

      function ao3BuildProviderTextBatches(texts, maxItems, maxChars) {
        const batches = []; let current = []; let currentChars = 0;
        texts.forEach(function(text) {
          const value = String(text || ''); const extra = value.length + (current.length ? 16 : 0);
          if (current.length && (current.length >= maxItems || currentChars + extra > maxChars)) {
            batches.push(current); current = []; currentChars = 0;
          }
          current.push(value); currentChars += value.length + (current.length > 1 ? 16 : 0);
        });
        if (current.length) batches.push(current);
        return batches;
      }

      async function translateParagraphBatchOnce(enStrings, contextMeta, manualProviderOverride, geminiModelOverride, geminiModelsAlreadyTried, batchState) {
        const translationBatchState = batchState || { geminiPoolExhausted: false, providerErrors: [] };
        if (!Array.isArray(translationBatchState.providerErrors)) translationBatchState.providerErrors = [];
        function recordBatchProviderError(provider, message) {
          const safeProvider = String(provider || 'API');
          const safeMessage = String(message || '원인을 알 수 없는 오류').replace(/\s+/g, ' ').slice(0, 360);
          translationBatchState.providerErrors.push(safeProvider + ': ' + safeMessage);
          recordTranslationProviderError(provider, message);
        }
        // Text replacement rules apply only after translation, never to the source text.
        const preparedStrings = enStrings.map(function(s) {
          if (isSceneDividerLine(s)) return '* * *';
          return stripInlineTranslationMarkup(s);
        });

        const customPrompt = ((state.settings.translationPrompt || DEFAULT_TRANSLATION_PROMPT).trim() +
          '\n\n[원문 문장 완결성] 원문에서 의도한 문장 조각, 말줄임표, 대시로 끊긴 말, 반복은 창작적 선택으로 보고 임의로 완성하거나 삭제하지 않는다. 원문에서 완결된 문장은 내용을 빠짐없이 완결된 한국어로 옮긴다. 고유명사·짧은 인용·코드 스위칭은 문맥상 의도일 수 있으므로 영어 잔여로 단정하지 말고, 일반 영어 구절이나 완결된 문장만 누락 여부를 다시 확인한다.');
        const fandomHint = (contextMeta && contextMeta.fandom) ? ('\n[원작/장르 정보]: ' + contextMeta.fandom) : '';
        const prevContextHint = (contextMeta && contextMeta.prevContext) ? ('\n[직전 문단 맥락(참고용, 번역 출력 제외)]: ' + contextMeta.prevContext) : '';
        const characterStyleHint = String(state.settings.characterStyleRules || '').trim() ? '\n[추가 프롬프트]\n' + String(state.settings.characterStyleRules).trim() + '\n기본 번역 지침과 충돌하면 원문의 의미와 문맥을 우선하고, 추가 지침은 해당 문맥에 맞게 적용하세요.' : '';
        const forcedProvider = manualProviderOverride || '';
        const triedGeminiModels = new Set(Array.isArray(geminiModelsAlreadyTried) ? geminiModelsAlreadyTried : []);
        let modelName = normalizeGeminiModel(geminiModelOverride || state.settings.geminiModel || DEFAULT_GEMINI_MODEL);
        const modelHealth = ao3GetGeminiModelHealthStore();
        if (Number(modelHealth[modelName] && modelHealth[modelName].until || 0) > Date.now()) {
          const coolingModel = modelName;
          triedGeminiModels.add(coolingModel);
          modelName = ao3NextAvailableGeminiModel(coolingModel, Array.from(triedGeminiModels));
          if (modelName) {
            setTranslationProviderStatus('Gemini', coolingModel + ' 혼잡 냉각 중 · ' + modelName + '으로 임시 전환');
            recordBatchProviderError('Gemini 모델 전환', coolingModel + '의 과부하 냉각이 끝나지 않아 ' + modelName + '으로 우회했습니다.');
          } else {
            setTranslationProviderStatus('Gemini', coolingModel + ' 과부하 냉각 중 · 다른 Gemini 모델도 사용 불가');
            recordBatchProviderError('Gemini 모델 전환', '사용자가 선택한 ' + coolingModel + '과 대체 Gemini 모델이 과부하 냉각 중이라 다른 공급자로 전환합니다.');
          }
        }
        async function acceptOrManuallyRetry(translations) {
          const nextProvider = window._ao3ManualProviderRequested || '';
          if (nextProvider) {
            window._ao3ManualProviderRequested = '';
            window._ao3ManualSwitchAbortRequested = false;
            setTranslationProviderStatus(nextProvider === 'gemini' ? 'Gemini' : nextProvider === 'workers-ai' ? 'Cloudflare Workers AI' : nextProvider === 'groq' ? 'Groq' : 'Azure Translator', '사용자가 선택한 API로 현재 문단 재시도');
            return translateParagraphBatchOnce(enStrings, contextMeta, nextProvider, undefined, undefined, translationBatchState);
          }
          return translations;
        }
        async function retryManualProviderAfterAbort() {
          const nextProvider = window._ao3ManualProviderRequested || '';
          if (!nextProvider || !window._ao3ManualSwitchAbortRequested) return null;
          window._ao3ManualProviderRequested = '';
          window._ao3ManualSwitchAbortRequested = false;
          setTranslationProviderStatus(nextProvider === 'gemini' ? 'Gemini' : nextProvider === 'workers-ai' ? 'Cloudflare Workers AI' : nextProvider === 'groq' ? 'Groq' : 'Azure Translator', '현재 문단 전환 중');
          return translateParagraphBatchOnce(enStrings, contextMeta, nextProvider, undefined, undefined, translationBatchState);
        }

        // 1. Gemini key pool: round-robin across requests, try every configured key on failure.
        const activeGeminiKeyList = ao3ActiveGeminiKeyList();
        // Capture a real snapshot: list edits (including editing the same active list)
        // must not remove the special-list label from requests already in flight.
        const geminiKeyListForTranslation = ao3SnapshotGeminiKeyList(activeGeminiKeyList);
        const geminiKeySource = geminiKeyListForTranslation && Array.isArray(geminiKeyListForTranslation.keys)
          ? geminiKeyListForTranslation.keys.join('\n')
          : String(state.settings.geminiApiKeys || state.settings.geminiApiKey || '');
        const geminiKeys = Array.from(new Set(String(geminiKeySource || '')
          .split(/[\r\n,;]+/).map(function(k) { return k.trim(); }).filter(Boolean)));
        if ((!forcedProvider || forcedProvider === 'gemini') && geminiKeys.length && modelName && ao3ShouldAttemptGeminiForBatch(translationBatchState, forcedProvider, geminiModelOverride)) {
          let savedStartIndex = Number(window._ao3GeminiNextKeyIndex);
          if (!Number.isFinite(savedStartIndex)) {
            try { savedStartIndex = Number(localStorage.getItem('ao3-gemini-next-key-index-v1') || 0); } catch (ignoreGeminiCursorRead) { savedStartIndex = 0; }
          }
          const startIndex = ((Math.floor(savedStartIndex || 0) % geminiKeys.length) + geminiKeys.length) % geminiKeys.length;
          const geminiCooldowns = ao3GetGeminiCooldownStore();
          let attemptedGeminiKeys = 0;
          let consideredGeminiKeys = 0;
          let coolingSkippedGeminiKeys = 0;
          const geminiKeyPassCount = 2;
          const geminiKeyVisitLimit = geminiKeys.length * geminiKeyPassCount;
          let geminiModelOverloaded = null;
          const systemInstructionText =
            '[번역 지침]\n' + customPrompt + characterStyleHint +
            fandomHint +
            '\n\n[출력 형식 규칙] 입력된 각 문단은 `<<<P_SEP>>>` 구분자로 나뉘어 있습니다. 반드시 입력된 문단 개수(' + preparedStrings.length + '개)와 정확히 동일한 개수로 번역하고, 각 문단 사이에 `<<<P_SEP>>>` 구분자를 그대로 유지하여 번역문만 출력하세요. 장면 구분선 `* * *`은 그대로 `* * *`로 유지하세요. 설명, 주석, 원문 재인용, 번역 라벨을 덧붙이지 마세요.';
          const userContentText =
            (prevContextHint ? (prevContextHint + '\n\n[번역할 원문 문단들]:\n') : '') +
            preparedStrings.join(' <<<P_SEP>>> ');

          while (consideredGeminiKeys < geminiKeyVisitLimit) {
            const passNumber = Math.floor(consideredGeminiKeys / geminiKeys.length) + 1;
            const keyIndex = (startIndex + (consideredGeminiKeys % geminiKeys.length)) % geminiKeys.length;
            consideredGeminiKeys++;
            const apiKey = geminiKeys[keyIndex];
            const geminiKeyDisplay = ao3GeminiKeyDisplayLabel(apiKey, geminiKeyListForTranslation);
            const geminiKeyLabel = geminiKeyDisplay.label;
            const geminiCooldownKey = ao3GeminiCooldownStorageKey(apiKey, modelName);
            ao3SetGeminiNextKeyIndex(keyIndex + 1, geminiKeys.length);
            if (state.settings.geminiCooldownEnabled !== false && Number(geminiCooldowns[geminiCooldownKey] || 0) > Date.now()) {
              coolingSkippedGeminiKeys++;
              recordBatchProviderError('Gemini 키 순환', geminiKeyLabel + '은 냉각 중이므로 ' + passNumber + '차 순회에서 건너뛰었습니다.');
              continue;
            }
            let geminiTimedOut = false;
            let geminiQuotaEventId = null;
            attemptedGeminiKeys++;
            try {
              setTranslationProviderStatus('Gemini', '요청 중 · ' + geminiKeyLabel);
              const geminiController = new AbortController();
              const manualControllers = window._ao3ManualProviderControllers || (window._ao3ManualProviderControllers = new Set());
              manualControllers.add(geminiController);
              const geminiTimeoutId = setTimeout(function() {
                geminiTimedOut = true;
                geminiController.abort('Gemini request exceeded ' + GEMINI_REQUEST_TIMEOUT_MS + 'ms');
              }, GEMINI_REQUEST_TIMEOUT_MS);
              let res;
              try {
                const geminiKeyIdentity = geminiKeyDisplay;
                geminiQuotaEventId = ao3RecordQuotaUsage('gemini', preparedStrings.join('\n').length, { model: modelName, keyFingerprint: geminiKeyIdentity.fingerprint, keyId: geminiKeyIdentity.id, keyLabel: geminiKeyIdentity.label });
                res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(modelName) + ':generateContent?key=' + encodeURIComponent(apiKey), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemInstructionText }] },
                    contents: [{ role: 'user', parts: [{ text: userContentText }] }],
                    generationConfig: { thinkingConfig: { thinkingLevel: 'low' } }
                  }),
                  signal: geminiController.signal
                });
              } finally {
                clearTimeout(geminiTimeoutId);
                manualControllers.delete(geminiController);
              }
              if (!res.ok) {
                let geminiErrorDetail = '';
                let errorPayload = null;
                try {
                  errorPayload = await res.json();
                  ao3CaptureQuotaResponse('gemini', res.status, errorPayload, res.headers, modelName);
                  if (res.status === 429) ao3CaptureGeminiQuotaFailure(errorPayload, modelName, keyIndex);
                  ao3UpdateQuotaEvent(geminiQuotaEventId, { status: 'HTTP ' + res.status });
                  const apiError = errorPayload && errorPayload.error;
                  if (apiError) {
                    geminiErrorDetail = [apiError.status, apiError.message].filter(Boolean).join(': ');
                    if (!geminiErrorDetail && apiError.code) geminiErrorDetail = String(apiError.code);
                  }
                } catch (ignoreGeminiErrorBody) {}
                if (ao3IsGeminiHighDemand(res.status, errorPayload)) {
                  geminiModelOverloaded = ao3MarkGeminiModelOverloaded(modelName, errorPayload, res.headers);
                  const overloadUntil = new Date(geminiModelOverloaded.until).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' });
                  const overloadMessage = 'Google AI가 ' + modelName + '에서 과부하/experiencing high demand를 보고했습니다. 약 ' + Math.ceil((geminiModelOverloaded.until - Date.now()) / 1000) + '초 냉각하고 ' + overloadUntil + ' 이후 다시 시도합니다.';
                  recordBatchProviderError('Gemini 모델 과부하', overloadMessage);
                  setTranslationProviderStatus('Gemini', modelName + ' 과부하 · 대체 모델 전환');
                  ao3UpdateQuotaEvent(geminiQuotaEventId, { status: 'server-overload-model-fallback' });
                }
                if (res.status === 429) {
                  const previousGeminiQuota = ao3LoadQuotaStore().snapshots.gemini || {};
                  if (state.settings.geminiCooldownEnabled !== false) {
                    const cooldown = ao3GeminiQuotaCooldown(apiKey, modelName, errorPayload, res.headers);
                    geminiCooldowns[cooldown.key] = cooldown.until;
                    ao3SaveGeminiCooldownStore(geminiCooldowns);
                    const waitSeconds = Math.ceil(cooldown.retryMs / 1000);
                    const retryAtLabel = new Date(cooldown.until).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' });
                    ao3SaveQuotaSnapshot('gemini', Object.assign({}, previousGeminiQuota, {
                      model: modelName, quotaHitAt: Date.now(), keySlot: geminiKeyDisplay.id,
                      cooldownUntil: cooldown.until, cooldownKind: cooldown.daily ? 'daily-limit' : 'rate-limit'
                    }));
                    geminiErrorDetail = (geminiErrorDetail ? geminiErrorDetail + ' · ' : '') + geminiKeyLabel + '을 ' + retryAtLabel + '까지 자동 제외';
                    console.info('Gemini confirmed HTTP 429; cooling down this model/key for about ' + waitSeconds + 's' + (cooldown.daily ? ' until the daily reset window' : '') + '.');
                    ao3RefreshGeminiCooldownPanel();
                  } else {
                    ao3SaveQuotaSnapshot('gemini', Object.assign({}, previousGeminiQuota, { model: modelName, quotaHitAt: Date.now(), keySlot: geminiKeyDisplay.id, cooldownKind: 'disabled' }));
                    geminiErrorDetail = (geminiErrorDetail ? geminiErrorDetail + ' · ' : '') + '냉각 꺼짐 · ' + geminiKeyLabel + '을 자동 제외하지 않음';
                  }
                }
                const geminiReason = 'HTTP ' + res.status + (geminiErrorDetail ? ' · ' + geminiErrorDetail : (res.status === 429 ? ' · 요청 한도 초과(429)' : ' · API 요청 실패'));
                setTranslationProviderStatus('Gemini', res.status === 429 ? geminiKeyLabel + ' 제한 · 다음 키/API 확인' : geminiKeyLabel + ' 오류 · 다음 API 확인');
                recordBatchProviderError(geminiKeyLabel, geminiReason);
                console.warn(
                  geminiKeyLabel + ' failed with HTTP ' + res.status +
                  (geminiErrorDetail ? ' (' + geminiErrorDetail + ')' : '') +
                  (res.status === 429 ? '; cooling down this key temporarily, then trying the next key/fallback.' : '; trying next key/fallback.')
                );
                // Keep the two full pool passes even for auth, quota, or server errors;
                // after pass two the other provider fallbacks may proceed.
                continue;
              }
              const data = await res.json();
              const usageMetadata = data && data.usageMetadata || {};
              ao3UpdateQuotaEvent(geminiQuotaEventId, { status: 'success', inputTokens: usageMetadata.promptTokenCount || usageMetadata.totalTokenCount || 0, outputTokens: usageMetadata.candidatesTokenCount || 0 });
              const rawOut = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts
                ? data.candidates[0].content.parts.map(function(part) { return part.text || ''; }).join('') : '';
              // Gemini: once the HTTP request succeeds, do not run post-translation
              // quality gates (paragraph-count, English-residue, incomplete-sentence, or
              // emptiness checks) here. Those gates previously rejected perfectly usable
              // Gemini responses and caused unnecessary calls to the next API key.
              // We only map the response into paragraph slots for the reader. Extra pieces
              // are folded into the final expected slot; missing slots are left blank so
              // chapter-level completeness protection can prevent an incomplete save, but
              // this mapping never triggers another Gemini request.
              let parts = rawOut.split(/\s*<<<P_SEP>>>\s*/);
              if (parts.length === 1 && enStrings.length > 1) {
                const blankLineParts = rawOut.split(/\r?\n\s*\r?\n+/).map(function(part) { return part.trim(); }).filter(Boolean);
                if (blankLineParts.length > 1) parts = blankLineParts;
              }
              if (enStrings.length > 0 && parts.length > enStrings.length) {
                const fitted = parts.slice(0, enStrings.length - 1);
                fitted.push(parts.slice(enStrings.length - 1).join('\n'));
                parts = fitted;
              }
              const cleanParts = enStrings.map(function(source, idx) {
                if (isSceneDividerLine(source)) return '* * *';
                return finalizeTranslatedParagraph(parts[idx] == null ? '' : parts[idx]);
              });
              const recoveredModelHealth = ao3GetGeminiModelHealthStore();
              if (recoveredModelHealth[modelName] && Number(recoveredModelHealth[modelName].until || 0) <= Date.now()) {
                delete recoveredModelHealth[modelName];
                ao3SaveGeminiModelHealthStore(recoveredModelHealth);
              }
              cleanParts.translationProvider = 'Gemini';
              setTranslationProviderStatus('Gemini', geminiKeyLabel + ' · ' + modelName + ' 번역 완료');
              return await acceptOrManuallyRetry(cleanParts);
            } catch (err) {
              const manuallyRetried = await retryManualProviderAfterAbort();
              if (manuallyRetried) return manuallyRetried;
              const message = geminiTimedOut
                ? 'Gemini request timed out after ' + Math.round(GEMINI_REQUEST_TIMEOUT_MS / 1000) + ' seconds; usage is unknown. Continuing remaining key slots in the two-pass rotation.'
                : (err && err.message ? err.message : String(err || 'Gemini request failed'));
              ao3UpdateQuotaEvent(geminiQuotaEventId, { status: geminiTimedOut ? 'timeout-usage-unknown' : (err && err.name === 'AbortError' ? 'aborted-usage-unknown' : 'network-error') });
              recordBatchProviderError(geminiKeyLabel, message);
              console.warn('Gemini request failed; continuing the remaining two-pass key rotation.', message);
              if (geminiTimedOut || (err && err.name === 'AbortError')) {
                // The configured key still counts as one attempted slot. Continue through
                // the remaining pool entries and the second pass, unless user switch handled it above.
                continue;
              }
            }
          }
          if (consideredGeminiKeys >= geminiKeyVisitLimit) {
            translationBatchState.geminiPoolExhausted = true;
            ao3SetGeminiNextKeyIndex(startIndex + 1, geminiKeys.length);
            recordBatchProviderError('Gemini 키 순환', '등록 키 ' + geminiKeys.length + '개를 ' + geminiKeyPassCount + '회 순회했습니다. 실제 요청 ' + attemptedGeminiKeys + '회' + (coolingSkippedGeminiKeys ? ', 냉각 정책으로 건너뜀 ' + coolingSkippedGeminiKeys + '회' : '') + '; 유효한 번역을 얻지 못해 다음 공급자로 전환합니다.');
          }
          if (geminiModelOverloaded) {
            triedGeminiModels.add(modelName);
            const alternateModel = ao3NextAvailableGeminiModel(modelName, Array.from(triedGeminiModels));
            if (alternateModel) {
              recordBatchProviderError('Gemini 모델 자동 전환', modelName + ' 과부하 후 현재 문단을 ' + alternateModel + '으로 재시도합니다.');
              setTranslationProviderStatus('Gemini', modelName + ' 과부하 · ' + alternateModel + ' 재시도');
              return translateParagraphBatchOnce(enStrings, contextMeta, forcedProvider, alternateModel, Array.from(triedGeminiModels), translationBatchState);
            }
            setTranslationProviderStatus('Gemini', '대체 Gemini 모델도 냉각 중 · 다음 공급자 확인');
          }
          if (attemptedGeminiKeys === 0) {
            recordBatchProviderError('Gemini', '이 모델의 등록 키가 명확한 HTTP 429 냉각 시간 안에 있어 이번 문단에서 건너뜁니다.');
            console.info('All configured Gemini keys for this model are cooling down after explicit HTTP 429 responses; continuing to fallback engines.');
          }
          // All Gemini keys failed or are cooling down; try Workers AI, then Groq with Azure hedge, then free endpoint.
        }

        // 2. Cloudflare Workers AI fallback (the second engine after Gemini).
        async function attemptWorkersAIProvider() {
          if (state.settings.workersAiEnabled === false) {
            setTranslationProviderStatus('Cloudflare Workers AI', '사용 안 함 · Groq로 전환');
            return null;
          }
          if (!window._ao3CloudflareProviderConfigReady) await refreshCloudflareProviderConfig();
          if (!window._ao3CloudflareServerProviders || !window._ao3CloudflareServerProviders.workersAI) {
            recordBatchProviderError('Cloudflare Workers AI', 'Worker에 AI 바인딩이 없거나 새 버전이 아직 배포되지 않았습니다.');
            setTranslationProviderStatus('Cloudflare Workers AI', '바인딩 미설정 · Groq로 전환');
            return null;
          }
          const model = String(state.settings.workersAiModel || '@cf/zai-org/glm-4.7-flash').trim();
          const baseContext = (contextMeta && contextMeta.prevContext) || '';
          const translated = [];
          try {
            // Larger character-bounded batches cut round-trips and stay below the 12k Worker cap.
            const workerBatches = ao3BuildProviderTextBatches(preparedStrings, 6, 9500);
            let workersStart = 0;
            for (let batchIndex = 0; batchIndex < workerBatches.length; batchIndex++) {
              const texts = workerBatches[batchIndex];
              const recentContext = preparedStrings.slice(Math.max(0, workersStart - 2), workersStart).filter(Boolean).join('\n\n');
              const prevContext = [baseContext, recentContext].filter(Boolean).join('\n\n').slice(-1800);
              let part = null;
              const workersContext = {
                prompt: customPrompt,
                fandom: (contextMeta && contextMeta.fandom) || '',
                prevContext: prevContext
              };
              try {
                part = await ao3TranslateWithPromptProvider('workers-ai-translate', 'workers-ai', '', model, texts, workersContext);
              } catch (batchError) {
                if (!batchError || batchError.reason !== 'paragraph_count_mismatch' || texts.length < 2) throw batchError;
                console.info('Workers AI paragraph alignment failed for a two-paragraph batch; retrying its paragraphs individually.');
                const repaired = [];
                for (let itemIndex = 0; itemIndex < texts.length; itemIndex++) {
                  const one = await ao3TranslateWithPromptProvider('workers-ai-translate', 'workers-ai', '', model, [texts[itemIndex]], workersContext);
                  if (!one || one.length !== 1 || !String(one[0] || '').trim()) throw new Error('Workers AI individual-paragraph recovery returned an empty result.');
                  repaired.push(one[0]);
                }
                part = repaired;
              }
              if (!part || part.length !== texts.length) throw new Error('Workers AI에서 번역 문단 수가 맞지 않는 결과를 반환했습니다.');
              translated.push.apply(translated, part);
              workersStart += texts.length;
            }
            if (translated.length !== preparedStrings.length) throw new Error('Workers AI 번역 결과가 불완전합니다.');
            const clean = translated.map(function(text, idx) {
              return isSceneDividerLine(enStrings[idx]) ? '* * *' : finalizeTranslatedParagraph(text);
            });
            const badIndex = clean.findIndex(function(text, idx) {
              return !isSceneDividerLine(enStrings[idx]) && ao3HasTranslationQualityIssue(preparedStrings[idx], text);
            });
            if (badIndex !== -1) throw new Error('문단 ' + (badIndex + 1) + '에 영어 잔존 또는 불완전한 번역이 감지되었습니다.');
            clean.translationProvider = 'Cloudflare Workers AI';
            setTranslationProviderStatus('Cloudflare Workers AI', '번역 완료 · 결과 검사 통과');
            return await acceptOrManuallyRetry(clean);
          } catch (error) {
            const manuallyRetried = await retryManualProviderAfterAbort();
            if (manuallyRetried) return manuallyRetried;
            recordBatchProviderError('Cloudflare Workers AI', error && error.message ? error.message : error);
            setTranslationProviderStatus('Cloudflare Workers AI', '실패 · Groq로 전환');
            console.warn('Workers AI translation failed; falling back to Groq/Azure.', error && error.message ? error.message : error);
            return null;
          }
        }

        const workersAiTranslations = (!forcedProvider || forcedProvider === 'workers-ai') ? await attemptWorkersAIProvider() : null;
        if (workersAiTranslations) return workersAiTranslations;

        const groqRaceController = new AbortController();
        const azureRaceController = new AbortController();
        let groqCancelledByHedgeWinner = false;
        function cancelGroqAsHedgeLoser() {
          groqCancelledByHedgeWinner = true;
          try { groqRaceController.abort('Azure fallback returned a valid translation first'); } catch (ignoreGroqRaceAbort) {}
        }
        async function attemptGroqProvider() {
        // Groq primary fallback attempt after Gemini.
        {
          if (!window._ao3CloudflareProviderConfigReady) await refreshCloudflareProviderConfig();
          const groqKey = String(state.settings.groqApiKey || '').trim();
          const groqServerSecretAvailable = Boolean(window._ao3CloudflareServerProviders && window._ao3CloudflareServerProviders.groq);
          const groqModel = String(state.settings.groqModel || 'openai/gpt-oss-120b').trim();
          const groqCooldowns = window._ao3ProviderCooldownUntil || (window._ao3ProviderCooldownUntil = Object.create(null));
          if (!Number(groqCooldowns.groq || 0)) {
            try { groqCooldowns.groq = Number(localStorage.getItem('ao3-groq-cooldown-until') || 0); } catch (ignoreGroqCooldownStorage) {}
          }
          if (state.settings.groqEnabled !== false && (groqKey || groqServerSecretAvailable) && groqModel && Number(groqCooldowns.groq || 0) <= Date.now()) {
            try {
              // Four paragraphs per call reduce requests; cap text below proxy limit.
              const groqBatches = ao3BuildProviderTextBatches(preparedStrings, 4, 8000);
              const groqTranslations = [];
              const groqBaseContext = (contextMeta && contextMeta.prevContext) || '';
              let groqStart = 0;
              for (let groqBatchIndex = 0; groqBatchIndex < groqBatches.length; groqBatchIndex++) {
                const groqTexts = groqBatches[groqBatchIndex];
                const recentContext = preparedStrings.slice(Math.max(0, groqStart - 2), groqStart).filter(Boolean).join('\n\n');
                const groqPrevContext = [groqBaseContext, recentContext].filter(Boolean).join('\n\n').slice(-1500);
                let groqPartResult = null;
                // Do not wait/retry inside the translation queue. A slow or rate-limited Groq
                // request is surfaced immediately so this entire batch can fall through to Google/Azure.
                const groqContext = {
                  prompt: customPrompt,
                  fandom: (contextMeta && contextMeta.fandom) || '',
                  prevContext: groqPrevContext,
                  signalController: groqRaceController
                };
                try {
                  groqPartResult = await ao3TranslateWithPromptProvider('groq-translate', 'groq', groqKey, groqModel, groqTexts, groqContext);
                } catch (batchError) {
                  if (!batchError || batchError.reason !== 'paragraph_count_mismatch' || groqTexts.length < 2) throw batchError;
                  console.info('Groq paragraph alignment failed for a two-paragraph batch; retrying its paragraphs individually.');
                  const repaired = [];
                  for (let itemIndex = 0; itemIndex < groqTexts.length; itemIndex++) {
                    const one = await ao3TranslateWithPromptProvider('groq-translate', 'groq', groqKey, groqModel, [groqTexts[itemIndex]], {
                      prompt: customPrompt,
                      fandom: (contextMeta && contextMeta.fandom) || '',
                      prevContext: groqPrevContext,
                      signalController: groqRaceController
                    });
                    if (!one || one.length !== 1 || !String(one[0] || '').trim()) throw new Error('Groq individual-paragraph recovery returned an empty result.');
                    repaired.push(one[0]);
                  }
                  groqPartResult = repaired;
                }
                if (!groqPartResult) throw new Error('Groq did not return translations for a paragraph batch.');
                groqTranslations.push.apply(groqTranslations, groqPartResult);
                groqStart += groqTexts.length;
              }
              if (groqTranslations.length === preparedStrings.length) {
                const cleanGroqTranslations = groqTranslations.map(function(text, idx) {
                  return isSceneDividerLine(enStrings[idx]) ? '* * *' : finalizeTranslatedParagraph(text);
                });
                const badGroqIndex = cleanGroqTranslations.findIndex(function(text, idx) {
                  return !isSceneDividerLine(enStrings[idx]) && ao3HasTranslationQualityIssue(preparedStrings[idx], text);
                });
                if (badGroqIndex !== -1) {
                  throw new Error('Groq translation paragraph ' + (badGroqIndex + 1) + ' appears to contain untranslated English or incomplete punctuation; falling back to free translation for the batch.');
                }
                cleanGroqTranslations.translationProvider = 'Groq';
                setTranslationProviderStatus('Groq', '번역 완료');
                return await acceptOrManuallyRetry(cleanGroqTranslations);
              }
              throw new Error('Groq translation returned an incomplete paragraph batch.');
            } catch (groqError) {
              const manuallyRetried = await retryManualProviderAfterAbort();
              if (manuallyRetried) return manuallyRetried;
              if (groqCancelledByHedgeWinner && groqRaceController.signal.aborted) {
                // Azure already returned a valid result; this abort is intentional, not a provider error.
                return null;
              }
              const status = Number(groqError && groqError.status || 0);
              const waitMs = Number(groqError && groqError.retryAfterMs || 60000);
              if (status === 429) {
                // Respect Groq's precise body/header retry hint (e.g. 6.86s) when available;
                // use a conservative 60s cooldown only when the provider gave no timing hint.
                const hasRetryHint = Number.isFinite(waitMs) && waitMs > 0 && waitMs < 60000;
                const cooldownMs = hasRetryHint ? Math.max(8000, waitMs + 1500) : 60000;
                const cooldownUntil = Date.now() + Math.min(15 * 60 * 1000, cooldownMs);
                groqCooldowns.groq = cooldownUntil;
                try { localStorage.setItem('ao3-groq-cooldown-until', String(cooldownUntil)); } catch (ignoreGroqCooldownWrite) {}
              }
              setTranslationProviderStatus('Groq', status === 429 ? '요청 한도 · Azure 백업' : '실패/시간 초과 · Azure 백업');
              recordBatchProviderError('Groq', groqError && groqError.message ? groqError.message : ('HTTP ' + (status || '오류')));
              console.warn('Groq translation failed; allowing Azure backup to win if it is already running.', groqError && groqError.message ? groqError.message : groqError);
            }
          } else if (state.settings.groqEnabled === false) {
            setTranslationProviderStatus('Groq', '사용 안 함 · Azure 백업');
            console.info('Groq auto-use is disabled in settings; skipping it and continuing to free fallback after Azure.');
          } else if (groqCooldowns.groq > Date.now()) {
            const cooldownSeconds = Math.ceil((Number(groqCooldowns.groq) - Date.now()) / 1000);
            setTranslationProviderStatus('Groq', '제한으로 건너뜀 · 약 ' + cooldownSeconds + '초 후 재시도 가능');
            recordBatchProviderError('Groq', '이전 HTTP 429로 일시 제한 중입니다. 남은 대기 시간 약 ' + cooldownSeconds + '초; 이번 번역은 Groq를 건너뛰고 다른 공급자로 진행합니다.');
            console.info('Groq is temporarily rate-limited; skipping it for this batch.');
          }
        }


          return null;
        }
        async function attemptAzureProvider() {
        // Azure backup attempt. It can run in parallel when Groq exceeds the hedge delay.
        if (state.settings.azureEnabled === false && forcedProvider !== 'azure') {
          setTranslationProviderStatus('Azure Translator', '자동 사용 안 함 · 건너뜀');
          console.info('Azure Translator auto-use is disabled in settings; skipping automatic backup.');
          return null;
        }
        if (!window._ao3CloudflareProviderConfigReady) await refreshCloudflareProviderConfig();
        const azureKey = String(state.settings.azureApiKey || '').trim();
        const azureServerSecretAvailable = Boolean(window._ao3CloudflareServerProviders && window._ao3CloudflareServerProviders.azure);
        const azureCooldownKey = azureKey || (azureServerSecretAvailable ? '__cloudflare_azure_secret__' : '');
        const azureCoolingDown = window._ao3AzureCooldownKey === azureCooldownKey && Number(window._ao3AzureCooldownUntil || 0) > Date.now();
        if ((azureKey || azureServerSecretAvailable) && !azureCoolingDown) {
          try {
            const azurePlan = ao3BuildAzureRequestBatches(preparedStrings);
            const translatedByOriginal = azurePlan.translatedByOriginal;
            let azureSucceeded = true;
            let lastAzureResponse = null;
            let lastAzureErrorDetail = '';

            for (let batchIndex = 0; batchIndex < azurePlan.batches.length; batchIndex++) {
              const azureBatch = azurePlan.batches[batchIndex];
              setTranslationProviderStatus('Azure Translator', '요청 중 · ' + (batchIndex + 1) + '/' + azurePlan.batches.length);
              const azureResponse = await ao3FetchAzureBatch(azureKey, String(state.settings.azureRegion || '').trim(), azureBatch, azureRaceController);
              lastAzureResponse = azureResponse;
              if (!azureResponse.ok) {
                azureSucceeded = false;
                try {
                  const azureErrorBody = await azureResponse.text();
                  if (azureErrorBody) {
                    try {
                      const parsedAzureError = JSON.parse(azureErrorBody);
                      lastAzureErrorDetail = (parsedAzureError.error && (parsedAzureError.error.message || parsedAzureError.error.code))
                        || parsedAzureError.message || parsedAzureError.Message || azureErrorBody;
                      const apiCode = parsedAzureError.error && parsedAzureError.error.code;
                      if (apiCode !== undefined) lastAzureErrorDetail = 'Azure code ' + apiCode + ': ' + lastAzureErrorDetail;
                    } catch (ignoreAzureErrorJson) { lastAzureErrorDetail = azureErrorBody; }
                  }
                } catch (ignoreAzureErrorRead) {}
                break;
              }

              const azureData = await azureResponse.json();
              if (!Array.isArray(azureData) || azureData.length !== azureBatch.length || !azureData.every(function(item) {
                return item && Array.isArray(item.translations) && item.translations[0] && typeof item.translations[0].text === 'string';
              })) {
                azureSucceeded = false;
                lastAzureErrorDetail = 'Azure 응답 형식이 요청한 문장 수와 일치하지 않습니다.';
                break;
              }
              azureData.forEach(function(item, index) {
                const record = azureBatch[index];
                const translatedText = String(item.translations[0].text || '').trim();
                if (record.pieces && record.pieces.length > 1) {
                  const marker = record.pieces[0].marker;
                  const markerPattern = new RegExp(marker.split('').map(function(ch) { return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('\\s*'), 'gi');
                  const normalizedTranslatedText = translatedText.replace(markerPattern, marker);
                  const pieces = ao3FitExtraTranslationParts(normalizedTranslatedText.split(marker), record.pieces.length);
                  if (pieces.length !== record.pieces.length) {
                    azureSucceeded = false;
                    lastAzureErrorDetail = 'Azure가 문맥 묶음의 문단 구분자를 변경했습니다. 누락 문단을 안전하게 대응할 수 없어 다른 공급자 대체로 전환합니다.';
                    return;
                  }
                  record.pieces.forEach(function(piece, pieceIndex) {
                    translatedByOriginal[piece.originalIndex] = pieces[pieceIndex].trim();
                  });
                } else {
                  const originalIndex = record.originalIndex;
                  if (!translatedByOriginal[originalIndex] || translatedByOriginal[originalIndex] === '* * *') {
                    translatedByOriginal[originalIndex] = translatedText;
                  } else {
                    translatedByOriginal[originalIndex] += ' ' + translatedText;
                  }
                }
              });
              if (!azureSucceeded) break;
            }

            if (azureSucceeded) {
              // Azure-only cleanup: normalize spacing/punctuation without blindly
              // converting dialogue speech levels, then reject visibly incomplete output.
              const azureCleaned = translatedByOriginal.map(function(text, idx) {
                if (isSceneDividerLine(enStrings[idx])) return '* * *';
                return finalizeAzureTranslatedParagraph(text);
              });
              const badAzureIndex = azureCleaned.findIndex(function(text, idx) {
                return !isSceneDividerLine(enStrings[idx]) &&
                  ao3HasTranslationQualityIssue(preparedStrings[idx], text);
              });
              if (badAzureIndex === -1) {
                azureCleaned.translationProvider = 'Azure Translator';
                setTranslationProviderStatus('Azure Translator', '번역 완료 · 결과 검사 통과');
                return await acceptOrManuallyRetry(azureCleaned);
              }
              // Do not save a questionable Azure result as successful. Continue to
              // the existing free Google fallback below, preserving provider order.
              azureSucceeded = false;
              lastAzureErrorDetail = '문단 ' + (badAzureIndex + 1) + '에 영어 잔존 또는 불완전한 번역이 감지되어 Groq 대체로 전환했습니다.';
              recordBatchProviderError('Azure Translator', lastAzureErrorDetail);
              setTranslationProviderStatus('Azure Translator', '결과 검사 실패 · Groq 전환');
            }

            if (lastAzureResponse && (lastAzureResponse.status === 429 || lastAzureResponse.status === 401 || lastAzureResponse.status === 403)) {
              const cooldownMs = lastAzureResponse.status === 429 ? 60 * 1000 : 10 * 60 * 1000;
              window._ao3AzureCooldownKey = azureCooldownKey;
              window._ao3AzureCooldownUntil = Date.now() + cooldownMs;
            }
            const azureStatusText = lastAzureResponse ? ('HTTP ' + lastAzureResponse.status) : '응답 없음';
            recordBatchProviderError('Azure Translator', azureStatusText + (lastAzureErrorDetail ? ' · ' + String(lastAzureErrorDetail).slice(0, 300) : ' · 요청을 완료하지 못했습니다.'));
            setTranslationProviderStatus('Azure Translator', lastAzureResponse && lastAzureResponse.status === 429 ? '요청 한도 · Groq 전환' : '실패 · Groq 전환');
            console.warn(
              'Azure Translator failed with HTTP ' + (lastAzureResponse ? lastAzureResponse.status : 'unknown') +
              (lastAzureErrorDetail ? ': ' + String(lastAzureErrorDetail).slice(0, 700) : '') +
              (lastAzureResponse && lastAzureResponse.status === 429 ? '; Azure was retried once after waiting; continuing to free fallback.' :
               lastAzureResponse && (lastAzureResponse.status === 401 || lastAzureResponse.status === 403) ? '; check Translator credentials/region/permissions; continuing to free fallback.' :
               '; continuing to Groq fallback.')
            );
          } catch (azureError) {
              const manuallyRetried = await retryManualProviderAfterAbort();
              if (manuallyRetried) return manuallyRetried;
            recordBatchProviderError('Azure Translator', azureError && azureError.message ? azureError.message : azureError);
            setTranslationProviderStatus('Azure Translator', '백업 요청 오류');
            console.warn('Azure Translator backup request failed.', azureError && azureError.message ? azureError.message : azureError);
          }
        } else if (azureCoolingDown) {
          setTranslationProviderStatus('Azure Translator', '일시 제한');
          recordBatchProviderError('Azure Translator', '이전 요청의 401/403 또는 429 오류로 일시 건너뛰고 Groq로 전환합니다.');
          console.info('Azure Translator is temporarily cooling down after a rate/authorization error; skipping it and continuing to Groq fallback.');
        }


          return null;
        }

        // Keep priority: Gemini first; then Groq. If Groq has not returned a validated
        // result within 3.5s, start Azure in parallel. If Groq fails earlier, start Azure
        // immediately. The first VALID result wins; failed/invalid outputs never race as winners.
        if (forcedProvider && forcedProvider !== 'groq' && forcedProvider !== 'azure') {
          throw new Error('선택한 API를 사용할 수 없거나 등록되어 있지 않습니다.');
        }
        const groqOutcome = (forcedProvider === 'azure' ? Promise.resolve(null) : attemptGroqProvider()).then(
          function(result) { return { provider: 'Groq', result: result || null }; },
          function(error) { recordBatchProviderError('Groq', error && error.message || error); return { provider: 'Groq', result: null }; }
        );
        let azureOutcome = null;
        let azureStarted = false;
        function startAzureBackup() {
          if (forcedProvider === 'groq') return Promise.resolve({ provider: 'Azure Translator', result: null });
          if (!azureStarted) {
            azureStarted = true;
            azureOutcome = attemptAzureProvider().then(
              function(result) { return { provider: 'Azure Translator', result: result || null }; },
              function(error) { recordBatchProviderError('Azure Translator', error && error.message || error); return { provider: 'Azure Translator', result: null }; }
            );
          }
          return azureOutcome;
        }
        const first = forcedProvider === 'azure'
          ? { provider: 'hedge-timer', result: null }
          : await Promise.race([groqOutcome, ao3Sleep(3500).then(function() { return { provider: 'hedge-timer', result: null }; })]);
        if (first.provider === 'Groq' && first.result) {
          azureRaceController.abort();
          setTranslationProviderStatus('Groq', '번역 완료 · 우선 결과');
          return first.result;
        }
        const azurePromise = startAzureBackup();
        if (first.provider === 'Groq') {
          const backup = await azurePromise;
          if (backup && backup.result) {
            cancelGroqAsHedgeLoser();
            setTranslationProviderStatus('Azure Translator', '백업 번역 완료');
            return backup.result;
          }
        } else {
          // Azure was started after the hedge delay. Race valid outcomes, then await the
          // remaining provider if the first completion is a failure.
          const winner = await Promise.race([groqOutcome, azurePromise]);
          if (winner.result) {
            if (winner.provider === 'Groq') {
              azureRaceController.abort();
              setTranslationProviderStatus('Groq', '번역 완료 · 우선 결과');
            } else {
              cancelGroqAsHedgeLoser();
              setTranslationProviderStatus('Azure Translator', '백업 번역 완료');
            }
            return winner.result;
          }
          const other = winner.provider === 'Groq' ? await azurePromise : await groqOutcome;
          if (other.result) {
            if (other.provider === 'Groq') azureRaceController.abort(); else cancelGroqAsHedgeLoser();
            setTranslationProviderStatus(other.provider, '번역 완료 · 대체 결과');
            return other.result;
          }
        }

        throw new Error('설정된 Gemini, Workers AI, Groq, Azure API가 모두 실패했습니다.');
      }

      // High-speed chapter translation with larger batches & parallel concurrency
      async function translateDraftChapter(chapterObj, progressCallback, fandomName) {
        const paragraphs = chapterObj.paragraphs || [];
        const total = paragraphs.length;
        if (total === 0) {
          chapterObj.translated = true;
          return;
        }
        // Chunk size balances prompt context and output length; concurrency below is adaptive.
        const hasAnyPromptProvider = Boolean(
          String(state.settings.geminiApiKeys || state.settings.geminiApiKey || '').trim() ||
          String(state.settings.groqApiKey || '').trim()
        );
        const chunkSize = hasAnyPromptProvider ? 12 : 8;

        const chunks = [];
        for (let start = 0; start < total; start += chunkSize) {
          chunks.push({
            start: start,
            slice: paragraphs.slice(start, start + chunkSize),
            prevContext: start > 0 ? (paragraphs[start - 1].en || '') : ''
          });
        }

        let completedParagraphs = 0;
        const stagedTranslations = new Array(total);
        let cursor = 0;
        let adaptiveConcurrency = 1;
        while (cursor < chunks.length) {
          const group = chunks.slice(cursor, cursor + adaptiveConcurrency);
          const groupResults = await Promise.allSettled(group.map(async function(task) {
            const enBatch = task.slice.map(function(p) { return p.en; });
            const koBatch = await translateParagraphBatch(enBatch, {
              fandom: fandomName || '',
              prevContext: task.prevContext
            });
            task.translationProvider = koBatch && koBatch.translationProvider ? koBatch.translationProvider : 'unknown';
            task.slice.forEach(function(p, idx) {
              const translatedText = stripInlineTranslationMarkup(koBatch[idx] || '');
              if (!translatedText && !isSceneDividerLine(p.en || '')) {
                throw new Error('번역 결과가 비어 있습니다. 해당 묶음은 완료 처리하지 않았습니다.');
              }
              stagedTranslations[task.start + idx] = isSceneDividerLine(p.en || '') ? '* * *' : translatedText;
            });
            completedParagraphs += task.slice.length;
            if (progressCallback) {
              progressCallback(Math.min(total, completedParagraphs), total, {
                start: task.start,
                translated: task.slice.map(function(p, idx) { return stagedTranslations[task.start + idx] || ''; })
              });
            }
          }));
          const failedGroupTask = groupResults.find(function(result) { return result.status === 'rejected'; });
          if (failedGroupTask) throw failedGroupTask.reason;
          // Parallelism is enabled only after a Gemini response has been mapped to its
          // paragraph slots without quality-gate retries. A fallback batch returns to serial
          // mode to avoid bursts against Workers AI/Groq free-tier TPM and Azure quotas.
          adaptiveConcurrency = group.every(function(task) { return task.translationProvider === 'Gemini'; }) ? 2 : 1;
          cursor += group.length;
        }
        // Commit only after every paragraph succeeded. A failed fallback must never leave a half-translated chapter.
        if (stagedTranslations.length !== total || stagedTranslations.some(function(value, idx) { return typeof value !== 'string' || (!value.trim() && !isSceneDividerLine(paragraphs[idx].en || '')); })) {
          throw new Error('번역 결과가 완전하지 않아 챕터 전체를 저장하지 않았습니다.');
        }
        paragraphs.forEach(function(p, idx) { p.ko = stagedTranslations[idx]; });
        chapterObj.translated = true;
      }

      // Render Studio View
      function renderStudio() {
        updateHeaderBadges();

        // Input Method Tabs
        const urlTab = document.getElementById('tabMethodUrlBtn');
        const pasteTab = document.getElementById('tabMethodPasteBtn');
        const urlPanel = document.getElementById('methodUrlPanel');
        const pastePanel = document.getElementById('methodPastePanel');

        // Compact two-mode workflow: AO3 chapter URL or manual text/HTML paste.
        const usePaste = state.studioInputMethod === 'paste';
        urlTab.className = usePaste ? 'px-4 py-2.5 border-b-2 border-transparent text-slate-500 transition' : 'px-4 py-2.5 border-b-2 border-rose-700 text-rose-700 transition';
        pasteTab.className = usePaste ? 'px-4 py-2.5 border-b-2 border-rose-700 text-rose-700 transition' : 'px-4 py-2.5 border-b-2 border-transparent text-slate-500 transition';
        urlPanel.classList.toggle('hidden', usePaste);
        pastePanel.classList.toggle('hidden', !usePaste);
        const urlModeBtn = document.getElementById('studioUrlModeBtn');
        const pasteModeBtn = document.getElementById('studioPasteModeBtn');
        if (urlModeBtn) {
          urlModeBtn.setAttribute('aria-pressed', usePaste ? 'false' : 'true');
          urlModeBtn.className = usePaste
            ? 'studio-mode-button flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition'
            : 'studio-mode-button flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-800 transition';
        }
        if (pasteModeBtn) {
          pasteModeBtn.setAttribute('aria-pressed', usePaste ? 'true' : 'false');
          pasteModeBtn.className = usePaste
            ? 'studio-mode-button flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-800 transition'
            : 'studio-mode-button flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition';
        }

        // Bind Mode (New vs Append)
        const newBtn = document.getElementById('bindModeNewBtn');
        const appendBtn = document.getElementById('bindModeAppendBtn');
        const appendBox = document.getElementById('appendTargetNovelBox');
        const newMetaBox = document.getElementById('newNovelMetaFields');
        const saveBtnText = document.getElementById('saveBoundNovelBtnText');

        if (state.studioBindMode === 'new') {
          newBtn.className = 'py-2 px-3 rounded-lg bg-white text-slate-900 shadow-sm transition';
          appendBtn.className = 'py-2 px-3 rounded-lg text-slate-600 hover:text-slate-900 transition';
          appendBox.classList.add('hidden');
          newMetaBox.classList.remove('hidden');
          saveBtnText.textContent = '챕터들을 한 권으로 묶어 책장에 저장하기';
        } else {
          appendBtn.className = 'py-2 px-3 rounded-lg bg-white text-slate-900 shadow-sm transition';
          newBtn.className = 'py-2 px-3 rounded-lg text-slate-600 hover:text-slate-900 transition';
          appendBox.classList.remove('hidden');
          newMetaBox.classList.add('hidden');
          saveBtnText.textContent = '선택한 책장 소설에 챕터 이어붙이기';

          const select = document.getElementById('appendTargetNovelSelect');
          const currentVal = select.value;
          if (state.novels.length === 0) {
            select.innerHTML = '<option value="">책장에 저장된 소설이 없습니다</option>';
          } else {
            select.innerHTML = state.novels.map(function(n) {
              return '<option value="' + escapeHtml(n.id) + '">' + escapeHtml(n.title) + ' (현재 ' + (n.chapters ? n.chapters.length : 0) + '챕터)</option>';
            }).join('');
            if (currentVal && state.novels.some(function(n) { return n.id === currentVal; })) {
              select.value = currentVal;
            }
          }
        }

        // Render Draft Chapters Queue
        document.getElementById('studioChapterCountBadge').textContent = state.draftChapters.length + '개 챕터';
        const container = document.getElementById('draftChaptersContainer');
        if (state.draftChapters.length === 0) {
          container.innerHTML = '' +
            '<div class="rounded-xl border border-dashed border-slate-200 p-8 text-center space-y-2">' +
              '<p class="text-xs sm:text-sm font-semibold text-slate-600">아직 대기열에 추가된 챕터가 없습니다.</p>' +
              '<p class="text-xs text-slate-400">위에서 AO3 URL을 입력하거나 영어 본문을 붙여넣어 여러 챕터를 추가해 보세요. 상단의 <strong>[+ 샘플 AO3 영문 챕터 불러오기]</strong> 버튼으로 즉시 테스트할 수도 있습니다.</p>' +
            '</div>';
          return;
        }

        container.innerHTML = state.draftChapters.map(function(ch, idx) {
          const pCount = (ch.paragraphs || []).length;
          const isTranslated = Boolean(ch.translated);
          const statusBadge = isTranslated
            ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">한국어 번역 완료</span>'
            : '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">미번역 (원문)</span>';

          const previewParagraph = ch.paragraphs && ch.paragraphs[0]
            ? (isTranslated ? ch.paragraphs[0].ko : ch.paragraphs[0].en)
            : '';

          return '' +
            '<div class="rounded-xl border border-slate-200 p-3.5 bg-slate-50/60 space-y-2.5">' +
              '<div class="flex flex-wrap items-center justify-between gap-2">' +
                '<div class="flex items-center gap-2 flex-1 min-w-[200px]">' +
                  '<span class="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">' + (idx + 1) + '</span>' +
                  '<input type="text" data-draft-title-idx="' + idx + '" value="' + escapeHtml(ch.title) + '" class="draft-title-input flex-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-rose-600" />' +
                '</div>' +
                '<div class="flex items-center gap-1">' +
                  statusBadge +
                  '<button type="button" data-translate-idx="' + idx + '" class="draft-translate-btn px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold transition">' +
                    (isTranslated ? '재번역' : '한국어 번역') +
                  '</button>' +
                  '<button type="button" data-move-up="' + idx + '" ' + (idx === 0 ? 'disabled' : '') + ' class="draft-up-btn p-1 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-30 text-xs" title="위로 이동">↑</button>' +
                  '<button type="button" data-move-down="' + idx + '" ' + (idx === state.draftChapters.length - 1 ? 'disabled' : '') + ' class="draft-down-btn p-1 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-30 text-xs" title="아래로 이동">↓</button>' +
                  '<button type="button" data-remove-idx="' + idx + '" class="draft-remove-btn p-1 rounded border border-slate-200 bg-white text-slate-400 hover:text-rose-600 text-xs" title="챕터 제거">✕</button>' +
                '</div>' +
              '</div>' +
              '<p class="text-xs text-slate-600 line-clamp-2 pl-8">' + escapeHtml(previewParagraph) + ' <span class="text-slate-400">(' + pCount + '문단)</span></p>' +
            '</div>';
        }).join('');

        // Bind draft chapter controls
        container.querySelectorAll('.draft-title-input').forEach(function(inp) {
          inp.addEventListener('input', function() {
            const i = Number(inp.getAttribute('data-draft-title-idx'));
            if (state.draftChapters[i]) state.draftChapters[i].title = inp.value;
          });
        });

        container.querySelectorAll('.draft-translate-btn').forEach(function(btn) {
          btn.addEventListener('click', async function() {
            const i = Number(btn.getAttribute('data-translate-idx'));
            await runSingleDraftTranslation(i);
          });
        });

        container.querySelectorAll('.draft-up-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const i = Number(btn.getAttribute('data-move-up'));
            if (i > 0) {
              const tmp = state.draftChapters[i - 1];
              state.draftChapters[i - 1] = state.draftChapters[i];
              state.draftChapters[i] = tmp;
              renderStudio();
            }
          });
        });

        container.querySelectorAll('.draft-down-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const i = Number(btn.getAttribute('data-move-down'));
            if (i < state.draftChapters.length - 1) {
              const tmp = state.draftChapters[i + 1];
              state.draftChapters[i + 1] = state.draftChapters[i];
              state.draftChapters[i] = tmp;
              renderStudio();
            }
          });
        });

        container.querySelectorAll('.draft-remove-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const i = Number(btn.getAttribute('data-remove-idx'));
            state.draftChapters.splice(i, 1);
            renderStudio();
          });
        });
      }

      async function runSingleDraftTranslation(idx) {
        if (window._ao3AutomaticTranslationJobBusy) {
          showToast('다른 작품 번역이 진행 중입니다. 현재 작업이 끝난 뒤 다시 시도해 주세요.', 'warning');
          return;
        }
        window._ao3AutomaticTranslationJobBusy = true;
        const ch = state.draftChapters[idx];
        if (!ch) { window._ao3AutomaticTranslationJobBusy = false; return; }
        const progressBox = document.getElementById('translationProgressBox');
        const statusText = document.getElementById('translationStatusText');
        const percentText = document.getElementById('translationPercentText');
        const bar = document.getElementById('translationProgressBar');

        progressBox.classList.remove('hidden');
        resetTranslationProviderErrors();
        setTranslationProviderStatus('API', '엔진 선택 중');
        statusText.textContent = '"' + ch.title + '" 한국어 번역 중...';
        percentText.textContent = '0%';
        bar.style.width = '5%';

        try {
          await translateDraftChapter(ch, function(done, total) {
            const pct = Math.round((done / Math.max(1, total)) * 100);
            percentText.textContent = pct + '%';
            bar.style.width = pct + '%';
          });
          statusText.textContent = '번역 완료';
          renderStudio();
          showToast('"' + ch.title + '" 한국어 번역이 완료되었습니다.');
          if (!(window._ao3TranslationProviderErrors || []).length) setTimeout(function() { progressBox.classList.add('hidden'); }, 1800);
        } catch (err) {
          statusText.textContent = '번역 실패 · 원문을 번역문으로 저장하지 않았습니다.';
          setTranslationProviderStatus(window._ao3LastTranslationProvider || 'API', '실패');
          recordTranslationProviderError('번역 중단', err && err.message ? err.message : err);
          const reportStatus = reportTranslationFailureToDrive(ch.title, err);
          showTranslationFailurePopup(ch.title, err, reportStatus);
          showToast('번역이 중단되었습니다. 팝업에서 원인과 오류 보고서 상태를 확인하세요.', 'warning');
        } finally {
          window._ao3AutomaticTranslationJobBusy = false;
        }
      }

      async function runTranslateAllDrafts(onProgress, chapterSnapshot) {
        const chaptersToTranslate = Array.isArray(chapterSnapshot) ? chapterSnapshot : state.draftChapters;
        if (chaptersToTranslate.length === 0) {
          showToast('번역할 챕터가 대기열에 없습니다.', 'warning');
          return;
        }
        const progressBox = document.getElementById('translationProgressBox');
        const statusText = document.getElementById('translationStatusText');
        const percentText = document.getElementById('translationPercentText');
        const bar = document.getElementById('translationProgressBar');

        progressBox.classList.remove('hidden');
        resetTranslationProviderErrors();
        setTranslationProviderStatus('API', '엔진 선택 중');
        for (let i = 0; i < chaptersToTranslate.length; i++) {
          const ch = chaptersToTranslate[i];
          if (ch.translated) continue;
          statusText.textContent = '(' + (i + 1) + '/' + chaptersToTranslate.length + ') "' + ch.title + '" 번역 중...';
          try {
            await translateDraftChapter(ch, function(done, total, batch) {
              const overallPct = Math.round(((i + (done / Math.max(1, total))) / chaptersToTranslate.length) * 100);
              percentText.textContent = overallPct + '%';
              bar.style.width = overallPct + '%';
              if (typeof onProgress === 'function') onProgress({
                chapterIndex: i,
                chapter: ch,
                chapterDone: done,
                chapterTotal: total,
                overallPercent: overallPct,
                batch: batch || null
              });
            });
            if (typeof onProgress === 'function') onProgress({
              chapterIndex: i,
              chapter: ch,
              chapterDone: (ch.paragraphs || []).length,
              chapterTotal: (ch.paragraphs || []).length,
              overallPercent: Math.round(((i + 1) / chaptersToTranslate.length) * 100),
              chapterComplete: true
            });
            if (state.currentView === 'studio') renderStudio();
          } catch (err) {
            statusText.textContent = '챕터 ' + (i + 1) + ' 번역 실패 · 이후 챕터는 중단됨';
            recordTranslationProviderError('챕터 ' + (i + 1), err && err.message ? err.message : err);
            const reportStatus = reportTranslationFailureToDrive(ch.title, err);
            setTranslationProviderStatus(window._ao3LastTranslationProvider || 'API', '실패');
            showTranslationFailurePopup(ch.title, err, reportStatus);
            showToast('번역이 중단되었습니다. 팝업에서 원인과 오류 보고서 상태를 확인하세요.', 'warning');
            return false;
          }
        }
        statusText.textContent = '모든 챕터 번역 완료';
        if (!(window._ao3TranslationProviderErrors || []).length) setTimeout(function() { progressBox.classList.add('hidden'); }, 1800);
        renderStudio();
        showToast('모든 챕터의 한국어 번역이 완료되었습니다!');
        return true;
      }

      // ==================== BOOKMARKS & TAGS MANAGER VIEW ====================
      // ==================== MANUAL CUSTOM BOOKSHELVES ====================
      function hydrateCustomShelvesFromNovels() {
        const embedded = (state.novels || []).find(function(n) { return Array.isArray(n.customShelfDefinitions) && n.customShelfDefinitions.length; });
        if (embedded && embedded.customShelfDefinitions.length) {
          const merged = new Map();
          state.customShelves.forEach(function(x) { merged.set(x.id, x); });
          embedded.customShelfDefinitions.forEach(function(x) { if (x && x.id && (x.type === 'author' || x.type === 'topic') && x.name) merged.set(x.id, x); });
          state.customShelves = Array.from(merged.values());
          try { localStorage.setItem(CUSTOM_SHELVES_KEY, JSON.stringify(state.customShelves)); } catch (e) {}
        }
      }
      function embedCustomShelvesInNovels() {
        try { localStorage.setItem(CUSTOM_SHELVES_KEY, JSON.stringify(state.customShelves || [])); } catch (e) {}
        (state.novels || []).forEach(function(n) { n.customShelfDefinitions = (state.customShelves || []).map(function(x) { return { id: x.id, type: x.type, name: x.name, createdAt: x.createdAt || 0 }; }); });
      }
      function persistCustomShelves() {
        embedCustomShelvesInNovels();
        try { localStorage.setItem(CUSTOM_SHELVES_KEY, JSON.stringify(state.customShelves || [])); } catch (e) {}
        setCustomShelvesLocalTimestamp(Date.now());
        saveToStorage();
        scheduleCustomShelvesDriveSync();
      }
      function getCustomShelfById(id) { return (state.customShelves || []).find(function(x) { return x.id === id; }) || null; }
      function renderCustomBookshelves() {
        const authorBox = document.getElementById('customAuthorShelvesList');
        const topicBox = document.getElementById('customTopicShelvesList');
        if (!authorBox || !topicBox) return;
        document.getElementById('customShelfAllCount').textContent = state.novels.length + '권';
        function shelfButton(shelf) {
          const selected = state.selectedCustomShelfId === shelf.id;
          const count = state.novels.filter(function(n) { return Array.isArray(n.customShelfIds) && n.customShelfIds.includes(shelf.id); }).length;
          return '<div class="flex items-center gap-1"><button type="button" data-custom-shelf="' + escapeHtml(shelf.id) + '" class="custom-shelf-select flex-1 min-w-0 text-left px-3 py-2 rounded-xl border text-sm ' + (selected ? 'bg-rose-50 text-rose-800 border-rose-200' : 'border-transparent text-slate-700 hover:bg-slate-50') + '"><span class="block truncate font-semibold">' + escapeHtml(shelf.name) + '</span><span class="block text-xs opacity-70 mt-0.5">' + count + '권</span></button><button type="button" data-delete-custom-shelf="' + escapeHtml(shelf.id) + '" aria-label="' + escapeHtml(shelf.name) + ' 책장 삭제" title="책장 삭제" class="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg></button></div>';
        }
        const authors = state.customShelves.filter(function(x) { return x.type === 'author'; });
        const topics = state.customShelves.filter(function(x) { return x.type === 'topic'; });
        authorBox.innerHTML = authors.length ? authors.map(shelfButton).join('') : '<p class="text-xs text-slate-400 px-2 py-1">직접 만든 작가별 책장이 없습니다.</p>';
        topicBox.innerHTML = topics.length ? topics.map(shelfButton).join('') : '<p class="text-xs text-slate-400 px-2 py-1">직접 만든 주제별 책장이 없습니다.</p>';
        document.querySelectorAll('.custom-shelf-select').forEach(function(btn) {
          btn.onclick = function() {
            state.selectedCustomShelfId = btn.getAttribute('data-custom-shelf') || 'all';
            state.customShelfSearchQuery = '';
            const searchPanel = document.getElementById('customShelfSearchPanel');
            if (searchPanel) searchPanel.classList.add('hidden');
            renderCustomBookshelves();
          };
        });
        document.querySelectorAll('[data-delete-custom-shelf]').forEach(function(btn) {
          btn.onclick = function() {
            const shelf = getCustomShelfById(btn.getAttribute('data-delete-custom-shelf'));
            if (!shelf) return;
            if (!window.confirm('「' + shelf.name + '」 책장을 삭제할까요? 작품 자체는 삭제되지 않습니다.')) return;
            state.customShelves = state.customShelves.filter(function(x) { return x.id !== shelf.id; });
            (state.novels || []).forEach(function(n) { n.customShelfIds = (n.customShelfIds || []).filter(function(id) { return id !== shelf.id; }); });
            if (state.selectedCustomShelfId === shelf.id) state.selectedCustomShelfId = 'all';
            persistCustomShelves(); renderCustomBookshelves();
            showToast('책장을 삭제했습니다. 작품 원본은 유지됩니다.');
          };
        });
        const shelf = getCustomShelfById(state.selectedCustomShelfId);
        const isAll = state.selectedCustomShelfId === 'all' || !shelf;
        document.getElementById('customShelfCurrentTitle').textContent = isAll ? '모든 번역 작품' : shelf.name;
        document.getElementById('customShelfCurrentDescription').textContent = '';
        document.getElementById('customShelfCurrentDescription').classList.add('hidden');
        document.getElementById('customShelfActions').classList.toggle('hidden', isAll);
        const list = document.getElementById('customShelfWorkList');
        const addWorkBtn = document.getElementById('customShelfAddWorkBtn');
        const searchPanel = document.getElementById('customShelfSearchPanel');
        const searchInput = document.getElementById('customShelfSearchInput');
        addWorkBtn.classList.toggle('hidden', isAll);
        if (searchInput) searchInput.value = state.customShelfSearchQuery || '';
        if (isAll && searchPanel) searchPanel.classList.add('hidden');
        if (!state.novels.length) {
          list.innerHTML = '<div class="py-10 text-center"><div class="text-3xl mb-2">📚</div><p class="text-sm font-semibold text-slate-700">아직 저장된 번역 작품이 없습니다.</p><p class="text-xs text-slate-500 mt-1">먼저 작품을 번역해 책장에 저장하세요.</p></div>';
          if (searchPanel && !isAll) renderCustomShelfSearchResults();
          return;
        }
        const tagCounts = getAllBookmarkTagsWithCounts();
        const selectedTag = state.customShelfTagFilter;
        const tagCloud = document.getElementById('customShelfTagCloud');
        document.getElementById('customShelfSelectedTagLabel').textContent = selectedTag ? ('#' + selectedTag + ' 필터링 중') : '전체 태그 표시 중';
        let tagHtml = '<button type="button" data-custom-shelf-tag="" class="custom-shelf-tag-btn px-3 py-1 rounded-full text-xs font-semibold border transition ' + (!selectedTag ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200') + '">전체 보기</button>';
        Object.keys(tagCounts).sort().forEach(function(t) { tagHtml += '<button type="button" data-custom-shelf-tag="' + escapeHtml(t) + '" class="custom-shelf-tag-btn px-3 py-1 rounded-full text-xs font-semibold border transition ' + (selectedTag === t ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-900 border-amber-200') + '">#' + escapeHtml(t) + ' (' + tagCounts[t] + ')</button>'; });
        tagCloud.innerHTML = tagHtml;
        tagCloud.querySelectorAll('.custom-shelf-tag-btn').forEach(function(btn) { btn.addEventListener('click', function() { state.customShelfTagFilter = btn.getAttribute('data-custom-shelf-tag') || null; renderCustomBookshelves(); }); });
        function novelHasTag(n, tag) {
          if (!tag) return true;
          if ((n.bookmarkTags || []).includes(tag)) return true;
          if ((n.sentenceBookmarks || []).some(function(b) { return (b.tags || []).includes(tag); })) return true;
          return (n.chapters || []).some(function(ch) { return (ch.paragraphs || []).some(function(p) { return (p.tags || []).includes(tag); }); });
        }
        const sorted = state.novels.slice().sort(function(a,b) { return (a.title || '').localeCompare(b.title || '', 'ko'); });
        const visible = (isAll ? sorted : sorted.filter(function(n) { return Array.isArray(n.customShelfIds) && n.customShelfIds.includes(shelf.id); })).filter(function(n) { return novelHasTag(n, selectedTag); });
        if (isAll) {
          list.innerHTML = (visible.length ? visible.map(function(n) {
            const chapterCount = Array.isArray(n.chapters) ? n.chapters.length : 0;
            return '<article class="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300"><div class="shrink-0 w-10 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-xl">📖</div><div class="min-w-0 flex-1"><button type="button" data-open-custom-novel="' + escapeHtml(n.id) + '" class="block text-left font-semibold text-sm text-slate-900 hover:text-rose-700 break-words">' + renderNovelTitleMarkup(n.title || '제목 없는 작품') + '</button><p class="text-xs text-slate-500 mt-1">' + escapeHtml(n.author || '작가 미상') + ' · ' + chapterCount + '챕터</p></div></article>';
          }).join('') : '<p class="text-sm text-slate-500 py-8 text-center">선택한 태그에 해당하는 작품이 없습니다.</p>');
        } else {
          list.innerHTML = (visible.length ? visible.map(function(n) {
            const chapterCount = Array.isArray(n.chapters) ? n.chapters.length : 0;
            return '<article class="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-rose-200 bg-white hover:border-rose-300"><div class="shrink-0 w-10 h-12 rounded-lg bg-rose-50 flex items-center justify-center text-xl">📖</div><div class="min-w-0 flex-1"><button type="button" data-open-custom-novel="' + escapeHtml(n.id) + '" class="block text-left font-semibold text-sm text-slate-900 hover:text-rose-700 break-words">' + renderNovelTitleMarkup(n.title || '제목 없는 작품') + '</button><p class="text-xs text-slate-500 mt-1">' + escapeHtml(n.author || '작가 미상') + ' · ' + chapterCount + '챕터</p></div><button type="button" data-remove-custom-novel="' + escapeHtml(n.id) + '" aria-label="책장에서 제거" title="책장에서 제거" class="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg></button></article>';
          }).join('') : '<div class="py-12 text-center rounded-xl border border-dashed border-slate-200"><div class="text-3xl mb-2">📚</div><p class="text-sm font-semibold text-slate-700">이 책장은 아직 비어 있어요.</p><p class="text-xs text-slate-500 mt-1">‘작품 추가’를 눌러 제목이나 작가로 검색해 담아 보세요.</p><button type="button" id="customShelfEmptyAddBtn" class="mt-4 px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold">+ 첫 작품 추가하기</button></div>');
          const emptyAdd = document.getElementById('customShelfEmptyAddBtn');
          if (emptyAdd) emptyAdd.addEventListener('click', openCustomShelfSearch);
        }
        list.querySelectorAll('[data-open-custom-novel]').forEach(function(btn) { btn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); openNovelInReader(btn.getAttribute('data-open-custom-novel'), 0); }); });
        list.querySelectorAll('[data-remove-custom-novel]').forEach(function(btn) { btn.addEventListener('click', function() {
          const novel = state.novels.find(function(x) { return x.id === btn.getAttribute('data-remove-custom-novel'); });
          if (!novel || !shelf) return;
          if (!Array.isArray(novel.customShelfIds)) novel.customShelfIds = [];
          novel.customShelfIds = novel.customShelfIds.filter(function(id) { return id !== shelf.id; });
          saveToStorage(novel.id); renderCustomBookshelves(); showToast('작품을 책장에서 제거했습니다. 원본 작품과 북마크는 유지됩니다.');
        }); });
        if (searchPanel && !searchPanel.classList.contains('hidden')) renderCustomShelfSearchResults();
      }
      function openCustomShelfSearch() {
        if (state.selectedCustomShelfId === 'all' || !getCustomShelfById(state.selectedCustomShelfId)) { showToast('먼저 작가별 또는 주제별 책장을 선택하세요.'); return; }
        const panel = document.getElementById('customShelfSearchPanel');
        panel.classList.remove('hidden');
        renderCustomShelfSearchResults();
        const input = document.getElementById('customShelfSearchInput');
        if (input) input.focus();
      }
      function renderCustomShelfSearchResults() {
        const results = document.getElementById('customShelfSearchResults');
        const hint = document.getElementById('customShelfSearchHint');
        const input = document.getElementById('customShelfSearchInput');
        if (!results || !hint || !input) return;
        const shelf = getCustomShelfById(state.selectedCustomShelfId);
        if (!shelf) { results.innerHTML = ''; hint.textContent = '작가별 또는 주제별 책장을 선택한 뒤 작품을 추가하세요.'; return; }
        const query = (state.customShelfSearchQuery || '').trim().toLocaleLowerCase();
        if (query.length < 1) {
          results.innerHTML = '';
          hint.textContent = '검색어를 입력하면 추가할 수 있는 작품이 표시됩니다. 전체 작품을 한꺼번에 나열하지 않습니다.';
          return;
        }
        function hasTag(n, tag) {
          if (!tag) return true;
          if ((n.bookmarkTags || []).includes(tag)) return true;
          if ((n.sentenceBookmarks || []).some(function(b) { return (b.tags || []).includes(tag); })) return true;
          return (n.chapters || []).some(function(ch) { return (ch.paragraphs || []).some(function(p) { return (p.tags || []).includes(tag); }); });
        }
        const matches = (state.novels || []).filter(function(n) {
          const already = Array.isArray(n.customShelfIds) && n.customShelfIds.includes(shelf.id);
          if (already || !hasTag(n, state.customShelfTagFilter)) return false;
          const title = (n.title || '').toLocaleLowerCase();
          const author = (n.author || '').toLocaleLowerCase();
          const summary = (n.summary || '').toLocaleLowerCase();
          return title.includes(query) || author.includes(query) || summary.includes(query);
        }).sort(function(a,b) { return (a.title || '').localeCompare(b.title || '', 'ko'); });
        hint.textContent = matches.length ? (matches.length + '개 작품을 찾았습니다. 원하는 작품의 ‘이 책장에 추가’를 누르세요.') : '검색 결과가 없습니다. 다른 제목이나 작가 이름으로 검색해 보세요.';
        results.innerHTML = matches.slice(0, 50).map(function(n) {
          const chapterCount = Array.isArray(n.chapters) ? n.chapters.length : 0;
          return '<article class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white"><div class="shrink-0 w-9 h-11 rounded-lg bg-slate-100 flex items-center justify-center">📖</div><div class="min-w-0 flex-1"><h5 class="font-semibold text-sm text-slate-900 break-words">' + renderNovelTitleMarkup(n.title || '제목 없는 작품') + '</h5><p class="text-xs text-slate-500 mt-1">' + escapeHtml(n.author || '작가 미상') + ' · ' + chapterCount + '챕터</p></div><button type="button" data-add-custom-novel="' + escapeHtml(n.id) + '" class="shrink-0 px-3 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold">이 책장에 추가</button></article>';
        }).join('');
        results.querySelectorAll('[data-add-custom-novel]').forEach(function(btn) { btn.addEventListener('click', function() {
          const novel = state.novels.find(function(x) { return x.id === btn.getAttribute('data-add-custom-novel'); });
          if (!novel || !getCustomShelfById(state.selectedCustomShelfId)) return;
          if (!Array.isArray(novel.customShelfIds)) novel.customShelfIds = [];
          if (!novel.customShelfIds.includes(state.selectedCustomShelfId)) novel.customShelfIds.push(state.selectedCustomShelfId);
          saveToStorage(novel.id); renderCustomBookshelves();
          const panel = document.getElementById('customShelfSearchPanel');
          if (panel) panel.classList.remove('hidden');
          renderCustomShelfSearchResults();
          const search = document.getElementById('customShelfSearchInput'); if (search) search.focus();
          showToast('작품을 책장에 추가하고 저장했습니다.');
        }); });
      }
      function createCustomShelf() {
        const nameInput = document.getElementById('customShelfNameInput');
        const type = document.getElementById('customShelfTypeInput').value;
        const name = (nameInput.value || '').trim();
        if (!name) { showToast('책장 이름을 입력해 주세요.'); nameInput.focus(); return; }
        if (state.customShelves.some(function(x) { return x.type === type && x.name.toLocaleLowerCase() === name.toLocaleLowerCase(); })) { showToast('같은 종류의 책장이 이미 있습니다.'); return; }
        const id = 'shelf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
        state.customShelves.push({ id: id, type: type, name: name, createdAt: Date.now() });
        state.selectedCustomShelfId = id;
        nameInput.value = '';
        document.getElementById('customShelfCreatePanel').classList.add('hidden');
        persistCustomShelves(); renderCustomBookshelves(); showToast('책장을 만들었습니다. 작품을 직접 골라 담아 보세요.');
      }
      function renameCustomShelf() {
        const shelf = getCustomShelfById(state.selectedCustomShelfId); if (!shelf) return;
        const next = window.prompt('새 책장 이름을 입력하세요.', shelf.name); if (next === null) return;
        const name = next.trim(); if (!name) { showToast('책장 이름은 비워 둘 수 없습니다.'); return; }
        shelf.name = name; persistCustomShelves(); renderCustomBookshelves();
      }
      function deleteCustomShelf() {
        const shelf = getCustomShelfById(state.selectedCustomShelfId); if (!shelf) return;
        if (!window.confirm('“' + shelf.name + '” 책장을 삭제할까요? 책장만 삭제되며 번역 작품과 북마크는 삭제되지 않습니다.')) return;
        state.customShelves = state.customShelves.filter(function(x) { return x.id !== shelf.id; });
        state.novels.forEach(function(n) { n.customShelfIds = (n.customShelfIds || []).filter(function(id) { return id !== shelf.id; }); });
        state.selectedCustomShelfId = 'all'; persistCustomShelves(); renderCustomBookshelves();
      }

      function renderBookmarksManager() {
        updateHeaderBadges();
        const subTab = state.bookmarkManagerFilter.subTab;
        const selectedTag = state.bookmarkManagerFilter.selectedTag;

        const btnAll = document.getElementById('bmSubTabAllBtn');
        const btnNovels = document.getElementById('bmSubTabNovelsBtn');
        const btnPassages = null; // 문단 단위 책갈피 UI 제거
        if (subTab === 'passages') state.bookmarkManagerFilter.subTab = 'all';
        [
          { btn: btnAll, key: 'all' },
          { btn: btnNovels, key: 'novels' }
        ].forEach(function(item) {
          if (!item.btn) return;
          if (item.key === state.bookmarkManagerFilter.subTab) {
            item.btn.className = 'px-3 py-1.5 rounded-lg bg-white text-slate-900 shadow-sm';
          } else {
            item.btn.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900';
          }
        });

        // Tag cloud
        const tagCounts = getAllBookmarkTagsWithCounts();
        const tags = Object.keys(tagCounts).sort();
        const cloudEl = document.getElementById('bookmarkManagerTagCloud');
        document.getElementById('bmSelectedTagLabel').textContent = selectedTag ? ('#' + selectedTag + ' 태그 필터링 중') : '전체 태그 표시 중';

        let cloudHtml = '<button type="button" data-bm-tag="" class="bm-tag-cloud-btn px-3 py-1 rounded-full text-xs font-semibold border transition ' + (!selectedTag ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200') + '">전체 보기</button>';
        tags.forEach(function(t) {
          const active = selectedTag === t;
          cloudHtml += '<button type="button" data-bm-tag="' + escapeHtml(t) + '" class="bm-tag-cloud-btn px-3 py-1 rounded-full text-xs font-semibold border transition ' + (active ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100') + '">#' + escapeHtml(t) + ' (' + tagCounts[t] + ')</button>';
        });
        cloudEl.innerHTML = cloudHtml;

        cloudEl.querySelectorAll('.bm-tag-cloud-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const t = btn.getAttribute('data-bm-tag');
            state.bookmarkManagerFilter.selectedTag = t ? t : null;
            renderBookmarksManager();
          });
        });

        // Collect bookmarked novels and bookmarked passages
        const bookmarkedNovels = state.novels.filter(function(n) {
          if (!n.bookmarked) return false;
          if (selectedTag && !(n.bookmarkTags || []).includes(selectedTag)) return false;
          return true;
        });

        const bookmarkedPassages = [];
        state.novels.forEach(function(n) {
          (n.chapters || []).forEach(function(ch, chIdx) {
            (ch.paragraphs || []).forEach(function(p, pIdx) {
              if (!p.bookmarked) return;
              if (selectedTag && !(p.tags || []).includes(selectedTag)) return;
              bookmarkedPassages.push({
                novelId: n.id,
                novelTitle: n.title,
                chapterId: ch.id,
                chapterIndex: chIdx,
                chapterTitle: ch.title,
                paragraphId: p.id,
                paragraphIndex: pIdx,
                ko: p.ko,
                en: p.en,
                tags: p.tags || [],
                note: p.note || ''
              });
            });
          });
        });

        const contentEl = document.getElementById('bookmarkManagerContent');
        let html = '';

        if (false && (subTab === 'all' || subTab === 'novels')) {
          html += '<div class="space-y-3">';
          html += '<h3 class="text-sm font-bold text-slate-800 flex items-center gap-2"><span>소설 단위 북마크</span><span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs">' + bookmarkedNovels.length + '권</span></h3>';
          if (bookmarkedNovels.length === 0) {
            html += '<div class="bg-white rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-500">해당 조건의 북마크된 소설이 없습니다.</div>';
          } else {
            html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
            bookmarkedNovels.forEach(function(n) {
              const tChips = (n.bookmarkTags || []).map(function(t) {
                return '<span class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold">#' + escapeHtml(t) + '</span>';
              }).join(' ');
              html += '' +
                '<div class="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between gap-3">' +
                  '<div class="space-y-1.5">' +
                    '<div class="flex items-start justify-between gap-2">' +
                      '<h4 class="font-bold text-sm text-slate-900">' + escapeHtml(n.title) + '</h4>' +
                      '<button type="button" data-bm-edit-novel="' + escapeHtml(n.id) + '" class="bm-edit-novel-btn text-xs text-amber-800 font-semibold hover:underline shrink-0">태그 수정</button>' +
                    '</div>' +
                    (n.bookmarkNote ? '<p class="text-xs text-slate-600">' + escapeHtml(n.bookmarkNote) + '</p>' : '') +
                    '<div class="flex flex-wrap gap-1 pt-1">' + (tChips || '<span class="text-[11px] text-slate-400">태그 없음</span>') + '</div>' +
                  '</div>' +
                  '<div class="flex justify-end">' +
                    '<button type="button" data-bm-open-novel="' + escapeHtml(n.id) + '" class="bm-open-novel-btn px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-700 text-white text-xs font-semibold transition">뷰어로 열기 →</button>' +
                  '</div>' +
                '</div>';
            });
            html += '</div>';
          }
          html += '</div>';
        }

        if (false && (subTab === 'all' || subTab === 'passages')) {
          html += '<div class="space-y-3">';
          html += '<h3 class="text-sm font-bold text-slate-800 flex items-center gap-2"><span>문장 책갈피</span><span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs">' + bookmarkedPassages.length + '개</span></h3>';
          if (bookmarkedPassages.length === 0) {
            html += '<div class="bg-white rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-500">뷰어 본문에서 저장할 문장을 두 번 탭하면 문장 책갈피를 추가할 수 있어요.</div>';
          } else {
            html += '<div class="space-y-2.5">';
            bookmarkedPassages.forEach(function(item) {
              const tChips = item.tags.map(function(t) {
                return '<span class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold">#' + escapeHtml(t) + '</span>';
              }).join(' ');
              html += '' +
                '<div class="bg-white rounded-xl border border-slate-200 p-4 space-y-2">' +
                  '<div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">' +
                    '<span><strong class="text-slate-800">' + renderNovelTitleMarkup(item.novelTitle) + '</strong> · ' + escapeHtml(item.chapterTitle) + '</span>' +
                    '<div class="flex items-center gap-2">' +
                      '<button type="button" data-bm-edit-p-novel="' + escapeHtml(item.novelId) + '" data-bm-edit-p-ch="' + escapeHtml(item.chapterId) + '" data-bm-edit-p-id="' + escapeHtml(item.paragraphId) + '" class="bm-edit-passage-btn text-amber-800 font-semibold hover:underline">태그/메모 편집</button>' +
                      '<button type="button" data-bm-jump-novel="' + escapeHtml(item.novelId) + '" data-bm-jump-ch="' + item.chapterIndex + '" data-bm-jump-pid="' + escapeHtml(item.paragraphId) + '" class="bm-jump-passage-btn px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100 transition">해당 위치로 이동 →</button>' +
                    '</div>' +
                  '</div>' +
                  '<blockquote class="p-3 rounded-lg bg-slate-50 border-l-4 border-amber-400 text-xs sm:text-sm text-slate-800 reader-serif">' + escapeHtml(item.ko || item.en) + '</blockquote>' +
                  (item.note ? '<p class="text-xs text-amber-900 font-medium">메모: ' + escapeHtml(item.note) + '</p>' : '') +
                  '<div class="flex flex-wrap gap-1">' + (tChips || '<span class="text-[11px] text-slate-400">태그 없음</span>') + '</div>' +
                '</div>';
            });
            html += '</div>';
          }
          html += '</div>';
        }

        const bookmarkedSentences = [];
        state.novels.forEach(function(n) {
          (n.sentenceBookmarks || []).forEach(function(b) {
            if (b.bookmarked === false) return;
            if (selectedTag && !(b.tags || []).includes(selectedTag)) return;
            const chIndex = typeof b.chapterIndex === 'number' ? b.chapterIndex : (n.chapters || []).findIndex(function(c) { return c.id === b.chapterId; });
            bookmarkedSentences.push({ novelId: n.id, novelTitle: n.title || b.novelTitle || '', author: n.author || b.author || '', chapterId: b.chapterId, chapterIndex: Math.max(0, chIndex), chapterTitle: b.chapterTitle || (((n.chapters || [])[chIndex] || {}).title || ''), paragraphId: b.paragraphId, quote: b.quote || '', tags: b.tags || [], note: b.note || '', id: b.id });
          });
        });
        if (true) {
          html += '<div class="space-y-3"><h3 class="text-sm font-bold text-slate-800 flex items-center gap-2"><span>저장한 문장</span><span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs">' + bookmarkedSentences.length + '개</span></h3>';
          if (!bookmarkedSentences.length) {
            html += '<div class="bg-white rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-500">뷰어에서 문장을 두 번 탭해 저장하세요. 작품 제목·작가·챕터 정보도 함께 보관됩니다.</div>';
          } else {
            html += '<div class="space-y-2.5">';
            bookmarkedSentences.forEach(function(item) {
              const chips = item.tags.map(function(t) { return '<span class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold">#' + escapeHtml(t) + '</span>'; }).join(' ');
              html += '<div class="bg-white rounded-xl border border-slate-200 p-4 space-y-2"><div class="flex flex-wrap items-start justify-between gap-2 text-xs text-slate-500"><div><div class="font-bold text-slate-800">' + renderNovelTitleMarkup(item.novelTitle) + '</div><div>' + escapeHtml(item.author || '작가 미상') + ' · ' + escapeHtml(item.chapterTitle || '챕터') + '</div></div><div class="flex gap-2"><button type="button" data-bm-edit-sentence-novel="' + escapeHtml(item.novelId) + '" data-bm-edit-sentence-id="' + escapeHtml(item.id) + '" class="text-amber-800 font-semibold hover:underline">편집</button><button type="button" data-bm-jump-sentence-novel="' + escapeHtml(item.novelId) + '" data-bm-jump-sentence-ch="' + item.chapterIndex + '" data-bm-jump-sentence-pid="' + escapeHtml(item.paragraphId) + '" class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-semibold">열기 →</button></div></div><blockquote class="p-3 rounded-lg bg-slate-50 border-l-4 border-amber-400 text-sm text-slate-800">' + escapeHtml(item.quote) + '</blockquote>' + (item.note ? '<p class="text-xs text-amber-900 font-medium">메모: ' + escapeHtml(item.note) + '</p>' : '') + '<div class="flex flex-wrap gap-1">' + (chips || '<span class="text-[11px] text-slate-400">태그 없음</span>') + '</div></div>';
            });
            html += '</div>';
          }
          html += '</div>';
        }

        contentEl.innerHTML = html;

        contentEl.querySelectorAll('[data-bm-edit-sentence-id]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const novel = state.novels.find(function(n) { return n.id === btn.getAttribute('data-bm-edit-sentence-novel'); });
            const b = novel && (novel.sentenceBookmarks || []).find(function(x) { return x.id === btn.getAttribute('data-bm-edit-sentence-id'); });
            if (novel && b) openBookmarkModalForSentence(novel.id, b.chapterId, b.paragraphId, b.quote);
          });
        });
        contentEl.querySelectorAll('[data-bm-jump-sentence-novel]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            openNovelInReader(btn.getAttribute('data-bm-jump-sentence-novel'), Number(btn.getAttribute('data-bm-jump-sentence-ch')), btn.getAttribute('data-bm-jump-sentence-pid'));
          });
        });

        contentEl.querySelectorAll('.bm-open-novel-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            openNovelInReader(btn.getAttribute('data-bm-open-novel'));
          });
        });

        contentEl.querySelectorAll('.bm-edit-novel-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            openBookmarkModalForNovel(btn.getAttribute('data-bm-edit-novel'));
          });
        });

        contentEl.querySelectorAll('.bm-edit-passage-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            openBookmarkModalForParagraph(
              btn.getAttribute('data-bm-edit-p-novel'),
              btn.getAttribute('data-bm-edit-p-ch'),
              btn.getAttribute('data-bm-edit-p-id')
            );
          });
        });

        contentEl.querySelectorAll('.bm-jump-passage-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const nId = btn.getAttribute('data-bm-jump-novel');
            const chIdx = Number(btn.getAttribute('data-bm-jump-ch'));
            const pId = btn.getAttribute('data-bm-jump-pid');
            openNovelInReader(nId, chIdx, pId);
          });
        });
      }

      // ==================== IN-APP READER VIEW ====================
      function openNovelInReader(novelId, chapterIndex, scrollParagraphId) {
        const novel = state.novels.find(function(n) { return n.id === novelId; });
        if (!novel) return;

        state.reader.novelId = novel.id;
        if (typeof chapterIndex === 'number' && chapterIndex >= 0 && chapterIndex < novel.chapters.length) {
          state.reader.chapterIndex = chapterIndex;
        } else {
          state.reader.chapterIndex = Math.min(novel.lastReadChapterIndex || 0, Math.max(0, novel.chapters.length - 1));
        }

        novel.lastReadAt = Date.now();
        novel.updatedAt = Date.now();
        novel.lastReadChapterIndex = state.reader.chapterIndex;
        saveToStorage(novel.id);

        switchView('reader');
        const readerControlsBar = document.getElementById('readerControlsBar');
        if (readerControlsBar) readerControlsBar.classList.remove('reader-controls-hidden');

        if (scrollParagraphId) {
          setTimeout(function() {
            const targetEl = document.getElementById('reader-p-' + scrollParagraphId);
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              targetEl.classList.add('ring-2', 'ring-amber-400');
              setTimeout(function() {
                targetEl.classList.remove('ring-2', 'ring-amber-400');
              }, 2200);
            }
          }, 120);
        }
      }

      function splitReaderTitle(title) {
        // Titles in older records are stored as "Korean translation (original title)".
        // Parse the final parenthetical suffix only; do not mutate the saved title.
        const fullTitle = String(title || '소설 제목')
          .normalize('NFC')
          .replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')
          .replace(/[\u00A0\u202F]/g, ' ')
          .replace(/[\r\n\t]+/g, ' ')
          .trim();
        if (!fullTitle) return { translated: '소설 제목', original: '' };

        // Common case: ASCII/full-width opening and closing parentheses, including
        // titles with no space before the opening parenthesis.
        const suffix = fullTitle.match(/\s*[（(]([^()（）]*?)[）)]\s*$/u);
        if (suffix) {
          const translated = fullTitle.slice(0, suffix.index).trim();
          const original = String(suffix[1] || '').trim();
          const open = suffix[0].trimStart()[0];
          const close = suffix[0].trimEnd().slice(-1);
          const matchedPair = (open === '(' && close === ')') || (open === '（' && close === '）') || (open === '(' && close === '）') || (open === '（' && close === ')');
          if (matchedPair && translated && original && /[가-힣]/u.test(translated) && /[A-Za-z]/u.test(original)) {
            return { translated, original };
          }
        }

        // Balanced fallback supports a final original title that itself contains parentheses.
        const close = fullTitle.slice(-1);
        const openFor = { ')': '(', '）': '（' };
        const expectedOpen = openFor[close];
        if (expectedOpen) {
          let depth = 0;
          for (let i = fullTitle.length - 1; i >= 0; i--) {
            const ch = fullTitle[i];
            if (ch === close) depth++;
            else if (ch === expectedOpen) {
              depth--;
              if (depth === 0) {
                const translated = fullTitle.slice(0, i).trim();
                const original = fullTitle.slice(i + 1, -1).trim();
                if (translated && original && /[가-힣]/u.test(translated) && /[A-Za-z]/u.test(original)) {
                  return { translated, original };
                }
                break;
              }
            }
          }
        }
        return { translated: fullTitle, original: '' };
      }

      // Shared formatter for visible novel-title surfaces. Older records store
      // translated and original titles in one string; split only for display.
      function renderNovelTitleMarkup(title) {
        const parts = splitReaderTitle(title);
        const translatedHtml = '<span class="novel-title-translated block">' + escapeHtml(parts.translated) + '</span>';
        const originalHtml = parts.original
          ? '<span class="novel-title-original block mt-1 text-xs font-medium text-slate-500 leading-snug break-words" lang="en" title="원제">' + escapeHtml(parts.original) + '</span>'
          : '';
        return translatedHtml + originalHtml;
      }

      function renderReaderTitle(title) {
        const titleEl = document.getElementById('readerNovelTitle');
        if (!titleEl) return;
        const parts = splitReaderTitle(title);
        const translated = document.createElement('span');
        translated.className = 'reader-title-translated';
        translated.textContent = parts.translated;
        const nodes = [translated];
        if (parts.original) {
          const original = document.createElement('span');
          original.className = 'reader-title-original';
          original.textContent = parts.original;
          original.setAttribute('lang', 'en');
          original.setAttribute('title', '원제');
          nodes.push(original);
        }
        // Marker and explicit DOM children make it easy to verify the deployed renderer.
        titleEl.dataset.titleSplitVersion = '48';
        titleEl.replaceChildren(...nodes);
      }

      function installReaderTitleSplitGuard() {
        const titleEl = document.getElementById('readerNovelTitle');
        if (!titleEl) return;

        const currentCanonical = function(parts) {
          const children = Array.from(titleEl.children);
          if (titleEl.dataset.titleSplitVersion !== '48') return false;
          if (children.length !== (parts.original ? 2 : 1)) return false;
          if (!children[0].classList.contains('reader-title-translated') || children[0].textContent !== parts.translated) return false;
          if (parts.original) {
            return children[1].classList.contains('reader-title-original') && children[1].textContent === parts.original;
          }
          return true;
        };

        const normalizeTitleDom = function() {
          // If a legacy render path writes raw title text after the reader opens,
          // normalize it at the final DOM boundary as well.
          const translatedNode = titleEl.querySelector(':scope > .reader-title-translated');
          const originalNode = titleEl.querySelector(':scope > .reader-title-original');
          const source = translatedNode && originalNode
            ? translatedNode.textContent.trim() + ' (' + originalNode.textContent.trim().replace(/^[（(]|[）)]$/g, '') + ')'
            : titleEl.textContent;
          const parts = splitReaderTitle(source);
          if (!currentCanonical(parts)) renderReaderTitle(source);
        };

        normalizeTitleDom();
        if (titleEl.dataset.titleSplitObserverVersion === '48' || typeof MutationObserver === 'undefined') return;
        titleEl.dataset.titleSplitObserverVersion = '48';
        const observer = new MutationObserver(function() {
          // Batch mutation callbacks to avoid recursive work during replaceChildren().
          Promise.resolve().then(normalizeTitleDom);
        });
        observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
      }

      function renderReaderTranslationProgress(novel) {
        const panel = document.getElementById('readerTranslationProgress');
        if (!panel) return;
        const progress = novel && novel.translationProgress;
        const isActive = Boolean(progress && progress.status === 'translating');
        panel.classList.toggle('hidden', !isActive);
        if (!isActive) return;
        panel.setAttribute('data-reader-theme', document.documentElement.getAttribute('data-app-theme') || 'light');

        const chapterIndex = Math.max(0, Math.min(Number(progress.currentChapterIndex || 0), (novel.chapters || []).length - 1));
        const chapter = novel.chapters[chapterIndex];
        const completedChapters = Math.max(0, Number(progress.completedChapters || 0));
        const totalChapters = Math.max(1, Number(progress.totalChapters || 1));
        const chapterDone = Math.max(0, Number(progress.chapterDone || 0));
        const chapterTotal = Math.max(1, Number(progress.chapterTotal || 1));
        const percentage = Math.max(0, Math.min(100, Number(progress.percentage || 0)));
        const status = document.getElementById('readerTranslationStatus');
        const percent = document.getElementById('readerTranslationPercent');
        const bar = document.getElementById('readerTranslationProgressBar');
        const track = document.getElementById('readerTranslationProgressTrack');
        const liveText = document.getElementById('readerTranslationLiveText');
        if (status) status.textContent = (chapter ? chapter.title : '챕터') + ' · ' + completedChapters + '/' + totalChapters + '개 챕터 완료 · 현재 ' + chapterDone + '/' + chapterTotal + '문단';
        if (percent) percent.textContent = percentage + '%';
        if (bar) bar.style.width = percentage + '%';
        if (track) track.setAttribute('aria-valuenow', String(percentage));
        if (liveText) {
          const recentTranslations = chapter
            ? (chapter.paragraphs || []).filter(function(paragraph) { return String(paragraph.ko || '').trim(); }).slice(-8)
            : [];
          liveText.innerHTML = recentTranslations.length
            ? recentTranslations.map(function(paragraph) { return '<p class="rounded-lg bg-white/60 px-3 py-2">' + escapeHtml(paragraph.ko) + '</p>'; }).join('')
            : '<p class="text-emerald-800/75">첫 번역 결과를 기다리는 중입니다…</p>';
        }
      }

      function replaceQuotedDialogueWithOriginal(translatedText, originalText) {
        const translated = String(translatedText || '');
        const original = String(originalText || '');
        // Only paired straight or curly double quotes are considered dialogue.
        const quotePattern = /"[^"\r\n]*"|“[^”\r\n]*”/g;
        const translatedQuotes = translated.match(quotePattern) || [];
        const originalQuotes = original.match(quotePattern) || [];
        if (!translatedQuotes.length || translatedQuotes.length !== originalQuotes.length) return translated;
        let index = 0;
        return translated.replace(quotePattern, function() {
          return originalQuotes[index++] || arguments[0];
        });
      }

      function renderReader() {
        const novel = state.novels.find(function(n) { return n.id === state.reader.novelId; });
        if (!novel || !novel.chapters || novel.chapters.length === 0) {
          switchView('bookshelf');
          return;
        }

        const chIdx = Math.min(state.reader.chapterIndex, novel.chapters.length - 1);
        state.reader.chapterIndex = chIdx;
        novel.lastReadChapterIndex = chIdx;
        saveToStorage();

        const chapter = novel.chapters[chIdx];

        renderReaderTitle(novel.title);
        document.getElementById('readerNovelSubtitle').textContent = (novel.author || 'AO3') + ' · 총 ' + novel.chapters.length + '개 챕터';

        // Bookmark icon & tags bar
        const bmIcon = document.getElementById('readerNovelBookmarkIcon');
        if (novel.bookmarked) {
          bmIcon.classList.add('fill-amber-500');
        } else {
          bmIcon.classList.remove('fill-amber-500');
        }



        // Chapter dropdown
        const select = document.getElementById('readerChapterSelect');
        select.innerHTML = novel.chapters.map(function(c, i) {
          return '<option value="' + i + '">' + (i + 1) + '화. ' + escapeHtml(c.title) + '</option>';
        }).join('');
        select.value = String(chIdx);

        // Prev / Next buttons
        const hasPrev = chIdx > 0;
        const hasNext = chIdx < novel.chapters.length - 1;
        document.getElementById('readerPrevChapterBtn').disabled = !hasPrev;
        document.getElementById('readerNextChapterBtn').disabled = !hasNext;
        document.getElementById('readerBottomPrevBtn').disabled = !hasPrev;
        document.getElementById('readerBottomNextBtn').disabled = !hasNext;
        document.getElementById('readerBottomProgressText').textContent = (chIdx + 1) + ' / ' + novel.chapters.length + ' 챕터';

        // Apply paper theme & typography
        const paper = document.getElementById('readerPaperContainer');
        const appTheme = document.documentElement.getAttribute('data-app-theme');
        state.reader.theme = appTheme === 'green' ? 'green' : (appTheme === 'light' ? 'paper' : 'dark');
        const themeClasses = {
          paper: 'rounded-2xl border shadow-sm bg-[#fbf8f1] text-[#243042] transition-colors duration-200',
          green: 'rounded-2xl border shadow-sm bg-[#bcd6c1] text-[#20382a] transition-colors duration-200',
          dark: 'rounded-2xl border shadow-sm bg-[#070d1a] text-[#e3eaf5] transition-colors duration-200'
        };
        paper.className = themeClasses[state.reader.theme] || themeClasses.paper;
        paper.setAttribute('data-reader-theme', state.reader.theme);
        // Mirror the active reader theme on the document canvas. Mobile CSS uses this
        // to make the viewport gutters match the paper instead of exposing the app shell.
        document.body.setAttribute('data-reader-canvas-theme', state.reader.theme);
        document.documentElement.setAttribute('data-reader-canvas-theme', state.reader.theme);

        document.getElementById('readerChapterIndexLabel').textContent = 'Chapter ' + (chIdx + 1) + ' of ' + novel.chapters.length;
        const srcEl = document.getElementById('readerChapterSourceLink');
        if (chapter.sourceUrl) {
          srcEl.innerHTML = '<a href="' + escapeHtml(chapter.sourceUrl) + '" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-100">AO3 원문 링크 ↗</a>';
        } else {
          srcEl.textContent = '';
        }

        const headingEl = document.getElementById('readerChapterTitleHeading');
        headingEl.textContent = chapter.title;
        headingEl.className = 'text-lg sm:text-xl font-bold leading-snug reader-sans';

        const pContainer = document.getElementById('readerParagraphsContainer');
        pContainer.className = 'reader-content-text reader-sans';
        const contentInner = document.getElementById('readerContentInner');
        state.reader.horizontalPadding = clampReaderSpacing(state.reader.horizontalPadding, 20, 30, 25);
        state.reader.lineHeightPx = clampReaderSpacing(state.reader.lineHeightPx, 10, 25, 20);
        state.reader.paragraphSpacingPx = clampReaderSpacing(state.reader.paragraphSpacingPx, 2, 10, 5);
        state.reader.firstLineIndentPx = clampReaderSpacing(state.reader.firstLineIndentPx, 0, 10, 0);
        if (contentInner) contentInner.style.setProperty('--reader-horizontal-padding', state.reader.horizontalPadding + 'px');
        pContainer.style.setProperty('--reader-line-height', state.reader.lineHeightPx + 'px');
        pContainer.style.setProperty('--reader-paragraph-spacing', state.reader.paragraphSpacingPx + 'px');
        pContainer.style.setProperty('--reader-first-line-indent', state.reader.firstLineIndentPx + 'px');
        const fontFamily = state.reader.fontFamily || 'noto';
        const fontWeight = [300, 400, 500].includes(Number(state.reader.fontWeight)) ? Number(state.reader.fontWeight) : 400;
        state.reader.fontWeight = fontWeight;
        pContainer.dataset.readerFont = fontFamily;
        pContainer.dataset.readerWeight = String(fontWeight);
        headingEl.dataset.readerFont = fontFamily;
        const fontSelect = document.getElementById('readerFontFamilySelect');
        if (fontSelect) fontSelect.value = fontFamily;
        const fontWeightSelect = document.getElementById('readerFontWeightSelect');
        if (fontWeightSelect) fontWeightSelect.value = String(fontWeight);
        const originalDialogueToggle = document.getElementById('readerOriginalDialogueToggle');
        if (originalDialogueToggle) originalDialogueToggle.checked = state.reader.showOriginalDialogue === true;
        pContainer.style.fontWeight = String(fontWeight);
        pContainer.style.fontSize = state.reader.fontSize + 'px';
        document.getElementById('readerFontSizeLabel').textContent = state.reader.fontSize + 'px';
        const readerSpacingControls = [
          ['readerHorizontalPaddingLabel', 'readerSpacingHorizontalPadding', state.reader.horizontalPadding],
          ['readerLineHeightLabel', 'readerSpacingLineHeight', state.reader.lineHeightPx],
          ['readerParagraphSpacingLabel', 'readerSpacingParagraphSpacing', state.reader.paragraphSpacingPx],
          ['readerFirstLineIndentLabel', 'readerSpacingFirstLineIndent', state.reader.firstLineIndentPx]
        ];
        readerSpacingControls.forEach(function(item) {
          const label = document.getElementById(item[0]);
          const value = document.querySelector('#' + item[1] + 'Minus')?.parentElement?.querySelector('.reader-spacing-value');
          if (label) label.textContent = item[2] + 'px';
          if (value) value.textContent = item[2] + 'px';
        });
        pContainer.innerHTML = (chapter.paragraphs || []).map(function(p, pIndex) {
          if (!p.id) p.id = 'para-' + chIdx + '-' + pIndex;
          if (p.ko === '* * *' || p.en === '* * *') {
            return '<div class="text-center py-4 opacity-50 tracking-widest">* * *</div>';
          }
          // Re-apply current post-translation spelling rules at render time so
          // existing translations reflect edits to the user's replacement table.
          // Keep p.ko unchanged; this is a display-only transformation.
          const storedKoreanText = String(p.ko || '');
          let displayText = (storedKoreanText.trim()
            ? applyTextReplacements(storedKoreanText)
            : String(p.en || '')).replace(/\r\n?/g, '\n').replace(/\n+/g, ' ').replace(/[\t ]+/g, ' ').trim();
          const originalText = String(p.en || '').trim();
          if (state.reader.showOriginalDialogue && storedKoreanText.trim() && originalText) {
            displayText = replaceQuotedDialogueWithOriginal(displayText, originalText);
          }
          const hasOriginal = Boolean(originalText && originalText !== displayText.trim());
          const sentenceHtml = renderSentenceSpans(displayText, novel.id, chapter.id, p.id);
          return '<div class="reader-paragraph" id="reader-p-' + escapeHtml(p.id) + '"' + (hasOriginal ? ' data-original-toggle="true" aria-expanded="false" title="터치하면 원문 표시/숨김"' : '') + '><p class="leading-relaxed whitespace-pre-line">' + sentenceHtml + '</p>' +
            (hasOriginal ? '<p class="reader-original" lang="en">' + escapeHtml(p.en) + '</p>' : '') +
            '</div>';
        }).join('');
        attachSentenceBookmarkEvents();
        renderReaderTranslationProgress(novel);
      }

      // Wrap individual sentences so a double-click / double-tap can save a sentence, not a paragraph.
      function splitSentencesPreservingText(text) {
        const input = String(text || '');
        const parts = [];
        const re = /[^.!?。！？]+[.!?。！？]+[”’"'」』】）)]*|[^.!?。！？]+$/g;
        let match, cursor = 0;
        while ((match = re.exec(input)) !== null) {
          if (match.index > cursor) parts.push({ text: input.slice(cursor, match.index), sentence: false });
          parts.push({ text: match[0], sentence: true });
          cursor = match.index + match[0].length;
        }
        if (cursor < input.length) parts.push({ text: input.slice(cursor), sentence: false });
        if (!parts.length && input) parts.push({ text: input, sentence: true });
        return parts;
      }

      function renderSentenceSpans(text, novelId, chapterId, paragraphId) {
        return splitSentencesPreservingText(text).map(function(part, index) {
          if (!part.sentence || !part.text.trim()) return escapeHtml(part.text);
          return '<span class="reader-sentence" data-sentence-text="' + escapeHtml(part.text.trim()) + '" data-sentence-novel="' + escapeHtml(novelId) + '" data-sentence-chapter="' + escapeHtml(chapterId || '') + '" data-sentence-paragraph="' + escapeHtml(paragraphId) + '" role="button" tabindex="0" aria-label="문장 책갈피: 두 번 탭하여 저장">' + escapeHtml(part.text) + '</span>';
        }).join('');
      }

      function openBookmarkModalForSentence(novelId, chapterId, paragraphId, sentenceText) {
        const novel = state.novels.find(function(n) { return n.id === novelId; });
        if (!novel) return;
        const chapter = (novel.chapters || []).find(function(c) { return c.id === chapterId; });
        if (!chapter) return;
        const p = (chapter.paragraphs || []).find(function(item) { return item.id === paragraphId; });
        if (!p) return;
        if (!Array.isArray(novel.sentenceBookmarks)) novel.sentenceBookmarks = [];
        let saved = novel.sentenceBookmarks.find(function(b) {
          return b.chapterId === chapterId && b.paragraphId === paragraphId && b.quote === sentenceText && b.bookmarked !== false;
        });
        state.bookmarkModalTarget = { type: 'sentence', novelId: novelId, chapterId: chapterId, paragraphId: paragraphId, quote: sentenceText, bookmarkId: saved ? saved.id : null };
        state.modalTempTags = saved && Array.isArray(saved.tags) ? saved.tags.slice() : [];
        document.getElementById('bookmarkModalTitle').querySelector('span').textContent = saved ? '저장한 문장 편집' : '문장 책갈피 저장';
        const preview = document.getElementById('bookmarkModalQuotePreview');
        preview.textContent = '“' + sentenceText + '”';
        preview.classList.remove('hidden');
        const context = document.getElementById('bookmarkModalContext');
        context.textContent = (novel.title || '제목 없음') + ' · ' + (novel.author || '작가 미상') + ' · ' + (chapter.title || '챕터');
        context.classList.remove('hidden');
        document.getElementById('modalBookmarkActiveCheck').checked = true;
        document.getElementById('modalBookmarkNoteInput').value = saved ? (saved.note || '') : '';
        document.getElementById('modalBookmarkTagInput').value = '';
        renderModalTagChips();
        document.getElementById('bookmarkModal').classList.remove('hidden');
      }

      function toggleParagraphOriginal(paragraph) {
        if (!paragraph) return;
        const original = paragraph.querySelector('.reader-original');
        if (!original) return;
        const visible = original.classList.toggle('is-visible');
        paragraph.setAttribute('aria-expanded', visible ? 'true' : 'false');
        paragraph.classList.toggle('reader-paragraph-original-visible', visible);
      }

      function attachSentenceBookmarkEvents() {
        const container = document.getElementById('readerParagraphsContainer');
        if (!container || container.dataset.sentenceBookmarkBound === '1') return;
        container.dataset.sentenceBookmarkBound = '1';
        let lastTapAt = 0;
        let lastTapSentence = null;
        const pendingParagraphTaps = new WeakMap();
        function cancelParagraphToggle(paragraph) {
          const timer = paragraph && pendingParagraphTaps.get(paragraph);
          if (timer) clearTimeout(timer);
          if (paragraph) pendingParagraphTaps.delete(paragraph);
        }
        function scheduleParagraphToggle(paragraph) {
          if (!paragraph || paragraph.getAttribute('data-original-toggle') !== 'true') return;
          cancelParagraphToggle(paragraph);
          const timer = setTimeout(function() {
            toggleParagraphOriginal(paragraph);
            pendingParagraphTaps.delete(paragraph);
          }, 330);
          pendingParagraphTaps.set(paragraph, timer);
        }
        function openFromSpan(span) {
          if (!span || document.getElementById('bookmarkModal').classList.contains('hidden') === false) return;
          openBookmarkModalForSentence(span.getAttribute('data-sentence-novel'), span.getAttribute('data-sentence-chapter'), span.getAttribute('data-sentence-paragraph'), span.getAttribute('data-sentence-text'));
        }
        // A single tap/click toggles only that paragraph's original. Delay prevents a double-tap bookmark conflict.
        container.addEventListener('click', function(e) {
          const paragraph = e.target.closest('.reader-paragraph[data-original-toggle="true"]');
          if (!paragraph || e.target.closest('a,button,input,textarea,select')) return;
          if (e.detail > 1) { cancelParagraphToggle(paragraph); return; }
          scheduleParagraphToggle(paragraph);
        });
        container.addEventListener('dblclick', function(e) {
          const span = e.target.closest('.reader-sentence');
          if (!span) return;
          e.preventDefault();
          cancelParagraphToggle(span.closest('.reader-paragraph'));
          openFromSpan(span);
        });
        container.addEventListener('touchend', function(e) {
          const span = e.target.closest('.reader-sentence');
          if (!span) { lastTapAt = 0; lastTapSentence = null; return; }
          const now = Date.now();
          if (lastTapSentence === span && now - lastTapAt < 320) {
            e.preventDefault();
            cancelParagraphToggle(span.closest('.reader-paragraph'));
            lastTapAt = 0; lastTapSentence = null;
            openFromSpan(span);
          } else {
            lastTapAt = now; lastTapSentence = span;
          }
        }, { passive: false });
        container.addEventListener('keydown', function(e) {
          const span = e.target.closest('.reader-sentence');
          if (span && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault(); openFromSpan(span);
          }
        });
      }

      // ==================== BOOKMARK & TAG MODAL LOGIC ====================
      function openBookmarkModalForNovel(novelId) {
        const novel = state.novels.find(function(n) { return n.id === novelId; });
        if (!novel) return;
        state.bookmarkModalTarget = { type: 'novel', novelId: novel.id };
        state.modalTempTags = Array.isArray(novel.bookmarkTags) ? novel.bookmarkTags.slice() : [];

        document.getElementById('bookmarkModalTitle').querySelector('span').textContent = '소설 북마크 & 태그 설정';
        document.getElementById('bookmarkModalQuotePreview').classList.add('hidden');
        document.getElementById('bookmarkModalContext').classList.add('hidden');
        document.getElementById('modalBookmarkActiveCheck').checked = true;
        document.getElementById('modalBookmarkNoteInput').value = novel.bookmarkNote || '';
        document.getElementById('modalBookmarkTagInput').value = '';

        renderModalTagChips();
        document.getElementById('bookmarkModal').classList.remove('hidden');
      }

      function openBookmarkModalForParagraph(novelId, chapterId, paragraphId) {
        const novel = state.novels.find(function(n) { return n.id === novelId; });
        if (!novel) return;
        const ch = (novel.chapters || []).find(function(c) { return c.id === chapterId; });
        if (!ch) return;
        const p = (ch.paragraphs || []).find(function(item) { return item.id === paragraphId; });
        if (!p) return;

        state.bookmarkModalTarget = { type: 'paragraph', novelId: novelId, chapterId: chapterId, paragraphId: paragraphId };
        state.modalTempTags = Array.isArray(p.tags) ? p.tags.slice() : [];

        document.getElementById('bookmarkModalTitle').querySelector('span').textContent = '문단 책갈피 북마크 & 태그 설정';
        const preview = document.getElementById('bookmarkModalQuotePreview');
        preview.textContent = '"' + (p.ko || p.en) + '"';
        preview.classList.remove('hidden');
        const context = document.getElementById('bookmarkModalContext');
        context.textContent = (novel.title || '제목 없음') + ' · ' + (novel.author || '작가 미상') + ' · ' + (ch.title || '챕터');
        context.classList.remove('hidden');

        document.getElementById('modalBookmarkActiveCheck').checked = true;
        document.getElementById('modalBookmarkNoteInput').value = p.note || '';
        document.getElementById('modalBookmarkTagInput').value = '';

        renderModalTagChips();
        document.getElementById('bookmarkModal').classList.remove('hidden');
      }

      function renderModalTagChips() {
        const container = document.getElementById('modalCurrentTagsContainer');
        if (state.modalTempTags.length === 0) {
          container.innerHTML = '<span class="text-xs text-slate-400">추가된 태그가 없습니다. 아래에서 입력하거나 기존 태그를 클릭하세요.</span>';
        } else {
          container.innerHTML = state.modalTempTags.map(function(t, idx) {
            return '' +
              '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-950 text-xs font-semibold">' +
                '#' + escapeHtml(t) +
                '<button type="button" data-remove-modal-tag="' + idx + '" class="ml-0.5 text-amber-700 hover:text-rose-600 font-bold">✕</button>' +
              '</span>';
          }).join('');

          container.querySelectorAll('[data-remove-modal-tag]').forEach(function(btn) {
            btn.addEventListener('click', function() {
              const i = Number(btn.getAttribute('data-remove-modal-tag'));
              state.modalTempTags.splice(i, 1);
              renderModalTagChips();
            });
          });
        }

        // Suggestions
        const allTags = Object.keys(getAllBookmarkTagsWithCounts());
        const defaults = ['angst', 'BDSM'];
        defaults.forEach(function(d) {
          if (!allTags.includes(d)) allTags.push(d);
        });

        const sugEl = document.getElementById('modalExistingTagsSuggestions');
        sugEl.innerHTML = allTags.map(function(t) {
          return '<button type="button" data-sug-tag="' + escapeHtml(t) + '" class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[11px] font-medium transition">#' + escapeHtml(t) + '</button>';
        }).join('');

        sugEl.querySelectorAll('[data-sug-tag]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const val = btn.getAttribute('data-sug-tag');
            if (val && !state.modalTempTags.includes(val)) {
              state.modalTempTags.push(val);
              renderModalTagChips();
            }
          });
        });
      }

      function addTagFromModalInput() {
        const inp = document.getElementById('modalBookmarkTagInput');
        const raw = inp.value.trim();
        if (!raw) return;
        raw.split(',').forEach(function(part) {
          const clean = part.replace(/^#+/, '').trim();
          if (clean && !state.modalTempTags.includes(clean)) {
            state.modalTempTags.push(clean);
          }
        });
        inp.value = '';
        renderModalTagChips();
      }

      function saveBookmarkModalChanges() {
        addTagFromModalInput();
        const target = state.bookmarkModalTarget;
        if (!target) return;

        const isActive = document.getElementById('modalBookmarkActiveCheck').checked;
        const note = document.getElementById('modalBookmarkNoteInput').value.trim();

        const novel = state.novels.find(function(n) { return n.id === target.novelId; });
        if (!novel) return;

        if (target.type === 'novel') {
          novel.bookmarked = isActive;
          novel.bookmarkTags = isActive ? state.modalTempTags.slice() : [];
          novel.bookmarkNote = isActive ? note : '';
          showToast(isActive ? '소설 북마크 및 태그가 저장되었습니다.' : '소설 북마크가 해제되었습니다.');
        } else if (target.type === 'paragraph') {
          const ch = (novel.chapters || []).find(function(c) { return c.id === target.chapterId; });
          const p = ch ? (ch.paragraphs || []).find(function(item) { return item.id === target.paragraphId; }) : null;
          if (p) {
            p.bookmarked = isActive;
            p.tags = isActive ? state.modalTempTags.slice() : [];
            p.note = isActive ? note : '';
            showToast(isActive ? '문단 책갈피 및 태그가 저장되었습니다.' : '문단 책갈피가 해제되었습니다.');
          }
        }
        else if (target.type === 'sentence') {
          if (!Array.isArray(novel.sentenceBookmarks)) novel.sentenceBookmarks = [];
          let saved = target.bookmarkId ? novel.sentenceBookmarks.find(function(b) { return b.id === target.bookmarkId; }) : null;
          if (!saved) saved = novel.sentenceBookmarks.find(function(b) { return b.chapterId === target.chapterId && b.paragraphId === target.paragraphId && b.quote === target.quote; });
          if (isActive) {
            if (!saved) {
              saved = { id: 'sentence-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), bookmarked: true };
              novel.sentenceBookmarks.push(saved);
            }
            const ch = (novel.chapters || []).find(function(c) { return c.id === target.chapterId; });
            saved.bookmarked = true;
            saved.chapterId = target.chapterId;
            saved.chapterTitle = ch ? ch.title : '';
            saved.chapterIndex = ch ? novel.chapters.indexOf(ch) : 0;
            saved.paragraphId = target.paragraphId;
            saved.quote = target.quote;
            saved.tags = state.modalTempTags.slice();
            saved.note = note;
            saved.author = novel.author || '';
            saved.novelTitle = novel.title || '';
            saved.savedAt = Date.now();
            showToast('문장 책갈피를 저장했습니다.');
          } else if (saved) {
            novel.sentenceBookmarks = novel.sentenceBookmarks.filter(function(b) { return b.id !== saved.id; });
            showToast('문장 책갈피를 삭제했습니다.');
          }
        }

        saveToStorage();
        document.getElementById('bookmarkModal').classList.add('hidden');
        updateHeaderBadges();
        if (state.currentView === 'bookshelf') renderBookshelf();
        if (state.currentView === 'bookmarks') renderBookmarksManager();
        if (state.currentView === 'reader') renderReader();
      }

      // ==================== EDIT & DELETE NOVEL MODALS ====================
      function openRenameChapterModal() {
        const novel = state.novels.find(function(item) { return item.id === state.reader.novelId; });
        const chapterIndex = Number(state.reader.chapterIndex);
        const chapter = novel && Array.isArray(novel.chapters) ? novel.chapters[chapterIndex] : null;
        if (!novel || !chapter) return;
        state.editingChapterTarget = { novelId: novel.id, chapterId: chapter.id, chapterIndex: chapterIndex };
        const modal = document.getElementById('renameChapterModal');
        const input = document.getElementById('renameChapterTitleInput');
        input.value = chapter.title || ('챕터 ' + (chapterIndex + 1));
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        input.focus({ preventScroll: true });
        input.select();
      }

      function closeRenameChapterModal() {
        const modal = document.getElementById('renameChapterModal');
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        state.editingChapterTarget = null;
        const trigger = document.getElementById('readerRenameChapterBtn');
        if (trigger) trigger.focus({ preventScroll: true });
      }

      function saveRenameChapterModal() {
        const target = state.editingChapterTarget;
        const newTitle = document.getElementById('renameChapterTitleInput').value.trim();
        if (!target) return;
        if (!newTitle) {
          showToast('챕터 제목을 입력해 주세요.', 'warning');
          document.getElementById('renameChapterTitleInput').focus();
          return;
        }
        const novel = state.novels.find(function(item) { return item.id === target.novelId; });
        const chapter = novel && Array.isArray(novel.chapters)
          ? ((target.chapterId != null ? novel.chapters.find(function(item) { return item.id === target.chapterId; }) : null) || novel.chapters[target.chapterIndex])
          : null;
        if (!novel || !chapter) {
          closeRenameChapterModal();
          showToast('챕터를 찾을 수 없습니다. 책장을 새로고침해 주세요.', 'error');
          return;
        }
        chapter.title = newTitle;
        (Array.isArray(novel.sentenceBookmarks) ? novel.sentenceBookmarks : []).forEach(function(bookmark) {
          if ((chapter.id != null && bookmark.chapterId === chapter.id) || (chapter.id == null && Number(bookmark.chapterIndex) === target.chapterIndex)) bookmark.chapterTitle = newTitle;
        });
        saveToStorage(novel.id);
        closeRenameChapterModal();
        if (state.currentView === 'reader' && state.reader.novelId === novel.id) renderReader();
        showToast('챕터 제목을 수정했습니다.');
      }

      function openEditNovelModal(novelId) {
        const novel = state.novels.find(function(n) { return n.id === novelId; });
        if (!novel) return;
        state.editingNovelId = novel.id;
        document.getElementById('editModalTitleInput').value = novel.title || '';
        document.getElementById('editModalAuthorInput').value = cleanAo3AuthorName(novel.author || '');
        document.getElementById('editModalFandomInput').value = novel.fandom || '';
        document.getElementById('editModalSummaryInput').value = novel.summary || '';
        document.getElementById('editNovelModal').classList.remove('hidden');
      }

      function saveEditNovelModal() {
        const novel = state.novels.find(function(n) { return n.id === state.editingNovelId; });
        if (!novel) return;
        const newTitle = document.getElementById('editModalTitleInput').value.trim();
        if (!newTitle) {
          showToast('소설 제목을 입력해 주세요.', 'warning');
          return;
        }
        novel.title = newTitle;
        novel.author = cleanAo3AuthorName(document.getElementById('editModalAuthorInput').value.trim());
        novel.fandom = document.getElementById('editModalFandomInput').value.trim();
        novel.summary = document.getElementById('editModalSummaryInput').value.trim();
        saveToStorage();
        document.getElementById('editNovelModal').classList.add('hidden');
        showToast('소설 제목 및 정보가 업데이트되었습니다.');
        if (state.currentView === 'bookshelf') renderBookshelf();
        if (state.currentView === 'reader') renderReader();
      }

      function openDeleteNovelModal(novelId) {
        const novel = state.novels.find(function(n) { return n.id === novelId; });
        if (!novel) return;
        state.deleteTarget = { type: 'novel', novelId: novel.id };
        document.getElementById('deleteModalTitle').textContent = '소설 삭제 확인';
        document.getElementById('deleteModalMessage').textContent = '"' + novel.title + '" 소설(총 ' + (novel.chapters ? novel.chapters.length : 0) + '개 챕터)을 책장에서 삭제하시겠습니까?';
        document.getElementById('deleteConfirmModal').classList.remove('hidden');
      }

      function openDeleteChapterModal() {
        if (state.currentView !== 'reader') return;
        const novel = state.novels.find(function(n) { return n.id === state.reader.novelId; });
        if (!novel || !Array.isArray(novel.chapters) || !novel.chapters.length) return;
        const chapterIndex = Math.max(0, Math.min(state.reader.chapterIndex, novel.chapters.length - 1));
        const chapter = novel.chapters[chapterIndex];
        if (!chapter) return;
        state.deleteTarget = {
          type: 'chapter',
          novelId: novel.id,
          chapterId: chapter.id,
          chapterIndex: chapterIndex
        };
        document.getElementById('deleteModalTitle').textContent = '챕터 삭제 확인';
        document.getElementById('deleteModalMessage').textContent = '“' + (novel.title || '제목 없음') + '”의 “' + (chapter.title || ('챕터 ' + (chapterIndex + 1))) + '”를 삭제할까요? 이 챕터의 문장 책갈피도 함께 삭제됩니다.';
        document.getElementById('deleteConfirmModal').classList.remove('hidden');
      }

      function confirmDeleteAction() {
        if (!state.deleteTarget) return;
        const target = state.deleteTarget;
        let deletedChapter = false;
        let deletedNovel = false;

        if (target.type === 'novel') {
          const idx = state.novels.findIndex(function(n) { return n.id === target.novelId; });
          if (idx !== -1) {
            const removed = state.novels.splice(idx, 1)[0];
            state.deletedNovelIds[removed.id] = Date.now();
            saveToStorage();
            if (isDriveTokenValid()) {
              if (state.currentView === 'bookshelf') deleteNovelFromDrive(removed.id, removed.driveFileId).catch(function() { window._ao3DriveNeedsSync = true; });
              else window._ao3DriveNeedsSync = true;
            }
            showToast('“' + removed.title + '” 소설이 삭제되었습니다.');
            deletedNovel = true;
          }
        } else if (target.type === 'chapter') {
          const novel = state.novels.find(function(n) { return n.id === target.novelId; });
          if (novel && Array.isArray(novel.chapters)) {
            let chapterIndex = novel.chapters.findIndex(function(ch) { return ch.id === target.chapterId; });
            if (chapterIndex < 0 && novel.chapters[target.chapterIndex] && novel.chapters[target.chapterIndex].id === target.chapterId) {
              chapterIndex = target.chapterIndex;
            }
            if (chapterIndex >= 0) {
              const removedChapter = novel.chapters.splice(chapterIndex, 1)[0];
              const removedChapterId = removedChapter && removedChapter.id;

              // Remove sentence bookmarks belonging to the deleted chapter.
              if (Array.isArray(novel.sentenceBookmarks)) {
                novel.sentenceBookmarks = novel.sentenceBookmarks.filter(function(bookmark) {
                  return bookmark.chapterId !== removedChapterId;
                });
                // Keep saved bookmark indices/titles in sync after earlier chapters are removed.
                novel.sentenceBookmarks.forEach(function(bookmark) {
                  const newIndex = novel.chapters.findIndex(function(ch) { return ch.id === bookmark.chapterId; });
                  if (newIndex >= 0) {
                    bookmark.chapterIndex = newIndex;
                    bookmark.chapterTitle = novel.chapters[newIndex].title || '';
                  }
                });
              }

              if (!novel.chapters.length) {
                novel.lastReadChapterIndex = 0;
                state.reader.chapterIndex = 0;
              } else {
                const nextIndex = Math.min(chapterIndex, novel.chapters.length - 1);
                novel.lastReadChapterIndex = nextIndex;
                if (state.reader.novelId === novel.id) state.reader.chapterIndex = nextIndex;
              }
              novel.updatedAt = Date.now();
              saveToStorage(novel.id);
              showToast('챕터 “' + (removedChapter.title || '제목 없음') + '”을(를) 삭제했습니다.');
              deletedChapter = true;
            }
          }
        }

        state.deleteTarget = null;
        document.getElementById('deleteConfirmModal').classList.add('hidden');
        updateHeaderBadges();

        if (deletedNovel) {
          if (state.currentView === 'reader') switchView('bookshelf');
          else renderBookshelf();
          return;
        }
        if (deletedChapter) {
          const novel = state.novels.find(function(n) { return n.id === target.novelId; });
          if (state.currentView === 'reader' && state.reader.novelId === target.novelId) {
            if (!novel || !novel.chapters || novel.chapters.length === 0) {
              showToast('챕터가 모두 삭제되어 책장으로 이동합니다.', 'info');
              switchView('bookshelf');
            } else {
              renderReader();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          } else {
            renderBookshelf();
          }
          return;
        }
        if (state.currentView === 'reader') switchView('bookshelf');
        else renderBookshelf();
      }

      // ==================== EVENT LISTENERS INITIALIZATION ====================
      function initEvents() {
        // Bind critical header controls first. A later optional UI binding error must not
        // prevent the backup/Drive/settings controls from working.
        const headerBindings = [
          ['brandHomeBtn', function() { switchView('bookshelf'); }],
          ['navBookshelfBtn', function() { switchView('bookshelf'); }],
          ['navCustomBookshelvesBtn', function() { switchView('customBookshelves'); }],
          ['navStudioBtn', function() { switchView('studio'); }],
          ['navBookmarksBtn', function() { switchView('bookmarks'); }],
          ['openSettingsModalBtn', function() { populateGeneralSettingsModal(); document.getElementById('settingsModal').classList.remove('hidden'); applySettingsDarkPalette(); }],
          ['openApiSettingsModalBtn', function() { populateApiSettingsModal(); setApiSettingsTab('main'); document.getElementById('apiSettingsModal').classList.remove('hidden'); applySettingsDarkPalette(); ao3RefreshProviderQuotaDashboard(); ao3RefreshGeminiCooldownPanel(); }],
          ['openBackupModalBtn', function() {
            const modal = document.getElementById('backupModal');
            if (!modal) { showToast('백업 창을 찾을 수 없습니다. 페이지를 새로고침해 주세요.', 'error'); return; }
            const json = document.getElementById('backupJsonTextarea');
            if (json) json.value = JSON.stringify(state.novels, null, 2);
            const clientId = document.getElementById('googleClientIdInput');
            if (clientId) clientId.value = state.settings.googleClientId || DEFAULT_GOOGLE_CLIENT_ID;
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            const firstControl = document.getElementById('googleClientIdInput');
            if (firstControl) firstControl.focus({ preventScroll: true });
          }],
          ['driveSyncBtn', function() { if (isDriveTokenValid()) syncWithGoogleDrive(false); else connectAndSyncGoogleDrive(); }]
        ];
        headerBindings.forEach(function(binding) {
          const element = document.getElementById(binding[0]);
          if (element) element.addEventListener('click', binding[1]);
          else console.error('[AO3] Header control missing:', binding[0]);
        });
        const manualProviderSelectors = ['translationManualProvider', 'readerManualProvider'].map(function(id) { return document.getElementById(id); }).filter(Boolean);
        manualProviderSelectors.forEach(function(select) {
          select.addEventListener('change', function() {
            manualProviderSelectors.forEach(function(other) { if (other !== select) other.value = select.value; });
          });
        });
        ['translationManualProviderBtn', 'readerManualProviderBtn'].forEach(function(id) {
          const button = document.getElementById(id);
          if (!button) return;
          button.addEventListener('click', function() {
            const provider = (manualProviderSelectors[0] && manualProviderSelectors[0].value) || 'gemini';
            if (!Number(window._ao3TranslationBatchActiveCount || 0)) {
              showToast('현재 실행 중인 번역 문단이 없습니다.', 'info');
              return;
            }
            window._ao3ManualProviderRequested = provider;
            window._ao3ManualSwitchAbortRequested = true;
            const activeControllers = window._ao3ManualProviderControllers;
            if (activeControllers) activeControllers.forEach(function(controller) {
              try { controller.abort('user_selected_provider_switch'); } catch (ignoreManualProviderAbort) {}
            });
            const label = provider === 'gemini' ? 'Gemini' : provider === 'workers-ai' ? 'Workers AI' : provider === 'groq' ? 'Groq' : 'Azure Translator';
            ['translationManualProviderHint', 'readerManualProviderHint'].forEach(function(hintId) {
              const hint = document.getElementById(hintId);
              if (hint) hint.textContent = label + '로 현재 진행 문단을 다시 시도하도록 예약했습니다.';
            });
            showToast(label + '로 전환합니다. 진행 중 요청을 취소하고 현재 문단을 다시 시도합니다.', 'info');
          });
        });
        // Manual bookshelf manager controls
        document.getElementById('customShelfCreateToggleBtn').addEventListener('click', function() { document.getElementById('customShelfCreatePanel').classList.toggle('hidden'); document.getElementById('customShelfNameInput').focus(); });
        document.getElementById('customShelfCancelCreateBtn').addEventListener('click', function() { document.getElementById('customShelfCreatePanel').classList.add('hidden'); });
        document.getElementById('customShelfCreateBtn').addEventListener('click', createCustomShelf);
        document.getElementById('customShelfNameInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); createCustomShelf(); } });
        document.getElementById('customShelfRenameBtn').addEventListener('click', renameCustomShelf);
        document.getElementById('customShelfDeleteBtn').addEventListener('click', deleteCustomShelf);
        document.getElementById('customShelfAddWorkBtn').addEventListener('click', openCustomShelfSearch);
        document.getElementById('customShelfCloseSearchBtn').addEventListener('click', function() { document.getElementById('customShelfSearchPanel').classList.add('hidden'); });
        document.getElementById('customShelfSearchInput').addEventListener('input', function(e) { state.customShelfSearchQuery = e.target.value || ''; renderCustomShelfSearchResults(); });
        document.getElementById('customShelfSearchInput').addEventListener('keydown', function(e) { if (e.key === 'Escape') document.getElementById('customShelfSearchPanel').classList.add('hidden'); });

        // Collapsible tag filter inside author/topic custom shelves.
        const customTagToggle = document.getElementById('customShelfTagFilterToggle');
        const customTagContent = document.getElementById('customShelfTagFilterContent');
        const customTagChevron = document.getElementById('customShelfTagFilterChevron');
        const customTagStorageKey = 'ao3_custom_shelf_tag_filter_collapsed_v1';
        let customTagsCollapsed = false;
        try { customTagsCollapsed = localStorage.getItem(customTagStorageKey) === '1'; } catch (e) {}
        if (customTagContent) customTagContent.classList.toggle('hidden', customTagsCollapsed);
        if (customTagToggle) customTagToggle.setAttribute('aria-expanded', String(!customTagsCollapsed));
        if (customTagChevron) customTagChevron.classList.toggle('rotate-180', !customTagsCollapsed);
        if (customTagToggle) customTagToggle.addEventListener('click', function() {
          customTagsCollapsed = !customTagsCollapsed;
          if (customTagContent) customTagContent.classList.toggle('hidden', customTagsCollapsed);
          customTagToggle.setAttribute('aria-expanded', String(!customTagsCollapsed));
          if (customTagChevron) customTagChevron.classList.toggle('rotate-180', !customTagsCollapsed);
          try { localStorage.setItem(customTagStorageKey, customTagsCollapsed ? '1' : '0'); } catch (e) {}
        });

        // Collapsible bookmark tag filter; remember the user's choice on this device.
        const tagFilterToggle = document.getElementById('shelfTagFilterToggleBtn');
        const tagFilterContent = document.getElementById('shelfTagFilterContent');
        const tagFilterChevron = document.getElementById('shelfTagFilterChevron');
        const tagFilterStorageKey = 'ao3_shelf_tag_filter_collapsed_v1';
        let tagsCollapsed = false;
        try { tagsCollapsed = localStorage.getItem(tagFilterStorageKey) === '1'; } catch (e) {}
        if (tagFilterContent) tagFilterContent.classList.toggle('hidden', tagsCollapsed);
        if (tagFilterToggle) tagFilterToggle.setAttribute('aria-expanded', String(!tagsCollapsed));
        if (tagFilterChevron) tagFilterChevron.classList.toggle('rotate-180', !tagsCollapsed);
        if (tagFilterToggle) tagFilterToggle.addEventListener('click', function() {
          tagsCollapsed = !tagsCollapsed;
          if (tagFilterContent) tagFilterContent.classList.toggle('hidden', tagsCollapsed);
          tagFilterToggle.setAttribute('aria-expanded', String(!tagsCollapsed));
          if (tagFilterChevron) tagFilterChevron.classList.toggle('rotate-180', !tagsCollapsed);
          try { localStorage.setItem(tagFilterStorageKey, tagsCollapsed ? '1' : '0'); } catch (e) {}
        });

        // Bookshelf Search, Filters, Sort
        document.getElementById('shelfSearchInput').addEventListener('input', function(e) {
          state.shelfFilter.search = e.target.value;
          renderBookshelf();
        });

        document.getElementById('filterAllNovelsBtn').addEventListener('click', function() {
          state.shelfFilter.onlyBookmarked = false;
          document.getElementById('filterAllNovelsBtn').className = 'flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition bg-slate-900 text-white border-slate-900';
          document.getElementById('filterBookmarkedNovelsBtn').className = 'flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition bg-white text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1';
          renderBookshelf();
        });

        document.getElementById('filterBookmarkedNovelsBtn').addEventListener('click', function() {
          state.shelfFilter.onlyBookmarked = true;
          document.getElementById('filterBookmarkedNovelsBtn').className = 'flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition bg-amber-500 text-white border-amber-500 flex items-center justify-center gap-1';
          document.getElementById('filterAllNovelsBtn').className = 'flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
          renderBookshelf();
        });

        document.getElementById('shelfSortSelect').addEventListener('change', function(e) {
          state.shelfFilter.sortBy = e.target.value;
          renderBookshelf();
        });

        // Studio Input Method Tabs
        document.getElementById('tabMethodUrlBtn').addEventListener('click', function() {
          state.studioInputMethod = 'url';
          renderStudio();
        });
        document.getElementById('tabMethodPasteBtn').addEventListener('click', function() {
          state.studioInputMethod = 'paste';
          renderStudio();
        });
        document.getElementById('studioUrlModeBtn').addEventListener('click', function() {
          state.studioInputMethod = 'url';
          renderStudio();
        });
        document.getElementById('studioPasteModeBtn').addEventListener('click', function() {
          state.studioInputMethod = 'paste';
          renderStudio();
        });

        // Studio Bind Mode Tabs
        document.getElementById('bindModeNewBtn').addEventListener('click', function() {
          state.studioBindMode = 'new';
          renderStudio();
        });
        document.getElementById('bindModeAppendBtn').addEventListener('click', function() {
          state.studioBindMode = 'append';
          renderStudio();
        });

        // Stage a work in the bookshelf before translating so its reader can show each completed batch live.
        async function autoTranslateAndSaveWorkToBookshelf(parsed, sourceUrl, importSelection) {
          if (!parsed || !parsed.chapters || parsed.chapters.length === 0) return null;
          if (window._ao3AutomaticTranslationJobBusy) {
            throw new Error('다른 작품 번역이 진행 중입니다. 현재 작업이 끝난 뒤 업로드해 주세요.');
          }
          window._ao3AutomaticTranslationJobBusy = true;
          try {
          if (importSelection) {
            const selectedIndexes = Array.isArray(importSelection.selectedChapterIndexes) ? importSelection.selectedChapterIndexes : [];
            const totalFileChapters = Number(importSelection.totalFileChapters || 0);
            const uniqueIndexes = new Set(selectedIndexes);
            if (!selectedIndexes.length || selectedIndexes.length !== parsed.chapters.length || uniqueIndexes.size !== selectedIndexes.length ||
                selectedIndexes.some(function(index) { return !Number.isInteger(index) || index < 0 || index >= totalFileChapters; }) ||
                parsed.chapters.some(function(chapter, index) { return Number(chapter.sourceChapterIndex) !== selectedIndexes[index]; })) {
              throw new Error('선택한 챕터 정보가 업로드 파일과 일치하지 않습니다. 파일을 다시 선택해 주세요.');
            }
          }

          // AO3 Summary discovery/translation is disabled. Keep imported works'
          // user memo blank; title, author, fandom, and chapter import continue normally.
          parsed.meta = parsed.meta || {};
          parsed.meta.summary = '';

          state.draftChapters = [];
          appendParsedWorkToDrafts(parsed, sourceUrl);
          const draftChapters = state.draftChapters.slice();
          if (importSelection && draftChapters.length !== importSelection.selectedChapterIndexes.length) {
            throw new Error('선택한 챕터 수와 번역 대기열이 일치하지 않아 중단했습니다.');
          }
          renderStudio();
          const rawMetaTitle = (parsed.meta && parsed.meta.title ? parsed.meta.title.trim() : '') ||
            document.getElementById('novelTitleInput').value.trim() ||
            (draftChapters[0] ? draftChapters[0].title : 'AO3 번역 소설');
          const rawAuthor = (parsed.meta && parsed.meta.author ? parsed.meta.author.trim() : '') ||
            document.getElementById('novelAuthorInput').value.trim() ||
            'Anonymous';
          const finalAuthor = cleanAo3AuthorName(rawAuthor) || 'Anonymous';
          const finalFandom = (parsed.meta && parsed.meta.fandom ? parsed.meta.fandom.trim() : '') ||
            document.getElementById('novelFandomInput').value.trim() || '';
          const isBookmarked = document.getElementById('studioBookmarkCheck').checked;
          const rawTags = document.getElementById('studioBookmarkTagsInput').value
            .split(',').map(function(t) { return t.replace(/^#+/, '').trim(); }).filter(Boolean);
          const workIdMatch = (sourceUrl || (draftChapters[0] && draftChapters[0].sourceUrl) || '').match(/\/works\/(\d+)/);
          const workId = workIdMatch ? workIdMatch[1] : null;

          let targetNovel = null;
          if (state.studioBindMode === 'append') {
            const select = document.getElementById('appendTargetNovelSelect');
            const targetId = select ? select.value : '';
            targetNovel = state.novels.find(function(n) { return n.id === targetId; }) || null;
          } else if (workId) {
            targetNovel = state.novels.find(function(n) { return n.ao3WorkId === workId; }) || null;
          }

          const isNewNovel = !targetNovel;
          const chapterOffset = targetNovel ? (targetNovel.chapters || []).length : 0;
          const chaptersCopy = draftChapters.map(function(ch) {
            return {
              id: 'ch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
              title: ch.title,
              sourceUrl: ch.sourceUrl || sourceUrl || '',
              paragraphs: (ch.paragraphs || []).map(function(p) {
                return {
                  id: p.id,
                  en: p.en,
                  ko: p.ko || '',
                  bookmarked: Boolean(p.bookmarked),
                  tags: Array.isArray(p.tags) ? p.tags.slice() : [],
                  note: p.note || ''
                };
              })
            };
          });
          if (targetNovel) {
            if (isBookmarked) {
              targetNovel.bookmarked = true;
              targetNovel.bookmarkTags = Array.isArray(targetNovel.bookmarkTags) ? targetNovel.bookmarkTags : [];
              rawTags.forEach(function(t) {
                if (!targetNovel.bookmarkTags.includes(t)) targetNovel.bookmarkTags.push(t);
              });
            }
          } else {
            targetNovel = {
              id: 'novel_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
              ao3WorkId: workId || null,
              title: rawMetaTitle,
              author: finalAuthor,
              fandom: finalFandom,
              summary: '',
              bookmarked: isBookmarked,
              bookmarkTags: isBookmarked ? rawTags : [],
              bookmarkNote: '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              lastReadAt: Date.now(),
              lastReadChapterIndex: 0,
              chapters: []
            };
            delete state.deletedNovelIds[targetNovel.id];
            state.novels.unshift(targetNovel);
          }
          targetNovel.chapters = (targetNovel.chapters || []).concat(chaptersCopy);
          targetNovel.translationProgress = {
            status: 'translating', percentage: 0, completedChapters: 0,
            totalChapters: draftChapters.length, currentChapterIndex: chapterOffset,
            chapterDone: 0, chapterTotal: (draftChapters[0].paragraphs || []).length
          };
          saveToStorage(targetNovel.id);
          openNovelInReader(targetNovel.id, chapterOffset);
          showToast('작품을 책장에 추가했습니다. 챕터 번역이 진행 중이며 뷰어에서 결과를 실시간으로 볼 수 있습니다.');

          const updateLiveShelfReader = function(update) {
            const draftChapter = update.chapter;
            const targetIndex = chapterOffset + update.chapterIndex;
            const targetChapter = targetNovel.chapters[targetIndex];
            if (!targetChapter || !draftChapter) return;
            targetChapter.paragraphs = (draftChapter.paragraphs || []).map(function(p) {
              return {
                id: p.id, en: p.en, ko: p.ko || '', bookmarked: Boolean(p.bookmarked),
                tags: Array.isArray(p.tags) ? p.tags.slice() : [], note: p.note || ''
              };
            });
            const doneBefore = draftChapters.slice(0, update.chapterIndex).reduce(function(sum, chapter) {
              return sum + (chapter.translated ? (chapter.paragraphs || []).length : 0);
            }, 0);
            const totalParagraphs = Math.max(1, draftChapters.reduce(function(sum, chapter) {
              return sum + (chapter.paragraphs || []).length;
            }, 0));
            const completedChapters = draftChapters.filter(function(chapter) { return chapter.translated; }).length;
            targetNovel.translationProgress.currentChapterIndex = targetIndex;
            targetNovel.translationProgress.completedChapters = completedChapters;
            targetNovel.translationProgress.chapterDone = update.chapterDone || 0;
            targetNovel.translationProgress.chapterTotal = Math.max(1, update.chapterTotal || (draftChapter.paragraphs || []).length);
            targetNovel.translationProgress.percentage = Math.max(0, Math.min(100, Math.round(((doneBefore + (update.chapterDone || 0)) / totalParagraphs) * 100)));
            targetNovel.updatedAt = Date.now();
            saveToStorage(targetNovel.id);
            if (state.currentView === 'reader' && state.reader.novelId === targetNovel.id) renderReader();
            else if (state.currentView === 'bookshelf') renderBookshelf();
          };

          try {
            const allDraftsTranslated = await runTranslateAllDrafts(updateLiveShelfReader, draftChapters);
            if (!allDraftsTranslated || draftChapters.some(function(ch) { return !ch.translated; })) {
              throw new Error('번역이 완료되지 않아 작업을 중단했습니다. API 오류를 확인한 뒤 다시 시도해 주세요.');
            }

            let finalTitle = rawMetaTitle;
            if (/[a-zA-Z]{2,}/.test(rawMetaTitle) && !/[가-힣]/.test(rawMetaTitle)) {
              try {
                const koTitleArr = await translateParagraphBatch([rawMetaTitle]);
                const koTitle = (koTitleArr && koTitleArr[0]) ? koTitleArr[0].trim() : '';
                if (koTitle && koTitle !== rawMetaTitle && !koTitle.startsWith('[')) finalTitle = koTitle + ' (' + rawMetaTitle + ')';
              } catch (ignoreTitleTranslationError) {}
            }
            if (isNewNovel) targetNovel.title = finalTitle;
            targetNovel.translationProgress.percentage = 100;
            targetNovel.translationProgress.completedChapters = draftChapters.length;
            targetNovel.translationProgress.status = 'completed';
            delete targetNovel.translationProgress;
            targetNovel.updatedAt = Date.now();
            targetNovel.lastReadAt = Date.now();
            saveToStorage(targetNovel.id);
            state.draftChapters = [];
            document.getElementById('novelTitleInput').value = '';
            document.getElementById('novelAuthorInput').value = '';
            document.getElementById('novelFandomInput').value = '';
            document.getElementById('novelSummaryInput').value = '';
            document.getElementById('studioBookmarkCheck').checked = false;
            document.getElementById('studioBookmarkTagsInput').value = '';
            if (state.currentView === 'reader' && state.reader.novelId === targetNovel.id) renderReader();
            else if (state.currentView === 'bookshelf') renderBookshelf();
            showToast('"' + targetNovel.title + '"의 ' + chaptersCopy.length + '개 챕터 번역이 완료되었습니다.');
            return targetNovel;
          } catch (translationError) {
            if (isNewNovel) {
              state.novels = state.novels.filter(function(novel) { return novel.id !== targetNovel.id; });
              state.deletedNovelIds[targetNovel.id] = Date.now();
              if (isDriveTokenValid()) deleteNovelFromDrive(targetNovel.id, targetNovel.driveFileId).catch(function() { window._ao3DriveNeedsSync = true; });
            } else {
              const appendedIds = new Set(chaptersCopy.map(function(chapter) { return chapter.id; }));
              targetNovel.chapters = (targetNovel.chapters || []).filter(function(chapter) { return !appendedIds.has(chapter.id); });
              delete targetNovel.translationProgress;
            }
            saveToStorage();
            if (state.currentView === 'reader' && state.reader.novelId === targetNovel.id) switchView('bookshelf');
            else if (state.currentView === 'bookshelf') renderBookshelf();
            throw translationError;
          }
          } finally {
            window._ao3AutomaticTranslationJobBusy = false;
          }
        }

        // Load Sample AO3 English multi-chapter work -> Auto-assign Title/Author, Translate, and Auto-Save to Bookshelf!
        document.getElementById('loadSampleAo3Btn').addEventListener('click', async function() {
          const _sampleDpId = { id: 'dp_' + Date.now() + '_1' };
          const sampleParsed = {
            meta: {
              title: 'Letters from the Clockwork Observatory',
              author: 'Eleanor_V',
              fandom: 'Steampunk Fantasy',
              summary: 'AO3 페이지에서 제목과 원작자를 자동으로 찾아 한국어로 번역한 뒤 Step 2 없이 책장에 즉시 자동 저장된 작품입니다.'
            },
            chapters: [
              {
                title: 'Chapter 1: The Clockwork Observatory',
                sourceUrl: 'https://archiveofourown.org/works/9876543/chapters/1',
                paragraphs: [
                  'High above the fog-draped harbor, the brass gears of the observatory turned silently through the night.',
                  'Eleanor adjusted the telescope lens and wrote her findings in the leather notebook beside her.',
                  '"If the stars align before dawn, the northern gate will open once again," she whispered to the empty hall.'
                ]
              },
              {
                title: 'Chapter 2: Letters Across the Sea',
                sourceUrl: 'https://archiveofourown.org/works/9876543/chapters/2',
                paragraphs: [
                  'Three weeks later, a sealed envelope arrived from the winter capital bearing the crest of the old academy.',
                  'Inside was a map drawn in silver ink, pointing directly to the lighthouse on the edge of the cliff.'
                ]
              }
            ]
          };

          const savedNovel = await autoTranslateAndSaveWorkToBookshelf(sampleParsed, 'https://archiveofourown.org/works/9876543');
          if (savedNovel) {
            showToast('"' + savedNovel.title + '" (원작자: ' + savedNovel.author + ') 소설이 책장에 자동 저장되었습니다! 바로 열람해 보세요.');
          }
        });

        // Helper to append parsed AO3 result into draftChapters and prefill metadata
        function appendParsedWorkToDrafts(parsed, sourceUrl) {
          let count = 0;
          (parsed.chapters || []).forEach(function(ch, cIdx) {
            state.draftChapters.push({
              id: 'draft_' + Date.now() + '_' + cIdx + '_' + Math.random().toString(36).slice(2, 7),
              title: ch.title || ('Chapter ' + (state.draftChapters.length + 1)),
              sourceUrl: ch.sourceUrl || sourceUrl || '',
              sourceChapterIndex: Number.isInteger(ch.sourceChapterIndex) ? ch.sourceChapterIndex : cIdx,
              translated: false,
              paragraphs: (ch.paragraphs || []).map(function(pText, pIdx) {
                return {
                  id: 'p_' + Date.now() + '_' + cIdx + '_' + pIdx + '_' + Math.random().toString(36).slice(2, 5),
                  en: pText,
                  ko: '',
                  bookmarked: false,
                  tags: [],
                  note: ''
                };
              })
            });
            count += 1;
          });

          if (parsed.meta) {
            const titleInput = document.getElementById('novelTitleInput');
            if (parsed.meta.title && !titleInput.value.trim()) {
              titleInput.value = parsed.meta.title;
            }
            const authorInput = document.getElementById('novelAuthorInput');
            if (parsed.meta.author && !authorInput.value.trim()) {
              authorInput.value = cleanAo3AuthorName(parsed.meta.author);
            } else if (authorInput.value.trim()) {
              authorInput.value = cleanAo3AuthorName(authorInput.value);
            }
            const fandomInput = document.getElementById('novelFandomInput');
            if ((parsed.meta.genre || parsed.meta.fandom) && !fandomInput.value.trim()) {
              fandomInput.value = parsed.meta.genre || parsed.meta.fandom;
            }
            const summaryInput = document.getElementById('novelSummaryInput');
            // AO3 Summary import is disabled; do not fill the user memo field automatically.
            summaryInput.value = '';
          }
          return count;
        }

        function appendFetchLog(msg) {
          const box = document.getElementById('ao3FetchLogBox');
          const list = document.getElementById('ao3FetchLogList');
          if (!box || !list) return;
          box.classList.remove('hidden');
          box.hidden = false;
          box.removeAttribute('hidden');
          // Keep the status area to one short line rather than a noisy technical log.
          list.textContent = msg;
          box.scrollTop = box.scrollHeight;
        }

        document.getElementById('clearFetchLogBtn').addEventListener('click', function() {
          document.getElementById('ao3FetchLogBox').classList.add('hidden');
        });



        const dropZone = document.getElementById('ao3FileDropZone');
        dropZone.addEventListener('dragover', function(e) {
          e.preventDefault();
          dropZone.classList.add('ring-2', 'ring-rose-500', 'bg-rose-100/80');
        });
        dropZone.addEventListener('dragleave', function() {
          dropZone.classList.remove('ring-2', 'ring-rose-500', 'bg-rose-100/80');
        });
        dropZone.addEventListener('drop', function(e) {
          e.preventDefault();
          dropZone.classList.remove('ring-2', 'ring-rose-500', 'bg-rose-100/80');
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const fileInput = document.getElementById('ao3HtmlFileInput');
            fileInput.files = e.dataTransfer.files;
            fileInput.dispatchEvent(new Event('change'));
          }
        });

        // 1-Click AO3 Downloaded HTML/TXT File Import
        document.getElementById('ao3HtmlFileBtn').addEventListener('click', function() {
          document.getElementById('ao3HtmlFileInput').click();
        });

        let pendingAo3FileImport = null;
        function renderAo3FileImportPreview(parsed) {
          const preview = document.getElementById('ao3FileImportPreview');
          const metaBox = document.getElementById('ao3FileImportMetadata');
          const chapterList = document.getElementById('ao3FileImportChapterList');
          const chapterCount = document.getElementById('ao3FileImportChapterCount');
          if (!preview || !metaBox || !chapterList || !chapterCount) return;
          pendingAo3FileImport = parsed;
          const meta = parsed.meta || {};
          metaBox.innerHTML = '<h3 class="text-sm font-bold text-slate-900">' + escapeHtml(meta.title || '제목 미확인') + '</h3>' +
            '<p class="text-xs text-slate-700">작가: ' + escapeHtml(meta.author || '작가 미확인') + '</p>' +
            '<p class="text-xs text-slate-700">원작 / 장르: ' + escapeHtml(meta.genre || meta.fandom || '분류 미확인') + '</p>';
          const updateSelectedChapterCount = function() {
            const selectedCount = chapterList.querySelectorAll('[data-file-import-chapter]:checked').length;
            chapterCount.textContent = '챕터 선택 · ' + selectedCount + '/' + parsed.chapters.length + '개 선택됨';
          };
          chapterList.innerHTML = parsed.chapters.map(function(chapter, index) {
            const paragraphCount = Array.isArray(chapter.paragraphs) ? chapter.paragraphs.length : 0;
            return '<label class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-800 hover:bg-rose-50">' +
              '<input type="checkbox" data-file-import-chapter="' + index + '" class="rounded border-slate-300 text-rose-700 focus:ring-rose-600">' +
              '<span class="min-w-0 flex-1 truncate">' + (index + 1) + '. ' + escapeHtml(chapter.title || ('Chapter ' + (index + 1))) + '</span>' +
              '<span class="shrink-0 text-[10px] text-slate-500">' + paragraphCount + '문단</span></label>';
          }).join('');
          chapterList.querySelectorAll('[data-file-import-chapter]').forEach(function(input) {
            input.addEventListener('change', updateSelectedChapterCount);
          });
          updateSelectedChapterCount();
          preview.classList.remove('hidden');
          preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        const chapterSelectAll = document.getElementById('ao3FileSelectAllBtn');
        if (chapterSelectAll) chapterSelectAll.addEventListener('click', function() {
          const chapterList = document.getElementById('ao3FileImportChapterList');
          chapterList.querySelectorAll('[data-file-import-chapter]').forEach(function(input) { input.checked = true; input.dispatchEvent(new Event('change')); });
        });
        const chapterSelectNone = document.getElementById('ao3FileSelectNoneBtn');
        if (chapterSelectNone) chapterSelectNone.addEventListener('click', function() {
          const chapterList = document.getElementById('ao3FileImportChapterList');
          chapterList.querySelectorAll('[data-file-import-chapter]').forEach(function(input) { input.checked = false; input.dispatchEvent(new Event('change')); });
        });
        document.getElementById('ao3TranslateSelectedFileChaptersBtn').addEventListener('click', async function(event) {
          if (!pendingAo3FileImport) return;
          if (window._ao3AutomaticTranslationJobBusy) {
            showToast('다른 작품 번역이 진행 중입니다. 현재 작업이 끝난 뒤 다시 선택해 주세요.', 'warning');
            return;
          }
          const fileImportSnapshot = pendingAo3FileImport;
          const chapterList = document.getElementById('ao3FileImportChapterList');
          const selectedIndexes = Array.from(chapterList.querySelectorAll('[data-file-import-chapter]:checked')).map(function(input) {
            return Number(input.getAttribute('data-file-import-chapter'));
          }).filter(function(index) { return Number.isInteger(index) && index >= 0 && index < fileImportSnapshot.chapters.length; }).sort(function(a, b) { return a - b; });
          if (!selectedIndexes.length) { showToast('번역할 챕터를 하나 이상 선택해 주세요.', 'warning'); return; }
          const button = event.currentTarget;
          button.disabled = true;
          const originalText = button.textContent;
          button.textContent = '선택한 ' + selectedIndexes.length + '개 챕터 번역 중…';
          const fileInput = document.getElementById('ao3HtmlFileInput');
          const uploadButton = document.getElementById('ao3HtmlFileBtn');
          const selectAllButton = document.getElementById('ao3FileSelectAllBtn');
          const selectNoneButton = document.getElementById('ao3FileSelectNoneBtn');
          const chapterCheckboxes = Array.from(chapterList.querySelectorAll('[data-file-import-chapter]'));
          const controls = [fileInput, uploadButton, selectAllButton, selectNoneButton].concat(chapterCheckboxes).filter(Boolean);
          const previousDisabledStates = controls.map(function(control) { return control.disabled; });
          controls.forEach(function(control) { control.disabled = true; });
          const parsed = {
            meta: Object.assign({}, fileImportSnapshot.meta || {}),
            chapters: selectedIndexes.map(function(index) {
              return Object.assign({}, fileImportSnapshot.chapters[index], { sourceChapterIndex: index });
            })
          };
          document.getElementById('novelTitleInput').value = parsed.meta.title || '';
          document.getElementById('novelAuthorInput').value = parsed.meta.author || '';
          document.getElementById('novelFandomInput').value = parsed.meta.genre || parsed.meta.fandom || '';
          try {
            const savedNovel = await autoTranslateAndSaveWorkToBookshelf(parsed, '', {
              selectedChapterIndexes: selectedIndexes.slice(),
              totalFileChapters: fileImportSnapshot.chapters.length
            });
            if (savedNovel) {
              if (pendingAo3FileImport === fileImportSnapshot) pendingAo3FileImport = null;
              document.getElementById('ao3FileImportPreview').classList.add('hidden');
              showToast('선택한 ' + selectedIndexes.length + '개 챕터를 번역해 책장에 저장했습니다.');
            }
          } catch (error) {
            showToast('선택 챕터를 저장하지 못했습니다: ' + String(error && error.message || error), 'error');
          } finally {
            controls.forEach(function(control, index) { control.disabled = previousDisabledStates[index]; });
            button.disabled = false;
            button.textContent = originalText;
          }
        });

        document.getElementById('ao3HtmlFileInput').addEventListener('change', async function(e) {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          pendingAo3FileImport = null;
          document.getElementById('ao3FileImportPreview').classList.add('hidden');
          document.getElementById('ao3FileImportChapterList').innerHTML = '';
          const extension = String(file.name || '').split('.').pop().toLowerCase();
          if (file.size > 25 * 1024 * 1024) {
            showToast('파일은 25MB 이하로 선택해 주세요.', 'warning'); e.target.value = ''; return;
          }
          if (!['html', 'htm', 'xhtml', 'txt'].includes(extension)) {
            showToast('AO3 다운로드 메뉴에서 HTML 형식으로 저장한 파일을 선택해 주세요.', 'warning'); e.target.value = ''; return;
          }
          try {
            appendFetchLog('선택한 파일을 분석하는 중…');
            const text = await file.text();
            let parsed = null;
            if (extension === 'txt') {
              const paragraphs = text.split(/\n\s*\n+/).map(function(value) { return value.replace(/\r/g, '').trim(); }).filter(Boolean);
              if (paragraphs.length) parsed = {
                meta: { title: file.name.replace(/\.[^.]+$/, ''), author: '', fandom: '', genre: '', tags: [], categories: [], summary: '' },
                chapters: [{ title: file.name.replace(/\.[^.]+$/, ''), paragraphs: normalizeAndMergeBrokenParagraphs(paragraphs), sourceUrl: '' }]
              };
            } else {
              parsed = parseAo3HtmlDocument(text, '', { includeTags: false });
              if (parsed && parsed.reason === 'adult_gate') {
                throw new Error('파일에 성인 인증 화면만 있습니다. 로그인 상태에서 AO3의 Download → HTML을 다시 저장해 주세요.');
              }
            }
            if (!parsed || !Array.isArray(parsed.chapters) || parsed.chapters.length === 0) {
              throw new Error('파일에서 챕터 본문을 찾지 못했습니다. AO3의 Download → HTML 파일인지 확인해 주세요.');
            }
            renderAo3FileImportPreview(parsed);
            appendFetchLog('작품 정보와 ' + parsed.chapters.length + '개 챕터를 읽었습니다. 번역할 챕터를 선택해 주세요.');
          } catch (error) {
            pendingAo3FileImport = null;
            document.getElementById('ao3FileImportPreview').classList.add('hidden');
            showToast(error && error.message ? error.message : '파일 분석에 실패했습니다.', 'error');
            appendFetchLog('파일 분석 실패');
          } finally {
            e.target.value = '';
          }
        });

        // Fetch one AO3 chapter URL -> translate and save to bookshelf.
        document.getElementById('ao3UrlInput').addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('fetchAo3UrlBtn').click();
          }
        });
        // Link translation queue: incoming AO3 links are serialized so a new chapter never races the active translation.
        window._ao3LinkQueueNextId = Number(window._ao3LinkQueueNextId || 0);
        window._ao3LinkTranslationQueue = (Array.isArray(window._ao3LinkTranslationQueue) ? window._ao3LinkTranslationQueue : []).map(function(item) {
          const normalized = typeof item === 'string' ? { url: item } : Object.assign({}, item || {});
          if (!normalized.id) normalized.id = 'ao3q-' + (++window._ao3LinkQueueNextId);
          if (!normalized.url) normalized.url = '';
          normalized.title = typeof normalized.title === 'string' ? normalized.title : '';
          normalized.author = typeof normalized.author === 'string' ? normalized.author : '';
          normalized.metadataState = normalized.metadataState || 'loading';
          return normalized;
        });
        window._ao3LinkTranslationBusy = false;
        function createAo3QueueItemId() {
          window._ao3LinkQueueNextId = Number(window._ao3LinkQueueNextId || 0) + 1;
          return 'ao3q-' + window._ao3LinkQueueNextId;
        }
        function getAo3QueueItemUrl(item) {
          return String(typeof item === 'string' ? item : (item && item.url) || '').trim();
        }
        function getAo3QueueItemId(item) {
          return String(item && typeof item === 'object' ? item.id || '' : '');
        }
        function renderAo3LinkQueue() {
          const box = document.getElementById('ao3LinkQueueBox');
          const status = document.getElementById('ao3LinkQueueStatus');
          const list = document.getElementById('ao3LinkQueueList');
          const clearBtn = document.getElementById('clearAo3LinkQueueBtn');
          const active = document.getElementById('ao3LinkQueueActive');
          const empty = document.getElementById('ao3LinkQueueEmpty');
          const queue = window._ao3LinkTranslationQueue || [];
          if (!box || !status || !list) return;
          // Do not hide the panel: users should always be able to see the queue area.
          box.classList.remove('hidden');
          box.hidden = false;
          box.removeAttribute('hidden');
          status.textContent = (window._ao3LinkTranslationBusy ? '챕터 처리 중' : '번역 대기열') + ' · ' + queue.length + '개 대기';
          const activeUrl = String(window._ao3ActiveLinkUrl || '').trim();
          const activeItem = window._ao3ActiveLinkItem || {};
          if (active) {
            active.classList.toggle('hidden', !window._ao3LinkTranslationBusy || !activeUrl);
            const activeLabel = activeItem.title || activeUrl;
            active.textContent = activeUrl ? '▶ 처리 중: ' + activeLabel + (activeItem.author ? ' — 작가: ' + activeItem.author : '') : '';
          }
          list.innerHTML = queue.map(function(item, i) {
            const url = getAo3QueueItemUrl(item);
            const title = String(item && item.title || '').trim();
            const author = String(item && item.author || '').trim();
            const state = String(item && item.metadataState || 'loading');
            const displayTitle = title || (state === 'error' ? '작품 정보 확인 실패' : (state === 'retrying' ? '작품 정보 재확인 중…' : '작품 정보 확인 중…'));
            const displayAuthor = author || (state === 'error' ? '확인 실패' : (state === 'retrying' ? '재시도 중…' : '확인 중…'));
            const id = getAo3QueueItemId(item);
            const retryControl = state === 'error'
              ? '<button type="button" data-retry-ao3-queue-item="' + escapeHtml(id) + '" aria-label="' + escapeHtml(displayTitle + ' 정보 다시 불러오기') + '" style="border:1px solid rgba(125,211,252,.45);border-radius:7px;padding:4px 8px;background:rgba(15,23,42,.25);color:inherit;font-size:11px;cursor:pointer;">다시 시도</button>'
              : '';
            return '<li style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:7px 0;border-top:1px solid rgba(125,211,252,.18);">' +
              '<div style="min-width:0;flex:1;overflow-wrap:anywhere;">' +
                '<div style="font-weight:700;">' + (i + 1) + '. ' + escapeHtml(displayTitle) + '</div>' +
                '<div style="opacity:.86;margin-top:2px;">작가: ' + escapeHtml(displayAuthor) + '</div>' +
                '<div style="font-size:11px;opacity:.68;margin-top:2px;">' + escapeHtml(url) + '</div>' +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:4px;flex:0 0 auto;">' + retryControl +
                '<button type="button" data-remove-ao3-queue-item="' + escapeHtml(id) + '" aria-label="' + escapeHtml(displayTitle + ' 대기열에서 삭제') + '" style="border:1px solid rgba(125,211,252,.45);border-radius:7px;padding:4px 8px;background:rgba(15,23,42,.25);color:inherit;font-size:11px;cursor:pointer;">삭제</button>' +
              '</div>' +
            '</li>';
          }).join('');
          if (empty) empty.classList.toggle('hidden', queue.length > 0);
          if (clearBtn) clearBtn.classList.toggle('hidden', queue.length === 0);
        }
        // Queue display needs only work metadata, not a fully parsed chapter body. This
        // deliberately separates title extraction from chapter-body extraction so a proxy
        // can provide a title even when its HTML layout cannot be parsed into paragraphs.
        function parseAo3QueueMetadataFromHtml(htmlText) {
          if (typeof htmlText !== 'string' || htmlText.length < 80) return null;
          if (/Just a moment\.\.\.|cf-browser-verification|Attention Required! \| Cloudflare|_cf_chl_opt/i.test(htmlText)) return null;
          let doc;
          try { doc = new DOMParser().parseFromString(htmlText, 'text/html'); } catch (e) { return null; }
          const clean = function(value) {
            return String(value || '').replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim();
          };
          const titleNode = doc.querySelector('#workskin .preface.group h2.title.heading') ||
            doc.querySelector('#workskin .preface h2.title.heading') ||
            doc.querySelector('#preface h2.title.heading') ||
            doc.querySelector('#preface h2.title') ||
            doc.querySelector('h2.title.heading') || doc.querySelector('h2.title');
          const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
            doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || '';
          const documentTitle = doc.querySelector('title')?.textContent || '';
          let title = '';
          if (titleNode) {
            title = clean(titleNode.textContent);
          } else {
            title = clean(ogTitle || documentTitle)
              .replace(/\s*\[Archive of Our Own\]\s*$/i, '')
              .replace(/\s*-\s*Archive of Our Own\s*$/i, '')
              .split(/\s+-\s+/)[0].trim();
          }
          title = title.replace(/\s*\[Archive of Our Own\]\s*$/i, '').trim();
          if (!title || /^(archive of our own|works? · archive of our own|log in · archive of our own)$/i.test(title)) title = '';

          const authorNodes = Array.from(doc.querySelectorAll(
            '#workskin .preface .byline a[rel="author"], #workskin .preface h3.byline a[rel="author"], ' +
            '#preface .byline a[rel="author"], h3.byline a[rel="author"], .byline a[rel="author"]'
          ));
          let authors = Array.from(new Set(authorNodes.map(function(node) { return clean(node.textContent); }).filter(Boolean)));
          if (!authors.length) {
            const byline = doc.querySelector('#workskin .preface h3.byline, #preface h3.byline, .preface .byline, h3.byline, .byline');
            const bylineText = clean(byline ? byline.textContent : '').replace(/^by\s+/i, '').trim();
            if (bylineText && bylineText.length < 160 && !/^archive of our own$/i.test(bylineText)) authors = [bylineText];
          }
          if (!authors.length) {
            const authorMeta = doc.querySelector('meta[name="author"], meta[property="article:author"]');
            const authorText = clean(authorMeta ? authorMeta.getAttribute('content') : '');
            if (authorText) authors = [authorText];
          }
          return title ? { title: title, author: cleanAo3AuthorName(authors.join(', ')), source: 'html' } : null;
        }

        function parseAo3QueueMetadataFromMarkdown(markdownText) {
          if (typeof markdownText !== 'string' || markdownText.length < 80) return null;
          if (/Just a moment\.\.\.|Attention Required! \| Cloudflare/i.test(markdownText)) return null;
          const titleMatch = markdownText.match(/^Title:\s*(.+)$/im);
          let title = '';
          let author = '';
          if (titleMatch) {
            const raw = titleMatch[1].replace(/\s*\[Archive of Our Own\].*$/i, '').replace(/\s*-\s*Archive of Our Own.*$/i, '').trim();
            const parts = raw.split(/\s+-\s+/).map(function(part) { return part.trim(); }).filter(Boolean);
            if (parts.length >= 3) { title = parts[0]; author = parts[parts.length - 2]; }
            else if (parts.length === 2) { title = parts[0]; author = parts[1]; }
            else title = raw;
          }
          if (!author) {
            const byMatch = markdownText.match(/(?:^|\n)#{1,6}\s*by\s+\[([^\]]+)\]|\bby\s+\[([^\]]+)\]\(https?:\/\/archiveofourown\.org\/users\//i);
            if (byMatch) author = (byMatch[1] || byMatch[2] || '').trim();
          }
          title = String(title || '').trim();
          if (!title || /^(archive of our own|works?)$/i.test(title)) return null;
          return { title: title, author: cleanAo3AuthorName(author), source: 'markdown' };
        }

        async function fetchAo3QueueMetadataFromProxies(rawUrl, parentSignal) {
          const info = extractAo3WorkInfo(rawUrl, false);
          if (!info) throw new Error('유효하지 않은 AO3 링크입니다.');
          const target = info.webUrl;
          const candidates = [
            {
              name: 'Cloudflare Worker 직접 AO3',
              url: ao3FunctionUrl('ao3-fetch') + '?url=' + encodeURIComponent(target),
              read: async function(response) { return { text: await response.text(), type: 'html' }; }
            },
            {
              name: 'AllOrigins Raw',
              url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent(target),
              read: async function(response) { return { text: await response.text(), type: 'html' }; }
            },
            {
              name: 'CodeTabs',
              url: 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(target),
              read: async function(response) { return { text: await response.text(), type: 'html' }; }
            },
            {
              name: 'AllOrigins JSON',
              url: 'https://api.allorigins.win/get?url=' + encodeURIComponent(target),
              read: async function(response) { const data = await response.json(); return { text: String(data && data.contents || ''), type: 'html' }; }
            },
            {
              name: 'Jina Reader',
              url: 'https://r.jina.ai/' + target,
              read: async function(response) {
                const text = await response.text();
                return { text: text, type: /^(?:Title:|URL Source:|Markdown Content:)/m.test(text) && !/<html[\s>]/i.test(text) ? 'markdown' : 'html' };
              }
            }
          ];
          const candidateControllers = [];
          function abortMetadataRequests() {
            candidateControllers.forEach(function(controller) {
              try { controller.abort(); } catch (ignoreAbort) {}
            });
          }
          async function tryCandidate(candidate) {
            const controller = new AbortController();
            candidateControllers.push(controller);
            const abortFromParent = function() { try { controller.abort(); } catch (ignoreAbort) {} };
            if (parentSignal) {
              if (parentSignal.aborted) abortFromParent();
              else parentSignal.addEventListener('abort', abortFromParent, { once: true });
            }
            const timeoutId = setTimeout(abortFromParent, 8500);
            try {
              const response = await fetch(candidate.url, {
                headers: candidate.name === 'Jina Reader' ? {
                  'X-Return-Format': 'html',
                  'X-Set-Cookie': 'view_adult=true; accepted_tos=20180523'
                } : { 'Accept': 'text/html,application/json;q=0.9,*/*;q=0.8' },
                signal: controller.signal
              });
              if (!response.ok) throw new Error(candidate.name + ' HTTP ' + response.status);
              const result = await candidate.read(response);
              let metadata = result.type === 'markdown'
                ? parseAo3QueueMetadataFromMarkdown(result.text)
                : parseAo3QueueMetadataFromHtml(result.text);
              // Jina sometimes returns HTML despite the request format; try both parsers.
              if (!metadata && result.type === 'markdown') metadata = parseAo3QueueMetadataFromHtml(result.text);
              if (!metadata && result.type === 'html') metadata = parseAo3QueueMetadataFromMarkdown(result.text);
              if (!metadata || !metadata.title) throw new Error(candidate.name + ' 응답에 작품 제목이 없습니다.');
              metadata.source = candidate.name;
              return metadata;
            } finally {
              clearTimeout(timeoutId);
              if (parentSignal) parentSignal.removeEventListener('abort', abortFromParent);
            }
          }
          const settledOnce = await new Promise(function(resolve, reject) {
            let pending = candidates.length;
            let done = false;
            let partial = null;
            let partialTimer = null;
            const errors = [];
            function finish(value, error) {
              if (done) return;
              done = true;
              if (partialTimer) clearTimeout(partialTimer);
              abortMetadataRequests();
              if (error) reject(error); else resolve(value);
            }
            if (!pending) { reject(new Error('사용 가능한 AO3 메타데이터 경로가 없습니다.')); return; }
            candidates.forEach(function(candidate) {
              tryCandidate(candidate).then(function(metadata) {
                if (done) return;
                pending -= 1;
                if (metadata && metadata.title && metadata.author) {
                  finish(metadata);
                  return;
                }
                if (metadata && metadata.title && !partial) {
                  partial = metadata;
                  // Let a near-simultaneous response fill the author field, but don't
                  // hold up the queue title display for the slowest proxy.
                  partialTimer = setTimeout(function() { finish(partial); }, 300);
                }
                if (pending <= 0) {
                  if (partial) finish(partial);
                  else finish(null, new Error(errors.slice(0, 3).join(' / ') || '사용 가능한 AO3 메타데이터 경로가 없습니다.'));
                }
              }, function(error) {
                if (done) return;
                pending -= 1;
                errors.push(String(error && error.message || error || '오류'));
                if (pending <= 0) {
                  if (partial) finish(partial);
                  else finish(null, new Error(errors.slice(0, 3).join(' / ') || '사용 가능한 AO3 메타데이터 경로가 없습니다.'));
                }
              });
            });
          });
          if (!settledOnce || !settledOnce.title) throw new Error('사용 가능한 AO3 메타데이터 경로가 없습니다.');
          return settledOnce;
        }

        async function resolveAo3LinkQueueMetadata(queueItem) {
          const targetId = getAo3QueueItemId(queueItem);
          const url = getAo3QueueItemUrl(queueItem);
          if (!targetId || !url || queueItem._metadataInFlight) return;
          const metadataController = new AbortController();
          queueItem._metadataAbortController = metadataController;
          queueItem._metadataInFlight = true;
          const stillQueued = function() {
            return (window._ao3LinkTranslationQueue || []).some(function(item) {
              return getAo3QueueItemId(item) === targetId;
            });
          };
          const fallbackTitle = 'AO3 작품 #' + ((url.match(/\/works\/(\d+)/i) || [])[1] || '?');
          let lastError = null;
          try {
            for (let attempt = 0; attempt < 2; attempt++) {
              if (!stillQueued()) return;
              queueItem.metadataState = attempt === 0 ? 'loading' : 'retrying';
              renderAo3LinkQueue();
              try {
                const meta = await fetchAo3QueueMetadataFromProxies(url, metadataController.signal);
                if (!stillQueued()) return;
                if (!meta || !String(meta.title || '').trim()) throw new Error('작품 제목을 찾지 못했습니다.');
                queueItem.title = String(meta.title).trim();
                queueItem.author = String(meta.author || '').trim() || '작가 정보 확인 불가';
                queueItem.metadataSource = meta.source || '';
                queueItem.metadataError = '';
                queueItem.metadataState = 'ready';
                lastError = null;
                break;
              } catch (err) {
                if (metadataController.signal.aborted || !stillQueued()) return;
                lastError = err;
                if (attempt === 0) {
                  queueItem.metadataState = 'retrying';
                  renderAo3LinkQueue();
                  await new Promise(function(resolve) { setTimeout(resolve, 1250); });
                }
              }
            }
            if (lastError && stillQueued()) {
              queueItem.title = queueItem.title || fallbackTitle;
              queueItem.author = queueItem.author || '작가 정보 확인 실패';
              queueItem.metadataError = String(lastError.message || lastError).slice(0, 240);
              queueItem.metadataState = 'error';
            }
          } finally {
            queueItem._metadataInFlight = false;
            if (queueItem._metadataAbortController === metadataController) queueItem._metadataAbortController = null;
            if (stillQueued()) renderAo3LinkQueue();
          }
        }
        document.getElementById('ao3LinkQueueList').addEventListener('click', function(event) {
          const retryButton = event.target && event.target.closest ? event.target.closest('[data-retry-ao3-queue-item]') : null;
          if (retryButton) {
            const retryId = retryButton.getAttribute('data-retry-ao3-queue-item');
            const retryItem = (window._ao3LinkTranslationQueue || []).find(function(item) { return getAo3QueueItemId(item) === retryId; });
            if (retryItem && !retryItem._metadataInFlight) {
              retryItem.metadataState = 'loading';
              renderAo3LinkQueue();
              resolveAo3LinkQueueMetadata(retryItem);
            }
            return;
          }
          const button = event.target && event.target.closest ? event.target.closest('[data-remove-ao3-queue-item]') : null;
          if (!button) return;
          const id = button.getAttribute('data-remove-ao3-queue-item');
          const queue = window._ao3LinkTranslationQueue || [];
          const removedItem = queue.find(function(item) { return getAo3QueueItemId(item) === id; });
          if (!removedItem) return;
          if (removedItem._metadataAbortController) { try { removedItem._metadataAbortController.abort(); } catch (ignoreMetadataAbort) {} }
          window._ao3LinkTranslationQueue = queue.filter(function(item) { return getAo3QueueItemId(item) !== id; });
          renderAo3LinkQueue();
          showToast('대기열에서 작품을 삭제했습니다: ' + (removedItem.title || getAo3QueueItemUrl(removedItem)));
        });
        document.getElementById('clearAo3LinkQueueBtn').addEventListener('click', function() {
          (window._ao3LinkTranslationQueue || []).forEach(function(item) {
            if (item && item._metadataAbortController) { try { item._metadataAbortController.abort(); } catch (ignoreMetadataAbort) {} }
          });
          window._ao3LinkTranslationQueue = [];
          renderAo3LinkQueue();
          showToast('대기 중인 링크를 비웠습니다. 현재 번역은 계속됩니다.');
        });

        async function processAo3UrlSubmission(urlOverride) {
          const currentUrl = typeof urlOverride === 'string'
            ? urlOverride.trim()
            : document.getElementById('ao3UrlInput').value.trim();
          if (!currentUrl) throw new Error('AO3 챕터 링크를 입력해 주세요.');
          if (!extractAo3WorkInfo(currentUrl, false)) {
            throw new Error('archiveofourown.org 작품 링크(/works/번호), 챕터 링크 또는 컬렉션 안의 작품 링크를 입력해 주세요.');
          }

          const btn = document.getElementById('fetchAo3UrlBtn');
          btn.setAttribute('aria-busy', 'true');
          const logList = document.getElementById('ao3FetchLogList');
          if (logList) logList.innerHTML = '';

          const combinedParsed = {
            meta: { title: '', author: '', fandom: '' },
            chapters: []
          };
          const seenChapterFingerprints = new Set();
          appendFetchLog('챕터 링크를 여는 중…');
          try {
            const parsed = await fetchAndParseAo3Url(currentUrl, false, appendFetchLog);
            if (parsed && parsed.chapters && parsed.chapters.length > 0) {
              if (parsed.chapters.length > 1) parsed.chapters = parsed.chapters.slice(0, 1);
              if (parsed.meta) {
                ['title', 'author', 'fandom'].forEach(function(key) {
                  if (parsed.meta[key]) combinedParsed.meta[key] = parsed.meta[key];
                });
                if (window._ao3ActiveLinkItem) {
                  if (parsed.meta.title) window._ao3ActiveLinkItem.title = String(parsed.meta.title).trim();
                  if (parsed.meta.author) window._ao3ActiveLinkItem.author = String(parsed.meta.author).trim();
                  window._ao3ActiveLinkItem.metadataState = 'ready';
                  renderAo3LinkQueue();
                }
              }
              parsed.chapters.forEach(function(ch) {
                const sample = (ch.paragraphs || []).map(function(p) { return p.ko || p.en || ''; }).join(' ');
                const fingerprint = (ch.title || '').toLowerCase().replace(/\s+/g, ' ').trim() + '|' + sample.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 320);
                if (!seenChapterFingerprints.has(fingerprint)) {
                  seenChapterFingerprints.add(fingerprint);
                  combinedParsed.chapters.push(ch);
                }
              });
            }
          } catch (err) {
            if (err && err.message === 'LOCKED_WORK') {
              appendFetchLog('로그인 제한이 있는 챕터입니다.');
              throw new Error('로그인이 필요한 챕터라 자동으로 가져올 수 없습니다.');
            }
            const detail = err && err.message ? err.message : String(err || '알 수 없는 오류');
            appendFetchLog('본문을 가져오지 못했습니다: ' + detail);
            if (/adult_gate/i.test(detail)) {
              throw new Error('AO3 성인 콘텐츠 경고 화면만 반환되었습니다. Worker가 view_adult 동의 경로와 다운로드 경로를 다시 시도했지만 본문을 받지 못했습니다. AO3에서 작품을 직접 열어 성인 콘텐츠 안내가 해제되는지 확인해 주세요.');
            }
            if (/\blocked\b|registered users/i.test(detail)) {
              throw new Error('AO3가 이 작품을 로그인 사용자에게만 공개하고 있습니다. 로그인 전용 작품은 자동으로 가져올 수 없습니다.');
            }
            if (/\bcloudflare\b|cf-chl|Just a moment/i.test(detail)) {
              throw new Error('AO3 또는 프록시가 Cloudflare 확인 페이지를 반환했습니다. 잠시 후 다시 시도하거나 본문을 복사해 붙여넣어 주세요.');
            }
            if (/ALL_PROXIES_BLOCKED/i.test(detail)) {
              throw new Error('AO3 본문 추출 경로가 응답하지 않았습니다. 잠시 후 다시 시도하거나 AO3에서 본문을 복사해 붙여넣어 주세요. (' + detail.replace(/^ALL_PROXIES_BLOCKED:\s*/i, '') + ')');
            }
            throw new Error('본문을 가져오지 못했습니다. ' + detail);
          } finally {
            btn.removeAttribute('aria-busy');
          }

          if (combinedParsed.chapters.length === 0) {
            renderStudio();
            throw new Error('가져온 본문이 없어 이 링크의 번역을 완료하지 못했습니다.');
          }

          const savedNovel = await autoTranslateAndSaveWorkToBookshelf(combinedParsed, currentUrl);
          if (!savedNovel) throw new Error('번역 결과를 책장에 저장하지 못했습니다.');
          const pendingQueue = window._ao3LinkTranslationQueue || [];
          if (pendingQueue.length === 0) {
            showToast('"' + savedNovel.title + '" (' + savedNovel.author + ') 소설이 책장에 자동 저장되었습니다! 바로 열람하세요.');
          } else {
            showToast('"' + savedNovel.title + '" 저장 완료. 남은 대기 링크 ' + pendingQueue.length + '개를 계속 처리합니다.');
          }
          return savedNovel;
        }

        function normalizeAo3QueueUrl(url) {
          return String(url || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
        }

        async function drainAo3LinkTranslationQueue() {
          if (window._ao3LinkTranslationBusy) return;
          window._ao3LinkTranslationBusy = true;
          renderAo3LinkQueue();
          try {
            // Keep the busy lock for the entire drain loop. This closes the gap
            // where a newly submitted URL could start in parallel between links.
            while ((window._ao3LinkTranslationQueue || []).length > 0) {
              const nextItem = window._ao3LinkTranslationQueue.shift();
              // Metadata is only a UI preview. Stop its proxy requests before body extraction
              // begins so the same AO3 page is not fetched twice in parallel.
              if (nextItem && nextItem._metadataAbortController) {
                try { nextItem._metadataAbortController.abort(); } catch (ignoreMetadataAbort) {}
              }
              const nextUrl = getAo3QueueItemUrl(nextItem);
              window._ao3ActiveLinkItem = typeof nextItem === 'string' ? { url: nextUrl } : nextItem;
              window._ao3ActiveLinkUrl = nextUrl;
              renderAo3LinkQueue();
              try {
                await processAo3UrlSubmission(nextUrl);
              } catch (err) {
                // Report each failure, but do not strand the rest of the queue.
                showToast('이 링크를 처리하지 못했습니다. 다음 대기 링크로 진행합니다. ' +
                  (err && err.message ? err.message : String(err)), 'warning');
              }
              window._ao3ActiveLinkUrl = '';
              window._ao3ActiveLinkItem = null;
              renderAo3LinkQueue();
            }
          } finally {
            window._ao3ActiveLinkUrl = '';
            window._ao3ActiveLinkItem = null;
            window._ao3LinkTranslationBusy = false;
            renderAo3LinkQueue();
            // A link can be enqueued by an event as this worker finishes.
            if ((window._ao3LinkTranslationQueue || []).length > 0) {
              setTimeout(drainAo3LinkTranslationQueue, 0);
            }
          }
        }

        document.getElementById('fetchAo3UrlBtn').addEventListener('click', function() {
          const input = document.getElementById('ao3UrlInput');
          const url = input.value.trim();
          if (!url) { showToast('AO3 챕터 링크를 입력해 주세요.', 'warning'); return; }
          if (!extractAo3WorkInfo(url, false)) {
            showToast('archiveofourown.org 작품 링크(/works/번호), 챕터 링크 또는 컬렉션 안의 작품 링크를 입력해 주세요.', 'warning'); return;
          }
          const normalizedUrl = normalizeAo3QueueUrl(url);
          const activeUrl = normalizeAo3QueueUrl(window._ao3ActiveLinkUrl);
          const alreadyQueued = (window._ao3LinkTranslationQueue || []).some(function(item) {
            return normalizeAo3QueueUrl(getAo3QueueItemUrl(item)) === normalizedUrl;
          });
          if (normalizedUrl === activeUrl || alreadyQueued) {
            showToast('이 링크는 이미 번역 중이거나 대기열에 있습니다.', 'warning');
            return;
          }
          const needsMetadataLookup = !!window._ao3LinkTranslationBusy || (window._ao3LinkTranslationQueue || []).length > 0;
          const queueItem = {
            id: createAo3QueueItemId(),
            url: url,
            title: '',
            author: '',
            metadataState: needsMetadataLookup ? 'loading' : 'loading',
            addedAt: Date.now()
          };
          window._ao3LinkTranslationQueue.push(queueItem);
          input.value = '';
          renderAo3LinkQueue();
          if (needsMetadataLookup) resolveAo3LinkQueueMetadata(queueItem);
          if (window._ao3LinkTranslationBusy) {
            showToast('현재 챕터 처리가 끝나면 대기열 순서대로 자동 번역합니다. 대기열 ' + window._ao3LinkTranslationQueue.length + '번째');
          } else {
            showToast('링크를 대기열에 추가했습니다. 번역을 시작합니다.');
            drainAo3LinkTranslationQueue();
          }
        });

        // Paste one chapter from a login-gated AO3 page, translate it, and save to the bookshelf.
        document.getElementById('addPastedChapterBtn').addEventListener('click', async function() {
          const rawText = document.getElementById('pasteEnglishTextarea').value.trim();
          if (!rawText) {
            showToast('본문을 붙여넣어 주세요.', 'warning');
            document.getElementById('pasteEnglishTextarea').focus();
            return;
          }
          const workTitle = document.getElementById('pasteNovelTitleInput').value.trim();
          const author = document.getElementById('pasteNovelAuthorInput').value.trim();
          const customChapterTitle = document.getElementById('pasteChapterTitleInput').value.trim();
          const sourceUrl = document.getElementById('pasteSourceUrlInput').value.trim();
          const resetPasteFields = function() {
            document.getElementById('pasteEnglishTextarea').value = '';
            document.getElementById('pasteNovelTitleInput').value = '';
            document.getElementById('pasteNovelAuthorInput').value = '';
            document.getElementById('pasteChapterTitleInput').value = '';
            document.getElementById('pasteSourceUrlInput').value = '';
          };

          // Pasted AO3 page HTML can supply metadata; manually entered values take precedence.
          if (rawText.includes('<div') && (rawText.includes('userstuff') || rawText.includes('chapter-') || rawText.includes('<title'))) {
            const parsed = parseAo3HtmlDocument(rawText, sourceUrl);
            if (parsed && parsed.chapters && parsed.chapters.length > 0) {
              parsed.chapters = parsed.chapters.slice(0, 1);
              parsed.meta = parsed.meta || {};
              if (workTitle) parsed.meta.title = workTitle;
              if (author) parsed.meta.author = cleanAo3AuthorName(author);
              if (customChapterTitle && parsed.chapters[0]) parsed.chapters[0].title = customChapterTitle;
              if (sourceUrl && parsed.chapters[0]) parsed.chapters[0].sourceUrl = sourceUrl;
              resetPasteFields();
              const savedNovel = await autoTranslateAndSaveWorkToBookshelf(parsed, sourceUrl);
              if (savedNovel) {
                showToast('"' + savedNovel.title + '"이 책장에 저장되었습니다.');
              }
              return;
            }
          }

          // Plain text is treated as one chapter. Blank lines split paragraphs.
          let paragraphs = rawText.split(/\r?\n\s*\r?\n/).map(function(p) { return p.trim(); }).filter(Boolean);
          if (paragraphs.length <= 1 && /\r?\n/.test(rawText)) {
            paragraphs = rawText.split(/\r?\n/).map(function(p) { return p.trim(); }).filter(Boolean);
          }
          paragraphs = paragraphs.map(function(p) { return p.replace(/[ \t]+/g, ' ').trim(); }).filter(Boolean);
          if (!paragraphs.length) {
            showToast('본문을 인식하지 못했습니다.', 'warning');
            return;
          }
          const chapterTitle = customChapterTitle || 'Chapter 1';
          const inferredTitle = workTitle || customChapterTitle || paragraphs[0].slice(0, 42) || 'AO3 번역 소설';
          resetPasteFields();

          const savedNovel = await autoTranslateAndSaveWorkToBookshelf({
            meta: {
              title: inferredTitle,
              author: cleanAo3AuthorName(author) || 'AO3 Author',
              fandom: '',
              summary: ''
            },
            chapters: [{ title: chapterTitle, sourceUrl: sourceUrl, paragraphs: paragraphs }]
          }, sourceUrl);
          if (savedNovel) {
            showToast('"' + savedNovel.title + '"이 번역되어 책장에 저장되었습니다.');
          }
        });

        // Translate All Drafts & Clear Drafts
        document.getElementById('translateAllChaptersBtn').addEventListener('click', function() {
          runTranslateAllDrafts();
        });

        document.getElementById('clearDraftChaptersBtn').addEventListener('click', function() {
          state.draftChapters = [];
          renderStudio();
          showToast('대기열 챕터를 비웠습니다.');
        });

        // Quick preset tags in Studio
        document.querySelectorAll('.quick-tag-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const tag = btn.getAttribute('data-quick-tag');
            const inp = document.getElementById('studioBookmarkTagsInput');
            const current = inp.value.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
            if (!current.includes(tag)) {
              current.push(tag);
              inp.value = current.join(', ');
            }
          });
        });

        // Bind & Save Novel to Bookshelf
        document.getElementById('saveBoundNovelBtn').addEventListener('click', async function() {
          if (state.draftChapters.length === 0) {
            showToast('먼저 1개 이상의 챕터를 대기열에 추가해 주세요.', 'warning');
            return;
          }

          // Automatically translate any untranslated chapters before binding
          const hasUntranslated = state.draftChapters.some(function(ch) { return !ch.translated; });
          if (hasUntranslated) {
            window._ao3AutomaticTranslationJobBusy = true;
            let translationSucceeded = false;
            try {
              translationSucceeded = await runTranslateAllDrafts();
            } finally {
              window._ao3AutomaticTranslationJobBusy = false;
            }
            if (!translationSucceeded || state.draftChapters.some(function(ch) { return !ch.translated; })) return;
          }

          const chaptersCopy = state.draftChapters.map(function(ch) {
            return {
              id: 'ch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
              title: ch.title,
              sourceUrl: ch.sourceUrl || '',
              paragraphs: ch.paragraphs.map(function(p) {
                return {
                  id: p.id,
                  en: p.en,
                  ko: p.ko || p.en,
                  bookmarked: Boolean(p.bookmarked),
                  tags: Array.isArray(p.tags) ? p.tags.slice() : [],
                  note: p.note || ''
                };
              })
            };
          });

          const isBookmarked = document.getElementById('studioBookmarkCheck').checked;
          const rawTags = document.getElementById('studioBookmarkTagsInput').value
            .split(',')
            .map(function(t) { return t.replace(/^#+/, '').trim(); })
            .filter(Boolean);

          if (state.studioBindMode === 'append') {
            const targetId = document.getElementById('appendTargetNovelSelect').value;
            const targetNovel = state.novels.find(function(n) { return n.id === targetId; });
            if (!targetNovel) {
              showToast('이어붙일 대상 소설을 선택해 주세요.', 'warning');
              return;
            }
            targetNovel.chapters = (targetNovel.chapters || []).concat(chaptersCopy);
            if (isBookmarked) {
              targetNovel.bookmarked = true;
              rawTags.forEach(function(t) {
                if (!targetNovel.bookmarkTags.includes(t)) targetNovel.bookmarkTags.push(t);
              });
            }
            targetNovel.lastReadAt = Date.now();
            saveToStorage();
            state.draftChapters = [];
            document.getElementById('studioBookmarkCheck').checked = false;
            document.getElementById('studioBookmarkTagsInput').value = '';
            showToast('"' + targetNovel.title + '" 소설에 ' + chaptersCopy.length + '개 챕터를 이어붙였습니다!');
            openNovelInReader(targetNovel.id, targetNovel.chapters.length - chaptersCopy.length);
            return;
          }

          // New Novel Mode
          const title = document.getElementById('novelTitleInput').value.trim();
          if (!title) {
            showToast('소설 제목을 반드시 할당해 주세요.', 'warning');
            document.getElementById('novelTitleInput').focus();
            return;
          }

          const newNovel = {
            id: 'novel_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            title: title,
            author: cleanAo3AuthorName(document.getElementById('novelAuthorInput').value.trim()) || 'AO3 Author',
            fandom: document.getElementById('novelFandomInput').value.trim(),
            summary: document.getElementById('novelSummaryInput').value.trim(),
            bookmarked: isBookmarked,
            bookmarkTags: isBookmarked ? rawTags : [],
            bookmarkNote: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastReadAt: Date.now(),
            lastReadChapterIndex: 0,
            chapters: chaptersCopy
          };

          delete state.deletedNovelIds[newNovel.id];
          state.novels.unshift(newNovel);
          saveToStorage(newNovel.id);

          // Reset studio inputs
          state.draftChapters = [];
          document.getElementById('novelTitleInput').value = '';
          document.getElementById('novelAuthorInput').value = '';
          document.getElementById('novelFandomInput').value = '';
          document.getElementById('novelSummaryInput').value = '';
          document.getElementById('studioBookmarkTagsInput').value = '';
          document.getElementById('studioBookmarkCheck').checked = false;

          showToast('"' + newNovel.title + '" (총 ' + newNovel.chapters.length + '챕터) 소설이 책장에 저장되었습니다!');
          openNovelInReader(newNovel.id, 0);
        });

        // 소설 단위 북마크 탭은 제거하고 저장한 문장만 표시합니다.
        // Reader Controls
        document.getElementById('readerBackToShelfBtn').addEventListener('click', function() {
          switchView('bookshelf');
        });

        document.getElementById('readerChapterSelect').addEventListener('change', function(e) {
          state.reader.chapterIndex = Number(e.target.value);
          renderReader();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        document.getElementById('readerDeleteChapterBtn').addEventListener('click', function() {
          openDeleteChapterModal();
        });
        document.getElementById('readerRenameChapterBtn').addEventListener('click', openRenameChapterModal);
        document.getElementById('closeRenameChapterModalBtn').addEventListener('click', closeRenameChapterModal);
        document.getElementById('cancelRenameChapterModalBtn').addEventListener('click', closeRenameChapterModal);
        document.getElementById('saveRenameChapterModalBtn').addEventListener('click', saveRenameChapterModal);
        document.getElementById('renameChapterTitleInput').addEventListener('keydown', function(event) {
          if (event.key === 'Enter') { event.preventDefault(); saveRenameChapterModal(); }
        });
        const renameChapterModal = document.getElementById('renameChapterModal');
        renameChapterModal.addEventListener('keydown', function(event) {
          if (event.key === 'Escape') { event.preventDefault(); closeRenameChapterModal(); }
        });
        renameChapterModal.addEventListener('click', function(event) {
          if (event.target === event.currentTarget) closeRenameChapterModal();
        });

        function stepChapter(delta) {
          const novel = state.novels.find(function(n) { return n.id === state.reader.novelId; });
          if (!novel) return;
          const nextIdx = state.reader.chapterIndex + delta;
          if (nextIdx >= 0 && nextIdx < novel.chapters.length) {
            state.reader.chapterIndex = nextIdx;
            renderReader();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }

        document.getElementById('readerPrevChapterBtn').addEventListener('click', function() { stepChapter(-1); });
        document.getElementById('readerNextChapterBtn').addEventListener('click', function() { stepChapter(1); });
        document.getElementById('readerBottomPrevBtn').addEventListener('click', function() { stepChapter(-1); });
        document.getElementById('readerBottomNextBtn').addEventListener('click', function() { stepChapter(1); });

        document.getElementById('readerToggleDisplayPanelBtn').addEventListener('click', function() {
          document.getElementById('readerDisplayDrawer').classList.toggle('hidden');
        });

        // Reading focus: hide the reader toolbar on downward scroll on all devices.
        // On phones only, also collapse the app navigation; scrolling up reveals it again.
        (function setupReaderToolbarScrollBehavior() {
          let lastY = window.scrollY || 0;
          let scheduled = false;
          const bar = document.getElementById('readerControlsBar');
          const appHeader = document.querySelector('body > header');
          if (!bar) return;
          window.addEventListener('scroll', function() {
            if (scheduled) return;
            scheduled = true;
            window.requestAnimationFrame(function() {
              const y = window.scrollY || 0;
              const delta = y - lastY;
              const isMobile = window.matchMedia ? window.matchMedia('(max-width: 640px)').matches : window.innerWidth <= 640;
              if (state.currentView === 'reader') {
                if (y < 100 || delta < -6) {
                  bar.classList.remove('reader-controls-hidden');
                  if (isMobile && appHeader) {
                    appHeader.classList.remove('reader-app-header-hidden');
                    document.documentElement.classList.remove('reader-app-header-hidden');
                  }
                } else if (delta > 6 && y > 100) {
                  bar.classList.add('reader-controls-hidden');
                  document.getElementById('readerDisplayDrawer').classList.add('hidden');
                  if (isMobile && appHeader) {
                    appHeader.classList.add('reader-app-header-hidden');
                    document.documentElement.classList.add('reader-app-header-hidden');
                  }
                }
              } else {
                bar.classList.remove('reader-controls-hidden');
                if (appHeader) appHeader.classList.remove('reader-app-header-hidden');
                document.documentElement.classList.remove('reader-app-header-hidden');
              }
              lastY = y;
              scheduled = false;
            });
          }, { passive: true });
        })();

        const originalDialogueToggle = document.getElementById('readerOriginalDialogueToggle');
        if (originalDialogueToggle) originalDialogueToggle.addEventListener('change', function(event) {
          state.reader.showOriginalDialogue = event.target.checked === true;
          saveReaderPreferences();
          if (state.currentView === 'reader') renderReader();
        });

        document.getElementById('readerFontFamilySelect').addEventListener('change', function(event) {
          state.reader.fontFamily = ['noto', 'plex', 'gothic', 'pretendard'].includes(event.target.value) ? event.target.value : 'noto';
          saveReaderPreferences();
          renderReader();
        });

        document.getElementById('readerFontWeightSelect').addEventListener('change', function(event) {
          const selectedWeight = Number(event.target.value);
          state.reader.fontWeight = [300, 400, 500].includes(selectedWeight) ? selectedWeight : 400;
          saveReaderPreferences();
          renderReader();
        });

        [
          { key: 'horizontalPadding', label: 'readerHorizontalPaddingLabel', min: 20, max: 30, step: 1 },
          { key: 'lineHeightPx', label: 'readerLineHeightLabel', min: 10, max: 25, step: 1 },
          { key: 'paragraphSpacingPx', label: 'readerParagraphSpacingLabel', min: 2, max: 10, step: 1 },
          { key: 'firstLineIndentPx', label: 'readerFirstLineIndentLabel', min: 0, max: 10, step: 1 }
        ].forEach(function(control) {
          ['Minus', 'Plus'].forEach(function(suffix) {
            const button = document.getElementById('readerSpacing' + ({
              horizontalPadding: 'HorizontalPadding',
              lineHeightPx: 'LineHeight',
              paragraphSpacingPx: 'ParagraphSpacing',
              firstLineIndentPx: 'FirstLineIndent'
            })[control.key] + suffix);
            if (!button) return;
            button.addEventListener('click', function() {
              const delta = suffix === 'Plus' ? control.step : -control.step;
              state.reader[control.key] = Math.max(control.min, Math.min(control.max, Number(state.reader[control.key]) + delta));
              const label = document.getElementById(control.label);
              if (label) label.textContent = state.reader[control.key] + 'px';
              const value = button.parentElement.querySelector('.reader-spacing-value');
              if (value) value.textContent = state.reader[control.key] + 'px';
              const contentInner = document.getElementById('readerContentInner');
              const paragraphs = document.getElementById('readerParagraphsContainer');
              if (contentInner) contentInner.style.setProperty('--reader-horizontal-padding', state.reader.horizontalPadding + 'px');
              if (paragraphs) {
                paragraphs.style.setProperty('--reader-line-height', state.reader.lineHeightPx + 'px');
                paragraphs.style.setProperty('--reader-paragraph-spacing', state.reader.paragraphSpacingPx + 'px');
                paragraphs.style.setProperty('--reader-first-line-indent', state.reader.firstLineIndentPx + 'px');
              }
              button.disabled = (suffix === 'Minus' && state.reader[control.key] <= control.min)
                || (suffix === 'Plus' && state.reader[control.key] >= control.max);
              const other = document.getElementById('readerSpacing' + ({
                horizontalPadding: 'HorizontalPadding',
                lineHeightPx: 'LineHeight',
                paragraphSpacingPx: 'ParagraphSpacing',
                firstLineIndentPx: 'FirstLineIndent'
              })[control.key] + (suffix === 'Minus' ? 'Plus' : 'Minus'));
              if (other) other.disabled = (suffix === 'Minus' && state.reader[control.key] >= control.max)
                || (suffix === 'Plus' && state.reader[control.key] <= control.min);
              saveReaderPreferences();
            });
          });
        });

        document.getElementById('readerFontSmallerBtn').addEventListener('click', function() {
          state.reader.fontSize = Math.max(8, state.reader.fontSize - 1);
          saveReaderPreferences();
          renderReader();
        });

        document.getElementById('readerFontLargerBtn').addEventListener('click', function() {
          state.reader.fontSize = Math.min(26, state.reader.fontSize + 1);
          saveReaderPreferences();
          renderReader();
        });

        document.getElementById('readerNovelBookmarkBtn').addEventListener('click', function() {
          if (state.reader.novelId) openBookmarkModalForNovel(state.reader.novelId);
        });
        // Bookmark Modal Events
        document.getElementById('closeBookmarkModalBtn').addEventListener('click', function() {
          document.getElementById('bookmarkModal').classList.add('hidden');
        });
        document.getElementById('cancelBookmarkModalBtn').addEventListener('click', function() {
          document.getElementById('bookmarkModal').classList.add('hidden');
        });
        document.getElementById('modalAddTagBtn').addEventListener('click', addTagFromModalInput);
        document.getElementById('modalBookmarkTagInput').addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            addTagFromModalInput();
          }
        });
        document.getElementById('saveBookmarkModalBtn').addEventListener('click', saveBookmarkModalChanges);

        // Edit Novel Modal Events
        document.getElementById('closeEditNovelModalBtn').addEventListener('click', function() {
          document.getElementById('editNovelModal').classList.add('hidden');
        });
        document.getElementById('cancelEditNovelModalBtn').addEventListener('click', function() {
          document.getElementById('editNovelModal').classList.add('hidden');
        });
        document.getElementById('saveEditNovelModalBtn').addEventListener('click', saveEditNovelModal);

        // Delete Confirm Modal Events
        document.getElementById('cancelDeleteModalBtn').addEventListener('click', function() {
          document.getElementById('deleteConfirmModal').classList.add('hidden');
        });
        document.getElementById('confirmDeleteModalBtn').addEventListener('click', confirmDeleteAction);

        function syncSettingsEngineBoxes(engineVal) {
          // Keep all automatic fallback provider fields visible.
          ['geminiApiKeyBox', 'workersAiApiBox', 'groqApiKeyBox', 'azureApiKeyBox'].forEach(function(id) {
            const box = document.getElementById(id);
            if (box) box.classList.remove('hidden');
          });
        }


        async function testPromptProviderConnection(provider, keyInputId, modelInputId, statusId, buttonId, endpoint) {
          await refreshCloudflareProviderConfig();
          const button = document.getElementById(buttonId);
          const status = document.getElementById(statusId);
          const apiKey = document.getElementById(keyInputId).value.trim();
          const serverSecretAvailable = endpoint === 'groq-translate' && Boolean(window._ao3CloudflareServerProviders.groq);
          const model = document.getElementById(modelInputId).value.trim();
          if (!apiKey && !serverSecretAvailable) {
            status.className = 'text-xs text-rose-700';
            status.textContent = 'API 키를 입력하거나 Cloudflare Secret GROQ_API_KEY를 설정하세요.';
            document.getElementById(keyInputId).focus();
            return;
          }
          if (!model) {
            status.className = 'text-xs text-rose-700';
            status.textContent = '모델 ID를 입력하세요.';
            document.getElementById(modelInputId).focus();
            return;
          }
          button.disabled = true;
          const originalLabel = button.textContent;
          button.textContent = '테스트 중…';
          status.className = 'text-xs text-slate-700';
          status.textContent = provider + '에 테스트 문장을 보내고 있습니다.';
          try {
            const response = await fetch(ao3FunctionUrl(endpoint), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                apiKey: apiKey,
                model: model,
                texts: ['Hello. This is a short novel translation connection test.'],
                prompt: '영어를 자연스러운 한국어 소설체로 번역한다. 번역문만 출력한다.',
                glossary: '', fandom: '', prevContext: ''
              })
            });
            const payload = await response.json().catch(function() { return null; });
            if (response.ok && payload && Array.isArray(payload.translations) && payload.translations[0]) {
              status.className = 'text-xs text-emerald-800 font-semibold';
              status.textContent = '연결 성공 · ' + payload.translations[0].slice(0, 160);
            } else {
              const detail = payload && (payload.message || payload.error || payload.detail) || ('HTTP ' + response.status);
              status.className = 'text-xs text-rose-700';
              status.textContent = '연결 실패 · HTTP ' + response.status + ' · ' + String(detail).slice(0, 220);
            }
          } catch (error) {
            status.className = 'text-xs text-rose-700';
            status.textContent = '요청 실패 · Cloudflare Worker 배포와 네트워크를 확인하세요: ' + String(error && error.message || error).slice(0, 180);
          } finally {
            button.disabled = false;
            button.textContent = originalLabel;
          }
        }

        document.getElementById('testGroqConnectionBtn').addEventListener('click', function() {
          testPromptProviderConnection('Groq', 'groqApiKeyInput', 'groqModelInput', 'groqTestStatus', 'testGroqConnectionBtn', 'groq-translate');
        });
        document.getElementById('testWorkersAiConnectionBtn').addEventListener('click', async function() {
          const button = this;
          const status = document.getElementById('workersAiTestStatus');
          const model = document.getElementById('workersAiModelInput').value || '@cf/zai-org/glm-4.7-flash';
          await refreshCloudflareProviderConfig(true);
          if (!window._ao3CloudflareServerProviders.workersAI) {
            status.className = 'text-xs text-rose-700';
            status.textContent = 'Workers AI 바인딩을 찾을 수 없습니다. wrangler.jsonc에 "ai": { "binding": "AI" }를 추가하고 재배포하세요.';
            return;
          }
          button.disabled = true;
          const originalLabel = button.textContent;
          button.textContent = '테스트 중…';
          status.className = 'text-xs text-violet-900/80';
          status.textContent = 'Workers AI에 테스트 문장을 보내고 있습니다.';
          try {
            const response = await fetch(ao3FunctionUrl('workers-ai-translate'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: model,
                texts: ['Hello. This is a short novel translation connection test.'],
                prompt: '영어를 자연스러운 한국어 소설체로 번역한다. 번역문만 출력한다.',
                fandom: '', prevContext: ''
              })
            });
            const payload = await response.json().catch(function() { return null; });
            if (response.ok && payload && Array.isArray(payload.translations) && payload.translations[0]) {
              status.className = 'text-xs text-emerald-800 font-semibold';
              status.textContent = '연결 성공 · ' + payload.translations[0].slice(0, 160);
            } else {
              const detail = payload && (payload.message || payload.error || payload.detail) || ('HTTP ' + response.status);
              status.className = 'text-xs text-rose-700';
              status.textContent = '연결 실패 · HTTP ' + response.status + ' · ' + String(detail).slice(0, 220);
            }
          } catch (error) {
            status.className = 'text-xs text-rose-700';
            status.textContent = '요청 실패 · Worker 배포/네트워크 확인: ' + String(error && error.message || error).slice(0, 180);
          } finally {
            button.disabled = false;
            button.textContent = originalLabel;
          }
        });
// Azure connection test: uses current form values, does not require saving first.
        document.getElementById('testAzureConnectionBtn').addEventListener('click', async function() {
          await refreshCloudflareProviderConfig();
          const button = this;
          const key = document.getElementById('azureApiKeyInput').value.trim();
          const azureServerSecretAvailable = Boolean(window._ao3CloudflareServerProviders.azure);
          const region = document.getElementById('azureRegionInput').value.trim();
          const status = document.getElementById('azureTestStatus');
          if (!key && !azureServerSecretAvailable) {
            status.className = 'text-xs text-rose-700';
            status.textContent = 'Azure 키를 입력하거나 Cloudflare Secret AZURE_TRANSLATOR_KEY를 설정하세요.';
            document.getElementById('azureApiKeyInput').focus();
            return;
          }
          button.disabled = true;
          button.textContent = '테스트 중…';
          status.className = 'text-xs text-blue-900/80';
          status.textContent = 'Azure에 테스트 문장을 보내고 있습니다.';
          try {
            const response = await fetch(ao3FunctionUrl('azure-translate'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                apiKey: key,
                region: region,
                texts: ['Hello. This is a short Azure Translator connection test.']
              })
            });
            const rawBody = await response.text();
            let payload = null;
            try { payload = rawBody ? JSON.parse(rawBody) : null; } catch (ignoreJson) {}
            const upstreamStatus = response.headers.get('X-Azure-Upstream-Status');
            const upstreamErrorCode = response.headers.get('X-Azure-Error-Code');
            if (response.ok && Array.isArray(payload) && payload[0] && payload[0].translations && payload[0].translations[0]) {
              status.className = 'text-xs text-emerald-800 font-semibold';
              status.textContent = '연결 성공 · 번역 결과: ' + payload[0].translations[0].text;
            } else {
              const apiError = payload && payload.error;
              const detail = (apiError && (apiError.message || apiError.code)) || (payload && (payload.detail || payload.message || payload.error)) || rawBody || '상세 오류 메시지가 없습니다.';
              status.className = 'text-xs text-rose-700';
              if (response.status === 429) {
                status.textContent = '요청 제한(429)' + (upstreamStatus ? ' · Azure 응답 ' + upstreamStatus : '') + (upstreamErrorCode ? ' · 코드 ' + upstreamErrorCode : '') + ' · ' + String(detail).slice(0, 260) + ' · Azure 사용량/계층을 확인하세요.';
              } else if (response.status === 401 || response.status === 403) {
                status.textContent = '인증/권한 오류(HTTP ' + response.status + ')' + (upstreamStatus ? ' · Azure 응답 ' + upstreamStatus : '') + (upstreamErrorCode ? ' · 코드 ' + upstreamErrorCode : '') + ' · 키와 리전을 확인하세요. ' + String(detail).slice(0, 220);
              } else if (response.status === 404 && !upstreamStatus) {
                status.textContent = '번역 API 서버 404 · Cloudflare Worker의 /api/azure-translate 경로와 배포 상태를 확인하세요.';
              } else {
                status.textContent = '연결 실패(HTTP ' + response.status + ')' + (upstreamStatus ? ' · Azure 응답 ' + upstreamStatus : '') + (upstreamErrorCode ? ' · 코드 ' + upstreamErrorCode : '') + ' · ' + String(detail).slice(0, 260);
              }
            }
          } catch (error) {
            status.className = 'text-xs text-rose-700';
            status.textContent = '요청 실패 · 네트워크 또는 Cloudflare Worker 배포를 확인하세요: ' + String(error && error.message ? error.message : error).slice(0, 180);
          } finally {
            button.disabled = false;
            button.textContent = 'Azure 연결 테스트';
          }
        });

        // Apply provider-settings contrast at runtime, including dynamically updated status text.
        // The same palette is applied on initial load, modal open, and app-theme changes.
        function applySettingsDarkPalette() {
          const isDark = document.documentElement.getAttribute('data-app-theme') === 'dark';
          const rules = [
            ['#settingsModal > div, #apiSettingsModal > div', { 'background-color': '#111a2b', color: '#f1f5fb', 'border-color': '#34435b' }],
            ['#workersAiApiBox', { 'background-color': '#2b2343', color: '#e8ddff', 'border-color': '#5a4b80' }],
            ['#groqApiKeyBox', { 'background-color': '#3b2a20', color: '#ffe6d1', 'border-color': '#76553d' }],
            ['#azureApiKeyBox', { 'background-color': '#1a2f49', color: '#deebff', 'border-color': '#3b5d81' }],
            ['#workersAiApiBox > label, #groqApiKeyBox > label, #apiSettingsModal [class~="bg-white/80"]', { 'background-color': '#202c40', color: '#f1f5fb', 'border-color': '#52627a' }],
            ['#workersAiApiBox [class~="text-violet-950"], #workersAiApiBox label[for="workersAiModelInput"]', { color: '#e8ddff' }],
            ['#workersAiApiBox [class~="text-violet-900/80"]', { color: '#d5c8f7' }],
            ['#groqApiKeyBox [class~="text-orange-950"], #groqApiKeyBox label', { color: '#ffe6d1' }],
            ['#groqApiKeyBox [class~="text-orange-900/80"]', { color: '#ffd2b0' }],
            ['#azureApiKeyBox [class~="text-blue-950"], #azureApiKeyBox label', { color: '#deebff' }],
            ['#azureApiKeyBox [class~="text-blue-900/80"]', { color: '#c9def9' }],
            ['#workersAiTestStatus', { color: '#e8ddff' }],
            ['#groqTestStatus', { color: '#ffe1c7' }],
            ['#azureTestStatus', { color: '#deebff' }],
            ['#settingsModal [class~="text-slate-500"], #settingsModal [class~="text-slate-600"], #settingsModal [class~="text-slate-700"], #settingsModal [class~="text-slate-800"], #settingsModal [class~="text-slate-900"]', { color: '#d3dceb' }]
          ];
          for (const [selector, props] of rules) {
            let elements = [];
            try { elements = document.querySelectorAll(selector); } catch (_) { continue; }
            elements.forEach(el => {
              for (const [property, value] of Object.entries(props)) {
                if (isDark) el.style.setProperty(property, value, 'important');
                else el.style.removeProperty(property);
              }
            });
          }
        }

        // App-wide color theme (dark by default, with an explicit persistent light option).
        function syncAppThemeButtons() {
          const current = document.documentElement.getAttribute('data-app-theme');
          const theme = ['light', 'green'].includes(current) ? current : 'dark';
          const darkBtn = document.getElementById('appThemeDarkBtn');
          const lightBtn = document.getElementById('appThemeLightBtn');
          const greenBtn = document.getElementById('appThemeGreenBtn');
          if (darkBtn) darkBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
          if (lightBtn) lightBtn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
          if (greenBtn) greenBtn.setAttribute('aria-pressed', theme === 'green' ? 'true' : 'false');
        }
        function setAppTheme(theme, announce) {
          const next = ['light', 'green'].includes(theme) ? theme : 'dark';
          document.documentElement.setAttribute('data-app-theme', next);
          document.documentElement.style.colorScheme = next;
          const themeMeta = document.getElementById('ao3ThemeColorMeta');
          if (themeMeta) themeMeta.setAttribute('content', next === 'green' ? '#bcd6c1' : (next === 'light' ? '#f1f5f9' : '#0d1525'));
          try { localStorage.setItem('ao3-app-theme', next); } catch (e) {}
          scheduleDriveUserPreferencesSync();
          syncAppThemeButtons();
          applySettingsDarkPalette();
          if (typeof window.ensureAlwaysVisibleAo3Queue === 'function') window.ensureAlwaysVisibleAo3Queue();
          if (typeof renderReader === 'function' && state && state.reader && state.reader.novelId) renderReader();
          if (announce && typeof showToast === 'function') showToast(({dark:'다크모드',light:'라이트모드',green:'그린모드'})[next] + '를 적용했습니다.');
        }
        document.getElementById('appThemeDarkBtn').addEventListener('click', function() { setAppTheme('dark', true); });
        document.getElementById('appThemeLightBtn').addEventListener('click', function() { setAppTheme('light', true); });
        document.getElementById('appThemeGreenBtn').addEventListener('click', function() { setAppTheme('green', true); });
        syncAppThemeButtons();
        applySettingsDarkPalette();

        // General translation settings modal (theme, prompt, additional prompt, replacements).
        function populateGeneralSettingsModal() {
          document.getElementById('translationPromptTextarea').value = state.settings.translationPrompt || DEFAULT_TRANSLATION_PROMPT;
          document.getElementById('glossaryTextarea').value = state.settings.textReplacements || '';
          document.getElementById('characterStyleRulesTextarea').value = state.settings.characterStyleRules || '';
          syncAppThemeButtons();
        }
        function populateApiSettingsModal() {
          const engineVal = 'gemini_api';
          document.getElementById('translationEngineSelect').value = engineVal;
          document.getElementById('geminiModelSelect').value = state.settings.geminiModel || DEFAULT_GEMINI_MODEL;
          document.getElementById('geminiApiKeysInput').value = state.settings.geminiApiKeys || state.settings.geminiApiKey || '';
          document.getElementById('geminiCooldownEnabledInput').checked = state.settings.geminiCooldownEnabled !== false;
          document.getElementById('qualityParagraphCountEnabledInput').checked = state.settings.qualityParagraphCountEnabled !== false;
          document.getElementById('qualityEnglishResidueEnabledInput').checked = state.settings.qualityEnglishResidueEnabled !== false;
          document.getElementById('azureApiKeyInput').value = state.settings.azureApiKey || '';
          document.getElementById('azureRegionInput').value = state.settings.azureRegion || '';
          document.getElementById('azureAutoEnabledInput').checked = state.settings.azureEnabled !== false;
          const azureQuotaTierInput = document.getElementById('azureQuotaTierInput');
          if (azureQuotaTierInput) azureQuotaTierInput.value = state.settings.azureQuotaTier || 'unknown';
          document.getElementById('groqApiKeyInput').value = state.settings.groqApiKey || '';
          document.getElementById('groqModelInput').value = state.settings.groqModel || 'openai/gpt-oss-120b';
          document.getElementById('groqAutoEnabledInput').checked = state.settings.groqEnabled !== false;
          document.getElementById('workersAiAutoEnabledInput').checked = state.settings.workersAiEnabled !== false;
          document.getElementById('workersAiModelInput').value = state.settings.workersAiModel || '@cf/zai-org/glm-4.7-flash';
          syncSettingsEngineBoxes(engineVal);
          ao3NormalizeGeminiKeyLists(); ao3RenderGeminiKeyListManager();
          ao3RefreshGeminiCooldownPanel();
        }
        function setApiSettingsTab(tab) {
          const showCooldown = tab === 'gemini-cooldown';
          const showQuality = tab === 'translation-quality';
          const showKeyLists = tab === 'gemini-key-lists';
          const mainPane = document.getElementById('apiSettingsMainTabPane');
          const cooldownPane = document.getElementById('geminiCooldownTabPane');
          const qualityPane = document.getElementById('translationQualityTabPane');
          const keyListsPane = document.getElementById('geminiKeyListsTabPane');
          const mainButton = document.getElementById('apiSettingsMainTabBtn');
          const cooldownButton = document.getElementById('geminiCooldownTabBtn');
          const qualityButton = document.getElementById('translationQualityTabBtn');
          const keyListsButton = document.getElementById('geminiKeyListsTabBtn');
          if (mainPane) mainPane.classList.toggle('hidden', showCooldown || showQuality || showKeyLists);
          if (cooldownPane) cooldownPane.classList.toggle('hidden', !showCooldown);
          if (qualityPane) qualityPane.classList.toggle('hidden', !showQuality);
          if (keyListsPane) keyListsPane.classList.toggle('hidden', !showKeyLists);
          [[mainButton, !showCooldown && !showQuality && !showKeyLists], [cooldownButton, showCooldown], [qualityButton, showQuality], [keyListsButton, showKeyLists]].forEach(function(pair) {
            const button = pair[0], active = pair[1];
            if (!button) return;
            button.setAttribute('aria-selected', String(active));
            button.className = 'flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ' + (active ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50');
          });
          if (showCooldown) ao3RefreshGeminiCooldownPanel();
          if (showKeyLists) ao3RenderGeminiKeyListManager();
          window._ao3ActiveApiSettingsTab = showCooldown ? 'gemini-cooldown' : (showQuality ? 'translation-quality' : (showKeyLists ? 'gemini-key-lists' : 'main'));
        }
        const apiMainTabButton = document.getElementById('apiSettingsMainTabBtn');
        const geminiCooldownTabButton = document.getElementById('geminiCooldownTabBtn');
        const translationQualityTabButton = document.getElementById('translationQualityTabBtn');
        const geminiKeyListsTabButton = document.getElementById('geminiKeyListsTabBtn');
        if (apiMainTabButton) apiMainTabButton.addEventListener('click', function() { setApiSettingsTab('main'); });
        if (geminiCooldownTabButton) geminiCooldownTabButton.addEventListener('click', function() { setApiSettingsTab('gemini-cooldown'); });
        if (translationQualityTabButton) translationQualityTabButton.addEventListener('click', function() { setApiSettingsTab('translation-quality'); });
        if (geminiKeyListsTabButton) geminiKeyListsTabButton.addEventListener('click', function() { setApiSettingsTab('gemini-key-lists'); });
        const geminiKeyListSelect = document.getElementById('geminiKeyListSelect');
        if (geminiKeyListSelect) geminiKeyListSelect.addEventListener('change', function() {
          const nextId = geminiKeyListSelect.value;
          const previousId = window._ao3GeminiEditingListId || state.settings.activeGeminiKeyListId;
          if (previousId && previousId !== nextId) {
            const previousList = (state.settings.geminiKeyLists || []).find(function(item) { return item.id === previousId; });
            ao3WriteGeminiKeyListInputsToList(previousList);
          }
          state.settings.activeGeminiKeyListId = nextId;
          ao3NormalizeGeminiKeyLists(); saveSettingsToStorage(); syncSettingsDriveVaultBackup();
          ao3RenderGeminiKeyListManager();
          const apiKeysInput = document.getElementById('geminiApiKeysInput'); if (apiKeysInput) apiKeysInput.value = state.settings.geminiApiKeys;
          ao3RefreshProviderQuotaDashboard(); ao3RefreshGeminiCooldownPanel();
        });
        const saveGeminiKeyListBtn = document.getElementById('saveGeminiKeyListBtn');
        if (saveGeminiKeyListBtn) saveGeminiKeyListBtn.addEventListener('click', function() { ao3SaveActiveGeminiKeyListFromInputs(false); });
        const createGeminiKeyListBtn = document.getElementById('createGeminiKeyListBtn');
        if (createGeminiKeyListBtn) createGeminiKeyListBtn.addEventListener('click', function() {
          ao3SaveActiveGeminiKeyListFromInputs(true);
          const id = 'gemini-list-' + Date.now().toString(36);
          state.settings.geminiKeyLists.push({ id: id, name: '새 키 목록', keys: [] }); state.settings.activeGeminiKeyListId = id;
          ao3NormalizeGeminiKeyLists(); saveSettingsToStorage(); syncSettingsDriveVaultBackup(); ao3RenderGeminiKeyListManager();
          const nameInput = document.getElementById('geminiKeyListNameInput'); if (nameInput) { nameInput.focus(); nameInput.select(); }
          showToast('새 키 목록을 만들었습니다. 이름과 키를 입력한 뒤 저장하세요.');
        });
        const deleteGeminiKeyListBtn = document.getElementById('deleteGeminiKeyListBtn');
        if (deleteGeminiKeyListBtn) deleteGeminiKeyListBtn.addEventListener('click', function() {
          const active = ao3ActiveGeminiKeyList(); if (!active) return;
          if (state.settings.geminiKeyLists.length <= 1) { showToast('마지막 키 목록은 삭제할 수 없습니다.', 'warning'); return; }
          if (!window.confirm('“' + active.name + '” 목록을 삭제할까요? API 키는 이 목록에서만 제거됩니다.')) return;
          state.settings.geminiKeyLists = state.settings.geminiKeyLists.filter(function(item) { return item.id !== active.id; }); state.settings.activeGeminiKeyListId = state.settings.geminiKeyLists[0].id;
          ao3NormalizeGeminiKeyLists(); saveSettingsToStorage(); syncSettingsDriveVaultBackup(); ao3RenderGeminiKeyListManager();
          const apiKeysInput = document.getElementById('geminiApiKeysInput'); if (apiKeysInput) apiKeysInput.value = state.settings.geminiApiKeys;
          ao3RefreshProviderQuotaDashboard(); ao3RefreshGeminiCooldownPanel(); showToast('키 목록을 삭제했습니다.');
        });
        const geminiCooldownEnabledInput = document.getElementById('geminiCooldownEnabledInput');
        if (geminiCooldownEnabledInput) geminiCooldownEnabledInput.addEventListener('change', function() {
          state.settings.geminiCooldownEnabled = geminiCooldownEnabledInput.checked;
          saveSettingsToStorage();
          syncSettingsDriveVaultBackup();
          ao3RefreshGeminiCooldownPanel();
          showToast(geminiCooldownEnabledInput.checked ? 'Gemini 키 냉각을 켰습니다.' : 'Gemini 키 냉각을 껐습니다. 429 키를 자동 제외하지 않습니다.');
        });
        [['qualityParagraphCountEnabledInput', 'qualityParagraphCountEnabled', '응답 문단 수 일치 검사'], ['qualityEnglishResidueEnabledInput', 'qualityEnglishResidueEnabled', '영어 원문 잔존 검사']].forEach(function(item) {
          const control = document.getElementById(item[0]);
          if (!control) return;
          control.addEventListener('change', function() {
            state.settings[item[1]] = control.checked;
            saveSettingsToStorage();
            syncSettingsDriveVaultBackup();
            showToast(item[2] + (control.checked ? '를 켰습니다.' : '를 껐습니다.'));
          });
        });
        const geminiKeysControl = document.getElementById('geminiApiKeysInput');
        const geminiModelControl = document.getElementById('geminiModelSelect');
        if (geminiKeysControl) geminiKeysControl.addEventListener('input', ao3RefreshGeminiCooldownPanel);
        if (geminiModelControl) geminiModelControl.addEventListener('change', ao3RefreshGeminiCooldownPanel);
        document.getElementById('translationEngineSelect').addEventListener('change', function(e) {
          syncSettingsEngineBoxes(e.target.value);
        });
        const quotaRefreshButton = document.getElementById('refreshProviderQuotaBtn');
        if (quotaRefreshButton) quotaRefreshButton.addEventListener('click', ao3RefreshProviderQuotaDashboard);
        const azureQuotaTierControl = document.getElementById('azureQuotaTierInput');
        if (azureQuotaTierControl) azureQuotaTierControl.addEventListener('change', ao3RefreshProviderQuotaDashboard);
        window.setInterval(function() {
          const apiModal = document.getElementById('apiSettingsModal');
          if (apiModal && !apiModal.classList.contains('hidden')) ao3RefreshGeminiCooldownPanel();
        }, 1000);
        window.setInterval(function() {
          const quotaModal = document.getElementById('apiSettingsModal');
          if (quotaModal && !quotaModal.classList.contains('hidden')) ao3RefreshProviderQuotaDashboard();
        }, 30000);
        document.addEventListener('visibilitychange', function() {
          if (!document.hidden) {
            const quotaModal = document.getElementById('apiSettingsModal');
            if (quotaModal && !quotaModal.classList.contains('hidden')) { ao3RefreshProviderQuotaDashboard(); ao3RefreshGeminiCooldownPanel(); }
          }
        });
        document.getElementById('resetDefaultPromptBtn').addEventListener('click', function() {
          document.getElementById('translationPromptTextarea').value = DEFAULT_TRANSLATION_PROMPT;
          showToast('기본 소설 번역 프롬프트가 복원되었습니다.');
        });
        document.getElementById('closeSettingsModalBtn').addEventListener('click', function() {
          document.getElementById('settingsModal').classList.add('hidden');
        });
        document.getElementById('closeApiSettingsModalBtn').addEventListener('click', function() {
          document.getElementById('apiSettingsModal').classList.add('hidden');
        });
        function syncSettingsDriveVaultBackup() {
          try {
            const vaultPassphrase = sessionStorage.getItem(DRIVE_SETTINGS_VAULT_SESSION_KEY) || '';
            if (vaultPassphrase && isDriveTokenValid()) {
              if (state.currentView === 'bookshelf') {
                saveEncryptedSettingsToDrive(vaultPassphrase, true).catch(function(err) {
                  showToast('로컬 설정은 저장했지만 Drive 암호화 백업은 실패했습니다: ' + (err.message || err), 'warning');
                });
              } else {
                window._ao3DriveNeedsSettingsBackup = true;
              }
            }
          } catch (e) {}
        }
        document.getElementById('saveSettingsModalBtn').addEventListener('click', function() {
          state.settings.translationPrompt = document.getElementById('translationPromptTextarea').value.trim() || DEFAULT_TRANSLATION_PROMPT;
          state.settings.textReplacements = document.getElementById('glossaryTextarea').value;
          state.settings.characterStyleRules = document.getElementById('characterStyleRulesTextarea').value.trim();
          saveSettingsToStorage();
          syncSettingsDriveVaultBackup();
          document.getElementById('settingsModal').classList.add('hidden');
          if (state.currentView === 'studio') renderStudio();
          if (state.currentView === 'reader') renderReader();
          showToast(isDriveTokenValid() ? '일반 번역 설정을 저장했습니다. Google Drive 암호화 백업을 갱신합니다.' : '번역 프롬프트·추가 프롬프트·텍스트 치환 설정을 기기에 저장했습니다.');
        });
        document.getElementById('saveApiSettingsModalBtn').addEventListener('click', function() {
          state.settings.engine = document.getElementById('translationEngineSelect').value;
          delete state.settings.functionBackendUrl;
          state.settings.geminiModel = document.getElementById('geminiModelSelect').value;
          const enteredGeminiKeys = Array.from(new Set(document.getElementById('geminiApiKeysInput').value.split(/[\r\n,;]+/).map(function(k) { return k.trim(); }).filter(Boolean)));
          ao3NormalizeGeminiKeyLists();
          const activeGeminiList = ao3ActiveGeminiKeyList();
          if (activeGeminiList) {
            activeGeminiList.keys = enteredGeminiKeys.slice();
            ao3EnsureGeminiSpecialListSlots(activeGeminiList);
          }
          state.settings.geminiApiKeys = enteredGeminiKeys.join('\n');
          state.settings.geminiApiKey = enteredGeminiKeys[0] || '';
          state.settings.geminiCooldownEnabled = document.getElementById('geminiCooldownEnabledInput').checked;
          state.settings.azureApiKey = document.getElementById('azureApiKeyInput').value.trim();
          state.settings.azureRegion = document.getElementById('azureRegionInput').value.trim();
          state.settings.azureEnabled = document.getElementById('azureAutoEnabledInput').checked;
          state.settings.azureQuotaTier = (document.getElementById('azureQuotaTierInput') && document.getElementById('azureQuotaTierInput').value) || 'unknown';
          state.settings.groqApiKey = document.getElementById('groqApiKeyInput').value.trim();
          state.settings.groqModel = document.getElementById('groqModelInput').value.trim() || 'openai/gpt-oss-120b';
          state.settings.groqEnabled = document.getElementById('groqAutoEnabledInput').checked;
          state.settings.workersAiEnabled = document.getElementById('workersAiAutoEnabledInput').checked;
          state.settings.workersAiModel = document.getElementById('workersAiModelInput').value || '@cf/zai-org/glm-4.7-flash';
          saveSettingsToStorage();
          ao3RefreshProviderQuotaDashboard();
          syncSettingsDriveVaultBackup();
          document.getElementById('apiSettingsModal').classList.add('hidden');
          showToast(isDriveTokenValid() ? 'API 설정을 저장했습니다. Google Drive 암호화 백업을 갱신합니다.' : 'API 설정을 기기에 저장했습니다.');
        });

        document.getElementById('driveConnectAndSyncBtn').addEventListener('click', function() {
          if (state.currentView !== 'bookshelf') {
            showToast('Google Drive 연결은 메인 책장에서만 실행됩니다.', 'info');
            return;
          }
          const cid = document.getElementById('googleClientIdInput').value.trim() || DEFAULT_GOOGLE_CLIENT_ID;
          state.settings.googleClientId = cid;
          saveSettingsToStorage();
          connectAndSyncGoogleDrive();
        });

        document.getElementById('driveSettingsVaultSaveBtn').addEventListener('click', async function() {
          if (state.currentView !== 'bookshelf') {
            showToast('Google Drive 설정 백업은 메인 책장에서만 실행됩니다.', 'info');
            return;
          }
          const passphrase = document.getElementById('driveSettingsVaultPassphrase').value;
          if (!isDriveTokenValid()) {
            showToast('먼저 Google Drive에 로그인하고 동기화해 주세요.', 'warning');
            return;
          }
          try {
            await saveEncryptedSettingsToDrive(passphrase, false);
            const remember = document.getElementById('driveSettingsVaultRememberSession').checked;
            try {
              if (remember) sessionStorage.setItem(DRIVE_SETTINGS_VAULT_SESSION_KEY, passphrase);
              else sessionStorage.removeItem(DRIVE_SETTINGS_VAULT_SESSION_KEY);
            } catch (e) {}
          } catch (err) {
            showToast(err.message || 'Drive 암호화 백업에 실패했습니다.', 'error');
          }
        });

        document.getElementById('driveSettingsVaultRestoreBtn').addEventListener('click', async function() {
          if (state.currentView !== 'bookshelf') {
            showToast('Google Drive 설정 복원은 메인 책장에서만 실행됩니다.', 'info');
            return;
          }
          const passphrase = document.getElementById('driveSettingsVaultPassphrase').value;
          if (!isDriveTokenValid()) {
            showToast('먼저 Google Drive에 로그인하고 동기화해 주세요.', 'warning');
            return;
          }
          try {
            await restoreEncryptedSettingsFromDrive(passphrase, false);
            const remember = document.getElementById('driveSettingsVaultRememberSession').checked;
            try {
              if (remember) sessionStorage.setItem(DRIVE_SETTINGS_VAULT_SESSION_KEY, passphrase);
              else sessionStorage.removeItem(DRIVE_SETTINGS_VAULT_SESSION_KEY);
            } catch (e) {}
          } catch (err) {
            showToast(err.message || 'Drive 설정 복원에 실패했습니다.', 'error');
          }
        });

        document.getElementById('driveDisconnectBtn').addEventListener('click', function() {
          state.drive.accessToken = '';
          state.drive.tokenExpiresAt = 0;
          try { localStorage.removeItem(DRIVE_RECONNECT_KEY); } catch (e) {}
          try { sessionStorage.removeItem(DRIVE_ACCESS_TOKEN_SESSION_KEY); sessionStorage.removeItem(DRIVE_ACCESS_TOKEN_EXPIRY_SESSION_KEY); } catch (e) {}
          try { sessionStorage.removeItem(DRIVE_SETTINGS_VAULT_SESSION_KEY); } catch (e) {}
          window._ao3VaultAutoRestoreDone = false;
          updateDriveUiStatus('Google Drive 연결 해제됨', 'disconnected');
          showToast('Google Drive 연결이 해제되었습니다.');
        });

        document.getElementById('downloadBackupFileBtn').addEventListener('click', function() {
          const dataStr = JSON.stringify(state.novels, null, 2);
          const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const dateTag = new Date().toISOString().slice(0, 10);
          a.href = url;
          a.download = 'AO3서재_백업_' + dateTag + '.json';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          showToast('서재 백업 파일(.json)을 내려받았습니다.');
        });

        document.getElementById('uploadBackupFileBtn').addEventListener('click', function() {
          document.getElementById('uploadBackupFileInput').click();
        });

        document.getElementById('uploadBackupFileInput').addEventListener('change', async function(e) {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.novels) ? parsed.novels : null);
            if (!list) {
              showToast('올바른 서재 백업 JSON 파일이 아닙니다.', 'error');
              return;
            }
            const existingMap = {};
            state.novels.forEach(function(n) { existingMap[n.id] = n; });
            list.forEach(function(item) {
              if (item && item.id) {
                existingMap[item.id] = item;
              }
            });
            state.novels = Object.keys(existingMap).map(function(k) { return existingMap[k]; });
            saveToStorage();
            document.getElementById('backupJsonTextarea').value = JSON.stringify(state.novels, null, 2);
            renderBookshelf();
            showToast('백업 파일에서 총 ' + list.length + '권의 소설을 불러와 병합했습니다!');
          } catch (err) {
            showToast('백업 파일 읽기에 실패했습니다.', 'error');
          }
          e.target.value = '';
        });

        document.getElementById('closeBackupModalBtn').addEventListener('click', function() {
          const modal = document.getElementById('backupModal');
          modal.classList.add('hidden');
          modal.style.display = 'none';
          modal.setAttribute('aria-hidden', 'true');
        });

        document.getElementById('copyBackupJsonBtn').addEventListener('click', function() {
          const textarea = document.getElementById('backupJsonTextarea');
          textarea.select();
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(textarea.value);
            } else {
              document.execCommand('copy');
            }
            showToast('서재 백업 JSON이 클립보드에 복사되었습니다.');
          } catch (err) {
            document.execCommand('copy');
            showToast('클립보드에 복사되었습니다.');
          }
        });

        document.getElementById('restoreBackupJsonBtn').addEventListener('click', function() {
          const raw = document.getElementById('backupJsonTextarea').value.trim();
          if (!raw) return;
          try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
              showToast('올바른 서재 JSON 배열 형식이 아닙니다.', 'error');
              return;
            }
            state.novels = parsed;
            saveToStorage();
            document.getElementById('backupModal').classList.add('hidden');
            document.getElementById('backupModal').style.display = 'none';
            document.getElementById('backupModal').setAttribute('aria-hidden', 'true');
            renderBookshelf();
            showToast('총 ' + parsed.length + '권의 소설 데이터가 서재에 복원되었습니다!');
          } catch (err) {
            showToast('JSON 구문 오류가 있습니다. 복사한 데이터를 확인해 주세요.', 'error');
          }
        });
      }

      // Reader chapter retranslation control was removed because it was unreliable.

      // Initialize App
      installReaderTitleSplitGuard();
      loadFromStorage();
      initEvents();
      renderBookshelf();
      refreshCloudflareProviderConfig();
      restoreGoogleDriveSession();
    })();
  
