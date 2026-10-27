const fs = require('fs');
const path = require('path');
const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
if (html.includes('\\n  <link')) throw new Error('Literal \\n found in HTML stylesheet links');
for (const asset of ['/assets/app.css?v=82.0', '/assets/app.js?v=86.0', '/assets/queue-widget-v44.js?v=74.0']) {
  if (!html.includes(asset)) throw new Error(`Missing cache-busted asset reference: ${asset}`);
}
if (!html.includes('AO3_BUILD=ao3-bookshelf-ui-v86.0')) throw new Error('Build marker not updated');
console.log('HTML asset references and literal newline regression checks passed.');
