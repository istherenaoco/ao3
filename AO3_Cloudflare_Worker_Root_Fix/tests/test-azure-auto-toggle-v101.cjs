const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
function assert(ok, message) { if (!ok) throw new Error(message); }
assert(html.includes('id="azureAutoEnabledInput"'), 'Azure automatic-use checkbox is missing');
assert(html.includes('Azure Translator 자동 사용'), 'Azure toggle label is missing');
assert(js.includes('azureEnabled: true'), 'Azure auto-use must default to enabled for existing users');
assert(js.includes("state.settings.azureEnabled = document.getElementById('azureAutoEnabledInput').checked"), 'Azure toggle is not saved');
assert(js.includes("state.settings.azureEnabled === false && forcedProvider !== 'azure'"), 'Disabled Azure must be skipped for automatic failover');
assert(js.includes("'azureEnabled'") && js.includes("['groqEnabled', 'workersAiEnabled', 'azureEnabled', 'geminiCooldownEnabled']"), 'Azure toggle is missing from Drive preference restoration');
assert(js.includes("if (typeof decoded.settings.azureEnabled === 'boolean') state.settings.azureEnabled = decoded.settings.azureEnabled;"), 'Azure toggle is missing from encrypted settings restoration');
assert(html.includes('app.js?v=107.0'), 'app.js cache-busting reference was not updated');
console.log('Azure auto-use toggle regression checks passed.');
