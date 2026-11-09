const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const useWebKit=process.env.TEST_BROWSER==='webkit';
 const proxy=process.env.LIVE_SHARED_PAGE && process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined;
 const browser=await (useWebKit?webkit.launch({headless:true,proxy}):chromium.launch({headless:true,proxy,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}));
 try {
 const {handleBrowserShareImport}=await import('../src/browser-share-import.js');
 const context=await browser.newContext(useWebKit?{isMobile:true,viewport:{width:390,height:844}}:{});
 const publicRoot=path.resolve(__dirname,'../public');
 const sourceUrl=process.env.SHARE_URL||'https://chatgpt.com/share/6af1917c-bfc0-83e8-acbe-8c7b0f442e9a';
 const fixture=process.env.SHARE_HTML_PATH?fs.readFileSync(process.env.SHARE_HTML_PATH,'utf8'):'<script type="application/json">'+JSON.stringify({linear_conversation:[{message:{id:'final',author:{role:'assistant'},channel:'final',content:{parts:['# Bridge Book\n## Chapter 1\n첫 본문.\n## Chapter 2\n두 번째 본문.']}}}]})+'</script>';
 const inert=fixture.replace(/<script\b[^>]*>/gi,'<script type="application/json">').replace(/<link\b[^>]*>/gi,'');
 let remoteFetches=0,posts=0;
 await context.route('**/*',async route=>{
  const request=route.request(),u=new URL(request.url());
  if(process.env.LIVE_SHARED_PAGE && (u.origin==='https://chatgpt.com'||u.hostname.endsWith('oaistatic.com')))return route.continue();
  if(u.origin==='https://chatgpt.com'&&u.pathname===new URL(sourceUrl).pathname)return route.fulfill({contentType:'text/html',body:inert});
  if(u.origin==='https://ao3.taglia.workers.dev'){
   if(process.env.LIVE_TARGET){if(u.pathname==='/api/browser-share-import')posts++;if(u.pathname==='/api/chatgpt-share')remoteFetches++;return route.continue();}
   if(u.pathname==='/api/browser-share-import'){
    posts++;
    const req=new Request(request.url(),{method:request.method(),headers:request.headers(),body:request.postDataBuffer()});
    const response=await handleBrowserShareImport(req,{ASSETS:{fetch:async()=>new Response(fs.readFileSync(path.join(publicRoot,'index.html')))}});
    return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
   }
   if(u.pathname.startsWith('/api/')){if(u.pathname==='/api/chatgpt-share')remoteFetches++;return route.fulfill({contentType:'application/json',body:JSON.stringify({platform:'cloudflare-worker',providers:{}})});}
   const file=u.pathname==='/'?path.join(publicRoot,'index.html'):path.resolve(publicRoot,'.'+u.pathname);
   if(!file.startsWith(publicRoot+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'missing'});
   return route.fulfill({contentType:/\.js$/.test(file)?'application/javascript':/\.css$/.test(file)?'text/css':/\.html$/.test(file)?'text/html':'text/plain',body:fs.readFileSync(file)});
  }
  return route.abort();
 });
 const page=await context.newPage();
 await page.goto(sourceUrl,{waitUntil:'domcontentloaded',timeout:45000});
 if(process.env.SOURCE_WAIT_MS)await page.waitForTimeout(Number(process.env.SOURCE_WAIT_MS));
 const code=decodeURIComponent(fs.readFileSync(path.join(publicRoot,'assets/chatgpt-to-bookshelf.txt'),'utf8').slice('javascript:'.length));
 await page.evaluate(code=>{(0,eval)(code);},code);
 await page.waitForURL('https://ao3.taglia.workers.dev/**');
 await page.waitForFunction(()=>window.__AO3_BUILD_VERSION__==='113');
 const expected=process.env.EXPECTED_TITLE||(process.env.SHARE_HTML_PATH?'BOGO':'Bridge Book');
 const expectedCount=Number(process.env.EXPECTED_CHAPTERS||(process.env.SHARE_HTML_PATH?6:2));
 await page.waitForFunction(title=>JSON.parse(localStorage.getItem('ao3_korean_bookshelf_v1')||'[]').some(n=>n.title===title),expected);
 const saved=await page.evaluate(title=>JSON.parse(localStorage.getItem('ao3_korean_bookshelf_v1')).find(n=>n.title===title),expected);
 assert.equal(saved.chapters.length,expectedCount);assert.equal(saved.importSourceUrls[0],sourceUrl);
 assert.equal(posts,1);assert.equal(remoteFetches,0);assert.equal(new URL(page.url()).pathname,'/');
 if(process.env.EXPECTED_AUTHOR)assert.equal(saved.author,process.env.EXPECTED_AUTHOR);
 if(process.env.SHARE_HTML_PATH&&!process.env.EXPECTED_TITLE){
  assert.equal(saved.chapters[0].paragraphs[0].ko,'모두가 일리야 로자노프의 삶은 요란하게 끝날 거라고 생각했다.');
  assert.equal(saved.chapters[5].paragraphs.at(-1).ko,'꽤 괜찮은 거래였다.');
 }
 assert(!saved.chapters.some(c=>c.paragraphs.some(p=>/^\*\*커플링|^\*\*등급|^If you want|^\*다음 부분에서 이어집니다/.test(p.ko))));
 await page.reload();await page.waitForFunction(()=>window.__AO3_BUILD_VERSION__==='113');
 assert.equal(await page.evaluate(title=>JSON.parse(localStorage.getItem('ao3_korean_bookshelf_v1')).find(n=>n.title===title).chapters.length,expected),expectedCount);
 console.log('PASS '+(useWebKit?'WebKit':'Chromium')+' browser form transfer: source page → bookshelf, complete chapters, author, no clipboard/server fetch/PDF, persisted after reload');
 await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
