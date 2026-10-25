const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/assets/app-v48.js'), 'utf8');
const start = source.indexOf('      function splitReaderTitle(title) {');
const end = source.indexOf('      function renderReaderTitle(title) {', start);
if (start < 0 || end < 0) throw new Error('Title helper functions not found');
const snippet = source.slice(start, end);
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const sandbox = { escapeHtml };
vm.createContext(sandbox);
vm.runInContext(snippet, sandbox);
const examples = [
  ['이제 비로소 나의 것이라 부를 수 있게 되었다. (i dare now call mine own)', '이제 비로소 나의 것이라 부를 수 있게 되었다.', 'i dare now call mine own'],
  ['나는 모든 일마다 그의 뜻을 기다렸다. (in every thing i wait upon his will)', '나는 모든 일마다 그의 뜻을 기다렸다.', 'in every thing i wait upon his will'],
  ['제목(Original Title)', '제목', 'Original Title'],
  ['이름 없는 작품', '이름 없는 작품', '']
];
for (const [input, translated, original] of examples) {
  const parts = sandbox.splitReaderTitle(input);
  if (parts.translated !== translated || parts.original !== original) throw new Error(`Split failed: ${input} => ${JSON.stringify(parts)}`);
  const markup = sandbox.renderNovelTitleMarkup(input);
  if (markup.includes('(') || markup.includes(')')) throw new Error(`Parentheses remain in rendered title: ${markup}`);
  if (!markup.includes(escapeHtml(translated))) throw new Error(`Translated title missing: ${markup}`);
  if (original && !markup.includes(escapeHtml(original))) throw new Error(`Original title missing: ${markup}`);
  console.log('PASS', input);
}
if (!source.includes('renderNovelTitleMarkup(novel.title)')) throw new Error('Main bookshelf bypasses shared title renderer');
if (!source.includes('data-title-split-version="48"')) throw new Error('Shelf title version marker is missing');
console.log('PASS main bookshelf invokes the v48 title renderer');
