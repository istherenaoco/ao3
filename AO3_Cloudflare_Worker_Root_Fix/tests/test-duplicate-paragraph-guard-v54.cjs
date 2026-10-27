const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(require('path').join(__dirname, '../public/assets/app.js'), 'utf8');
const match = source.match(/function dedupeRepeatedSourceParagraphs\(blocks\)\s*\{[\s\S]*?\n      \}/);
if (!match) throw new Error('dedupeRepeatedSourceParagraphs helper missing from app bundle');
const context = {};
vm.runInNewContext('(' + match[0] + ')', context);
const dedupe = vm.runInNewContext('(' + match[0] + ')');
const a = 'A long paragraph about Shane and Ilya that is repeated by a broken import and contains enough words to exceed one hundred characters when combined with the surrounding sentence details.';
const b = 'Another long paragraph where Shane asks Ilya what he is doing, with enough details to make it a full paragraph rather than a short repeated dialogue line.';
const c = 'A third long paragraph describes the same scene and makes the repeated block unambiguous for this regression test.';
const cleaned = dedupe([a, b, c, a, b, c, '“오늘 밤은 여기서 자.”', '“오늘 밤은 여기서 자.”']);
if (cleaned.filter(x => x === a).length !== 1 || cleaned.filter(x => x === b).length !== 1 || cleaned.filter(x => x === c).length !== 1) {
  throw new Error('Repeated paragraph block was not removed');
}
if (cleaned.filter(x => x === '“오늘 밤은 여기서 자.”').length !== 2) {
  throw new Error('Short repeated dialogue should be preserved');
}
const longDuplicate = a + ' A second sentence makes this duplicate paragraph even longer and still unambiguous.';
const cleanedLong = dedupe([longDuplicate, 'A short transition.', longDuplicate]);
if (cleanedLong.filter(x => x === longDuplicate).length !== 1) throw new Error('Repeated long paragraph was not removed');
console.log('Duplicate source paragraph guard tests passed.');
