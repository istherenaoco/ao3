const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(__dirname + '/public/assets/app-v48.js', 'utf8');
const start = source.indexOf('      function splitReaderTitle(title) {');
const end = source.indexOf('      function renderReaderTitle(title) {', start);
if (start < 0 || end < 0) throw new Error('Title helper functions not found');
const snippet = source.slice(start, end);
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
const sandbox = { escapeHtml };
vm.createContext(sandbox);
vm.runInContext(snippet, sandbox);
const examples = [
  ['이제 비로소 나의 것이라 부를 수 있게 되었다. (i dare now call mine own)', '이제 비로소 나의 것이라 부를 수 있게 되었다.', 'i dare now call mine own'],
  ['나는 모든 일마다 그의 뜻을 기다렸다. (in every thing i wait upon his will)', '나는 모든 일마다 그의 뜻을 기다렸다.', 'in every thing i wait upon his will'],
  ['이름 없는 작품', '이름 없는 작품', '']
];
for (const [input, translated, original] of examples) {
  const parts = sandbox.splitReaderTitle(input);
  if (parts.translated !== translated || parts.original !== original) {
    throw new Error(`Split failed: ${input} => ${JSON.stringify(parts)}`);
  }
  const markup = sandbox.renderNovelTitleMarkup(input);
  if (markup.includes('(') || markup.includes(')')) throw new Error(`Parentheses remain in display: ${markup}`);
  if (!markup.includes(escapeHtml(translated))) throw new Error(`Translated title absent: ${markup}`);
  if (original && !markup.includes(escapeHtml(original))) throw new Error(`Original title absent: ${markup}`);
  console.log('PASS', input, '=>', markup);
}
const mainShelf = source.slice(source.indexOf('function renderBookshelf()'), source.indexOf('// ====================', source.indexOf('function renderBookshelf()') + 50));
if (!mainShelf.includes('renderNovelTitleMarkup(novel.title)')) throw new Error('Main bookshelf still bypasses shared title renderer');
console.log('PASS main bookshelf invokes renderNovelTitleMarkup');
