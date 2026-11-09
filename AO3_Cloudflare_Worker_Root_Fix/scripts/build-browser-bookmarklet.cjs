const fs = require('node:fs');
const path = require('node:path');
const {transformSync} = require('esbuild');
const root = path.resolve(__dirname, '..');
function read(name) { return fs.readFileSync(path.join(root, 'public/assets', name), 'utf8'); }
let translation = read('translated-import.js').replace('})(typeof window === \'undefined\' ? globalThis : window);', '})(bridge);');
let importer = read('chatgpt-share-import.js').replace('})(window);', '})(bridge);');
let transfer = read('browser-share-transfer.js').replace('})(window);', '})(bridge);');
const source = '(function(){const bridge={};\n' + translation + '\n' + importer + '\n' + transfer + '\nvoid bridge.BrowserShareTransfer.send("https://ao3.taglia.workers.dev/api/browser-share-import");})();';
const code = transformSync(source, {minify:true, target:'es2020', charset:'utf8'}).code;
const bookmarklet = 'javascript:' + encodeURIComponent(code);
fs.writeFileSync(path.join(root, 'public/assets/chatgpt-to-bookshelf.txt'), bookmarklet);
const guide=fs.readFileSync(path.join(root,'scripts/browser-import-guide.template.html'),'utf8');
fs.writeFileSync(path.join(root,'public/browser-import.html'),guide.replace('{{BOOKMARKLET}}',()=>bookmarklet.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')));
console.log('Bookmarklet generated:', code.length, 'characters');
