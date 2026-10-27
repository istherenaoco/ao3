const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { webcrypto } = require('node:crypto');
const { TextEncoder, TextDecoder } = require('node:util');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
function assert(ok, message) { if (!ok) throw new Error(message); }
function extractSimpleFunction(name) {
  const start = app.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('function not found: ' + name);
  const brace = app.indexOf('{', start);
  let depth = 0, quote = '', escaped = false;
  for (let i = brace; i < app.length; i++) {
    const c = app[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return app.slice(start, i + 1);
  }
  throw new Error('could not extract function: ' + name);
}
const deriveStart = app.indexOf('async function deriveDriveVaultCryptoKey(');
const settingsHelperStart = app.indexOf('\n      function getSettingsForEncryptedDriveBackup(', deriveStart);
assert(deriveStart >= 0 && settingsHelperStart > deriveStart, 'could not locate Drive vault key derivation function');
const deriveFunction = app.slice(deriveStart, settingsHelperStart).trim();
const encryptStart = app.indexOf('async function encryptSettingsForDrive(');
const decryptStart = app.indexOf('\n      async function decryptSettingsFromDriveVault(', encryptStart);
const findVaultStart = app.indexOf('\n      async function findDriveSettingsVaultFile(', decryptStart);
assert(encryptStart >= 0 && decryptStart > encryptStart && findVaultStart > decryptStart, 'could not locate encrypted Drive vault functions');
const encryptFunctions = app.slice(encryptStart, decryptStart).trim();
const decryptFunctions = app.slice(decryptStart, findVaultStart).trim();
const defaults = {
  engine: 'gemini_api', geminiModel: 'test-gemini-model', geminiApiKey: 'key-default-1', geminiApiKeys: 'key-default-1\nkey-default-2',
  geminiKeyLists: [
    { id: 'gemini-list-default', name: '기본 목록', keys: ['key-default-1', 'key-default-2'] },
    { id: 'gemini-list-fic', name: 'Fic Group', keys: ['key-fic-1', 'key-fic-2'], keySlots: { 'fp-fic-1': 1, 'fp-fic-2': 2 }, nextKeySlot: 3 },
    { id: 'gemini-list-backup', name: 'Backup', keys: ['key-backup-1'], keySlots: { 'fp-backup-1': 1 }, nextKeySlot: 2 }
  ],
  activeGeminiKeyListId: 'gemini-list-fic', geminiKeyIdentityRegistry: { ids: { 'fp-fic-1': 20 }, nextId: 21 },
  geminiCooldownEnabled: false, qualityParagraphCountEnabled: false, qualityEnglishResidueEnabled: true,
  azureApiKey: 'azure-secret', azureRegion: 'koreacentral', azureEnabled: false,
  groqApiKey: 'groq-secret', groqModel: 'test-groq-model', groqEnabled: true,
  workersAiEnabled: false, workersAiModel: '@cf/test-model', translationPrompt: 'prompt', glossary: 'term=>번역', textReplacements: 'old=>new', characterStyleRules: 'style rules'
};
const state = { settings: JSON.parse(JSON.stringify(defaults)) };
let normalizeCalls = 0;
const context = {
  state, window: { crypto: webcrypto }, crypto: webcrypto, TextEncoder, TextDecoder, btoa, atob, JSON, Date,
  DEFAULT_GEMINI_MODEL: 'test-gemini-model',
  normalizeGeminiModel(value) { return value || 'test-gemini-model'; },
  ao3NormalizeGeminiKeyLists() { normalizeCalls++; }
};
vm.createContext(context);
vm.runInContext([
  extractSimpleFunction('vaultBytesToBase64'),
  extractSimpleFunction('vaultBase64ToBytes'),
  deriveFunction,
  extractSimpleFunction('getSettingsForEncryptedDriveBackup'),
  encryptFunctions,
  decryptFunctions
].join('\n'), context);
(async function main() {
  const payload = await context.encryptSettingsForDrive('test passphrase');
  assert(payload.kind === 'ao3-encrypted-settings-vault' && payload.cipher === 'AES-256-GCM', 'Drive vault should use the expected authenticated encryption envelope');
  const targetState = { settings: {} };
  context.state = targetState;
  const restored = await context.decryptSettingsFromDriveVault(payload, 'test passphrase');
  assert(restored === true, 'valid encrypted backup should restore successfully');
  assert(targetState.settings.geminiKeyLists.length === 3, 'all three Gemini lists should survive encrypted Drive round-trip');
  assert(targetState.settings.geminiKeyLists[1].name === 'Fic Group' && targetState.settings.geminiKeyLists[1].keys.join(',') === 'key-fic-1,key-fic-2', 'all keys and names in the second special list should be restored');
  assert(targetState.settings.geminiKeyLists[2].name === 'Backup' && targetState.settings.geminiKeyLists[2].keys[0] === 'key-backup-1', 'all keys in additional lists should be restored, not replaced by only the active list');
  assert(targetState.settings.activeGeminiKeyListId === 'gemini-list-fic', 'active list selection should survive Drive round-trip');
  assert(targetState.settings.geminiCooldownEnabled === false && targetState.settings.qualityParagraphCountEnabled === false && targetState.settings.qualityEnglishResidueEnabled === true, 'cooldown and quality toggle states should survive Drive round-trip');
  assert(targetState.settings.azureApiKey === 'azure-secret' && targetState.settings.groqApiKey === 'groq-secret', 'provider credentials should survive only inside encrypted backup');
  assert(normalizeCalls >= 1, 'restored list metadata should be normalized for runtime use');
  await context.decryptSettingsFromDriveVault(payload, 'wrong passphrase').then(
    () => { throw new Error('wrong passphrase unexpectedly decrypted the vault'); },
    error => assert(/암호가 틀렸|손상/.test(String(error.message)), 'wrong passphrase should fail with a clear error')
  );
  console.log('Drive vault runtime round-trip passed: multiple special lists, all keys, active list, and quality/cooldown toggles are restored; wrong passphrase is rejected.');
})().catch(error => { console.error(error); process.exitCode = 1; });
