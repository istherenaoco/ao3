const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/assets/app.css'), 'utf8');
const required = [
  'readerSpacingHorizontalPaddingMinus', 'readerSpacingHorizontalPaddingPlus',
  'readerSpacingLineHeightMinus', 'readerSpacingLineHeightPlus',
  'readerSpacingParagraphSpacingMinus', 'readerSpacingParagraphSpacingPlus',
  'readerSpacingFirstLineIndentMinus', 'readerSpacingFirstLineIndentPlus'
];
for (const id of required) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing reader spacing control: ${id}`);
}
for (const key of ['horizontalPadding', 'lineHeightPx', 'paragraphSpacingPx', 'firstLineIndentPx']) {
  if (!js.includes(key)) throw new Error(`Missing persisted preference: ${key}`);
}
for (const cssToken of ['--reader-horizontal-padding', '--reader-line-height', '--reader-paragraph-spacing', '--reader-first-line-indent']) {
  if (!css.includes(cssToken)) throw new Error(`Missing CSS variable ${cssToken}`);
  if (!js.includes(cssToken)) throw new Error(`Missing live CSS application ${cssToken}`);
}
if (!html.includes('/assets/app.css') || !html.includes('/assets/app.js')) throw new Error('HTML is not wired to canonical assets');
console.log('Reader spacing v53 tests passed.');

if (!js.includes("{ key: 'lineHeightPx', label: 'readerLineHeightLabel', min: 10, max: 25, step: 1 }")) throw new Error('Line-height minimum must be 10px');
if (!css.includes('html[data-app-theme="light"] .reader-spacing-stepper button') || !css.includes('html[data-app-theme="dark"] .reader-spacing-stepper button')) throw new Error('Spacing stepper buttons must be theme-aware');
