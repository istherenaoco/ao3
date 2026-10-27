const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/assets/app.css'), 'utf8');
function assert(ok, message) { if (!ok) throw new Error(message); }
assert(html.includes('id="ao3FileDropZone"') && !html.includes('id="ao3FileDropZone" style="display:none!important"'), 'AO3 HTML upload area should be visible');
assert(html.includes('id="ao3FileImportPreview"') && html.includes('id="ao3FileImportChapterList"'), 'file import should preview recognized metadata and chapter selections');
assert(html.includes('id="ao3TranslateSelectedFileChaptersBtn"') && html.includes('선택한 챕터만 번역하고 저장'), 'users should explicitly translate only selected chapters');
assert(html.includes('accept=".html,.htm,.xhtml,.txt'), 'file chooser should accept the recommended AO3 HTML export');
assert(js.includes("querySelectorAll('#workskin .preface dd.fandom.tags a.tag") && js.includes('workCategoryEls') && js.includes('workTagEls'), 'AO3 fandom/category/tag metadata should be extracted');
assert(js.includes("metadataTagsForLabels(['fandom', 'fandoms'])") && js.includes("metadataTagsForLabels(['category', 'categories'])"), 'plain AO3 download metadata labels should also be recognized');
assert(js.includes('renderAo3FileImportPreview(parsed)') && js.includes('selectedIndexes.map(function(index)'), 'file import should stage the selected chapters before translation');
assert(js.includes('parseAo3HtmlDocument(text, \'\')') && js.includes("parsed.reason === 'adult_gate'"), 'adult gate files should be reported instead of silently imported');
assert(css.includes('html[data-app-theme="green"] body #ao3LinkQueueBox[style]') && css.includes('background-color: #edf5ee !important;'), 'green queue background must override the inline dark background');
assert(html.includes('app.css?v=83.0') && html.includes('app.js?v=87.0'), 'upload and queue color fixes should use fresh cached assets');
console.log('Login-only AO3 file import and green queue contrast checks passed.');
