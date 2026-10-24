import { jsonHeaders, jsonResponse, upstreamErrorMessage } from './shared.js';

const MAX_GROQ_BATCH_CHARS = 10000;
const MAX_AZURE_BATCH_CHARS = 50000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: jsonHeaders(request) });
      if (url.pathname === '/api/status') return handleStatus(request, env);
      if (url.pathname === '/api/groq-translate') return handleGroq(request, env);
      if (url.pathname === '/api/azure-translate') return handleAzure(request, env);
      return jsonResponse(request, { error: 'API route not found', path: url.pathname }, 404);
    }

    if (!env.ASSETS) {
      return new Response('Static asset binding ASSETS is missing. Check wrangler.jsonc assets.binding.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }
    return env.ASSETS.fetch(request);
  }
};

function handleStatus(request, env) {
  if (request.method !== 'GET') return jsonResponse(request, { error: 'Method Not Allowed' }, 405);
  return jsonResponse(request, {
    platform: 'cloudflare-worker',
    providers: {
      groq: Boolean(env.GROQ_API_KEY),
      azure: Boolean(env.AZURE_TRANSLATOR_KEY)
    }
  }, 200, { ...jsonHeaders(request), 'Cache-Control': 'no-store' });
}

async function handleGroq(request, env) {
  if (request.method !== 'POST') return jsonResponse(request, { error: 'Method Not Allowed' }, 405);
  try {
    const body = await request.json().catch(() => ({}));
    const apiKey = String(body.apiKey || env.GROQ_API_KEY || '').trim();
    const model = String(body.model || env.GROQ_MODEL || 'openai/gpt-oss-120b').trim();
    const texts = body.texts;
    if (!apiKey || !model || !Array.isArray(texts) || texts.length < 1 || texts.length > 30 || texts.some((text) => typeof text !== 'string')) {
      return jsonResponse(request, { error: 'Groq API 키(앱 설정 또는 Worker Secret GROQ_API_KEY), 모델 ID, texts 문자열 배열이 필요합니다.' }, 400);
    }
    const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
    if (totalChars > MAX_GROQ_BATCH_CHARS) {
      return jsonResponse(request, { error: 'Groq 번역 묶음이 너무 큽니다.', message: `요청은 ${totalChars}자입니다. 한 번에 ${MAX_GROQ_BATCH_CHARS}자 이하로 줄여 주세요.` }, 413);
    }

    const prompt = String(body.prompt || '영어를 자연스러운 한국어 소설체로 번역한다. 번역문만 출력한다.');
    const glossary = String(body.glossary || '');
    const fandom = String(body.fandom || '');
    const prevContext = String(body.prevContext || '');
    const systemPrompt = [
      'You are an expert English-to-Korean literary translator.',
      'Translate into fluent, natural Korean novel prose. Preserve plot, facts, emotional nuance, character voice, dialogue tone, paragraph order, and scene dividers.',
      'Never summarize, explain, censor, add notes, or include the original text.',
      'Translate every English sentence and ordinary English word into Korean. Leave only proper names, acronyms, or titles in English when translating them would be unnatural. Never leave English articles, pronouns, adverbs, or clauses embedded in Korean prose.',
      'Treat Markdown underscores, asterisks, italics, and bold markers as formatting only: do not emit the markers, and always translate the words inside them.',
      'Proofread Korean grammar before responding. Attach Korean particles naturally (은/는, 이/가, 을/를, 에/에서, 으로/로), preserve sentence meaning without omissions, and normalize punctuation and quotation marks. Do not output an incomplete sentence or a mixture of untranslated English and Korean.',
      'Follow the user translation instructions below exactly:', prompt,
      fandom ? '\n[원작/장르 정보]\n' + fandom : '',
      glossary ? '\n[고유명사 지정 표기]\n' + glossary : '',
      '\n[출력 형식] 입력 문단 수와 동일한 수의 번역 문단을 출력하고, 반드시 <<<P_SEP>>> 구분자를 각 문단 사이에 그대로 넣으세요. 구분자 외의 설명은 출력하지 마세요. 장면 구분선 * * * 은 그대로 유지하세요.'
    ].filter(Boolean).join('\n\n');
    const userContent = (prevContext ? '[직전 문단 맥락(번역 출력 제외)]\n' + prevContext + '\n\n' : '') + texts.join(' <<<P_SEP>>> ');

    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
        temperature: 0.2,
        // Keep the requested completion budget proportional to this small batch.
        // An 8192-token reservation is wasteful for short passages and can trigger TPM 429s.
        max_tokens: Math.min(4096, Math.max(1024, Math.ceil(totalChars * 1.1) + 256)),
        stream: false
      })
    });
    const raw = await upstream.text();
    let payload = null;
    try { payload = raw ? JSON.parse(raw) : null; } catch (_) {}
    const extra = { 'X-Provider-Upstream-Status': String(upstream.status) };
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) extra['Retry-After'] = retryAfter;
    if (!upstream.ok) return jsonResponse(request, { error: 'Groq API 요청 실패', message: upstreamErrorMessage(payload, raw), upstreamStatus: upstream.status }, upstream.status, extra);

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) return jsonResponse(request, { error: 'Groq에서 비어 있는 번역을 반환했습니다.', message: 'empty assistant content' }, 502, extra);
    const translations = content.split(/\s*<<<P_SEP>>>\s*/).map((text) => text.trim());
    if (translations.length !== texts.length || translations.some((text) => !text)) {
      return jsonResponse(request, {
        error: 'Groq 번역 문단 구분이 올바르지 않습니다.',
        message: 'expected ' + texts.length + ' paragraphs, received ' + translations.length + '. 결과는 저장하지 않고 클라이언트가 다른 번역 공급자로 전환해야 합니다.',
        reason: 'paragraph_count_mismatch',
        expectedParagraphs: texts.length,
        receivedParagraphs: translations.length
      }, 502, extra);
    }
    return jsonResponse(request, { translations, model: payload.model || model, usage: payload.usage || null }, 200, extra);
  } catch (error) {
    return jsonResponse(request, { error: 'Groq proxy failed', message: String(error?.message || error) }, 500);
  }
}

async function handleAzure(request, env) {
  if (request.method !== 'POST') return jsonResponse(request, { error: 'Method Not Allowed' }, 405);
  try {
    const body = await request.json().catch(() => ({}));
    const apiKey = String(body.apiKey || env.AZURE_TRANSLATOR_KEY || '').trim();
    const region = String(body.region || env.AZURE_TRANSLATOR_REGION || '').trim();
    const texts = body.texts;
    if (!apiKey || !Array.isArray(texts) || texts.length === 0 || texts.some((text) => typeof text !== 'string')) {
      return jsonResponse(request, { error: 'Azure API 키(앱 설정 또는 Worker Secret AZURE_TRANSLATOR_KEY)와 texts 문자열 배열이 필요합니다.' }, 400);
    }
    const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
    if (texts.length > 1000 || totalChars > MAX_AZURE_BATCH_CHARS) {
      return jsonResponse(request, { error: '요청이 Azure Translator 한도를 초과했습니다.', message: `요청 ${totalChars}자; 허용 상한 ${MAX_AZURE_BATCH_CHARS}자` }, 413);
    }

    const endpoint = String(env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com').replace(/\/+$/, '');
    const url = endpoint + '/translate?api-version=3.0&from=en&to=ko';
    const headers = { 'Ocp-Apim-Subscription-Key': apiKey, 'Content-Type': 'application/json; charset=UTF-8' };
    if (region) headers['Ocp-Apim-Subscription-Region'] = region;
    const upstream = await fetch(url, { method: 'POST', headers, body: JSON.stringify(texts.map((text) => ({ text }))) });
    const raw = await upstream.text();
    const extra = { 'X-Azure-Upstream-Status': String(upstream.status) };
    const retryAfter = upstream.headers.get('retry-after');
    const requestId = upstream.headers.get('x-requestid') || upstream.headers.get('x-ms-request-id');
    const clientTraceId = upstream.headers.get('x-clienttraceid');
    if (retryAfter) extra['Retry-After'] = retryAfter;
    if (requestId) extra['X-Azure-Request-Id'] = requestId;
    if (clientTraceId) extra['X-Azure-Client-Trace-Id'] = clientTraceId;
    let parsedBody = raw;
    try {
      parsedBody = raw ? JSON.parse(raw) : null;
      const code = parsedBody?.error?.code;
      if (code !== undefined && code !== null) extra['X-Azure-Error-Code'] = String(code);
    } catch (_) {}
    return new Response(typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody), {
      status: upstream.status,
      headers: { ...jsonHeaders(request), ...extra }
    });
  } catch (error) {
    return jsonResponse(request, { error: 'Azure Translator 요청 실패', detail: String(error?.message || error) }, 500);
  }
}
