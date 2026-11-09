const assert=require('node:assert/strict');
(async()=>{
 const {handleBrowserShareImport}=await import('../src/browser-share-import.js');
 const endpoint='https://ao3.taglia.workers.dev/api/browser-share-import';
 const body='AO3-BROWSER-SHARE/1\n'+JSON.stringify({meta:{title:'Example'},chapters:[{title:'One',paragraphs:['</script><img src=x onerror=alert(1)>']}]});
 const request=(origin='https://chatgpt.com')=>new Request(endpoint,{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({payload:body})});
 const env={ASSETS:{fetch:async()=>new Response('<html><!-- Application Script --><script src="/assets/app.js"></script></html>')}};
 assert.equal((await handleBrowserShareImport(request('https://evil.example'),env)).status,403);
 assert.equal((await handleBrowserShareImport(new Request(endpoint),env)).status,405);
 const response=await handleBrowserShareImport(request(),env);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const html=await response.text();assert(!html.includes('<img src=x'));assert.equal(JSON.parse(html.match(/id="browserTransferPayload">([\s\S]*?)<\/script>/)[1]),body);assert(html.indexOf('browserTransferPayload')<html.indexOf('Application Script'));
 const oversize=new Request(endpoint,{method:'POST',headers:{Origin:'https://chatgpt.com','Content-Type':'application/x-www-form-urlencoded','Content-Length':String(9*1024*1024)},body:'payload=x'});
 assert.equal((await handleBrowserShareImport(oversize,env)).status,413);
 console.log('PASS browser import origin/method/size validation and inert HTML payload escaping');
})().catch(e=>{console.error(e);process.exit(1)});
