export function jsonHeaders(request) {
  return {
    'Content-Type': 'application/json; charset=UTF-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': new URL(request.url).origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'Retry-After, X-Provider-Upstream-Status, X-Azure-Upstream-Status, X-Azure-Error-Code, X-Azure-Request-Id, X-Azure-Client-Trace-Id',
    'Vary': 'Origin'
  };
}

export function jsonResponse(request, data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...jsonHeaders(request), ...extraHeaders }
  });
}

export function upstreamErrorMessage(payload, raw) {
  const error = payload && payload.error;
  return String((error && (error.message || error.code)) || (payload && (payload.message || payload.detail)) || raw || 'Provider request failed').slice(0, 1200);
}
