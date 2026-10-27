const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public/assets/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
function assert(condition, message) { if (!condition) throw new Error(message); }
assert(html.includes('translationQualityTabBtn') && html.includes('translationQualityTabPane'), 'quality settings tab must exist');
assert(html.includes('qualityParagraphCountEnabledInput'), 'paragraph count toggle must exist');
assert(html.includes('qualityEnglishResidueEnabledInput'), 'English residue toggle must exist');
assert(app.includes('qualityParagraphCountEnabled: true') && app.includes('qualityEnglishResidueEnabled: true'), 'quality checks should default on');
assert(app.includes("name === 'paragraphCount'") && app.includes("name === 'englishResidue'"), 'quality check flags should be consulted');
assert(app.includes('ao3FitExtraTranslationParts'), 'disabled paragraph count check should attempt safe extra-part alignment');
assert(app.includes("'qualityParagraphCountEnabled', 'qualityEnglishResidueEnabled'"), 'quality settings should sync through Drive preferences');
assert(app.includes('decoded.settings.qualityParagraphCountEnabled') && app.includes('decoded.settings.qualityEnglishResidueEnabled'), 'quality settings should restore from encrypted backup');
assert((app.match(/ao3QualityCheckEnabled\('englishResidue'\)/g) || []).length >= 4, 'all provider English-residue checks should honor the toggle');
console.log('Translation quality toggles v103 tests passed.');
