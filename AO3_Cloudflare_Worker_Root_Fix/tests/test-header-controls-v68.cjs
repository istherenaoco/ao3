const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/assets/app.js', 'utf8');
const ids = ['brandHomeBtn','navBookshelfBtn','navCustomBookshelvesBtn','navStudioBtn','navBookmarksBtn','driveSyncBtn','openApiSettingsModalBtn','openSettingsModalBtn','openBackupModalBtn'];
for (const id of ids) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing header control in HTML: ${id}`);
  if (!js.includes(`['${id}', function()`)) throw new Error(`Missing early header binding: ${id}`);
}
const init = js.indexOf('function initEvents()');
const binding = js.indexOf("['openBackupModalBtn', function()", init);
const firstOptional = js.indexOf("document.getElementById('customShelfCreateToggleBtn')", init);
if (init < 0 || binding < 0 || firstOptional < 0 || binding > firstOptional) throw new Error('Critical header bindings must run before optional event bindings');
if (!js.includes("modal.classList.remove('hidden')")) throw new Error('Backup modal open action missing');
if (!js.includes("modal.style.display = 'flex'")) throw new Error('Backup modal must explicitly become visible when opened');
if (!html.includes('id="backupModal" aria-hidden="true"') || !html.includes('style="display:none"')) throw new Error('Backup modal initial visibility state missing');
if (!js.includes("modal.style.display = 'none'")) throw new Error('Backup modal close action must explicitly hide it');
console.log('Header controls v68: passed');
