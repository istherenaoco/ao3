const PREFIX = 'AO3-BROWSER-SHARE/1\n';
export async function handleBrowserShareImport(request, env) {
  const error = function(message, status) { return new Response(message, {status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}}); };
  if (request.method !== 'POST') return error('공유 페이지에서 서재로 보내기를 실행해 주세요.',405);
  const origin = request.headers.get('origin');
  if (!['https://chatgpt.com','https://chat.openai.com',new URL(request.url).origin].includes(origin)) return error('허용된 공유 페이지에서 보낸 요청이 아닙니다.',403);
  if (!(request.headers.get('content-type') || '').startsWith('application/x-www-form-urlencoded')) return error('전달 형식이 올바르지 않습니다.',415);
  const limit = 8 * 1024 * 1024;
  if (Number(request.headers.get('content-length')) > limit) return error('대화가 너무 큽니다. 챕터별로 나눠 보내 주세요.',413);
  const reader = request.body?.getReader();
  if (!reader) return error('전달된 본문이 없습니다.',400);
  let size=0; const chunks=[];
  while (true) {
    const {value,done}=await reader.read(); if(done)break;
    size+=value.byteLength;
    if(size>limit){await reader.cancel();return error('대화가 너무 큽니다. 챕터별로 나눠 보내 주세요.',413);}
    chunks.push(value);
  }
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const rawPayload = new URLSearchParams(new TextDecoder().decode(bytes)).get('payload');
  const payload = rawPayload && rawPayload.replace(/\r\n?/g, '\n');
  if (!payload || !payload.startsWith(PREFIX) || payload.length>2500000) return error('전달 데이터가 올바르지 않습니다.',400);
  try { JSON.parse(payload.slice(PREFIX.length)); } catch { return error('전달 데이터가 손상됐습니다.',400); }
  if(!env.ASSETS)return error('서재 정적 파일을 찾지 못했습니다.',500);
  const index=await env.ASSETS.fetch(new Request(new URL('/',request.url),{method:'GET'}));
  if(!index.ok)return error('서재 페이지를 불러오지 못했습니다.',502);
  // JSON is inert data, escaped so text cannot close the script element.
  const encoded = JSON.stringify(payload).replace(/[<>\u2028\u2029]/g, character => '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0'));
  const tag='<script type="application/json" id="browserTransferPayload">'+encoded+'</script>';
  const html=(await index.text()).replace('<!-- Application Script -->',() => tag+'\n<!-- Application Script -->');
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
