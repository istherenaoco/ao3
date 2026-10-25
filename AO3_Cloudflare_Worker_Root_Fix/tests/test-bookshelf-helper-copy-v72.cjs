const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'app.js'), 'utf8');
const removed = [
  '기본 책장은 모든 번역 작품을 모아 봅니다. 작가별·주제별 책장은 검색으로 원하는 작품만 직접 추가합니다. 자동 분류는 하지 않습니다.',
  '기본 책장 · 작품은 여기서 삭제되지 않습니다.',
  '작가별 책장 · 원하는 작품을 직접 선택해 담으세요.',
  '주제별 책장 · 원하는 작품을 직접 선택해 담으세요.',
  '전체 번역 작품을 모아 보는 기본 책장입니다. 작가별·주제별 책장에 담으려면 해당 책장을 선택하고 ‘작품 추가’를 눌러 검색하세요.',
  '이 책장에 직접 담은 작품만 표시됩니다. 작품을 추가하려면 ‘작품 추가’를 누르고 제목이나 작가를 검색하세요.'
];
for (const phrase of removed) {
  if (html.includes(phrase) || app.includes(phrase)) throw new Error(`Removed helper copy still exists: ${phrase}`);
}
if (!html.includes('app.css?v=73.0') || !html.includes('app.js?v=73.0')) throw new Error('Asset cache version was not bumped to 73.0');
if (!app.includes("document.getElementById('customShelfCurrentDescription').textContent = '';")) throw new Error('Shelf description is not cleared');
console.log('Bookshelf helper copy removal test passed.');
