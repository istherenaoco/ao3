const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const shared = fs.readFileSync(path.join(root, 'src/shared.js'), 'utf8');
function assert(ok, message) { if (!ok) throw new Error(message); }
assert(js.includes('GEMINI_REQUEST_TIMEOUT_MS = 30000'), 'Gemini timeout should allow normal generation latency');
assert(js.includes('GEMINI_MAX_KEY_ATTEMPTS_PER_BATCH = 2'), 'Gemini key attempts must be bounded');
assert(js.includes("res.status === 401 || res.status === 403 || res.status === 429"), 'Gemini key rotation should be limited to auth/quota errors');
assert(js.includes("if (round >= maxRounds || !shouldRetryTranslationRound(error)) break;"), 'full provider cycles should only retry transient errors');
assert(js.includes('ao3BuildProviderTextBatches(preparedStrings, 6, 9500)'), 'Workers AI batches should be larger but stay under proxy size limits');
assert(js.includes('ao3BuildProviderTextBatches(preparedStrings, 4, 8000)'), 'Groq batches should reduce request overhead while staying bounded');
assert(js.includes("store.snapshots['groq:' + groqModel]") && js.includes('ao3QuotaCountModel'), 'Groq usage should be shown per model');
assert(js.includes('DRIVE_PROVIDER_QUOTA_FILE') && js.includes('syncProviderQuotaWithGoogleDrive'), 'quota usage should merge to Drive');
assert(js.includes('ao3ScheduleProviderQuotaBoundaryRefresh') && js.includes('visibilitychange'), 'quota dashboard should refresh at reset boundaries and tab resume');
assert(html.includes('id="providerQuotaStorageNote"') && html.includes('app.js?v=103.0'), 'quota storage note and app build version should be updated');
assert(shared.includes('X-Groq-RateLimit-Remaining-Requests'), 'Groq limit headers must be exposed through the Worker CORS response');
console.log('Translation quota optimization regression checks passed.');
