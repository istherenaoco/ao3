const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/assets/app.css'), 'utf8');
function assert(ok, message) { if (!ok) throw new Error(message); }
assert(css.includes('html[data-app-theme="green"] #ao3LinkQueueBox #ao3LinkQueueList > li'), 'Green queue row divider override is missing');
assert(css.includes('html[data-app-theme="green"] #ao3LinkQueueBox #ao3LinkQueueList li button'), 'Green queue action button background/border override is missing');
assert(css.includes('background: #d5e6d8 !important;'), 'Green queue button background must override inline navy styles');
assert(css.includes('html[data-app-theme="green"] #ao3LinkQueueBox #ao3LinkQueueList li > div:first-child > div:nth-child(3)'), 'Green queue URL contrast override is missing');
assert(css.includes('html[data-app-theme="green"] #studioAdvancedDetails [class~="bg-slate-50/60"]'), 'Green manual chapter queue card override is missing');
assert(css.includes('#draftChaptersContainer [class~="bg-emerald-50"]'), 'Green translated-state badge override is missing');
assert(css.includes('#draftChaptersContainer [class~="bg-amber-50"]'), 'Green untranslated-state badge override is missing');
assert(js.includes("background:rgba(15,23,42,.25)"), 'Expected inline dark queue button style changed; ensure CSS still overrides this source');
assert(html.includes('app.css?v=85.0') && html.includes('app.js?v=89.0'), 'Queue/app cache-busting versions are missing');
console.log('Green translation queue color regression checks passed.');
