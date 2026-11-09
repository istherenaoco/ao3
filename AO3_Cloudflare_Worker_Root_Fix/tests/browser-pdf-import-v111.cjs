const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
 try {
 const page = await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:4173');
 await page.waitForFunction(()=>window.__AO3_BUILD_VERSION__ === '111');
 await page.locator('#translatedFileInput').setInputFiles(path.join(__dirname,'fixtures/translated-korean.pdf')); 
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ao3_korean_bookshelf_v1')||'[]').some(n=>n.title==='별빛'));
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ao3_korean_bookshelf_v1')).find(n=>n.title==='별빛'));
 assert.equal(saved.author,'Writer');assert.equal(saved.chapters.length,2);
 assert.equal(saved.chapters[0].paragraphs[0].ko,'첫 번째 번역 본문입니다.');
 assert.equal(saved.chapters[1].paragraphs[0].ko,'두 번째 번역 본문입니다.');
 assert(!JSON.stringify(saved).includes('제외할 후기'));
 const savedCount = await page.evaluate(()=>JSON.parse(localStorage.getItem('ao3_korean_bookshelf_v1')).length);
 await page.reload();
 await page.waitForFunction(()=>window.__AO3_BUILD_VERSION__ === '111');
 for (const [filename, message] of [['scanned.pdf','스캔 PDF'],['locked.pdf','암호']]) {
   await page.locator('#translatedFileInput').setInputFiles(path.join(__dirname,'fixtures',filename));
   await page.waitForFunction(text=>document.getElementById('toastContainer').textContent.includes(text),message);
   assert.equal(await page.locator('#translatedFileBtn').isDisabled(),false);
 }
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ao3_korean_bookshelf_v1')).length),savedCount);
 assert.deepEqual(errors,[]);
 console.log('PASS Korean PDF upload: metadata, chapters, notes, persisted text, scanned and encrypted PDF errors');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
