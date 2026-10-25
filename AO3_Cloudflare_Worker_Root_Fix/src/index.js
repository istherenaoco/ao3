import { jsonHeaders, jsonResponse, upstreamErrorMessage } from './shared.js';

const MAX_GROQ_BATCH_CHARS = 10000;
const MAX_AZURE_BATCH_CHARS = 50000;
const MAX_WORKERS_AI_BATCH_CHARS = 12000;
const WORKERS_AI_MODELS = new Set(['@cf/zai-org/glm-4.7-flash', '@cf/openai/gpt-oss-120b']);

// OpenAI-compatible APIs may return content as a string, an array of text blocks,
// or null when a reasoning model exhausts its completion budget before final output.
// Never treat the model's private reasoning field as user-facing translation text.
function extractAssistantText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => {
    if (typeof part === 'string') return part;
    if (part && typeof part.text === 'string') return part.text;
    return '';
  }).join('');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: jsonHeaders(request) });
      if (url.pathname === '/api/status') return handleStatus(request, env);
      if (url.pathname === '/api/groq-translate') return handleGroq(request, env);
      if (url.pathname === '/api/azure-translate') return handleAzure(request, env);
      if (url.pathname === '/api/workers-ai-translate') return handleWorkersAI(request, env);
      return jsonResponse(request, { error: 'API route not found', path: url.pathname }, 404);
    }

    if (!env.ASSETS) {
      return new Response('Static asset binding ASSETS is missing. Check wrangler.jsonc assets.binding.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }
    // v41: HTML must be revalidated so a previous reader renderer cannot remain cached
    // after deployment. Assets are served from ./public (see wrangler.jsonc).
    const assetResponse = await env.ASSETS.fetch(request);
    const assetType = assetResponse.headers.get('content-type') || '';
    if (assetType.includes('text/html') || url.pathname === '/' || /\.html?$/i.test(url.pathname)) {
      const headers = new Headers(assetResponse.headers);
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
      headers.set('CDN-Cache-Control', 'no-store');
      return new Response(assetResponse.body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers
      });
    }
    return assetResponse;
  }
};

function handleStatus(request, env) {
  if (request.method !== 'GET') return jsonResponse(request, { error: 'Method Not Allowed' }, 405);
  return jsonResponse(request, {
    platform: 'cloudflare-worker',
    providers: {
      groq: Boolean(env.GROQ_API_KEY),
      azure: Boolean(env.AZURE_TRANSLATOR_KEY),
      workersAI: Boolean(env.AI && typeof env.AI.run === 'function')
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
      'Translate into publication-quality Korean literary fiction, not a literal English-shaped rendering. Preserve plot, facts, emotional nuance, viewpoint, character voice, dialogue tone, paragraph order, and scene dividers.',
      "Narration (outside direct dialogue) must consistently use natural Korean novel prose, normally past-tense -았다/-었다/-였다. Do not let narration drift into conversational endings such as -해, -야, -거야, -했어요, or formal -습니다. Preserve each speaker's natural dialogue register; never apply narration rules to dialogue.",
      'Rebuild English syntax into idiomatic Korean: reorder clauses, resolve omitted subjects and pronouns from context, and avoid English word order, awkward nominalizations, redundant subjects, and unnatural passive constructions. Preserve intentional fragments and repetition when they carry literary rhythm.',
      'Check idioms, phrasal verbs, body terms, and context-sensitive vocabulary by meaning, not spelling resemblance. Preserve who does what to whom, tense, negation, agency, and cause-and-effect. Never hallucinate, omit, soften, or add details.',
      'Before responding, silently proofread every sentence for natural Korean syntax, particles, terminology, consistent narration endings, dialogue voice, and missing content; rewrite awkward sentences rather than merely correcting particles.',
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
        temperature: 0.15,
        // Keep the requested completion budget proportional to this small batch.
        // An 8192-token reservation is wasteful for short passages and can trigger TPM 429s.
        max_completion_tokens: Math.min(3072, Math.max(512, Math.ceil(totalChars * 1.15) + 192)),
        // GPT-OSS is a reasoning model; explicitly suppress reasoning in the API
        // response so translation text is available in message.content.
        include_reasoning: false,
        reasoning_effort: 'low',
        stream: false
      })
    });
    const raw = await upstream.text();
    let payload = null;
    try { payload = raw ? JSON.parse(raw) : null; } catch (_) {}
    const extra = { 'X-Provider-Upstream-Status': String(upstream.status) };
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) extra['Retry-After'] = retryAfter;
    // Groq's authoritative rate-limit headers are safe to expose (they contain no credentials).
    // Preserve organization-scoped request/token caps so the settings dashboard can display
    // real remaining values after a translation request instead of guessing them.
    const groqRateHeaders = [
      ['x-ratelimit-limit-requests', 'X-Groq-RateLimit-Limit-Requests'],
      ['x-ratelimit-remaining-requests', 'X-Groq-RateLimit-Remaining-Requests'],
      ['x-ratelimit-reset-requests', 'X-Groq-RateLimit-Reset-Requests'],
      ['x-ratelimit-limit-tokens', 'X-Groq-RateLimit-Limit-Tokens'],
      ['x-ratelimit-remaining-tokens', 'X-Groq-RateLimit-Remaining-Tokens'],
      ['x-ratelimit-reset-tokens', 'X-Groq-RateLimit-Reset-Tokens']
    ];
    groqRateHeaders.forEach(([source, target]) => {
      const value = upstream.headers.get(source);
      if (value !== null) extra[target] = value;
    });
    if (!upstream.ok) return jsonResponse(request, { error: 'Groq API 요청 실패', message: upstreamErrorMessage(payload, raw), upstreamStatus: upstream.status }, upstream.status, extra);

    const choice = payload?.choices?.[0];
    const assistantMessage = choice?.message;
    const content = extractAssistantText(assistantMessage?.content);
    if (!content.trim()) {
      // Do not echo assistantMessage.reasoning: it is not translation output and can
      // expose internal reasoning or create very noisy client-console diagnostics.
      return jsonResponse(request, {
        error: 'Groq에서 최종 번역 본문을 반환하지 않았습니다.',
        message: 'assistant content is empty; reasoning output was excluded. Check model output budget and Groq response metadata.',
        model: payload?.model || model,
        finishReason: choice?.finish_reason || null,
        hasReasoningField: typeof assistantMessage?.reasoning === 'string' && assistantMessage.reasoning.length > 0,
        usage: payload?.usage || null
      }, 502, extra);
    }
    let translations = content.split(/\s*<<<P_SEP>>>\s*/).map((text) => text.trim());
    // For a one-paragraph retry, some models still emit the separator marker despite
    // being asked for a single paragraph. There is no alignment ambiguity in that case:
    // merge nonempty fragments back into the one requested paragraph.
    if (texts.length === 1) translations = [translations.filter(Boolean).join(' ').trim()];
    const emptyIndexes = translations.map((text, index) => text ? -1 : index + 1).filter((index) => index > 0);
    if (translations.length !== texts.length || translations.some((text) => !text)) {
      const countMessage = 'expected ' + texts.length + ' paragraphs, received ' + translations.length;
      const detail = emptyIndexes.length ? '; empty paragraph output at index(es): ' + emptyIndexes.join(', ') : '';
      return jsonResponse(request, {
        error: 'Groq 번역 문단 구분이 올바르지 않습니다.',
        message: countMessage + detail + '. 결과는 저장하지 않고 클라이언트가 다른 번역 공급자로 전환해야 합니다.',
        reason: 'paragraph_count_mismatch',
        expectedParagraphs: texts.length,
        receivedParagraphs: translations.length,
        emptyParagraphIndexes: emptyIndexes
      }, 502, extra);
    }
    return jsonResponse(request, { translations, model: payload.model || model, usage: payload.usage || null }, 200, extra);
  } catch (error) {
    return jsonResponse(request, { error: 'Groq proxy failed', message: String(error?.message || error) }, 500);
  }
}

async function handleWorkersAI(request, env) {
  if (request.method !== 'POST') return jsonResponse(request, { error: 'Method Not Allowed' }, 405);
  // Reject browser-originated cross-site requests so another website cannot casually trigger AI usage.
  // This is a CSRF guard, not authentication; apply Cloudflare rate limiting for public deployments.
  const requestOrigin = request.headers.get('Origin');
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return jsonResponse(request, { error: 'Cross-origin Workers AI requests are not allowed.' }, 403);
  }
  if (!env.AI || typeof env.AI.run !== 'function') {
    return jsonResponse(request, {
      error: 'Cloudflare Workers AI 바인딩이 설정되지 않았습니다.',
      message: 'wrangler.jsonc에 "ai": { "binding": "AI" }를 추가한 뒤 배포하세요.'
    }, 503);
  }
  try {
    const body = await request.json().catch(() => ({}));
    const model = String(body.model || '@cf/zai-org/glm-4.7-flash').trim();
    const texts = body.texts;
    if (!WORKERS_AI_MODELS.has(model)) {
      return jsonResponse(request, {
        error: '지원하지 않는 Workers AI 모델입니다.',
        message: '허용 모델: ' + Array.from(WORKERS_AI_MODELS).join(', ')
      }, 400);
    }
    if (!Array.isArray(texts) || texts.length < 1 || texts.length > 30 || texts.some((text) => typeof text !== 'string')) {
      return jsonResponse(request, { error: 'texts 문자열 배열이 필요합니다(1~30개).' }, 400);
    }
    const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
    if (totalChars > MAX_WORKERS_AI_BATCH_CHARS) {
      return jsonResponse(request, {
        error: 'Workers AI 번역 묶음이 너무 큽니다.',
        message: `요청은 ${totalChars}자입니다. 한 번에 ${MAX_WORKERS_AI_BATCH_CHARS}자 이하로 줄여 주세요.`
      }, 413);
    }

    const prompt = String(body.prompt || '영어를 자연스러운 한국어 소설체로 번역한다. 번역문만 출력한다.').slice(0, 12000);
    const fandom = String(body.fandom || '').slice(0, 1000);
    const prevContext = String(body.prevContext || '').slice(-3000);
    const systemPrompt = [
      'You are an expert English-to-Korean literary fiction translator. Produce polished, publication-quality Korean prose, never a literal English-shaped rendering.',
      'Preserve meaning, every detail, point of view, tense, agency, paragraph order, emotional nuance, character voice, dialogue register, and scene dividers. Never summarize, add, omit, censor, or explain.',
      'For narration outside direct dialogue, use consistent natural Korean literary past-tense endings, normally -았다/-었다/-였다. Do not use conversational endings such as -해/-야/-거야/-했어요 or formal -습니다 for narration. Dialogue must retain the speaker’s natural register; do not apply narration rules to dialogue.',
      'Rebuild English syntax into idiomatic Korean. Reorder clauses naturally, infer omitted subjects from context, use correct particles, avoid awkward nominalizations, redundant subjects, unnatural passives, and English word order. Translate all ordinary English words, clauses, idioms, phrasal verbs, and context-sensitive terms. Leave proper names in English only where natural or required by the glossary.',
      'Silently proofread every sentence for missing content, Korean syntax, particles, terminology, narration endings, dialogue voice, and punctuation. Rewrite awkward sentences before answering.',
      'Follow these project-specific translation instructions exactly:', prompt,
      fandom ? '\n[Source/genre context]\n' + fandom : '',
      '\n[Output requirements] Return only the Korean translation. Input paragraphs are separated by the exact marker <<<P_SEP>>>. Return exactly ' + texts.length + ' translated paragraphs, preserving that marker between paragraphs. Keep scene divider * * * unchanged. Do not include commentary or repeat source text.'
    ].filter(Boolean).join('\n\n');
    const userContent = (prevContext ? '[Previous context for consistency; do not translate this section]\n' + prevContext + '\n\n' : '') + texts.join(' <<<P_SEP>>> ');
    const maxTokens = Math.min(4096, Math.max(1024, Math.ceil(totalChars * 1.8) + 300));
    const result = await env.AI.run(model, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      max_tokens: maxTokens,
      temperature: 0.15,
      // GLM-4.7-Flash enables thinking by default. Disable it for direct translation,
      // otherwise the model may spend its output budget on reasoning and return content:null.
      reasoning_effort: null,
      chat_template_kwargs: { enable_thinking: false, clear_thinking: true }
    });

    let content = '';
    if (typeof result === 'string') content = result;
    else if (typeof result?.response === 'string') content = result.response;
    else if (typeof result?.result?.response === 'string') content = result.result.response;
    else if (result?.choices?.[0]?.message) content = extractAssistantText(result.choices[0].message.content);
    else if (typeof result?.output_text === 'string') content = result.output_text;
    else if (Array.isArray(result?.response)) content = extractAssistantText(result.response);
    if (!content.trim()) {
      // Return safe metadata only. Never stringify the full model result because it may
      // contain a large reasoning field and leak it into the browser console.
      const choice = result?.choices?.[0];
      const message = choice?.message;
      return jsonResponse(request, {
        error: 'Workers AI에서 최종 번역 본문을 반환하지 않았습니다.',
        message: 'assistant content is empty after disabling thinking mode; check model response metadata.',
        model: result?.model || model,
        finishReason: choice?.finish_reason || null,
        hasReasoningField: typeof message?.reasoning === 'string' && message.reasoning.length > 0,
        choiceCount: Array.isArray(result?.choices) ? result.choices.length : null,
        usage: result?.usage || null
      }, 502);
    }

    let translations = content.split(/\s*<<<P_SEP>>>\s*/).map((text) => text.trim());
    // As with Groq, recover a one-paragraph retry if the model inserts separators anyway.
    if (texts.length === 1) translations = [translations.filter(Boolean).join(' ').trim()];
    const emptyIndexes = translations.map((text, index) => text ? -1 : index + 1).filter((index) => index > 0);
    if (translations.length !== texts.length || translations.some((text) => !text)) {
      const countMessage = 'expected ' + texts.length + ' paragraphs, received ' + translations.length;
      const detail = emptyIndexes.length ? '; empty paragraph output at index(es): ' + emptyIndexes.join(', ') : '';
      return jsonResponse(request, {
        error: 'Workers AI 번역 문단 구분이 올바르지 않습니다.',
        message: countMessage + detail + '. 결과는 저장하지 않고 다음 공급자로 전환합니다.',
        reason: 'paragraph_count_mismatch',
        expectedParagraphs: texts.length,
        receivedParagraphs: translations.length,
        emptyParagraphIndexes: emptyIndexes
      }, 502);
    }
    return jsonResponse(request, { translations, model, usage: result?.usage || null }, 200);
  } catch (error) {
    const message = String(error?.message || error);
    const status = /rate.?limit|quota|too many requests|429/i.test(message) ? 429 : 502;
    return jsonResponse(request, { error: 'Cloudflare Workers AI 요청 실패', message: message.slice(0, 1200) }, status);
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
