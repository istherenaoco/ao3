const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
function assert(ok, message) { if (!ok) throw new Error(message); }
assert(app.includes('geminiKeyIdentityRegistry'), 'stable Gemini key identity registry should be stored in settings');
assert(app.includes('state.settings.geminiKeyIdentityRegistry = rs.geminiKeyIdentityRegistry'), 'key identity registry should sync through Drive safe settings');
assert(app.includes('keySlots: list.keySlots'), 'special lists should preserve stable per-key slot assignments');
assert(app.includes('list.keySlots[fingerprint] = nextSlot;') && app.includes('usedSlots.has(storedSlot)'), 'new special-list keys should receive increasing, unique slot numbers');
assert(app.includes("label: 'Gemini 키 ' + identity.id"), 'default list should display stable base key identity');
assert(app.includes("label: '키 ' + identity.id + '-' + list.name + '-' + slot"), 'special list should display base identity plus list name and stable list slot');
assert(app.includes("const resetZone = 'America/Los_Angeles'"), 'per-key daily counts should use Gemini Pacific-time quota reset boundary');
assert(app.includes("ao3QuotaDateKey(Number(event.at), resetZone) === todayKey"), 'per-key daily request count should reset on quota day boundary');
assert(app.includes("ao3QuotaCountdown(resetAt)"), 'dashboard should show time until next daily quota reset');
assert(app.includes('keyDisplay.label'), 'cooldown panel should use stable key labels');
assert(html.includes('Gemini 키별 요청 수'), 'dashboard should contain per-key request count panel');
console.log('Gemini per-key request counts, reset boundary, stable IDs, and special-list numbering tests passed.');
