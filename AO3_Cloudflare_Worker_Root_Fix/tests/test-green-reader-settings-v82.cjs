const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/assets/app.css'), 'utf8');
function assert(ok, message) { if (!ok) throw new Error(message); }
assert(css.includes('html[data-app-theme="green"] #readerDisplayDrawer'), 'Green reader settings drawer override is missing');
assert(css.includes('html[data-app-theme="green"] #readerControlsBar'), 'Green reader toolbar override is missing');
assert(css.includes('background: #e7f0e8 !important;'), 'Reader settings surfaces must use green surface color');
assert(css.includes('#readerDisplayDrawer input[type="checkbox"]') && css.includes('accent-color: #477653 !important;'), 'Reader settings checkbox accent is missing');
assert(html.includes('app.css?v=87.0') && html.includes('app.js?v=109.0'), 'Reader/app cache-busting versions are missing');
console.log('Green reader settings color regression checks passed.');
