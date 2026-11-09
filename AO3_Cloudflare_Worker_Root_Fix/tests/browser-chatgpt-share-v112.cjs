const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_BASE_URL||'http://127.0.0.1:4174');await page.waitForFunction(()=>window.__AO3_BUILD_VERSION__==='113');
 const message=(id,text,metadata={},role='assistant')=>({id,author:{role},channel:'final',recipient:'all',content:{parts:[text]},metadata});
 const final=message('full','# Test Book\n## Chapter 1: One\n아래는 본문 번역입니다.\n\n---\n\n첫 문단.\n둘째 문단.\n\n**챕터 1 끝**',{is_merged_message:true,source_message_ids:['fragment']});
 const data={linear_conversation:[{message:message('fragment','중복 조각',{is_message_fragment:true,merged_message_id:'full'})},{message:final},{message:message('prompt','저자: Writer\n원문 URL: https://archiveofourown.org/works/123\n영어 원문',{},'user')},{message:message('full2','# Chapter 2: Two\n*소제목*\n\n**챕터 요약:**  \n요약 내용.\n\n셋째 문단.\n\n*챕터 2 본문 끝.*')}]};
 const html='<script type="application/json">'+JSON.stringify(data)+'</script>';
 const parsed=await page.evaluate(html=>ChatgptShareImport.parse(html),html);
 assert.equal(parsed.meta.title,'Test Book');assert.equal(parsed.meta.author,'Writer');assert.equal(parsed.chapters.length,2);
 assert.deepEqual(parsed.chapters.map(c=>c.paragraphs),[['첫 문단.','둘째 문단.'],['셋째 문단.']]);
 const mobile=await page.evaluate(()=>{
   const encode=value=>Array.isArray(value)?['array',value.map(encode)]:value&&typeof value==='object'?['object',Object.entries(value).map(([key,item])=>[key,encode(item)])]:[typeof value,value];
   const data={rows:[{id:'m1',role:'assistant',content:'# Mobile Book\n저자: Mobile Writer\nChapter 1\n모바일 본문.',reasoningSummary:'숨긴 분석'}]};
   return ChatgptShareImport.parse('<script type="application/json" data-octane-native-signals>'+JSON.stringify({version:1,scopes:[{entries:[{value:encode(data)}]}]})+'</script>');
 });
 assert.equal(mobile.meta.title,'Mobile Book');assert.equal(mobile.meta.author,'Mobile Writer');assert.deepEqual(mobile.chapters[0].paragraphs,['모바일 본문.']);assert(!JSON.stringify(mobile).includes('숨긴 분석'));
 const mobileDom=await page.evaluate(()=>ChatgptShareImport.parse('<div data-message-author-role="assistant"><div data-assistant-markdown-root><h1>Mobile Book</h1><p>저자: Writer</p><h2>Chapter 1</h2><p>본문.</p></div></div>'));
 assert.equal(mobileDom.meta.title,'Mobile Book');assert.equal(mobileDom.chapters.length,1);assert.deepEqual(mobileDom.chapters[0].paragraphs,['본문.']);
 await page.route('**/api/chatgpt-share?*',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({html,shareUrl:'https://chatgpt.com/share/6af1917c-bfc0-83e8-acbe-8c7b0f442e9a'})}));
 await page.locator('#chatgptShareUrlInput').fill('https://chatgpt.com/share/6af1917c-bfc0-83e8-acbe-8c7b0f442e9a');
 await page.locator('#chatgptShareImportBtn').evaluate(e=>e.click());
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ao3_korean_bookshelf_v1')||'[]').some(n=>n.title==='Test Book'));
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ao3_korean_bookshelf_v1')).find(n=>n.title==='Test Book'));
 assert.equal(saved.chapters.length,2);assert(!JSON.stringify(saved).includes('중복 조각'));assert(!JSON.stringify(saved).includes('영어 원문'));
 await page.locator('#chatgptShareUrlInput').fill('https://chatgpt.com/share/6af1917c-bfc0-83e8-acbe-8c7b0f442e9a');
 await page.locator('#chatgptShareImportBtn').evaluate(e=>e.click());
 await page.waitForFunction(()=>document.getElementById('toastContainer').textContent.includes('이미 책장에 저장된'));
 const count=await page.evaluate(()=>JSON.parse(localStorage.getItem('ao3_korean_bookshelf_v1')).filter(n=>n.title==='Test Book').map(n=>n.chapters.length));
 assert.deepEqual(count,[2]);
 if(process.env.SHARE_HTML_PATH){
 const actual=await page.evaluate(html=>ChatgptShareImport.parse(html),fs.readFileSync(process.env.SHARE_HTML_PATH,'utf8'));
 assert.equal(actual.meta.title,'BOGO');assert.equal(actual.missingAuthor,true);
 assert.deepEqual(actual.chapters.map(c=>c.number),[1,2,3,4,5,6]);
 assert.equal(actual.chapters[0].paragraphs[0],'모두가 일리야 로자노프의 삶은 요란하게 끝날 거라고 생각했다.');
 assert.equal(actual.chapters[5].paragraphs.at(-1),'꽤 괜찮은 거래였다.');
 for(const c of actual.chapters)assert(!c.paragraphs.some(p=>/챕터 요약|챕터 \d+ (?:본문 )?끝|The output of this plugin was redacted|작가 후기 생략/.test(p)));
 console.log('PASS supplied public conversation: BOGO, six complete chapters, metadata fallback, no fragments/summaries/footers');
 }
 assert.deepEqual(errors,[]);console.log('PASS share import browser parser and direct bookshelf save');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
