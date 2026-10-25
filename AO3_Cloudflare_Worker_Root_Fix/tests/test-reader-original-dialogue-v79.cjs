const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
function assert(ok, message) { if (!ok) throw new Error(message); }

const match = source.match(/function replaceQuotedDialogueWithOriginal\(translatedText, originalText\) \{[\s\S]*?\n      \}/);
assert(match, 'reader-only dialogue replacement helper missing');
const replaceQuotedDialogueWithOriginal = vm.runInNewContext('(' + match[0] + ')');

assert(
  replaceQuotedDialogueWithOriginal('그가 말했다. "안녕, 잘 지내?" 그리고 “잘 가!”', 'He said. "Hello, how are you?" Then “Goodbye!”') === '그가 말했다. "Hello, how are you?" 그리고 “Goodbye!”',
  'quoted English source dialogue should replace Korean quoted dialogue in display text'
);
assert(
  replaceQuotedDialogueWithOriginal('그는 "괜찮아"라고 말했다.', 'He said, "It is fine."') === '그는 "It is fine."라고 말했다.',
  'straight-quoted dialogue should be replaced one-to-one'
);
assert(
  replaceQuotedDialogueWithOriginal('그는 “안녕”이라고 말했다.', 'He said “Hello”.') === '그는 “Hello”이라고 말했다.',
  'curly double quotes should be supported'
);
assert(
  replaceQuotedDialogueWithOriginal('"안녕" 그리고 "잘 가"', '"Hello"') === '"안녕" 그리고 "잘 가"',
  'mismatched quote counts should be left unchanged rather than misaligned'
);
assert(
  replaceQuotedDialogueWithOriginal('그는 정말 괜찮았다.', 'He was fine.') === '그는 정말 괜찮았다.',
  'text without quoted dialogue should remain unchanged'
);
assert(source.includes('const displayText = storedKoreanText.trim()') && source.includes('replaceQuotedDialogueWithOriginal(translatedDisplayText, originalText)'), 'helper must only affect reader display rendering');
assert(html.includes('/assets/app.js?v=79.0'), 'reader script cache-buster must be incremented');
console.log('Reader original dialogue display tests passed.');
