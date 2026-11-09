import { jsonResponse } from './shared.js';

export function normalizeShareUrl(raw) {
  let url;
  try { url = new URL(String(raw || '')); } catch { throw new Error('공개 ChatGPT 공유 링크를 입력해 주세요.'); }
  if (url.protocol !== 'https:' || !['chatgpt.com', 'chat.openai.com'].includes(url.hostname) ||
      url.port || url.username || url.password || !/^\/(?:share\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}|s\/t_[a-f0-9]{28,64})\/?$/i.test(url.pathname)) {
    throw new Error('chatgpt.com/share/… 또는 chatgpt.com/s/t_… 공개 공유 링크만 지원합니다.');
  }
  return 'https://chatgpt.com' + url.pathname.replace(/\/$/, '');
}

export async function handleChatgptShare(request) {
  if (request.method !== 'GET') return jsonResponse(request, { error: 'Method Not Allowed' }, 405);
  let target;
  try { target = normalizeShareUrl(new URL(request.url).searchParams.get('url')); }
  catch (error) { return jsonResponse(request, { error: error.message }, 400); }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const upstream = await fetch(target, { redirect: 'manual', signal: controller.signal, headers: { Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'ko-KR,ko;q=0.9', 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' } });
    if (!upstream.ok) {
      await upstream.body?.cancel();
      return jsonResponse(request, { error: '공유 페이지에 접근할 수 없습니다. 공개 상태를 확인하거나 번역문을 붙여넣어 주세요.' }, 502);
    }
    if (!/text\/html/i.test(upstream.headers.get('content-type') || '')) {
      await upstream.body?.cancel();
      return jsonResponse(request, { error: '공유 페이지 형식을 읽을 수 없습니다.' }, 502);
    }
    const reader = upstream.body.getReader();
    const chunks = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 10 * 1024 * 1024) {
        await reader.cancel();
        return jsonResponse(request, { error: '대화가 너무 큽니다. 번역문 파일로 올려 주세요.' }, 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return jsonResponse(request, { html: new TextDecoder().decode(bytes), shareUrl: target }, 200, { 'Cache-Control': 'no-store' });
  } catch {
    return jsonResponse(request, { error: '공유 링크를 가져오지 못했습니다. 잠시 뒤 다시 시도하거나 번역문을 붙여넣어 주세요.' }, 502);
  } finally { clearTimeout(timeout); }
}
