const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
function assert(ok, message) { if (!ok) throw new Error(message); }
assert(js.includes('function replaceQuotedDialogueWithOriginal'), 'dialogue replacement helper missing');
assert(js.includes('state.reader.showOriginalDialogue && storedKoreanText.trim() && originalText'), 'display-only feature gate missing');
assert(js.includes('state.reader.showOriginalDialogue = event.target.checked === true'), 'toggle handler missing');
assert(js.includes('showOriginalDialogue: state.reader.showOriginalDialogue === true'), 'preference persistence missing');
assert(html.includes('readerOriginalDialogueToggle'), 'viewer settings toggle missing');
assert(html.includes('큰따옴표 대사는 영어 원문으로 표시'), 'toggle label missing');
console.log('Reader original dialogue toggle checks passed.');
