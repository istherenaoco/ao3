const assert = require('node:assert/strict');
(async()=>{
 const {normalizeShareUrl,handleChatgptShare}=await import('../src/chatgpt-share.js');
 const share='https://chatgpt.com/share/6af1917c-bfc0-83e8-acbe-8c7b0f442e9a';
 assert.equal(normalizeShareUrl(share+'?tracking=1#x'),share);
 assert.equal(normalizeShareUrl('https://chatgpt.com/s/t_6af1910c1f488191893c87d6cc563392'),'https://chatgpt.com/s/t_6af1910c1f488191893c87d6cc563392');
 for(const url of ['https://chatgpt.com.evil.test/share/x','http://chatgpt.com/share/x','https://chatgpt.com/backend-api/conversation/x','https://user@chatgpt.com/share/6af1917c-bfc0-83e8-acbe-8c7b0f442e9a','https://127.0.0.1/share/x'])assert.throws(()=>normalizeShareUrl(url));
 const original=global.fetch;let calls=0;
 const req=(url=share)=>new Request('https://ao3.example/api/chatgpt-share?url='+encodeURIComponent(url));
 try{
 global.fetch=async(url,options)=>{calls++;assert.equal(options.redirect,'manual');assert(!options.headers.Cookie);return new Response('<html>shared content</html>',{headers:{'content-type':'text/html'}})};
 const response=await handleChatgptShare(req());assert.equal(response.status,200);assert.equal((await response.json()).html,'<html>shared content</html>');assert.equal(response.headers.get('cache-control'),'no-store');
 calls=0;assert.equal((await handleChatgptShare(req('https://evil.test/'))).status,400);assert.equal(calls,0);
 global.fetch=async()=>new Response(null,{status:302,headers:{Location:'https://evil.test'}});
 assert.equal((await handleChatgptShare(req())).status,502);
 global.fetch=async()=>new Response('challenge',{status:403,headers:{'cf-mitigated':'challenge'}});
 const blocked=await handleChatgptShare(req());assert.equal(blocked.status,502);
 const details=await blocked.json();assert.equal(details.upstreamStatus,403);assert.equal(details.reason,'challenge');
 global.fetch=async()=>new Response('forbidden',{status:403});assert.equal((await (await handleChatgptShare(req())).json()).reason,'forbidden');
 global.fetch=async()=>new Response('x'.repeat(10*1024*1024+1),{headers:{'content-type':'text/html'}});assert.equal((await handleChatgptShare(req())).status,413);
 }finally{global.fetch=original;}
 console.log('PASS public share URL validation, no credentials/redirects, size limits, cache and upstream errors');
})().catch(e=>{console.error(e);process.exit(1)});
