const assert = require('node:assert/strict');

(async function() {
  const worker = (await import('../src/index.js')).default;
  const originalFetch = globalThis.fetch;
  let calls = [];
  try {
    globalThis.fetch = async function(url, options) {
      calls.push({ url: String(url), options: options || {} });
      return new Response('<html><div id="workskin"><div id="chapters">story</div></div></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=UTF-8' }
      });
    };

    const target = 'https://secure.ao3.org/collections/Some-Collection/works/76008221?view_full_work=true#workskin';
    const request = new Request('https://ao3.example/api/ao3-fetch?url=' + encodeURIComponent(target));
    const response = await worker.fetch(request, {});
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://ao3.example');
    assert.match(await response.text(), /id="workskin"/);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://archiveofourown.org/collections/Some-Collection/works/76008221?view_adult=true&view_full_work=true');
    assert.equal(calls[0].options.headers.Cookie, 'view_adult=true; accepted_tos=20180523');

    const sampleLinks = [
      ['https://archiveofourown.org/works/76008221', 'https://archiveofourown.org/works/76008221?view_adult=true'],
      ['https://archiveofourown.org/works/75114181/chapters/196285836', 'https://archiveofourown.org/works/75114181/chapters/196285836?view_adult=true'],
      ['https://archiveofourown.org/works/87402886/chapters/233492651#workskin', 'https://archiveofourown.org/works/87402886/chapters/233492651?view_adult=true']
    ];
    for (const [sampleUrl, expectedUrl] of sampleLinks) {
      calls = [];
      const sampleRequest = new Request('https://ao3.example/api/ao3-fetch?url=' + encodeURIComponent(sampleUrl));
      const sampleResponse = await worker.fetch(sampleRequest, {});
      assert.equal(sampleResponse.status, 200);
      assert.equal(calls[0].url, expectedUrl);
    }

    calls = [];
    const invalid = new Request('https://ao3.example/api/ao3-fetch?url=' + encodeURIComponent('https://example.com/works/76008221'));
    const invalidResponse = await worker.fetch(invalid, {});
    assert.equal(invalidResponse.status, 400);
    assert.equal(calls.length, 0, 'non-AO3 hosts must never be fetched');

    calls = [];
    globalThis.fetch = async function(url, options) {
      calls.push({ url: String(url), options: options || {} });
      return new Response(null, { status: 302, headers: { Location: 'https://example.com/redirected' } });
    };
    const redirected = new Request('https://ao3.example/api/ao3-fetch?url=' + encodeURIComponent('https://archiveofourown.org/works/75114181/chapters/196285836#workskin'));
    const redirectResponse = await worker.fetch(redirected, {});
    assert.equal(redirectResponse.status, 502);
    assert.equal(calls.length, 1, 'redirects must remain on AO3 domains');
    console.log('AO3 Worker fetch validation, adult view, fragment cleanup, and redirect checks passed.');
  } finally {
    globalThis.fetch = originalFetch;
  }
})().catch(function(error) {
  console.error(error);
  process.exitCode = 1;
});
