const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
function assert(ok, message) { if (!ok) throw new Error(message); }

const functionStart = app.indexOf('async function translateParagraphBatchOnce(');
const functionEnd = app.indexOf('\n      // High-speed chapter translation', functionStart);
assert(functionStart >= 0 && functionEnd > functionStart, 'could not locate actual Gemini/provider batch function');
const actualBatchFunction = app.slice(functionStart, functionEnd).trim();
const shouldAttemptStart = app.indexOf('function ao3ShouldAttemptGeminiForBatch(');
const shouldAttemptEnd = app.indexOf('\n      async function translateParagraphBatch(', shouldAttemptStart);
assert(shouldAttemptStart >= 0 && shouldAttemptEnd > shouldAttemptStart, 'could not locate batch-scoped Gemini exhaustion helper');
const shouldAttemptFunction = app.slice(shouldAttemptStart, shouldAttemptEnd).trim();
const snapshotStart = app.indexOf('function ao3SnapshotGeminiKeyList(');
const snapshotEnd = app.indexOf('\n      function ao3GeminiKeyDisplayLabel(', snapshotStart);
const snapshotFunction = app.slice(snapshotStart, snapshotEnd).trim();

async function runPool({ coolingEnabled, coolingKeys = [], respond429FirstKeyOnce = false, successResponseText, inputTexts = ['A complete English sentence.'] }) {
  const keys = ['test-key-a', 'test-key-b', 'test-key-c'];
  const specialList = { id: 'gemini-list-special', name: 'Runtime Test', keys: keys.slice(), keySlots: {}, nextKeySlot: 1 };
  const cooldowns = Object.create(null);
  coolingKeys.forEach(key => { cooldowns[key] = Date.now() + 60000; });
  const calls = [];
  const errors = [];
  const qualityChecks = [];
  let firstKey429Used = false;
  const runtimeWindow = { _ao3CloudflareProviderConfigReady: true, _ao3CloudflareServerProviders: { workersAI: false, groq: false, azure: false }, _ao3ManualProviderControllers: new Set() };
  const settings = {
    translationPrompt: 'Translate fiction naturally.', characterStyleRules: '',
    geminiApiKey: keys[0], geminiApiKeys: keys.join('\n'), geminiKeyLists: [specialList],
    activeGeminiKeyListId: specialList.id, geminiModel: 'test-model', geminiCooldownEnabled: coolingEnabled,
    workersAiEnabled: false, groqEnabled: false, azureEnabled: false,
    groqApiKey: '', azureApiKey: '', groqModel: 'test-groq-model', workersAiModel: 'test-worker-model'
  };
  const context = {
    state: { settings },
    window: runtimeWindow,
    localStorage: { getItem() { return null; }, setItem() {} },
    AbortController,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    Set,
    Promise,
    JSON,
    encodeURIComponent,
    console: { info() {}, warn() {}, error() {}, log() {} },
    DEFAULT_TRANSLATION_PROMPT: 'Translate fiction naturally.',
    DEFAULT_GEMINI_MODEL: 'test-model',
    GEMINI_REQUEST_TIMEOUT_MS: 30000,
    normalizeGeminiModel(value) { return value || 'test-model'; },
    ao3GetGeminiModelHealthStore() { return {}; },
    ao3NextAvailableGeminiModel() { return null; },
    ao3ShouldAttemptGeminiForBatch: undefined,
    ao3SnapshotGeminiKeyList: undefined,
    ao3ActiveGeminiKeyList() { return specialList; },
    ao3GeminiKeyDisplayLabel(key, list) { return { label: 'key-' + key.slice(-1) + '-Runtime Test-' + (list.keys.indexOf(key) + 1), id: list.keys.indexOf(key) + 1, fingerprint: 'fp-' + key }; },
    ao3SetGeminiNextKeyIndex(index, count) { runtimeWindow._ao3GeminiNextKeyIndex = ((index % count) + count) % count; },
    ao3GetGeminiCooldownStore() { return cooldowns; },
    ao3GeminiCooldownStorageKey(key) { return key; },
    ao3SaveGeminiCooldownStore() {},
    ao3SaveQuotaSnapshot() {},
    ao3LoadQuotaStore() { return { snapshots: { gemini: {} } }; },
    ao3RefreshGeminiCooldownPanel() {},
    ao3RecordQuotaUsage() { return 'event'; },
    ao3UpdateQuotaEvent() {},
    ao3CaptureQuotaResponse() {},
    ao3CaptureGeminiQuotaFailure() {},
    ao3IsGeminiHighDemand() { return false; },
    ao3GeminiQuotaCooldown(key) { return { key, until: Date.now() + 60000, retryMs: 60000, daily: false }; },
    ao3QualityCheckEnabled() { return true; },
    ao3HasTranslationQualityIssue(source, translated) { qualityChecks.push({ source, translated }); return true; },
    ao3FitExtraTranslationParts(parts) { return parts; },
    isSceneDividerLine(text) { return /^\s*(?:\*\s*){3,}$/.test(String(text || '').trim()); },
    stripInlineTranslationMarkup(text) { return String(text || '').trim(); },
    finalizeTranslatedParagraph(text) { return String(text || '').trim(); },
    ao3BuildProviderTextBatches() { return []; },
    refreshCloudflareProviderConfig: async function() { runtimeWindow._ao3CloudflareProviderConfigReady = true; },
    ao3TranslateWithPromptProvider: async function() { throw new Error('should not call disabled provider'); },
    ao3Sleep: async function() {},
    setTranslationProviderStatus() {},
    recordTranslationProviderError(provider, message) { errors.push(String(provider) + ': ' + String(message)); },
    fetch: async function(url) {
      const parsed = new URL(url);
      const key = parsed.searchParams.get('key');
      calls.push(key);
      if (successResponseText !== undefined && key === 'test-key-a') {
        return {
          ok: true, status: 200, headers: { get() { return null; } },
          async json() { return { usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 8 }, candidates: [{ content: { parts: [{ text: successResponseText }] } }] }; }
        };
      }
      const status = respond429FirstKeyOnce && key === 'test-key-a' && !firstKey429Used ? (firstKey429Used = true, 429) : 503;
      return {
        ok: false,
        status,
        headers: { get() { return null; } },
        async json() { return status === 429 ? { error: { status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded. Please retry in 60s.' } } : { error: { status: 'UNAVAILABLE', message: 'Service unavailable' } }; }
      };
    }
  };
  runtimeWindow._ao3GeminiNextKeyIndex = 0;
  context.state.settings.activeGeminiKeyListId = specialList.id;
  context.ao3ShouldAttemptGeminiForBatch = undefined;
  vm.createContext(context);
  vm.runInContext(shouldAttemptFunction, context);
  vm.runInContext(snapshotFunction, context);
  vm.runInContext(actualBatchFunction, context);
  let thrown = null;
  let result = null;
  try {
    result = await context.translateParagraphBatchOnce(inputTexts, {}, '', undefined, undefined, { geminiPoolExhausted: false, providerErrors: [] });
  } catch (error) { thrown = error; }
  if (successResponseText === undefined) {
    assert(thrown && /all failed|모두 실패|설정된 Gemini/i.test(String(thrown.message)), 'runtime should exit with an explicit all-provider failure after configured keys exhaust; thrown=' + String(thrown && thrown.stack || thrown));
  } else {
    assert(!thrown, 'successful Gemini HTTP response should be accepted without quality-gate rejection: ' + String(thrown && thrown.stack || thrown));
  }
  return { calls, errors, cooldowns, qualityChecks, result, thrown };
}

(async function main() {
  const cooldownOff = await runPool({ coolingEnabled: false, coolingKeys: ['test-key-b'] });
  assert(JSON.stringify(cooldownOff.calls) === JSON.stringify(['test-key-a', 'test-key-b', 'test-key-c', 'test-key-a', 'test-key-b', 'test-key-c']), 'with cooldown disabled, all configured keys must be requested in both passes: ' + JSON.stringify(cooldownOff.calls));
  const cooldownOn = await runPool({ coolingEnabled: true, coolingKeys: ['test-key-b'] });
  assert(JSON.stringify(cooldownOn.calls) === JSON.stringify(['test-key-a', 'test-key-c', 'test-key-a', 'test-key-c']), 'with cooldown enabled, only explicitly cooling keys should be skipped in both passes: ' + JSON.stringify(cooldownOn.calls));
  assert(cooldownOn.errors.filter(item => item.includes('test-key-b') || item.includes('key-b')).length >= 2, 'cooldown skips should appear in per-batch diagnostics for both passes');
  const newlyCooling = await runPool({ coolingEnabled: true, respond429FirstKeyOnce: true });
  assert(JSON.stringify(newlyCooling.calls) === JSON.stringify(['test-key-a', 'test-key-b', 'test-key-c', 'test-key-b', 'test-key-c']), 'a new HTTP 429 should cool that key for the second pass when cooling is enabled: ' + JSON.stringify(newlyCooling.calls));
  const noNewCooldown = await runPool({ coolingEnabled: false, respond429FirstKeyOnce: true });
  assert(JSON.stringify(noNewCooldown.calls) === JSON.stringify(['test-key-a', 'test-key-b', 'test-key-c', 'test-key-a', 'test-key-b', 'test-key-c']), 'with cooldown disabled, a new HTTP 429 must not exclude its key from the second pass: ' + JSON.stringify(noNewCooldown.calls));

  // Successful HTTP responses are never rejected by output-quality analysis, even if the
  // configured quality helper would reject English residue or incomplete sentences.
  const englishResidueSuccess = await runPool({ coolingEnabled: true, successResponseText: 'This remains English, intentionally proving the quality gate is bypassed.' });
  assert(JSON.stringify(englishResidueSuccess.calls) === JSON.stringify(['test-key-a']), 'a successful Gemini response must return immediately without calling the next key: ' + JSON.stringify(englishResidueSuccess.calls));
  assert(englishResidueSuccess.qualityChecks.length === 0, 'Gemini path must not call the quality inspection helper at all');
  assert(englishResidueSuccess.result && englishResidueSuccess.result.translationProvider === 'Gemini', 'quality-unchecked successful output should be returned as Gemini result');
  assert(englishResidueSuccess.result[0].includes('This remains English'), 'Gemini successful output should not be rejected for English residue');

  // A paragraph-count mismatch also must not cause a second Gemini key request. The mapping
  // layer leaves a missing slot blank; chapter-level completeness protection prevents a bad
  // chapter save later, without making the quality checker call another Gemini key.
  const paragraphMismatchSuccess = await runPool({ coolingEnabled: true, successResponseText: '첫 문단만 번역된 응답입니다.', inputTexts: ['First source paragraph.', 'Second source paragraph.'] });
  assert(JSON.stringify(paragraphMismatchSuccess.calls) === JSON.stringify(['test-key-a']), 'paragraph-count mismatch must not advance to the next Gemini key: ' + JSON.stringify(paragraphMismatchSuccess.calls));
  assert(paragraphMismatchSuccess.qualityChecks.length === 0, 'Gemini paragraph mapping must not call quality inspections');
  assert(paragraphMismatchSuccess.result && paragraphMismatchSuccess.result.length === 2 && paragraphMismatchSuccess.result[1] === '', 'mapping a short Gemini response should fill its slot without triggering key rotation');
  console.log('Gemini runtime integration tests passed: all keys are considered twice on API failure, cooldown follows its toggle, successful Gemini responses bypass output-quality checks, and quality findings never trigger the next Gemini key.');
})().catch(error => { console.error(error); process.exitCode = 1; });
