(function(root) {
  'use strict';
  const PREFIX = 'AO3-BROWSER-SHARE/1\n';
  function sourceUrl(raw) {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !['chatgpt.com', 'chat.openai.com'].includes(url.hostname) ||
        url.username || url.password || url.port || !/^\/(?:share\/[a-f0-9-]{36}|s\/t_[a-f0-9]{28,64})\/?$/i.test(url.pathname)) {
      throw new Error('ChatGPT 공개 공유 페이지를 Safari에서 연 뒤 실행해 주세요.');
    }
    return 'https://chatgpt.com' + url.pathname.replace(/\/$/, '');
  }
  function validate(parsed) {
    if (!parsed || !parsed.meta || !Array.isArray(parsed.chapters) || !parsed.chapters.length || parsed.chapters.length > 500) throw new Error('전달된 챕터 형식이 올바르지 않습니다.');
    const string = function(value, max) { return typeof value === 'string' ? value.slice(0, max) : ''; };
    let characters = 0, paragraphs = 0;
    const chapters = parsed.chapters.map(function(chapter, index) {
      if (!chapter || !Array.isArray(chapter.paragraphs)) throw new Error('본문 형식이 올바르지 않습니다.');
      const text = chapter.paragraphs.map(function(value) {
        if (typeof value !== 'string') throw new Error('본문에 텍스트가 아닌 값이 있습니다.');
        characters += value.length; paragraphs++;
        if (characters > 2000000 || paragraphs > 50000) throw new Error('대화가 너무 큽니다. 챕터별로 나눠 보내 주세요.');
        return value.trim();
      }).filter(Boolean);
      if (!text.length) throw new Error('빈 챕터는 저장할 수 없습니다.');
      return { title: string(chapter.title, 500) || 'Chapter ' + (index + 1), number: Number.isInteger(chapter.number) && chapter.number > 0 ? chapter.number : undefined, paragraphs: text };
    });
    let originalUrl = string(parsed.meta.sourceUrl, 2048);
    if (originalUrl) { try { const url = new URL(originalUrl); if (url.protocol !== 'https:' || url.username || url.password) originalUrl = ''; } catch { originalUrl = ''; } }
    return { meta: { title: string(parsed.meta.title, 500) || '번역 소설', author: string(parsed.meta.author, 200), sourceUrl: originalUrl, shareUrl: sourceUrl(parsed.meta.shareUrl) }, chapters: chapters, missingTitle: !!parsed.missingTitle, missingAuthor: !!parsed.missingAuthor };
  }
  function encode(parsed) { return PREFIX + JSON.stringify(validate(parsed)); }
  function decode(text) {
    if (typeof text !== 'string' || !text.startsWith(PREFIX)) throw new Error('서재로 보낸 대화가 없습니다. 공유 페이지에서 ‘서재로 보내기’를 먼저 실행해 주세요.');
    if (text.length > 2500000) throw new Error('전달 데이터가 너무 큽니다.');
    let parsed;
    try { parsed = JSON.parse(text.slice(PREFIX.length)); } catch { throw new Error('전달 데이터가 손상됐습니다. 공유 페이지에서 다시 보내 주세요.'); }
    return validate(parsed);
  }
  function capture(html, url) {
    const publicUrl = sourceUrl(url);
    const parsed = root.ChatgptShareImport.parse(html);
    parsed.meta.shareUrl = publicUrl;
    return encode(parsed);
  }
  async function readCurrentShare() {
    sourceUrl(location.href);
    try { return capture(document.documentElement.outerHTML, location.href); }
    catch (error) {
      return new Promise(function(resolve, reject) {
        const frame = document.createElement('iframe');
        frame.setAttribute('sandbox', 'allow-same-origin');
        frame.style.display = 'none';
        let finished = false;
        const finish = function(error, payload) {
          if (finished) return; finished = true; clearTimeout(timer); frame.remove();
          if (error) reject(error); else resolve(payload);
        };
        const timer = setTimeout(function() { finish(new Error('공유 페이지 원본을 읽는 시간이 초과됐습니다.')); }, 20000);
        frame.onload = function() {
          try { finish(null, capture(frame.contentDocument.documentElement.outerHTML, location.href)); }
          catch (error) { finish(error); }
        };
        frame.src = location.origin + location.pathname;
        document.body.append(frame);
      });
    }
  }
  async function send(destination) {
    let payload;
    try { payload = await readCurrentShare(); }
    catch (error) { alert(error.message); return false; }
    const form = document.createElement('form');
    form.method = 'POST'; form.action = destination; form.acceptCharset = 'UTF-8';
    const input = document.createElement('input'); input.type = 'hidden'; input.name = 'payload'; input.value = payload;
    form.append(input); document.body.append(form);
    form.submit();
    return true;
  }
  root.BrowserShareTransfer = { capture: capture, encode: encode, decode: decode, send: send, readCurrentShare: readCurrentShare };
})(window);
