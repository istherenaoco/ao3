const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/assets/app.css'), 'utf8');
for (const weight of ['300', '400', '500']) {
  if (!html.includes(`<option value="${weight}">`)) throw new Error(`Missing weight option ${weight}`);
  if (!js.includes(String(weight))) throw new Error(`Missing JS support for ${weight}`);
  if (!css.includes(`data-reader-weight="${weight}"`)) throw new Error(`Missing CSS rule for ${weight}`);
}
if (html.includes('<option value="700">') || /fontWeight\s*:\s*700/.test(js)) {
  throw new Error('Bold reader weight should not be selectable');
}
for (const target of ['readerFontWeightSelect', 'fontWeight: [300, 400, 500]', 'scheduleDriveUserPreferencesSync']) {
  if (!js.includes(target)) throw new Error(`Missing preference persistence hook: ${target}`);
}
if (!html.includes('/assets/app.css') || !html.includes('/assets/app.js')) throw new Error('Versioned assets are not referenced');
console.log('Reader font-weight control tests passed.');
