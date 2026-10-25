
    (function() {
      'use strict';
      window.__AO3_BUILD_VERSION__ = '42';

      const STORAGE_KEY = 'ao3_korean_bookshelf_v1';
      const SETTINGS_KEY = 'ao3_korean_settings_v1';
      const READER_PREFS_KEY = 'ao3_korean_reader_preferences_v1';
      const DELETED_IDS_KEY = 'ao3_korean_deleted_ids_v1';
      const DEFAULT_GOOGLE_CLIENT_ID = '821952251109-upebojq1da9ep7cmrjg18hlukdppmjru.apps.googleusercontent.com';
      const DRIVE_FOLDER_NAME = 'AO3서재';
      // Cloudflare Worker API routes run on this same origin under /api/*.
      const DRIVE_RECONNECT_KEY = 'ao3_google_drive_reconnect_v1';
      // Session-scoped token cache lets a connected tab auto-sync after reload without persisting OAuth credentials across browser sessions.
      const DRIVE_ACCESS_TOKEN_SESSION_KEY = 'ao3_google_drive_access_token_session_v1';
      const DRIVE_ACCESS_TOKEN_EXPIRY_SESSION_KEY = 'ao3_google_drive_access_token_expiry_session_v1';
      let libraryHydrationPromise = Promise.resolve();
      const DRIVE_LOGIN_HINT_KEY = 'ao3_google_drive_login_hint_v1';
      const DRIVE_SETTINGS_VAULT_FILE = 'ao3_settings_encrypted.json';
      const DRIVE_USER_PREFERENCES_FILE = 'ao3_user_preferences.json';
      const DRIVE_USER_PREFERENCES_TS_KEY = 'ao3_user_preferences_drive_updated_at_v1';
      const DRIVE_SETTINGS_VAULT_SESSION_KEY = 'ao3_drive_settings_vault_passphrase_session_v1';
      const IDB_NAME = 'ao3_korean_library_idb_v1';
      const CUSTOM_SHELVES_KEY = 'ao3_custom_bookshelves_v1';
      const DRIVE_CUSTOM_SHELVES_FILE = 'ao3_custom_bookshelves.json';
      const CUSTOM_SHELVES_SYNC_TS_KEY = 'ao3_custom_bookshelves_drive_updated_at_v1';
      const IDB_STORE = 'novels_store';

      // One source of truth for the default literary translation prompt.
      const DEFAULT_TRANSLATION_PROMPT = '한국어로 번역한다. 목표는 요약이나 기계적 직역이 아니라 출판 가능한 자연스러운 한국어 장편소설 문장이다. [서술 문체] 대사와 생각이 직접 인용된 부분을 제외한 일반 서술은 일관된 소설 문어체로 쓰고, 기본 종결은 과거형 -았다/-었다/-였다 및 필요한 연결형으로 유지한다. 서술문에 -해/-야/-거야/-했어요/-습니다 같은 구어체·대화체 종결을 섞지 않는다. 단, 인물의 실제 대사와 직접 인용된 내면 독백은 화자의 말투를 유지한다. 원문이 현재형이거나 의도적으로 단문을 반복할 때는 효과를 살리되, 문체를 기계적으로 통일하지 않는다. [한국어 재구성] 영어 어순과 수식어 순서를 그대로 따라가지 말고, 한국어에서 자연스러운 주어·목적어·수식어 순서로 문장을 다시 구성한다. 영어 관계절·분사구문·생략된 주어는 문맥에 맞게 풀어 쓰고, 문장 조각은 앞뒤 문장과 논리적으로 연결한다. 원문이 의도한 단문 리듬은 보존한다. [정확성] 모든 문장을 빠짐없이 번역하고 의미를 추가·삭제·완화하지 않는다. 관용구, 구동사, 신체·의학 용어, 성적 용어는 철자 유사성으로 추측하지 말고 문맥상 의미를 정확히 고른다. 인물의 성별·대명사·행위 주체·대상·시제·부정·인과관계를 유지한다. [문학성] 감정의 미묘함, 시점, 인물별 어휘와 말투, 반복과 리듬을 보존한다. 같은 표현을 문맥 없이 반복하지 말고, 한국어에서 어색한 명사화·피동·중복 주어·영어식 추상명사를 자연스럽게 고친다. [형식] 원문의 문단 순서와 문단 수, 장면 구분선을 유지한다. 대사는 따옴표 안에 두고 서술문과 대사의 말투 규칙을 혼동하지 않는다. 고유명사는 작품 내 통용 표기를 우선하고 지정 표기를 따른다. 원문에 있는 이탤릭은 강조 의미를 보존하되 마크다운 기호를 출력하지 않는다. 번역문만 출력하고 설명이나 주석을 붙이지 않는다. 출력 전 내부적으로 문장별 누락 여부, 한국어 어순, 조사, 용어, 서술 종결, 대사 말투를 검수하고 어색한 문장을 다시 쓴다.';

      // Keep the selected model compatible with the current Gemini generateContent endpoint.
      // Gemini 4 Argon is intentionally not listed here: it is paid-only and uses the Interactions API.
      const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
      const SUPPORTED_GEMINI_MODELS = new Set([
        'gemini-3.8-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite'
      ]);
      function normalizeGeminiModel(model) {
        const value = String(model || '').trim();
        if (SUPPORTED_GEMINI_MODELS.has(value)) return value;
        // Older saved choices include models that are shut down or no longer recommended.
        return DEFAULT_GEMINI_MODEL;
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
          theme: 'dark', // default reading canvas is deep navy dark
          font: 'sans', // 독서 글꼴은 고딕으로 고정
          fontSize: 14
        },
        settings: {
          engine: 'gemini_api',
          geminiModel: DEFAULT_GEMINI_MODEL,
          geminiApiKey: '',
          geminiApiKeys: '',
          azureApiKey: '',
          azureRegion: '',
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
        deleteTarget: null // { type: 'novel', novelId } | { type: 'chapter', novelId, chapterId, chapterIndex }
      };

      function ao3FunctionUrl(name) {
        const safeName = String(name || '').replace(/^\/+|\/+$/g, '');
        const allowed = ['groq-translate', 'azure-translate', 'workers-ai-translate', 'status'];
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
            if (!state.settings.translationPrompt) state.settings.translationPrompt = DEFAULT_TRANSLATION_PROMPT;
            state.settings.geminiModel = normalizeGeminiModel(state.settings.geminiModel);
            if (!state.settings.groqModel || state.settings.groqModel === 'llama-3.3-70b-versatile') state.settings.groqModel = 'openai/gpt-oss-120b';
            if (typeof state.settings.groqEnabled !== 'boolean') state.settings.groqEnabled = true;
            if (typeof state.settings.workersAiEnabled !== 'boolean') state.settings.workersAiEnabled = true;
            if (!['@cf/zai-org/glm-4.7-flash', '@cf/openai/gpt-oss-120b'].includes(state.settings.workersAiModel)) state.settings.workersAiModel = '@cf/zai-org/glm-4.7-flash';
            if (state.settings.engine !== 'free_gtx') state.settings.engine = 'gemini_api';
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
          azureRegion: String(s.azureRegion || ''),
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
            bilingual: Boolean(state.reader.bilingual)
          },
          appTheme: (function() {
            try { return localStorage.getItem('ao3-app-theme') === 'light' ? 'light' : 'dark'; }
            catch (e) { return document.documentElement.getAttribute('data-app-theme') === 'light' ? 'light' : 'dark'; }
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
        ['groqEnabled', 'workersAiEnabled'].forEach(function(key) { if (typeof rs[key] === 'boolean') state.settings[key] = rs[key]; });
        if (state.settings.engine !== 'free_gtx') state.settings.engine = 'gemini_api';
        state.settings.geminiModel = normalizeGeminiModel(state.settings.geminiModel);
        if (!state.settings.groqModel || state.settings.groqModel === 'llama-3.3-70b-versatile') state.settings.groqModel = 'openai/gpt-oss-120b';
        if (!['@cf/zai-org/glm-4.7-flash', '@cf/openai/gpt-oss-120b'].includes(state.settings.workersAiModel)) state.settings.workersAiModel = '@cf/zai-org/glm-4.7-flash';

        const rp = remote.readerPreferences || {};
        if (['paper', 'green', 'dark', 'white', 'sepia'].includes(rp.theme)) state.reader.theme = normalizeReaderTheme(rp.theme);
        if (typeof rp.fontSize === 'number' && Number.isFinite(rp.fontSize)) state.reader.fontSize = Math.max(8, Math.min(26, Math.round(rp.fontSize)));
        if (typeof rp.bilingual === 'boolean') state.reader.bilingual = rp.bilingual;
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
          localStorage.setItem(READER_PREFS_KEY, JSON.stringify({ theme: state.reader.theme, fontSize: state.reader.fontSize, bilingual: state.reader.bilingual }));
        } catch (e) {}

        const theme = remote.appTheme === 'light' ? 'light' : 'dark';
        try { localStorage.setItem('ao3-app-theme', theme); } catch (e) {}
        document.documentElement.setAttribute('data-app-theme', theme);
        document.documentElement.style.colorScheme = theme;
        const darkBtn = document.getElementById('appThemeDarkBtn');
        const lightBtn = document.getElementById('appThemeLightBtn');
        if (darkBtn) darkBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
        if (lightBtn) lightBtn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
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
          ? ('https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(targetFileId) + '?uploadType=multipart&fields=id')
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
          }
        } else {
          console.warn('Drive novel sync failed with HTTP ' + upRes.status + '; local copy remains saved.');
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
          azureApiKey: String(s.azureApiKey || ''),
          azureRegion: String(s.azureRegion || ''),
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
        if (typeof decoded.settings.groqEnabled === 'boolean') state.settings.groqEnabled = decoded.settings.groqEnabled;
        if (typeof decoded.settings.workersAiEnabled === 'boolean') state.settings.workersAiEnabled = decoded.settings.workersAiEnabled;
        if (!state.settings.geminiApiKeys && state.settings.geminiApiKey) state.settings.geminiApiKeys = state.settings.geminiApiKey;
        state.settings.geminiModel = normalizeGeminiModel(state.settings.geminiModel);
        if (state.settings.groqModel === 'llama-3.3-70b-versatile') state.settings.groqModel = 'openai/gpt-oss-120b';
        if (state.settings.engine !== 'free_gtx') state.settings.engine = 'gemini_api';
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
        const workersAiEnabledInput = document.getElementById('workersAiAutoEnabledInput');
        if (workersAiEnabledInput) workersAiEnabledInput.checked = state.settings.workersAiEnabled !== false;
        const workersAiModelInput = document.getElementById('workersAiModelInput');
        if (workersAiModelInput) workersAiModelInput.value = state.settings.workersAiModel || '@cf/zai-org/glm-4.7-flash';
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
          await syncDriveUserPreferencesWithGoogleDrive(folderId);
          window._ao3DriveNeedsPreferencesSync = false;
          await syncCustomShelvesWithGoogleDrive(folderId, false);
          const q = "'" + folderId + "' in parents and trashed = false and mimeType = 'application/json'";
          const listUrl = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&pageSize=500&fields=files(id,name,modifiedTime)';
          const listRes = await driveApiFetch(listUrl);
          if (!listRes.ok) throw new Error('드라이브 파일 목록 조회 실패');
          const listData = await listRes.json();
          const remoteFiles = listData.files || [];

          const localMap = {};
          state.novels.forEach(function(n) { localMap[n.id] = n; });
          const seenIds = {};
          let downloadedCount = 0;
          let uploadedCount = 0;

          for (let i = 0; i < remoteFiles.length; i++) {
            const rf = remoteFiles[i];
            const match = (rf.name || '').match(/^ao3_novel_(.+)\.json$/);
            if (!match) continue;
            const novelId = match[1];
            seenIds[novelId] = rf.id;

            // If deleted locally on this device, delete on Drive too
            if (state.deletedNovelIds && state.deletedNovelIds[novelId]) {
              await deleteNovelFromDrive(novelId, rf.id);
              continue;
            }

            // Download remote novel JSON to compare updatedAt
            const dlRes = await driveApiFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(rf.id) + '?alt=media');
            if (!dlRes.ok) continue;
            let remoteNovel = null;
            try {
              remoteNovel = await dlRes.json();
            } catch (e) {
              continue;
            }
            if (!remoteNovel || !remoteNovel.id) continue;
            remoteNovel.driveFileId = rf.id;

            const localNovel = localMap[novelId];
            if (!localNovel) {
              state.novels.push(remoteNovel);
              localMap[novelId] = remoteNovel;
              downloadedCount += 1;
            } else {
              const remoteTs = getNovelTimestamp(remoteNovel);
              const localTs = getNovelTimestamp(localNovel);
              if (remoteTs > localTs) {
                const idx = state.novels.findIndex(function(x) { return x.id === novelId; });
                if (idx !== -1) state.novels[idx] = remoteNovel;
                downloadedCount += 1;
              } else if (localTs > remoteTs) {
                await uploadSingleNovelToDrive(localNovel, rf.id);
                uploadedCount += 1;
              }
            }
          }

          // Upload any local novels not yet in Google Drive (skip default sample if user already has other novels on Drive)
          for (let j = 0; j < state.novels.length; j++) {
            const ln = state.novels[j];
            if (!seenIds[ln.id]) {
              await uploadSingleNovelToDrive(ln, '');
              uploadedCount += 1;
            }
          }

          state.drive.lastSyncAt = Date.now();
          state.drive.syncing = false;
          await idbSetNovels(state.novels).catch(function() {});
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.novels));
          } catch (e) {}

          window._ao3DriveNeedsSync = false;
          updateDriveUiStatus('AO3서재 동기화 완료 (' + state.novels.length + '권)', 'connected');
          updateHeaderBadges();
          if (state.currentView === 'bookshelf') renderBookshelf();

          if (!silent) {
            showToast('Google Drive “AO3서재” 동기화 완료! (내려받기 ' + downloadedCount + '권 · 업로드 ' + uploadedCount + '권)');
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

      function normalizeReaderTheme(theme) {
        if (theme === 'green') return 'green';
        if (theme === 'dark') return 'dark';
        // Migrate old white/sepia settings to the familiar paper palette.
        if (theme === 'paper' || theme === 'white' || theme === 'sepia') return 'paper';
        return 'dark';
      }

      function saveReaderPreferences(suppressDriveSync) {
        try {
          state.reader.font = 'sans';
          localStorage.setItem(READER_PREFS_KEY, JSON.stringify({
            theme: state.reader.theme,
            fontSize: state.reader.fontSize,
            bilingual: state.reader.bilingual
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
            btn.className = 'nav-tab-btn px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 bg-white text-slate-900 shadow-sm';
          } else {
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
          if (sortBy === 'titleAsc') return (a.title || '').localeCompare(b.title || '', 'ko');
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
            '<article class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between gap-4">' +
              '<div class="space-y-2.5">' +
                '<div class="flex items-start justify-between gap-2">' +
                  '<div class="min-w-0">' +
                    '<div class="flex items-center gap-1.5 flex-wrap mb-1">' +
                      '<span class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 font-bold text-[11px]">단행본 · ' + chCount + '개 챕터</span>' +
                      (novel.fandom ? '<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">' + escapeHtml(novel.fandom) + '</span>' : '') +
                      (passageBookmarkCount > 0 ? '<span class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold text-[11px]">문단 책갈피 ' + passageBookmarkCount + '개</span>' : '') +
                    '</div>' +
                    '<h3 data-title-split-version="48" class="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words cursor-pointer hover:text-rose-700 transition card-open-reader" data-novel-id="' + escapeHtml(novel.id) + '">' +
                      renderNovelTitleMarkup(novel.title) +
                    '</h3>' +
                    '<p class="text-xs text-slate-500 mt-0.5">' + escapeHtml(novel.author || '작자 미상') + ' · 총 ' + totalParagraphs + '문단</p>' +
                  '</div>' +
                  '<div class="flex items-center gap-1 shrink-0">' +
                    '<button type="button" data-bm-novel-id="' + escapeHtml(novel.id) + '" title="북마크 및 태그 설정" class="card-bookmark-btn p-2 rounded-xl border transition ' + bookmarkBtnClass + '">' +
                      '<svg class="w-4 h-4 ' + (novel.bookmarked ? 'fill-amber-500' : '') + '" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"/></svg>' +
                    '</button>' +
                    '<button type="button" data-edit-novel-id="' + escapeHtml(novel.id) + '" title="제목 및 정보 수정" class="card-edit-btn p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition">' +
                      '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.14l-2.812.938.938-2.812a4.5 4.5 0 011.14-1.89l12.654-12.654z"/></svg>' +
                    '</button>' +
                    '<button type="button" data-delete-novel-id="' + escapeHtml(novel.id) + '" title="소설 삭제" class="card-delete-btn p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition">' +
                      '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>' +
                    '</button>' +
                  '</div>' +
                '</div>' +
                (novel.summary ? '<p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">' + escapeHtml(novel.summary) + '</p>' : '') +
                '<div class="flex items-center gap-1.5 flex-wrap pt-1">' +
                  tagsMarkup +
                  '<button type="button" data-bm-novel-id="' + escapeHtml(novel.id) + '" class="card-bookmark-btn text-[11px] font-semibold text-amber-800 hover:underline ml-1">+ 태그 편집</button>' +
                '</div>' +
              '</div>' +

              '<div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">' +
                '<div class="text-[11px] text-slate-500 truncate">' +
                  '이어보기: <strong class="text-slate-700">' + escapeHtml(lastChTitle) + '</strong>' +
                '</div>' +
                '<div class="flex items-center gap-1.5 shrink-0">' +
                  '<button type="button" data-append-novel-id="' + escapeHtml(novel.id) + '" class="card-append-btn px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition">+ 챕터 추가</button>' +
                  '<button type="button" data-novel-id="' + escapeHtml(novel.id) + '" class="card-open-reader px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-700 text-white text-xs font-semibold transition flex items-center gap-1">' +
                    '<span>뷰어로 열람</span>' +
                    '<span>→</span>' +
                  '</button>' +
                '</div>' +
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

      function normalizeAndMergeBrokenParagraphs(rawBlocks) {
        const cleanedBlocks = [];
        rawBlocks.forEach(function(raw) {
          const s = String(raw || '').replace(/\r/g, '').trim();
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
        return cleanedBlocks;
      }

      function extractParagraphsFromElement(containerEl) {
        const clone = containerEl.cloneNode(true);
        clone.querySelectorAll('h3.landmark.heading, script, style, .landmark, #preface, .meta').forEach(function(el) {
          el.remove();
        });

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

      function parseAo3HtmlDocument(htmlText, fallbackSourceUrl) {
        if (!htmlText || typeof htmlText !== 'string') {
          return { meta: {}, chapters: [], reason: 'empty' };
        }

        // Detect Cloudflare challenge or AO3 lock/interstitial pages early
        if (
          htmlText.includes('Just a moment...') ||
          htmlText.includes('cf-browser-verification') ||
          htmlText.includes('Attention Required! | Cloudflare') ||
          htmlText.includes('_cf_chl_opt')
        ) {
          return { meta: {}, chapters: [], reason: 'cloudflare' };
        }

        if (
          htmlText.includes('This work is only available to registered users of the Archive') ||
          htmlText.includes('new_user_session') && !htmlText.includes('workskin') && !htmlText.includes('id="chapters"')
        ) {
          return { meta: {}, chapters: [], reason: 'locked' };
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

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

        const workFandomEl = doc.querySelector('#workskin .preface dd.fandom.tags a.tag') ||
          doc.querySelector('#preface dd.fandom.tags a.tag') ||
          doc.querySelector('dd.fandom.tags a.tag');

        const cleanMetaText = function(value) {
          return String(value || '').replace(/\s+/g, ' ').trim();
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

        const extractedMeta = {
          title: rawTitle || 'AO3 추출 작품',
          author: cleanAo3AuthorName(rawAuthor) || 'Anonymous',
          fandom: cleanMetaText(workFandomEl ? workFandomEl.textContent : ''),
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
            const dlUserstuffs = dlChaptersContainer.querySelectorAll(':scope > div.userstuff, :scope > div.chapter > div.userstuff');
            if (dlUserstuffs.length > 0) {
              dlUserstuffs.forEach(function(uNode, idx) {
                const chapterContainer = uNode.closest('div.chapter');
                let rawChTitle = chapterContainer ? getChapterTitle(chapterContainer, idx) : '';
                if (!chapterContainer) {
                  // In AO3's downloaded HTML, a chapter's heading is often the
                  // preceding .meta.group sibling rather than a child of userstuff.
                  let previous = uNode.previousElementSibling;
                  while (previous && !rawChTitle) {
                    if (previous.matches('.meta.group, .meta, h2.toc-heading')) {
                      const heading = previous.querySelector('h2.heading, h3.heading, h2, h3') || previous;
                      const candidate = cleanChapterTitle(heading.textContent, idx);
                      if (candidate !== 'Chapter ' + (idx + 1)) rawChTitle = candidate;
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
            doc.querySelector('#chapters div.userstuff[role="article"]') ||
            doc.querySelector('#chapters div.userstuff') ||
            doc.querySelector('#workskin div.userstuff[role="article"]') ||
            doc.querySelector('#workskin .userstuff') ||
            doc.querySelector('div.userstuff[role="article"]');
          if (singleArticle) {
            const paragraphs = extractParagraphsFromElement(singleArticle);
            if (paragraphs.length > 0) {
              extractedChapters.push({
                title: getChapterTitle(singleArticle.closest('div.chapter') || singleArticle.parentElement || singleArticle, 0),
                sourceUrl: fallbackSourceUrl || '',
                paragraphs: paragraphs
              });
            }
          }
        }

        // Check if it was an Adult Content Warning page
        if (extractedChapters.length === 0 && (htmlText.includes('This work could have adult content') || htmlText.includes('view_adult=true'))) {
          return { meta: extractedMeta, chapters: [], reason: 'adult_gate' };
        }

        return { meta: extractedMeta, chapters: extractedChapters, reason: extractedChapters.length > 0 ? 'ok' : 'no_content' };
      }

      // Parse Jina Reader Markdown output when raw HTML proxies are blocked by Cloudflare
      function parseAo3JinaMarkdown(mdText, fallbackSourceUrl) {
        if (!mdText || mdText.length < 200) return { meta: {}, chapters: [] };
        if (mdText.includes('Just a moment...') || mdText.includes('Attention Required!')) {
          return { meta: {}, chapters: [] };
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
              const clean = stripInlineTranslationMarkup(b
                .replace(/^#{1,6}\s*Chapter Text\s*$/gim, '')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/[ \t]+/g, ' ')
                .trim());
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
            const clean = stripInlineTranslationMarkup(b.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[ \t]+/g, ' ').trim());
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
        let u = rawUrl.trim();
        if (!u) return null;
        if (!/^https?:\/\//i.test(u)) {
          u = 'https://' + u;
        }
        const workMatch = u.match(/\/works\/(\d+)/);
        const chapterMatch = u.match(/\/chapters\/(\d+)/);
        const workId = workMatch ? workMatch[1] : null;
        const chapterId = chapterMatch ? chapterMatch[1] : null;

        let webUrl = u;
        try {
          const parsed = new URL(u);
          if (parsed.hostname.endsWith('ao3.org')) {
            parsed.hostname = 'archiveofourown.org';
          }
          parsed.searchParams.set('view_adult', 'true');
          if (fullWork && workId) {
            parsed.pathname = '/works/' + workId;
            parsed.searchParams.set('view_full_work', 'true');
          } else {
            // Never let a pasted query parameter turn a single-chapter import into a full-work fetch.
            parsed.searchParams.delete('view_full_work');
          }
          webUrl = parsed.toString();
        } catch (e) {
          // Keep original
        }

        // AO3 official static HTML download URL (bypasses adult warning screen and contains full work)
        const downloadHtmlUrl = workId
          ? ('https://archiveofourown.org/downloads/' + workId + '/work.html')
          : null;

        return {
          originalUrl: rawUrl.trim(),
          workId: workId,
          chapterId: chapterId,
          fullWork: Boolean(fullWork),
          webUrl: webUrl,
          downloadHtmlUrl: downloadHtmlUrl
        };
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
            throw new Error(parsed.reason || 'no_content');
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

      const AO3_COMMON_ENGLISH_RESIDUE = new Set((
        'the and or but if then when where what who why how you your yourself yours only such time said says say with from that this these those have has had was were are is am be been being will would could should not dont dontve didnt doesnt isnt arent wasnt werent its im ive ill we they he she her his their them me my mine us for of to in on at as by into through just all still already because however although please really very much more most some any each every again about after before while than too also can cannot do does did done get got go went come came know think feel want need make made take took give gave tell told look see heard hear over under up down out off back away one two may might must shall whoa yeah okay ok fuck fucking shit damn no yes man woman girl boy' 
      ).split(/\s+/));

      function hasUntranslatedEnglishResidue(source, translated) {
        const clean = stripInlineTranslationMarkup(translated);
        if (!clean || /<<<P_SEP>>>|\[번역 대기\]|\[오프라인 원문\]/i.test(clean)) return true;
        const src = String(source || '').trim();
        if (isSceneDividerLine(src)) return !isSceneDividerLine(clean);
        if (/[A-Za-z]/.test(src) && !/[가-힣]/.test(clean)) return true;

        const englishWords = clean.match(/\b[A-Za-z][A-Za-z'-]*\b/g) || [];
        const residueWords = englishWords.map(function(word) { return word.toLowerCase().replace(/['’]/g, ''); })
          .filter(function(word) { return AO3_COMMON_ENGLISH_RESIDUE.has(word); });
        const uniqueResidue = Array.from(new Set(residueWords));
        if (uniqueResidue.length >= 2 || residueWords.length >= 3) return true;

        // A long run of Latin words inside Korean prose is usually an untranslated fragment.
        const latinRuns = clean.match(/\b[A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*){2,}\b/g) || [];
        if (latinRuns.some(function(run) {
          return run.split(/\s+/).some(function(word) {
            return AO3_COMMON_ENGLISH_RESIDUE.has(word.toLowerCase().replace(/['’]/g, ''));
          });
        })) return true;

        // If the source ends a full sentence but the long translated sentence is left dangling,
        // treat it as suspect so a fallback provider can translate the whole batch.
        const sourceHasTerminal = /[.!?…][\"'”’)}\]]?$/.test(src);
        const translationHasTerminal = /[.!?。！？…][\"'”’)}\]]?$/.test(clean);
        if (src.length > 80 && clean.length > 35 && sourceHasTerminal && !translationHasTerminal) return true;
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
          }
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
        try {
          response = await fetch(ao3FunctionUrl(endpoint), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: apiKey,
              model: model,
              texts: texts,
              prompt: ((context && context.prompt) || (state.settings.translationPrompt || '').trim()) + (String(state.settings.characterStyleRules || '').trim() ? '\n\n[작품별 인물·관계·말투 규칙]\n' + String(state.settings.characterStyleRules).trim() + '\n화자와 상대가 명확할 때만 적용하고, 서술문 규칙을 대사에 적용하지 마세요.' : ''),
              fandom: (context && context.fandom) || '',
              prevContext: (context && context.prevContext) || ''
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
        }
        const retryAfterHeader = response.headers.get('Retry-After');
        let retrySeconds = Number(retryAfterHeader || 0);
        let payload = null;
        try { payload = await response.json(); } catch (ignoreJson) {}
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
        if (!payload || !Array.isArray(payload.translations) || payload.translations.length !== texts.length || payload.translations.some(function(value) { return typeof value !== 'string'; })) {
          throw new Error(provider.toUpperCase() + ' returned an unexpected translation response format.');
        }
        return payload.translations;
      }

      function setTranslationProviderStatus(provider, detail) {
        // Small live status pill in the translation-add progress panel.
        const pill = document.getElementById('translationProviderStatus');
        const text = document.getElementById('translationProviderStatusText');
        if (!pill || !text) return;
        const name = String(provider || 'API').trim();
        const phase = String(detail || '').trim();
        const key = name.toLowerCase();
        pill.dataset.provider = key;
        text.textContent = phase ? name + ' · ' + phase : name;
        const dot = pill.querySelector('span');
        pill.className = 'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold shrink-0';
        let dotClass = 'bg-slate-400';
        if (key.indexOf('gemini') >= 0) {
          pill.classList.add('bg-violet-50', 'border-violet-200', 'text-violet-800'); dotClass = 'bg-violet-500';
        } else if (key.indexOf('groq') >= 0) {
          pill.classList.add('bg-orange-50', 'border-orange-200', 'text-orange-800'); dotClass = 'bg-orange-500';
        } else if (key.indexOf('workers ai') >= 0 || key.indexOf('workers-ai') >= 0) {
          pill.classList.add('bg-violet-50', 'border-violet-200', 'text-violet-800'); dotClass = 'bg-violet-500';
        } else if (key.indexOf('azure') >= 0) {
          pill.classList.add('bg-sky-50', 'border-sky-200', 'text-sky-800'); dotClass = 'bg-sky-500';
        } else if (key.indexOf('google') >= 0) {
          pill.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-800'); dotClass = 'bg-emerald-500';
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

      async function translateParagraphBatch(enStrings, contextMeta) {
        // Text replacement rules apply only after translation, never to the source text.
        const preparedStrings = enStrings.map(function(s) {
          if (isSceneDividerLine(s)) return '* * *';
          return stripInlineTranslationMarkup(s);
        });

        const customPrompt = (state.settings.translationPrompt || DEFAULT_TRANSLATION_PROMPT).trim();
        const fandomHint = (contextMeta && contextMeta.fandom) ? ('\n[원작/장르 정보]: ' + contextMeta.fandom) : '';
        const prevContextHint = (contextMeta && contextMeta.prevContext) ? ('\n[직전 문단 맥락(참고용, 번역 출력 제외)]: ' + contextMeta.prevContext) : '';
        const characterStyleHint = String(state.settings.characterStyleRules || '').trim() ? '\n[작품별 인물·관계·말투 규칙]\n' + String(state.settings.characterStyleRules).trim() + '\n규칙은 화자와 상대가 명확할 때만 적용하고, 불확실하면 원문의 말투를 보존하세요. 서술문 규칙을 대사에 적용하지 마세요.' : '';

        // 1. Gemini key pool: round-robin across requests, try every configured key on failure.
        const geminiKeys = Array.from(new Set(String(state.settings.geminiApiKeys || state.settings.geminiApiKey || '')
          .split(/[\r\n,;]+/).map(function(k) { return k.trim(); }).filter(Boolean)));
        if (state.settings.engine !== 'free_gtx' && geminiKeys.length) {
          const modelName = (state.settings.geminiModel || DEFAULT_GEMINI_MODEL).trim();
          const startIndex = (window._ao3GeminiNextKeyIndex || 0) % geminiKeys.length;
          window._ao3GeminiNextKeyIndex = (startIndex + 1) % geminiKeys.length;
          const geminiCooldowns = window._ao3GeminiKeyCooldownUntil || (window._ao3GeminiKeyCooldownUntil = Object.create(null));
          let attemptedGeminiKeys = 0;
          // Bound the entire Gemini key-pool attempt for each batch. A list of several
          // slow keys must not multiply the fallback delay without limit.
          const geminiBatchDeadline = Date.now() + 12000;
          const systemInstructionText =
            '[번역 지침]\n' + customPrompt + characterStyleHint +
            fandomHint +
            '\n\n[출력 형식 규칙] 입력된 각 문단은 `<<<P_SEP>>>` 구분자로 나뉘어 있습니다. 반드시 입력된 문단 개수(' + preparedStrings.length + '개)와 정확히 동일한 개수로 번역하고, 각 문단 사이에 `<<<P_SEP>>>` 구분자를 그대로 유지하여 번역문만 출력하세요. 장면 구분선 `* * *`은 그대로 `* * *`로 유지하세요. 설명, 주석, 원문 재인용, 번역 라벨을 덧붙이지 마세요.';
          const userContentText =
            (prevContextHint ? (prevContextHint + '\n\n[번역할 원문 문단들]:\n') : '') +
            preparedStrings.join(' <<<P_SEP>>> ');

          for (let attempt = 0; attempt < geminiKeys.length; attempt++) {
            const geminiRemainingMs = geminiBatchDeadline - Date.now();
            if (geminiRemainingMs <= 0) break;
            const keyIndex = (startIndex + attempt) % geminiKeys.length;
            const apiKey = geminiKeys[keyIndex];
            if (Number(geminiCooldowns[apiKey] || 0) > Date.now()) continue;
            attemptedGeminiKeys++;
            try {
              setTranslationProviderStatus('Gemini', '요청 중 · 키 ' + (keyIndex + 1));
              const geminiController = new AbortController();
              const geminiTimeoutBudget = Math.max(500, Math.min(9000, geminiRemainingMs));
              const geminiTimeoutId = setTimeout(function() { geminiController.abort(); }, geminiTimeoutBudget);
              let res;
              try {
                res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(modelName) + ':generateContent?key=' + encodeURIComponent(apiKey), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemInstructionText }] },
                    contents: [{ role: 'user', parts: [{ text: userContentText }] }],
                    generationConfig: { temperature: 0.35 }
                  }),
                  signal: geminiController.signal
                });
              } finally {
                clearTimeout(geminiTimeoutId);
              }
              if (!res.ok) {
                let geminiErrorDetail = '';
                try {
                  const errorPayload = await res.json();
                  const apiError = errorPayload && errorPayload.error;
                  if (apiError) {
                    geminiErrorDetail = [apiError.status, apiError.message].filter(Boolean).join(': ');
                    if (!geminiErrorDetail && apiError.code) geminiErrorDetail = String(apiError.code);
                  }
                } catch (ignoreGeminiErrorBody) {}
                if (res.status === 429) {
                  const retryAfter = Number(res.headers.get('Retry-After') || 0);
                  const cooldownMs = retryAfter > 0 ? Math.min(retryAfter * 1000, 15 * 60 * 1000) : 60 * 1000;
                  geminiCooldowns[apiKey] = Date.now() + Math.max(1000, cooldownMs);
                }
                const geminiReason = 'HTTP ' + res.status + (geminiErrorDetail ? ' · ' + geminiErrorDetail : (res.status === 429 ? ' · 요청 한도 초과(429)' : ' · API 요청 실패'));
                setTranslationProviderStatus('Gemini', res.status === 429 ? '한도 초과 · 다음 API 확인' : '오류 · 다음 API 확인');
                recordTranslationProviderError('Gemini 키 ' + (keyIndex + 1), geminiReason);
                console.warn(
                  'Gemini key slot ' + (keyIndex + 1) + ' failed with HTTP ' + res.status +
                  (geminiErrorDetail ? ' (' + geminiErrorDetail + ')' : '') +
                  (res.status === 429 ? '; cooling down this key temporarily, then trying the next key/fallback.' : '; trying next key/fallback.')
                );
                continue;
              }
              const data = await res.json();
              const rawOut = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts
                ? data.candidates[0].content.parts.map(function(part) { return part.text || ''; }).join('') : '';
              const parts = rawOut.split(/\s*<<<P_SEP>>>\s*/);
              if (parts.length === enStrings.length && parts.every(function(part, idx) { return isSceneDividerLine(enStrings[idx]) || part.trim().length > 0; })) {
                const cleanParts = parts.map(function(part, idx) {
                  return isSceneDividerLine(enStrings[idx]) ? '* * *' : finalizeTranslatedParagraph(part);
                });
                const badIndex = cleanParts.findIndex(function(part, idx) {
                  return !isSceneDividerLine(enStrings[idx]) && hasUntranslatedEnglishResidue(preparedStrings[idx], part);
                });
                if (badIndex === -1) {
                  cleanParts.translationProvider = 'Gemini';
                  setTranslationProviderStatus('Gemini', '번역 완료');
                  return cleanParts;
                }
                recordTranslationProviderError('Gemini', '문단 ' + (badIndex + 1) + '에 영어 원문 잔여 또는 불완전한 문장이 있어 결과를 채택하지 않았습니다.');
                console.warn('Gemini output for paragraph ' + (badIndex + 1) + ' contained leftover English/formatting or an incomplete sentence; trying Workers AI/Groq/Azure fallback for the batch.');
                break;
              }
              recordTranslationProviderError('Gemini', '응답 문단 수가 원문과 일치하지 않아 결과를 채택하지 않았습니다.');
              console.warn('Gemini response format mismatch; trying next key/fallback.');
            } catch (err) {
              recordTranslationProviderError('Gemini 키 ' + (keyIndex + 1), err && err.message ? err.message : err);
              console.warn('Gemini request failed; trying next key/fallback.', err && err.message ? err.message : err);
            }
          }
          if (attemptedGeminiKeys === 0) {
            recordTranslationProviderError('Gemini', '설정된 모든 키가 일시 제한 중이거나 요청 가능한 키가 없습니다.');
            console.info('Gemini keys are temporarily rate-limited; skipping Gemini for this batch and continuing to fallback engines.');
          }
          // All Gemini keys failed or are cooling down; try Workers AI, then Groq with Azure hedge, then free endpoint.
        }

        // 2. Cloudflare Workers AI fallback (the second engine after Gemini).
        async function attemptWorkersAIProvider() {
          if (state.settings.engine === 'free_gtx') return null;
          if (state.settings.workersAiEnabled === false) {
            setTranslationProviderStatus('Cloudflare Workers AI', '사용 안 함 · Groq로 전환');
            return null;
          }
          if (!window._ao3CloudflareProviderConfigReady) await refreshCloudflareProviderConfig();
          if (!window._ao3CloudflareServerProviders || !window._ao3CloudflareServerProviders.workersAI) {
            recordTranslationProviderError('Cloudflare Workers AI', 'Worker에 AI 바인딩이 없거나 새 버전이 아직 배포되지 않았습니다.');
            setTranslationProviderStatus('Cloudflare Workers AI', '바인딩 미설정 · Groq로 전환');
            return null;
          }
          const model = String(state.settings.workersAiModel || '@cf/zai-org/glm-4.7-flash').trim();
          const baseContext = (contextMeta && contextMeta.prevContext) || '';
          const translated = [];
          try {
            // Four-paragraph batches retain nearby context while halving serial round-trips
            // compared with two-paragraph requests. A malformed batch is repaired locally.
            const workersBatchSize = 4;
            for (let start = 0; start < preparedStrings.length; start += workersBatchSize) {
              const texts = preparedStrings.slice(start, start + workersBatchSize);
              const recentContext = preparedStrings.slice(Math.max(0, start - 2), start).filter(Boolean).join('\n\n');
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
            }
            if (translated.length !== preparedStrings.length) throw new Error('Workers AI 번역 결과가 불완전합니다.');
            const clean = translated.map(function(text, idx) {
              return isSceneDividerLine(enStrings[idx]) ? '* * *' : finalizeTranslatedParagraph(text);
            });
            const badIndex = clean.findIndex(function(text, idx) {
              return !isSceneDividerLine(enStrings[idx]) && hasUntranslatedEnglishResidue(preparedStrings[idx], text);
            });
            if (badIndex !== -1) throw new Error('문단 ' + (badIndex + 1) + '에 영어 잔존 또는 불완전한 번역이 감지되었습니다.');
            clean.translationProvider = 'Cloudflare Workers AI';
            setTranslationProviderStatus('Cloudflare Workers AI', '번역 완료 · 결과 검사 통과');
            return clean;
          } catch (error) {
            recordTranslationProviderError('Cloudflare Workers AI', error && error.message ? error.message : error);
            setTranslationProviderStatus('Cloudflare Workers AI', '실패 · Groq로 전환');
            console.warn('Workers AI translation failed; falling back to Groq/Azure.', error && error.message ? error.message : error);
            return null;
          }
        }

        const workersAiTranslations = await attemptWorkersAIProvider();
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
        if (state.settings.engine !== 'free_gtx') {
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
              // Three paragraphs per request balance context, output size, and TPM budget.
              // If alignment breaks, only that failed mini-batch is retried paragraph-by-paragraph.
              const groqBatchSize = 3;
              const groqTranslations = [];
              const groqBaseContext = (contextMeta && contextMeta.prevContext) || '';
              for (let groqStart = 0; groqStart < preparedStrings.length; groqStart += groqBatchSize) {
                const groqTexts = preparedStrings.slice(groqStart, groqStart + groqBatchSize);
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
              }
              if (groqTranslations.length === preparedStrings.length) {
                const cleanGroqTranslations = groqTranslations.map(function(text, idx) {
                  return isSceneDividerLine(enStrings[idx]) ? '* * *' : finalizeTranslatedParagraph(text);
                });
                const badGroqIndex = cleanGroqTranslations.findIndex(function(text, idx) {
                  return !isSceneDividerLine(enStrings[idx]) && hasUntranslatedEnglishResidue(preparedStrings[idx], text);
                });
                if (badGroqIndex !== -1) {
                  throw new Error('Groq translation paragraph ' + (badGroqIndex + 1) + ' appears to contain untranslated English or incomplete punctuation; falling back to free translation for the batch.');
                }
                cleanGroqTranslations.translationProvider = 'Groq';
                setTranslationProviderStatus('Groq', '번역 완료');
                return cleanGroqTranslations;
              }
              throw new Error('Groq translation returned an incomplete paragraph batch.');
            } catch (groqError) {
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
              recordTranslationProviderError('Groq', groqError && groqError.message ? groqError.message : ('HTTP ' + (status || '오류')));
              console.warn('Groq translation failed; allowing Azure backup to win if it is already running.', groqError && groqError.message ? groqError.message : groqError);
            }
          } else if (state.settings.groqEnabled === false) {
            setTranslationProviderStatus('Groq', '사용 안 함 · Azure 백업');
            console.info('Groq auto-use is disabled in settings; skipping it and continuing to free fallback after Azure.');
          } else if (groqCooldowns.groq > Date.now()) {
            const cooldownSeconds = Math.ceil((Number(groqCooldowns.groq) - Date.now()) / 1000);
            setTranslationProviderStatus('Groq', '제한으로 건너뜀 · 약 ' + cooldownSeconds + '초 후 재시도 가능');
            recordTranslationProviderError('Groq', '이전 HTTP 429로 일시 제한 중입니다. 남은 대기 시간 약 ' + cooldownSeconds + '초; 이번 번역은 Groq를 건너뛰고 다른 공급자로 진행합니다.');
            console.info('Groq is temporarily rate-limited; skipping it for this batch.');
          }
        }


          return null;
        }
        async function attemptAzureProvider() {
        // Azure backup attempt. It can run in parallel when Groq exceeds the hedge delay.
        if (!window._ao3CloudflareProviderConfigReady) await refreshCloudflareProviderConfig();
        const azureKey = String(state.settings.azureApiKey || '').trim();
        const azureServerSecretAvailable = Boolean(window._ao3CloudflareServerProviders && window._ao3CloudflareServerProviders.azure);
        const azureCooldownKey = azureKey || (azureServerSecretAvailable ? '__cloudflare_azure_secret__' : '');
        const azureCoolingDown = window._ao3AzureCooldownKey === azureCooldownKey && Number(window._ao3AzureCooldownUntil || 0) > Date.now();
        if (state.settings.engine !== 'free_gtx' && (azureKey || azureServerSecretAvailable) && !azureCoolingDown) {
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
                  const pieces = normalizedTranslatedText.split(marker);
                  if (pieces.length !== record.pieces.length) {
                    azureSucceeded = false;
                    lastAzureErrorDetail = 'Azure가 문맥 묶음의 문단 구분자를 변경했습니다. 문단 대응을 보장할 수 없어 다른 공급자 대체로 전환합니다.';
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
                  (!text || hasUntranslatedEnglishResidue(preparedStrings[idx], text));
              });
              if (badAzureIndex === -1) {
                azureCleaned.translationProvider = 'Azure Translator';
                setTranslationProviderStatus('Azure Translator', '번역 완료 · 결과 검사 통과');
                return azureCleaned;
              }
              // Do not save a questionable Azure result as successful. Continue to
              // the existing free Google fallback below, preserving provider order.
              azureSucceeded = false;
              lastAzureErrorDetail = '문단 ' + (badAzureIndex + 1) + '에 영어 잔존 또는 불완전한 번역이 감지되어 Groq 대체로 전환했습니다.';
              recordTranslationProviderError('Azure Translator', lastAzureErrorDetail);
              setTranslationProviderStatus('Azure Translator', '결과 검사 실패 · Groq 전환');
            }

            if (lastAzureResponse && (lastAzureResponse.status === 429 || lastAzureResponse.status === 401 || lastAzureResponse.status === 403)) {
              const cooldownMs = lastAzureResponse.status === 429 ? 60 * 1000 : 10 * 60 * 1000;
              window._ao3AzureCooldownKey = azureCooldownKey;
              window._ao3AzureCooldownUntil = Date.now() + cooldownMs;
            }
            const azureStatusText = lastAzureResponse ? ('HTTP ' + lastAzureResponse.status) : '응답 없음';
            recordTranslationProviderError('Azure Translator', azureStatusText + (lastAzureErrorDetail ? ' · ' + String(lastAzureErrorDetail).slice(0, 300) : ' · 요청을 완료하지 못했습니다.'));
            setTranslationProviderStatus('Azure Translator', lastAzureResponse && lastAzureResponse.status === 429 ? '요청 한도 · Groq 전환' : '실패 · Groq 전환');
            console.warn(
              'Azure Translator failed with HTTP ' + (lastAzureResponse ? lastAzureResponse.status : 'unknown') +
              (lastAzureErrorDetail ? ': ' + String(lastAzureErrorDetail).slice(0, 700) : '') +
              (lastAzureResponse && lastAzureResponse.status === 429 ? '; Azure was retried once after waiting; continuing to free fallback.' :
               lastAzureResponse && (lastAzureResponse.status === 401 || lastAzureResponse.status === 403) ? '; check Translator credentials/region/permissions; continuing to free fallback.' :
               '; continuing to Groq fallback.')
            );
          } catch (azureError) {
            recordTranslationProviderError('Azure Translator', azureError && azureError.message ? azureError.message : azureError);
            setTranslationProviderStatus('Azure Translator', '백업 요청 오류');
            console.warn('Azure Translator backup request failed.', azureError && azureError.message ? azureError.message : azureError);
          }
        } else if (azureCoolingDown && state.settings.engine !== 'free_gtx') {
          setTranslationProviderStatus('Azure Translator', '일시 제한');
          recordTranslationProviderError('Azure Translator', '이전 요청의 401/403 또는 429 오류로 일시 건너뛰고 Groq로 전환합니다.');
          console.info('Azure Translator is temporarily cooling down after a rate/authorization error; skipping it and continuing to Groq fallback.');
        }


          return null;
        }

        // Keep priority: Gemini first; then Groq. If Groq has not returned a validated
        // result within 3.5s, start Azure in parallel. If Groq fails earlier, start Azure
        // immediately. The first VALID result wins; failed/invalid outputs never race as winners.
        const groqOutcome = attemptGroqProvider().then(
          function(result) { return { provider: 'Groq', result: result || null }; },
          function(error) { recordTranslationProviderError('Groq', error && error.message || error); return { provider: 'Groq', result: null }; }
        );
        let azureOutcome = null;
        let azureStarted = false;
        function startAzureBackup() {
          if (!azureStarted) {
            azureStarted = true;
            azureOutcome = attemptAzureProvider().then(
              function(result) { return { provider: 'Azure Translator', result: result || null }; },
              function(error) { recordTranslationProviderError('Azure Translator', error && error.message || error); return { provider: 'Azure Translator', result: null }; }
            );
          }
          return azureOutcome;
        }
        const first = await Promise.race([
          groqOutcome,
          ao3Sleep(3500).then(function() { return { provider: 'hedge-timer', result: null }; })
        ]);
        if (first.provider === 'Groq' && first.result) {
          azureRaceController.abort();
          setTranslationProviderStatus('Groq', '번역 완료 · 우선 결과');
          return first.result;
        }
        const azurePromise = startAzureBackup();
        if (first.provider === 'Groq') {
          const backup = await azurePromise;
          if (backup.result) {
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

        // 4. Free Google Translate GTX endpoint (last resort after Gemini, Workers AI, Groq and Azure). Never silently return English as a translation.
        setTranslationProviderStatus('Google 번역', '최후 대체 요청 중');
        const googleErrors = [];
        const googleResults = new Array(preparedStrings.length);
        // Chunk within a safe URL size. This keeps the final free fallback from turning
        // a long chapter into dozens of serial network requests.
        const googleBatches = [];
        let googleBatch = [];
        let googleBatchChars = 0;
        for (let idx = 0; idx < preparedStrings.length; idx++) {
          const text = preparedStrings[idx];
          const extra = text.length + (googleBatch.length ? 2 : 0);
          if (googleBatch.length && googleBatchChars + extra > 3800) {
            googleBatches.push(googleBatch);
            googleBatch = [];
            googleBatchChars = 0;
          }
          googleBatch.push({ index: idx, text: text });
          googleBatchChars += text.length + (googleBatch.length > 1 ? 2 : 0);
        }
        if (googleBatch.length) googleBatches.push(googleBatch);

        async function translateGoogleSingle(item) {
          if (isSceneDividerLine(enStrings[item.index])) return '* * *';
          const singleUrl = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=' + encodeURIComponent(item.text);
          const response = await fetchWithTimeout(singleUrl, {}, 12000);
          if (!response.ok) throw new Error('문단 ' + (item.index + 1) + ' 실패: HTTP ' + response.status + (response.status === 429 ? ' · 요청 한도 초과' : ''));
          const data = await response.json();
          const koText = Array.isArray(data && data[0]) ? data[0].map(function(segment) { return segment[0] || ''; }).join('') : '';
          if (!koText.trim()) throw new Error('문단 ' + (item.index + 1) + ' 결과가 비어 있습니다.');
          const finalText = finalizeTranslatedParagraph(koText);
          if (hasUntranslatedEnglishResidue(item.text, finalText)) throw new Error('문단 ' + (item.index + 1) + '에 영어 원문이 남아 있습니다.');
          return finalText;
        }

        for (let batchIndex = 0; batchIndex < googleBatches.length; batchIndex++) {
          const batch = googleBatches[batchIndex];
          let batchAccepted = false;
          const joined = batch.map(function(item) { return item.text; }).join('\n\n');
          if (joined.length <= 4200) {
            try {
              const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=' + encodeURIComponent(joined);
              const response = await fetchWithTimeout(url, {}, 12000);
              if (!response.ok) throw new Error('HTTP ' + response.status + (response.status === 429 ? ' · 요청 한도 초과' : ''));
              const data = await response.json();
              if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('응답 JSON 형식이 예상과 다름');
              const fullTranslated = data[0].map(function(segment) { return segment[0] || ''; }).join('');
              const splitBack = fullTranslated.split(/\n\s*\n/);
              if (splitBack.length !== batch.length || splitBack.some(function(part, idx) { return !isSceneDividerLine(enStrings[batch[idx].index]) && !String(part || '').trim(); })) {
                throw new Error('묶음 응답의 문단 구분이 원문과 일치하지 않음');
              }
              const stagedBatch = splitBack.map(function(part, localIndex) {
                const item = batch[localIndex];
                if (isSceneDividerLine(enStrings[item.index])) return '* * *';
                const finalText = finalizeTranslatedParagraph(part);
                if (hasUntranslatedEnglishResidue(item.text, finalText)) throw new Error('문단 ' + (item.index + 1) + '에 영어 원문이 남아 있습니다.');
                return finalText;
              });
              stagedBatch.forEach(function(text, localIndex) { googleResults[batch[localIndex].index] = text; });
              batchAccepted = true;
            } catch (err) {
              googleErrors.push('묶음 ' + (batchIndex + 1) + ': ' + String(err && err.message || err));
            }
          } else {
            googleErrors.push('묶음 ' + (batchIndex + 1) + ': URL 길이 제한으로 개별 요청 전환');
          }

          if (!batchAccepted) {
            setTranslationProviderStatus('Google 번역', '문단별 대체 번역 중 · 묶음 ' + (batchIndex + 1) + '/' + googleBatches.length);
            // Retry only the malformed/oversized batch item-by-item; earlier accepted
            // batches remain staged but are still committed only if every paragraph succeeds.
            for (let localIndex = 0; localIndex < batch.length; localIndex++) {
              const item = batch[localIndex];
              try {
                googleResults[item.index] = await translateGoogleSingle(item);
              } catch (err) {
                recordTranslationProviderError('Google 번역', (err && err.message ? err.message : String(err)) + (googleErrors.length ? ' · 묶음 오류: ' + googleErrors.slice(-2).join('; ') : ''));
                setTranslationProviderStatus('Google 번역', '실패 · 번역 중단');
                throw new Error('모든 번역 API가 이 문단 묶음을 완료하지 못했습니다. 원문을 번역문으로 저장하지 않았습니다. ' + getTranslationProviderErrorSummary());
              }
              if (localIndex + 1 < batch.length) await ao3Sleep(100);
            }
          }
        }
        if (googleResults.some(function(value, index) { return typeof value !== 'string' || (!value.trim() && !isSceneDividerLine(enStrings[index])); })) {
          recordTranslationProviderError('Google 번역', '번역 결과에서 빈 문단을 감지했습니다.');
          throw new Error('무료 번역 결과에 빈 문단이 있어 저장하지 않았습니다.');
        }
        googleResults.translationProvider = 'Google 번역';
        setTranslationProviderStatus('Google 번역', '번역 완료');
        return googleResults;
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
              progressCallback(Math.min(total, completedParagraphs), total);
            }
          }));
          const failedGroupTask = groupResults.find(function(result) { return result.status === 'rejected'; });
          if (failedGroupTask) throw failedGroupTask.reason;
          // Parallelism is enabled only after a fully validated Gemini batch, where quality
          // and latency are predictable. A fallback batch returns to serial mode to avoid
          // bursts against Workers AI/Groq free-tier TPM and Azure character quotas.
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
        const ch = state.draftChapters[idx];
        if (!ch) return;
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
          showToast('번역에 실패했습니다. 진행 창에서 API 오류 이유를 확인하세요.', 'warning');
        }
      }

      async function runTranslateAllDrafts() {
        if (state.draftChapters.length === 0) {
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
        for (let i = 0; i < state.draftChapters.length; i++) {
          const ch = state.draftChapters[i];
          if (ch.translated) continue;
          statusText.textContent = '(' + (i + 1) + '/' + state.draftChapters.length + ') "' + ch.title + '" 번역 중...';
          try {
            await translateDraftChapter(ch, function(done, total) {
              const overallPct = Math.round(((i + (done / Math.max(1, total))) / state.draftChapters.length) * 100);
              percentText.textContent = overallPct + '%';
              bar.style.width = overallPct + '%';
            });
            renderStudio();
          } catch (err) {
            statusText.textContent = '챕터 ' + (i + 1) + ' 번역 실패 · 이후 챕터는 중단됨';
            recordTranslationProviderError('챕터 ' + (i + 1), err && err.message ? err.message : err);
            setTranslationProviderStatus(window._ao3LastTranslationProvider || 'API', '실패');
            showToast('번역 실패 이유를 진행 창에서 확인하세요.', 'warning');
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
          return '<div class="flex items-center gap-1"><button type="button" data-custom-shelf="' + escapeHtml(shelf.id) + '" class="custom-shelf-select flex-1 min-w-0 text-left px-3 py-2 rounded-xl border text-sm ' + (selected ? 'bg-rose-50 text-rose-800 border-rose-200' : 'border-transparent text-slate-700 hover:bg-slate-50') + '"><span class="block truncate font-semibold">' + escapeHtml(shelf.name) + '</span><span class="block text-xs opacity-70 mt-0.5">' + count + '권</span></button></div>';
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
        const shelf = getCustomShelfById(state.selectedCustomShelfId);
        const isAll = state.selectedCustomShelfId === 'all' || !shelf;
        document.getElementById('customShelfCurrentTitle').textContent = isAll ? '모든 번역 작품' : shelf.name;
        document.getElementById('customShelfCurrentDescription').textContent = isAll ? '기본 책장 · 작품은 여기서 삭제되지 않습니다.' : (shelf.type === 'author' ? '작가별 책장 · 원하는 작품을 직접 선택해 담으세요.' : '주제별 책장 · 원하는 작품을 직접 선택해 담으세요.');
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
          list.innerHTML = '<p class="text-xs text-slate-500 mb-3">전체 번역 작품을 모아 보는 기본 책장입니다. 작가별·주제별 책장에 담으려면 해당 책장을 선택하고 ‘작품 추가’를 눌러 검색하세요.</p>' + (visible.length ? visible.map(function(n) {
            const chapterCount = Array.isArray(n.chapters) ? n.chapters.length : 0;
            return '<article class="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300"><div class="shrink-0 w-10 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-xl">📖</div><div class="min-w-0 flex-1"><h4 class="font-semibold text-sm text-slate-900 break-words">' + renderNovelTitleMarkup(n.title || '제목 없는 작품') + '</h4><p class="text-xs text-slate-500 mt-1">' + escapeHtml(n.author || '작가 미상') + ' · ' + chapterCount + '챕터</p></div><button type="button" data-open-custom-novel="' + escapeHtml(n.id) + '" class="shrink-0 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold">열기</button></article>';
          }).join('') : '<p class="text-sm text-slate-500 py-8 text-center">선택한 태그에 해당하는 작품이 없습니다.</p>');
        } else {
          list.innerHTML = '<p class="text-xs text-slate-500 mb-3">이 책장에 직접 담은 작품만 표시됩니다. 작품을 추가하려면 ‘작품 추가’를 누르고 제목이나 작가를 검색하세요.</p>' + (visible.length ? visible.map(function(n) {
            const chapterCount = Array.isArray(n.chapters) ? n.chapters.length : 0;
            return '<article class="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-rose-200"><div class="shrink-0 w-10 h-12 rounded-lg bg-rose-50 flex items-center justify-center text-xl">📖</div><div class="min-w-0 flex-1"><h4 class="font-semibold text-sm text-slate-900 break-words">' + renderNovelTitleMarkup(n.title || '제목 없는 작품') + '</h4><p class="text-xs text-slate-500 mt-1">' + escapeHtml(n.author || '작가 미상') + ' · ' + chapterCount + '챕터</p></div><button type="button" data-open-custom-novel="' + escapeHtml(n.id) + '" class="shrink-0 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold">열기</button><button type="button" data-remove-custom-novel="' + escapeHtml(n.id) + '" class="shrink-0 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-700 text-xs font-semibold">책장에서 제거</button></article>';
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
        state.reader.theme = normalizeReaderTheme(state.reader.theme);
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
        state.reader.font = 'sans';
        headingEl.className = 'text-lg sm:text-xl font-bold leading-snug reader-sans';

        const pContainer = document.getElementById('readerParagraphsContainer');
        pContainer.className = 'space-y-5 leading-relaxed reader-sans';
        pContainer.style.fontSize = state.reader.fontSize + 'px';
        document.getElementById('readerFontSizeLabel').textContent = state.reader.fontSize + 'px';
        document.querySelectorAll('.reader-theme-btn').forEach(function(themeBtn) {
          const active = themeBtn.getAttribute('data-theme') === state.reader.theme;
          themeBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
          themeBtn.classList.toggle('ring-2', active);
          themeBtn.classList.toggle('ring-rose-400', active);
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
          const displayText = storedKoreanText.trim()
            ? applyTextReplacements(storedKoreanText)
            : String(p.en || '');
          const originalText = String(p.en || '').trim();
          const hasOriginal = Boolean(originalText && originalText !== displayText.trim());
          const sentenceHtml = renderSentenceSpans(displayText, novel.id, chapter.id, p.id);
          return '<div class="reader-paragraph" id="reader-p-' + escapeHtml(p.id) + '"' + (hasOriginal ? ' data-original-toggle="true" aria-expanded="false" title="터치하면 원문 표시/숨김"' : '') + '><p class="leading-relaxed whitespace-pre-line">' + sentenceHtml + '</p>' +
            (hasOriginal ? '<p class="reader-original" lang="en">' + escapeHtml(p.en) + '</p>' : '') +
            '</div>';
        }).join('');
        attachSentenceBookmarkEvents();
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

        document.getElementById('bookmarkModalTitle').querySelector('span').textContent = '소설 북마크 & 태그 설정 (' + novel.title + ')';
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
        // Brand home
        document.getElementById('brandHomeBtn').addEventListener('click', function() {
          switchView('bookshelf');
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

        // Main Navigation Tabs
        document.querySelectorAll('.nav-tab-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            switchView(btn.getAttribute('data-view'));
          });
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

        // Automatic 1-Step Pipeline: Auto-assign Title & Author from AO3 -> Translate all Chapters -> Auto-Save to Bookshelf -> Switch to Bookshelf!
        async function autoTranslateAndSaveWorkToBookshelf(parsed, sourceUrl) {
          if (!parsed || !parsed.chapters || parsed.chapters.length === 0) return null;

          // AO3 Summary discovery/translation is disabled. Keep imported works'
          // user memo blank; title, author, fandom, and chapter import continue normally.
          parsed.meta = parsed.meta || {};
          parsed.meta.summary = '';

          // Clear draftChapters and stage this work's chapters for live progress translation
          state.draftChapters = [];
          appendParsedWorkToDrafts(parsed, sourceUrl);
          renderStudio();

          // 1. Translate all chapters into Korean; never save a failed translation as if complete.
          const allDraftsTranslated = await runTranslateAllDrafts();
          if (!allDraftsTranslated || state.draftChapters.some(function(ch) { return !ch.translated; })) {
            throw new Error('번역이 완료되지 않아 책장에 저장하지 않았습니다. 번역 창의 API 오류를 확인한 뒤 다시 시도해 주세요.');
          }

          // 2. Auto-determine Novel Title and Author from AO3 page metadata
          const rawMetaTitle = (parsed.meta && parsed.meta.title ? parsed.meta.title.trim() : '') ||
            document.getElementById('novelTitleInput').value.trim() ||
            (state.draftChapters[0] ? state.draftChapters[0].title : 'AO3 번역 소설');

          let finalTitle = rawMetaTitle;
          // If title is in English, also translate title to Korean and format cleanly
          if (/[a-zA-Z]{2,}/.test(rawMetaTitle) && !/[가-힣]/.test(rawMetaTitle)) {
            try {
              const koTitleArr = await translateParagraphBatch([rawMetaTitle]);
              const koTitle = (koTitleArr && koTitleArr[0]) ? koTitleArr[0].trim() : '';
              if (koTitle && koTitle !== rawMetaTitle && !koTitle.startsWith('[')) {
                finalTitle = koTitle + ' (' + rawMetaTitle + ')';
              }
            } catch (e) {
              finalTitle = rawMetaTitle;
            }
          }

          const rawAuthor = (parsed.meta && parsed.meta.author ? parsed.meta.author.trim() : '') ||
            document.getElementById('novelAuthorInput').value.trim() ||
            'Anonymous';
          const finalAuthor = cleanAo3AuthorName(rawAuthor) || 'Anonymous';
          const finalFandom = (parsed.meta && parsed.meta.fandom ? parsed.meta.fandom.trim() : '') ||
            document.getElementById('novelFandomInput').value.trim() || '';
          // AO3 summaries are not imported; keep the existing user memo untouched.
          const finalSummary = '';

          // 3. Build bound chapters
          const chaptersCopy = state.draftChapters.map(function(ch) {
            return {
              id: 'ch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
              title: ch.title,
              sourceUrl: ch.sourceUrl || sourceUrl || '',
              paragraphs: (ch.paragraphs || []).map(function(p) {
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

          // Check if user explicitly selected "append to existing novel" OR if a novel with the exact same AO3 workId/title already exists
          const workIdMatch = (sourceUrl || '').match(/\/works\/(\d+)/);
          const workId = workIdMatch ? workIdMatch[1] : null;

          let targetNovel = null;
          if (state.studioBindMode === 'append') {
            const targetId = document.getElementById('appendTargetNovelSelect').value;
            targetNovel = state.novels.find(function(n) { return n.id === targetId; });
          } else if (workId) {
            targetNovel = state.novels.find(function(n) { return n.ao3WorkId === workId; });
          }

          if (targetNovel) {
            targetNovel.chapters = (targetNovel.chapters || []).concat(chaptersCopy);
            // Preserve all existing user-authored memo text when appending chapters.
            targetNovel.lastReadAt = Date.now();
            if (isBookmarked) {
              targetNovel.bookmarked = true;
              rawTags.forEach(function(t) {
                if (!targetNovel.bookmarkTags.includes(t)) targetNovel.bookmarkTags.push(t);
              });
            }
            saveToStorage();
            state.draftChapters = [];
            document.getElementById('studioBookmarkCheck').checked = false;
            document.getElementById('studioBookmarkTagsInput').value = '';
            showToast('"' + targetNovel.title + '" 소설에 ' + chaptersCopy.length + '개 챕터가 자동 병합·저장되었습니다!');
            return targetNovel;
          }

          const newNovel = {
            id: 'novel_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            ao3WorkId: workId || null,
            title: finalTitle,
            author: finalAuthor,
            fandom: finalFandom,
            summary: finalSummary,
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

          // Reset studio draft state
          state.draftChapters = [];
          document.getElementById('novelTitleInput').value = '';
          document.getElementById('novelAuthorInput').value = '';
          document.getElementById('novelFandomInput').value = '';
          document.getElementById('novelSummaryInput').value = '';
          document.getElementById('studioBookmarkCheck').checked = false;
          document.getElementById('studioBookmarkTagsInput').value = '';

          return newNovel;
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
            switchView('bookshelf');
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
            if (parsed.meta.fandom && !fandomInput.value.trim()) {
              fandomInput.value = parsed.meta.fandom;
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



        document.getElementById('copyAo3ExtractorScriptBtn').addEventListener('click', function() {
          const bookmarkletCode = "javascript:(function(){var h=document.documentElement.outerHTML;navigator.clipboard.writeText(h).then(function(){document.title='[복사완료] '+document.title;});})();";
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(bookmarkletCode);
            }
          } catch (e) {}
          const logList = document.getElementById('ao3FetchLogList');
          if (logList) logList.innerHTML = '';
          appendFetchLog('📋 [1클릭 추출 북마클릿 코드 복사 완료]');
          appendFetchLog('1) AO3에서 원하는 소설 페이지(Entire Work)를 여세요.');
          appendFetchLog('2) 가장 빠르고 확실한 방법: AO3 상단 우측의 [Download → HTML]을 누른 뒤 내려받은 파일을 이 화면으로 드래그하거나 [AO3 HTML/TXT 파일 불러오기]를 누르면 전 챕터가 1초 만에 자동 분리·번역됩니다.');
          appendFetchLog('3) 또는 브라우저 주소창/북마크에 방금 복사된 스크립트를 실행하면 HTML 전체가 복사되어 [직접 붙여넣기] 탭에서 100% 자동 파싱됩니다.');
          showToast('1클릭 추출 스크립트 및 안내가 표시되었습니다.');
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

        document.getElementById('ao3HtmlFileInput').addEventListener('change', async function(e) {
          const files = Array.from(e.target.files || []);
          if (files.length === 0) return;

          let lastSavedNovel = null;
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const text = await file.text();
            let parsed = null;
            if (file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm') || text.includes('<div') || text.includes('<p')) {
              parsed = parseAo3HtmlDocument(text, '');
            }
            if (!parsed || !parsed.chapters || parsed.chapters.length === 0) {
              const lines = text.split(/\n\s*\n|\n/).map(function(s) { return s.trim(); }).filter(Boolean);
              if (lines.length > 0) {
                parsed = {
                  meta: { title: file.name.replace(/\.[^.]+$/, ''), author: 'AO3 Author' },
                  chapters: [{ title: file.name.replace(/\.[^.]+$/, ''), paragraphs: lines }]
                };
              }
            }
            if (parsed && parsed.chapters && parsed.chapters.length > 0) {
              lastSavedNovel = await autoTranslateAndSaveWorkToBookshelf(parsed, '');
            }
          }

          e.target.value = '';
          if (lastSavedNovel) {
            switchView('bookshelf');
            showToast('"' + lastSavedNovel.title + '" (원작자: ' + lastSavedNovel.author + ') 소설이 자동 번역되어 책장에 저장되었습니다!');
          } else {
            showToast('선택한 파일에서 본문을 찾지 못했습니다.', 'warning');
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
          if (!/^https?:\/\/(?:www\.)?(?:archiveofourown|ao3)\.org\/works\/\d+(?:\/chapters\/\d+)?(?:[/?#]|$)/i.test(currentUrl)) {
            throw new Error('AO3 작품 링크(/works/번호) 또는 챕터 링크(/works/번호/chapters/번호)를 입력해 주세요.');
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
            switchView('bookshelf');
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
          if (!/^https?:\/\/(?:www\.)?(?:archiveofourown|ao3)\.org\/works\/\d+(?:\/chapters\/\d+)?(?:[/?#]|$)/i.test(url)) {
            showToast('AO3 작품 링크(/works/번호) 또는 챕터 링크(/works/번호/chapters/번호)를 입력해 주세요.', 'warning'); return;
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
                switchView('bookshelf');
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
            switchView('bookshelf');
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
            await runTranslateAllDrafts();
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

        document.querySelectorAll('.reader-theme-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            state.reader.theme = btn.getAttribute('data-theme');
            saveReaderPreferences();
            renderReader();
          });
        });

        state.reader.font = 'sans';

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
        document.getElementById('readerAddMoreChaptersBtn').addEventListener('click', function() {
          const targetId = state.reader.novelId;
          state.studioBindMode = 'append';
          switchView('studio');
          const select = document.getElementById('appendTargetNovelSelect');
          if (select && targetId) select.value = targetId;
        });

        document.getElementById('readerEditNovelTitleBtn').addEventListener('click', function() {
          if (state.reader.novelId) openEditNovelModal(state.reader.novelId);
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

        // Reader AI Retranslate Chapter button
        document.getElementById('readerRetranslateChapterBtn').addEventListener('click', async function() {
          const novel = state.novels.find(function(n) { return n.id === state.reader.novelId; });
          if (!novel || !novel.chapters || !novel.chapters[state.reader.chapterIndex]) return;
          const ch = novel.chapters[state.reader.chapterIndex];
          const btn = document.getElementById('readerRetranslateChapterBtn');
          const origText = btn.textContent;
          btn.disabled = true;
          btn.textContent = '번역 중...';
          showToast('현재 설정된 번역 모델 및 프롬프트로 이 챕터를 다시 번역합니다...');
          try {
            await translateDraftChapter(ch, function(done, total) {
              btn.textContent = Math.round((done / Math.max(1, total)) * 100) + '%';
            }, novel.fandom || '');
            saveToStorage();
            renderReader();
            showToast('이 챕터의 재번역이 완료되었습니다!');
          } catch (err) {
            showToast('재번역 실패: ' + String(err && err.message || err).slice(0, 180), 'warning');
            alert('챕터 재번역에 실패했습니다. 원문을 번역문으로 저장하지 않았습니다.\n\n' + String(err && err.message || err).slice(0, 1200));
          } finally {
            btn.disabled = false;
            btn.textContent = origText;
          }
        });

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
          const isDark = document.documentElement.getAttribute('data-app-theme') !== 'light';
          const rules = [
            ['#settingsModal > div', { 'background-color': '#111a2b', color: '#f1f5fb', 'border-color': '#34435b' }],
            ['#workersAiApiBox', { 'background-color': '#2b2343', color: '#e8ddff', 'border-color': '#5a4b80' }],
            ['#groqApiKeyBox', { 'background-color': '#3b2a20', color: '#ffe6d1', 'border-color': '#76553d' }],
            ['#azureApiKeyBox', { 'background-color': '#1a2f49', color: '#deebff', 'border-color': '#3b5d81' }],
            ['#workersAiApiBox > label, #groqApiKeyBox > label, #settingsModal [class~="bg-white/80"]', { 'background-color': '#202c40', color: '#f1f5fb', 'border-color': '#52627a' }],
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
          const theme = document.documentElement.getAttribute('data-app-theme') === 'light' ? 'light' : 'dark';
          const darkBtn = document.getElementById('appThemeDarkBtn');
          const lightBtn = document.getElementById('appThemeLightBtn');
          if (darkBtn) darkBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
          if (lightBtn) lightBtn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
        }
        function setAppTheme(theme, announce) {
          const next = theme === 'light' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-app-theme', next);
          document.documentElement.style.colorScheme = next;
          try { localStorage.setItem('ao3-app-theme', next); } catch (e) {}
          scheduleDriveUserPreferencesSync();
          syncAppThemeButtons();
          applySettingsDarkPalette();
          if (typeof window.ensureAlwaysVisibleAo3Queue === 'function') window.ensureAlwaysVisibleAo3Queue();
          if (announce && typeof showToast === 'function') showToast(next === 'dark' ? '다크모드를 적용했습니다.' : '라이트모드를 적용했습니다.');
        }
        document.getElementById('appThemeDarkBtn').addEventListener('click', function() { setAppTheme('dark', true); });
        document.getElementById('appThemeLightBtn').addEventListener('click', function() { setAppTheme('light', true); });
        syncAppThemeButtons();
        applySettingsDarkPalette();

        // Settings Modal Events
        document.getElementById('openSettingsModalBtn').addEventListener('click', function() {
          const engineVal = state.settings.engine === 'free_gtx' ? 'free_gtx' : 'gemini_api';
          document.getElementById('translationEngineSelect').value = engineVal;
          document.getElementById('geminiModelSelect').value = state.settings.geminiModel || DEFAULT_GEMINI_MODEL;
          document.getElementById('geminiApiKeysInput').value = state.settings.geminiApiKeys || state.settings.geminiApiKey || '';
          document.getElementById('azureApiKeyInput').value = state.settings.azureApiKey || '';
          document.getElementById('azureRegionInput').value = state.settings.azureRegion || '';
          document.getElementById('groqApiKeyInput').value = state.settings.groqApiKey || '';
          document.getElementById('groqModelInput').value = state.settings.groqModel || 'openai/gpt-oss-120b';
          document.getElementById('groqAutoEnabledInput').checked = state.settings.groqEnabled !== false;
          document.getElementById('workersAiAutoEnabledInput').checked = state.settings.workersAiEnabled !== false;
          document.getElementById('workersAiModelInput').value = state.settings.workersAiModel || '@cf/zai-org/glm-4.7-flash';
          document.getElementById('translationPromptTextarea').value = state.settings.translationPrompt || DEFAULT_TRANSLATION_PROMPT;
          document.getElementById('glossaryTextarea').value = state.settings.textReplacements || '';
          document.getElementById('characterStyleRulesTextarea').value = state.settings.characterStyleRules || '';

          syncSettingsEngineBoxes(engineVal);
          document.getElementById('settingsModal').classList.remove('hidden');
          applySettingsDarkPalette();
        });

        document.getElementById('translationEngineSelect').addEventListener('change', function(e) {
          syncSettingsEngineBoxes(e.target.value);
        });

        document.getElementById('resetDefaultPromptBtn').addEventListener('click', function() {
          document.getElementById('translationPromptTextarea').value = DEFAULT_TRANSLATION_PROMPT;
          showToast('기본 소설 번역 프롬프트가 복원되었습니다.');
        });

        document.getElementById('closeSettingsModalBtn').addEventListener('click', function() {
          document.getElementById('settingsModal').classList.add('hidden');
        });

        document.getElementById('saveSettingsModalBtn').addEventListener('click', function() {
          state.settings.engine = document.getElementById('translationEngineSelect').value;
          delete state.settings.functionBackendUrl;
          state.settings.geminiModel = document.getElementById('geminiModelSelect').value;
          state.settings.geminiApiKeys = document.getElementById('geminiApiKeysInput').value.split(/[\r\n,;]+/).map(function(k) { return k.trim(); }).filter(Boolean).filter(function(k, i, a) { return a.indexOf(k) === i; }).join('\n');
          state.settings.geminiApiKey = (state.settings.geminiApiKeys.split(/\r?\n/).find(Boolean) || '');
          state.settings.azureApiKey = document.getElementById('azureApiKeyInput').value.trim();
          state.settings.azureRegion = document.getElementById('azureRegionInput').value.trim();
          state.settings.groqApiKey = document.getElementById('groqApiKeyInput').value.trim();
          state.settings.groqModel = document.getElementById('groqModelInput').value.trim() || 'openai/gpt-oss-120b';
          state.settings.groqEnabled = document.getElementById('groqAutoEnabledInput').checked;
          state.settings.workersAiEnabled = document.getElementById('workersAiAutoEnabledInput').checked;
          state.settings.workersAiModel = document.getElementById('workersAiModelInput').value || '@cf/zai-org/glm-4.7-flash';
          state.settings.translationPrompt = document.getElementById('translationPromptTextarea').value.trim() || DEFAULT_TRANSLATION_PROMPT;
          state.settings.glossary = ''; // Legacy pre-translation glossary disabled.
          state.settings.textReplacements = document.getElementById('glossaryTextarea').value;
          state.settings.characterStyleRules = document.getElementById('characterStyleRulesTextarea').value.trim();
          saveSettingsToStorage();
          // If the encrypted Drive vault was unlocked in this tab before, keep its backup current.
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
          document.getElementById('settingsModal').classList.add('hidden');
          if (state.currentView === 'studio') renderStudio();
          // Immediately refresh an open reader so replacement-table edits take effect
          // without changing chapters or reloading the page.
          if (state.currentView === 'reader') renderReader();
          showToast(isDriveTokenValid() ? '번역 프롬프트·작품별 말투 규칙·텍스트 치환표를 포함한 사용자 설정을 Google Drive에 동기화합니다.' : '번역 프롬프트·작품별 말투 규칙·텍스트 치환표를 포함한 설정을 기기에 저장했습니다. Google Drive 연결 시 자동 동기화됩니다.');
        });

        // Header Google Drive Quick Sync Button
        document.getElementById('driveSyncBtn').addEventListener('click', function() {
          if (isDriveTokenValid()) {
            syncWithGoogleDrive(false);
          } else {
            connectAndSyncGoogleDrive();
          }
        });

        // Backup, File Download/Upload & Google Drive Modal Events
        document.getElementById('openBackupModalBtn').addEventListener('click', function() {
          document.getElementById('backupJsonTextarea').value = JSON.stringify(state.novels, null, 2);
          document.getElementById('googleClientIdInput').value = state.settings.googleClientId || DEFAULT_GOOGLE_CLIENT_ID;
          document.getElementById('backupModal').classList.remove('hidden');
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
          document.getElementById('backupModal').classList.add('hidden');
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
            renderBookshelf();
            showToast('총 ' + parsed.length + '권의 소설 데이터가 서재에 복원되었습니다!');
          } catch (err) {
            showToast('JSON 구문 오류가 있습니다. 복사한 데이터를 확인해 주세요.', 'error');
          }
        });
      }

      // Initialize App
      installReaderTitleSplitGuard();
      loadFromStorage();
      initEvents();
      renderBookshelf();
      refreshCloudflareProviderConfig();
      restoreGoogleDriveSession();
    })();
  