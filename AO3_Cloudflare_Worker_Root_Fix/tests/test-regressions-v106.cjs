const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'src/index.js'), 'utf8');
function assert(ok, message) { if (!ok) throw new Error(message); }

// No duplicate settings control IDs: a hidden first duplicate previously prevented visible toggles from working.
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
assert(duplicates.length === 0, 'HTML contains duplicate IDs: ' + [...new Set(duplicates)].join(', '));
assert(html.includes('app.js?v=107.0'), 'cache-busting version is stale');
assert(app.includes("window.__AO3_BUILD_VERSION__ = '107'"), 'build version should be 107');

// Multiple special lists: editing previous list by tracked ID is required when the select value has already changed.
assert(app.includes('function ao3WriteGeminiKeyListInputsToList(list)'), 'list-editor writer helper missing');
assert(app.includes('const previousId = window._ao3GeminiEditingListId || state.settings.activeGeminiKeyListId;'), 'previous list editor ID is not tracked');
assert(app.includes('ao3WriteGeminiKeyListInputsToList(previousList);'), 'selection changes must save old list contents to the old list');
assert(app.includes('geminiKeyLists: Array.isArray(s.geminiKeyLists) ? s.geminiKeyLists : []'), 'all special lists must be included in encrypted Drive settings');
assert(app.includes('if (Array.isArray(decoded.settings.geminiKeyLists)) state.settings.geminiKeyLists = decoded.settings.geminiKeyLists;'), 'all special lists must restore from Drive vault');

// A full two-pass traversal is bounded by number of keys * 2; HTTP/network failures continue through the pool while Gemini output-quality findings are never checked.
assert(app.includes('const geminiKeyPassCount = 2;'), 'Gemini two-pass setting missing');
assert(app.includes('const geminiKeyVisitLimit = geminiKeys.length * geminiKeyPassCount;'), 'Gemini visit budget must be twice the pool size');
assert(app.includes('while (consideredGeminiKeys < geminiKeyVisitLimit)'), 'Gemini must not limit attempts to only two keys');
const geminiBlockStart = app.indexOf('// 1. Gemini key pool: round-robin across requests, try every configured key on failure.');
const geminiBlockEnd = app.indexOf('// 2. Cloudflare Workers AI fallback (the second engine after Gemini).', geminiBlockStart);
const geminiRuntimeBlock = app.slice(geminiBlockStart, geminiBlockEnd);
assert(!geminiRuntimeBlock.includes('ao3HasTranslationQualityIssue(') && !geminiRuntimeBlock.includes('ao3FitExtraTranslationParts('), 'Gemini output quality checks must not run or influence subsequent Gemini key calls');
assert(app.includes('function ao3ShouldAttemptGeminiForBatch(batchState, forcedProvider, geminiModelOverride)'), 'batch-scoped Gemini exhaustion gate missing');
assert(app.includes("String(list.id) === 'gemini-list-default'"), 'default-list detection must be based on stable ID, not a user-editable name');
assert(app.includes('while (usedNames.has(uniqueName.toLocaleLowerCase()))'), 'duplicate special-list names must be disambiguated');
assert(!app.includes('_ao3GeminiPoolExhaustedForCurrentBatch'), 'shared Gemini exhaustion flag can race across concurrent batches');
assert(app.includes('translationBatchState.geminiPoolExhausted = true;'), 'exhaustion must be recorded on the current batch only');
assert(app.includes('showTranslationFailurePopup(ch.title, err, reportStatus);'), 'final translation failure must show a cause popup with accurate report persistence status');
assert(app.includes('function showTranslationFailurePopup(chapterTitle, error, reportStatus)'), 'translation failure popup helper missing');
assert(app.includes('reportTranslationFailureToDrive(ch.title, err);'), 'final failure must be queued for Drive report');

// Quality checks are centralized and both toggles are persisted via the encrypted vault/preferences.
assert((app.match(/ao3HasTranslationQualityIssue\(/g) || []).length >= 4, 'fallback provider result validators must use the central gate');
assert(app.includes("if (!ao3QualityCheckEnabled('englishResidue')) return false;"), 'English residue and incomplete-sentence checks do not respect the toggle');
assert(app.includes('qualityParagraphCountEnabled: ao3QualityCheckEnabled(\'paragraphCount\')'), 'paragraph-count option not transmitted to worker APIs');
assert(worker.match(/body\.qualityParagraphCountEnabled === false/g)?.length === 2, 'both Groq and Workers AI server endpoints must honor the paragraph-count toggle');
assert((worker.match(/const extras = translations\.splice\(texts\.length - 1\);/g) || []).length === 2, 'paragraph recovery should exist once per Worker provider, without duplicate code');
assert(app.includes('const enteredGeminiKeys = Array.from(new Set(document.getElementById(\'geminiApiKeysInput\').value.split('), 'API settings save must preserve newly entered Gemini keys before normalizing the active list');
assert(app.includes('const paragraphCheckInput = document.getElementById(\'qualityParagraphCountEnabledInput\')') && app.includes('const englishCheckInput = document.getElementById(\'qualityEnglishResidueEnabledInput\')'), 'Drive restore must sync quality toggles back into visible controls');
assert(app.includes("['qualityParagraphCountEnabled', 'qualityEnglishResidueEnabled']"), 'quality toggles must sync to Drive preferences');
assert(app.includes('decoded.settings.qualityEnglishResidueEnabled'), 'English quality toggle must restore from encrypted Drive backup');

// Execute the actual quality gate helpers with the two saved toggle states.
function extractFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('function not found: ' + name);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, template = false;
  for (let i = brace; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('could not extract function: ' + name);
}
const needed = [
  "const AO3_ENGLISH_FUNCTION_WORDS = new Set(('the and or but if then when where what who why how i you your with from that this these those have has had was were are is am be been being will would could should not dont didnt doesnt isnt arent wasnt werent for of to in on at as by into through because although while than can cannot do does did').split(/\\s+/));",
  extractFunction(app, 'ao3QualityCheckEnabled'),
  extractFunction(app, 'ao3FitExtraTranslationParts'),
  extractFunction(app, 'ao3HasTranslationQualityIssue'),
  extractFunction(app, 'hasUntranslatedEnglishResidue')
].join('\n');
const context = {
  state: { settings: { qualityEnglishResidueEnabled: true, qualityParagraphCountEnabled: true } },
  stripInlineTranslationMarkup: value => String(value == null ? '' : value).trim(),
  isSceneDividerLine: value => /^\s*(?:\*\s*){3,}$/.test(String(value || '').trim())
};
vm.createContext(context);
vm.runInContext(needed, context);
const english = 'He walked into the room and looked around carefully before he realized that the window had been left open.';
assert(context.ao3HasTranslationQualityIssue(english, english) === true, 'English-source leakage should be rejected while enabled');
context.state.settings.qualityEnglishResidueEnabled = false;
assert(context.ao3HasTranslationQualityIssue(english, english) === false, 'English-source leakage check should be bypassed when disabled');
context.state.settings.qualityEnglishResidueEnabled = true;
const completeSource = 'After a long and difficult journey through the forest, they finally reached the old house just before the sun disappeared behind the mountains.';
const danglingKo = '그들은 길고 힘든 숲속 여정을 마친 끝에 해가 산 뒤로 사라지기 직전에 오래된 집에 도착했고';
assert(context.ao3HasTranslationQualityIssue(completeSource, danglingKo) === true, 'incomplete Korean sentence should be rejected while enabled');
context.state.settings.qualityEnglishResidueEnabled = false;
assert(context.ao3HasTranslationQualityIssue(completeSource, danglingKo) === false, 'incomplete-sentence check should be bypassed when disabled');
context.state.settings.qualityParagraphCountEnabled = true;
assert(context.ao3FitExtraTranslationParts(['a', 'b', 'c', 'extra'], 3).length === 4, 'paragraph-count check on must leave mismatched counts detectable');
context.state.settings.qualityParagraphCountEnabled = false;
assert(JSON.stringify(context.ao3FitExtraTranslationParts(['a', 'b', 'c', 'extra'], 3)) === JSON.stringify(['a', 'b', 'c\nextra']), 'paragraph-count check off must merge surplus fragments');
assert(context.ao3FitExtraTranslationParts(['a', 'b'], 3).length === 2, 'missing translated paragraphs must remain a safety failure rather than fabricated text');
assert(app.includes('const geminiKeyLabel = geminiKeyDisplay.label;'), 'Gemini error and cooldown logs should use stable key labels');
assert(app.includes('ao3FitExtraTranslationParts(normalizedTranslatedText.split(marker), record.pieces.length)'), 'Azure marker alignment must also honor the paragraph-count toggle');
assert(!app.includes("recordTranslationProviderError('Gemini 키 ' + (keyIndex + 1)"), 'Gemini failures should not use unstable array indexes in reports');
// Exercise actual key identity/label helpers and the workroom status renderer. This verifies
// that a special-list label survives even if the selected list changes while translation runs.
const labelContext = {
  state: { settings: {
    geminiApiKeys: 'AIzaExampleKey', geminiApiKey: 'AIzaExampleKey',
    geminiKeyLists: [{ id: 'gemini-list-special', name: 'Fic Group', keys: ['AIzaExampleKey'], keySlots: {}, nextKeySlot: 1 }],
    activeGeminiKeyListId: 'gemini-list-special', geminiKeyIdentityRegistry: { ids: {}, nextId: 1 }
  } },
  window: {},
  localStorage: { data: {}, getItem(key) { return this.data[key] || null; }, setItem(key, value) { this.data[key] = String(value); } },
  saveSettingsToStorage() {}, scheduleDriveUserPreferencesSync() {},
  document: null
};
const statusText = { textContent: '', style: {} };
const dot = { className: '' };
const classList = { add() {} };
const statusPill = { dataset: {}, style: {}, classList, className: '', title: '', attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, querySelector() { return dot; } };
labelContext.document = { getElementById(id) { return id === 'translationProviderStatus' ? statusPill : (id === 'translationProviderStatusText' ? statusText : null); } };
const labelFns = [
  "const AO3_GEMINI_KEY_IDENTITIES_KEY = 'ao3-gemini-key-identities-v1';",
  extractFunction(app, 'ao3GeminiKeyFingerprint'),
  extractFunction(app, 'ao3GetGeminiKeyIdentity'),
  extractFunction(app, 'ao3EnsureGeminiSpecialListSlots'),
  extractFunction(app, 'ao3SnapshotGeminiKeyList'),
  extractFunction(app, 'ao3NormalizeGeminiKeyLists'),
  extractFunction(app, 'ao3ActiveGeminiKeyList'),
  extractFunction(app, 'ao3GeminiKeyDisplayLabel'),
  extractFunction(app, 'ao3ShouldAttemptGeminiForBatch'),
  extractFunction(app, 'setTranslationProviderStatus')
].join('\n');
vm.createContext(labelContext);
vm.runInContext(labelFns, labelContext);
const snapshotList = labelContext.ao3ActiveGeminiKeyList();
const specialLabel = labelContext.ao3GeminiKeyDisplayLabel('AIzaExampleKey', snapshotList).label;
assert(/^키 \d+-Fic Group-1$/.test(specialLabel), 'special key label should be “키-목록명-목록 번호”, got: ' + specialLabel);
// Malformed imported slot maps must not create duplicate labels, and deleted slots are never reused.
const slotList = { id: 'gemini-list-slot-test', name: 'Slots', keys: ['slot-key-a', 'slot-key-b', 'slot-key-c'], keySlots: {}, nextKeySlot: 2 };
const slotA = labelContext.ao3GeminiKeyFingerprint('slot-key-a');
const slotB = labelContext.ao3GeminiKeyFingerprint('slot-key-b');
slotList.keySlots[slotA] = 1; slotList.keySlots[slotB] = 1; slotList.keySlots.removedKeyFingerprint = 6;
labelContext.ao3EnsureGeminiSpecialListSlots(slotList);
const normalizedSlots = slotList.keys.map(key => slotList.keySlots[labelContext.ao3GeminiKeyFingerprint(key)]);
assert(new Set(normalizedSlots).size === normalizedSlots.length, 'slot repair must eliminate duplicate special-list numbers');
assert(normalizedSlots[2] > 6, 'new list entries must not reuse numbers reserved by removed keys');
labelContext.state.settings.activeGeminiKeyListId = 'gemini-list-other';
labelContext.state.settings.geminiKeyLists.push({ id: 'gemini-list-other', name: 'Other', keys: ['AIzaOtherKey'], keySlots: {}, nextKeySlot: 1 });
labelContext.ao3NormalizeGeminiKeyLists();
const stableLabel = labelContext.ao3GeminiKeyDisplayLabel('AIzaExampleKey', snapshotList).label;
assert(stableLabel === specialLabel, 'in-flight key label must remain tied to the list snapshot after active list changes');
// Also test editing/removing a key from the same list after a request has started.
const sameActiveList = labelContext.ao3ActiveGeminiKeyList();
const sameListSnapshot = labelContext.ao3SnapshotGeminiKeyList(sameActiveList);
const labelBeforeSameListEdit = labelContext.ao3GeminiKeyDisplayLabel('AIzaExampleKey', sameListSnapshot).label;
const originalSameListState = { keys: sameActiveList.keys.slice(), name: sameActiveList.name, keySlots: Object.assign({}, sameActiveList.keySlots) };
sameActiveList.keys = ['AIzaReplacementKey'];
sameActiveList.name = 'Edited While Translating';
sameActiveList.keySlots = {};
const labelAfterSameListEdit = labelContext.ao3GeminiKeyDisplayLabel('AIzaExampleKey', sameListSnapshot).label;
assert(labelAfterSameListEdit === labelBeforeSameListEdit, 'in-flight label should survive edits to the very same list object');
sameActiveList.keys = originalSameListState.keys;
sameActiveList.name = originalSameListState.name;
sameActiveList.keySlots = originalSameListState.keySlots;
labelContext.ao3NormalizeGeminiKeyLists();
// A user-created list named “기본 목록” must still behave as a special list.
const namedDefaultList = { id: 'gemini-list-named-default', name: '기본 목록', keys: ['AIzaAnotherKey'], keySlots: {}, nextKeySlot: 1 };
labelContext.state.settings.geminiKeyLists.push(namedDefaultList);
labelContext.ao3NormalizeGeminiKeyLists();
const namedDefaultLabel = labelContext.ao3GeminiKeyDisplayLabel('AIzaAnotherKey', namedDefaultList).label;
assert(/^키 \d+-기본 목록-1$/.test(namedDefaultLabel), 'custom list named “기본 목록” must retain the special-list suffix, got: ' + namedDefaultLabel);
// Identical list names from imported backups are made unique so dashboard labels stay distinguishable.
labelContext.state.settings.geminiKeyLists.push({ id: 'gemini-list-duplicate-name', name: 'Fic Group', keys: ['AIzaThirdKey'], keySlots: {}, nextKeySlot: 1 });
labelContext.ao3NormalizeGeminiKeyLists();
const normalizedNames = labelContext.state.settings.geminiKeyLists.map(list => list.name);
assert(new Set(normalizedNames.map(name => name.toLocaleLowerCase())).size === normalizedNames.length, 'special-list names must remain unique after normalization');
labelContext.setTranslationProviderStatus('Gemini', specialLabel + ' · gemini-model 번역 완료');
assert(statusText.textContent === 'Gemini · ' + specialLabel + ' · gemini-model 번역 완료', 'workroom status must display the full special-list key label');
assert(statusPill.title === statusText.textContent && statusPill.attributes['aria-label'] === statusText.textContent, 'workroom key label should also be available to assistive tech and hover');
assert(statusPill.style.maxWidth === 'min(72vw, 520px)' && statusText.style.overflowWrap === 'anywhere', 'long special-list labels should wrap without overflowing the workroom');
const exhaustedBatch = { geminiPoolExhausted: true }, independentBatch = { geminiPoolExhausted: false };
assert(labelContext.ao3ShouldAttemptGeminiForBatch(exhaustedBatch, '', undefined) === false, 'an exhausted batch should avoid re-running Gemini on the outer retry');
assert(labelContext.ao3ShouldAttemptGeminiForBatch(independentBatch, '', undefined) === true, 'another in-flight batch must still be allowed to run Gemini');
assert(labelContext.ao3ShouldAttemptGeminiForBatch(exhaustedBatch, 'gemini', undefined) === true, 'manual Gemini retry must override batch exhaustion');
const redactionContext = { state: { settings: { azureApiKey: '0123456789abcdef', geminiApiKey: '', geminiApiKeys: '', groqApiKey: '', geminiKeyLists: [{ id: 'gemini-list-special', name: 'Private', keys: ['CUSTOM_SECRET_SPECIAL_KEY_123456789'] }] } } };
vm.createContext(redactionContext);
vm.runInContext(extractFunction(app, 'redactTranslationFailureSecrets'), redactionContext);
const redacted = redactionContext.redactTranslationFailureSecrets('Azure failed for key 0123456789abcdef; special key CUSTOM_SECRET_SPECIAL_KEY_123456789');
assert(!redacted.includes('0123456789abcdef') && !redacted.includes('CUSTOM_SECRET_SPECIAL_KEY_123456789') && (redacted.match(/\[REDACTED API KEY\]/g) || []).length >= 2, 'Azure API keys and keys from inactive special lists must be removed from Drive failure reports');
const popupContext = {
  state: redactionContext.state,
  window: { alert(message) { this.lastAlert = message; } },
  isDriveTokenValid() { return false; },
  getTranslationProviderErrorSummary() { return 'Special list error CUSTOM_SECRET_SPECIAL_KEY_123456789'; }
};
vm.createContext(popupContext);
vm.runInContext(extractFunction(app, 'redactTranslationFailureSecrets') + '\n' + extractFunction(app, 'showTranslationFailurePopup'), popupContext);
popupContext.showTranslationFailurePopup('Test chapter', new Error('Echoed token CUSTOM_SECRET_SPECIAL_KEY_123456789'));
assert(popupContext.window.lastAlert.includes('원인:') && popupContext.window.lastAlert.includes('Drive') && !popupContext.window.lastAlert.includes('CUSTOM_SECRET_SPECIAL_KEY_123456789'), 'failure popup should state the reason and Drive status without exposing API secrets');
popupContext.showTranslationFailurePopup('Test chapter', new Error('HTTP 503'), { persisted: false, driveConnected: false });
assert(popupContext.window.lastAlert.includes('저장하지 못했습니다') && popupContext.window.lastAlert.includes('복사해 보관'), 'failure popup must not claim a report was saved when browser storage rejects it');
const persistenceContext = { localStorage: { setItem() { throw new Error('quota exceeded'); } }, TRANSLATION_FAILURE_REPORTS_KEY: 'test-reports', MAX_PENDING_TRANSLATION_FAILURE_REPORTS: 20, console: { warn() {} } };
vm.createContext(persistenceContext);
vm.runInContext(extractFunction(app, 'savePendingTranslationFailureReports'), persistenceContext);
assert(persistenceContext.savePendingTranslationFailureReports([{ id: 'test', report: 'test' }]) === false, 'report persistence helper must surface storage failure to its caller');
assert(app.includes('ao3SnapshotGeminiKeyList(activeGeminiKeyList)'), 'each translation must snapshot the complete active list before asynchronous requests begin');
console.log('v106 regression tests passed: key-list persistence, two-pass rotation, concurrent batch isolation, quality checks, safe failure reports, and workroom special-key labels.');
