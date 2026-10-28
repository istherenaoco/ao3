const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
function assert(ok, message) { if (!ok) throw new Error(message); }

assert(app.includes("window.__AO3_BUILD_VERSION__ = '109'"), 'build version should be 108');
assert(html.includes('app.js?v=109.0'), 'app asset cache busting should be updated');
assert(app.includes('applyLiveTranslationBatchToChapter(draftChapter, update.batch);'), 'live shelf callback must apply each completed batch before copying paragraphs');

function extractFunction(source, name) {
  let start = source.indexOf('async function ' + name + '(');
  if (start < 0) start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('function not found: ' + name);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false;
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

const source = [
  extractFunction(app, 'applyLiveTranslationBatchToChapter'),
  extractFunction(app, 'translateDraftChapter')
].join('\n');
let calls = 0;
const context = {
  state: { settings: { geminiApiKeys: 'test-key', geminiApiKey: '' } },
  stripInlineTranslationMarkup: value => String(value == null ? '' : value).trim(),
  isSceneDividerLine: value => /^\s*(?:\*\s*){3,}$/.test(String(value || '').trim()),
  async translateParagraphBatch(texts) {
    calls++;
    if (calls > 1) throw new Error('simulated later-batch failure');
    const result = texts.map((_, i) => '한국어 번역 ' + (i + 1));
    result.translationProvider = 'Gemini';
    return result;
  }
};
vm.createContext(context);
vm.runInContext(source, context);

(async () => {
  const chapter = { paragraphs: Array.from({ length: 13 }, (_, i) => ({ id: 'p' + i, en: 'Original paragraph ' + i, ko: '' })) };
  const shelfChapter = { paragraphs: chapter.paragraphs.map(p => ({ id: p.id, en: p.en, ko: '' })) };
  const updates = [];
  let failed = false;
  try {
    await context.translateDraftChapter(chapter, (done, total, batch) => {
      context.applyLiveTranslationBatchToChapter(chapter, batch);
      shelfChapter.paragraphs = chapter.paragraphs.map(p => ({ id: p.id, en: p.en, ko: p.ko || '' }));
      updates.push({ done, total, batch });
    });
  } catch (error) {
    failed = /simulated later-batch failure/.test(String(error && error.message));
  }
  assert(failed, 'test must simulate a failure after one batch succeeds');
  assert(updates.length === 1, 'a completed batch should trigger a live update before the chapter ends');
  assert(updates[0].done === 12 && updates[0].total === 13, 'callback should report completed paragraph count');
  assert(shelfChapter.paragraphs.slice(0, 12).every(p => p.ko.startsWith('한국어 번역 ')), 'viewer copy should contain the completed batch immediately');
  assert(shelfChapter.paragraphs[12].ko === '', 'not-yet-translated paragraphs must remain blank');
  assert(chapter.translated !== true, 'a partially translated chapter must not be marked complete');
  console.log('Live reader translation test passed: completed batches are visible before full-chapter completion.');
})().catch(error => { console.error(error); process.exitCode = 1; });
