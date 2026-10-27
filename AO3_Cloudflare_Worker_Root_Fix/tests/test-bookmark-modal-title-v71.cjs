const fs = require('fs');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'app.js'), 'utf8');
const expected = "textContent = '소설 북마크 & 태그 설정';";
if (!app.includes(expected)) throw new Error('Novel bookmark modal title should be static and omit the novel title.');
if (app.includes("textContent = '소설 북마크 & 태그 설정 (' + novel.title + ')'")) throw new Error('Dynamic novel title is still appended to bookmark modal heading.');
console.log('Bookmark modal title regression test passed.');
