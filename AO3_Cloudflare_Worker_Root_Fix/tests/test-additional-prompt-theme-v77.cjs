const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/assets/app.css'), 'utf8');
function assert(ok, message) { if (!ok) throw new Error(message); }
assert(html.includes('id="additionalPromptSettingsPanel"'), 'Additional prompt panel needs a stable theme hook');
const panel = html.match(/<div id="additionalPromptSettingsPanel"[\s\S]*?<\/div>/)?.[0] || '';
assert(!/bg-violet|border-violet|text-violet|focus:border-violet/.test(panel), 'Additional prompt markup still hardcodes violet colors');
assert(css.includes('#additionalPromptSettingsPanel'), 'Base additional prompt palette is missing');
for (const theme of ['dark', 'green']) assert(css.includes(`html[data-app-theme="${theme}"] #additionalPromptSettingsPanel`), `${theme} additional prompt palette is missing`);
assert(html.includes('app.css?v=82.0') && html.includes('app.js?v=85.0'), 'App cache-busting version was not updated');
console.log('Additional prompt theme contrast checks passed.');

assert(css.includes('html[data-app-theme="green"] #ao3FetchLogBox {'), 'Green extraction log palette is missing');
assert(css.includes('html[data-app-theme="green"] #ao3FetchLogBox #ao3FetchLogList'), 'Green extraction log text contrast rule is missing');
assert(css.includes('html[data-app-theme="dark"] #ao3FetchLogBox {'), 'Dark extraction log palette is missing');
