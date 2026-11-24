const allowed: Record<string, RegExp> = {
  GET: /^(?:templates(?:\/sample|\/(?:original|[0-9a-f-]{36})\/preview|\/[0-9a-f-]{36}\/export)?|content(?:\/(?:vi|en)\/preview)?)$/,
  POST: /^(?:login|logout|templates\/import|content\/(?:publish|(?:vi|en)\/(?:preview|publish)))$/,
  PUT: /^(?:templates\/(?:original|[0-9a-f-]{36})\/active|content)$/,
};

async function forward(request: Request, context: { params: Promise<{ parts: string[] }> }) {
  const path = (await context.params).parts.join('/');
  if (!allowed[request.method]?.test(path)) return Response.json({ message: 'Không tìm thấy.' }, { status: 404 });
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (!origin || !host || ![`http://${host}`, `https://${host}`].includes(origin) ||
        request.headers.get('sec-fetch-site') === 'cross-site') {
      return Response.json({ message: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 });
    }
  }
  const headers = new Headers();
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  if (request.method !== 'GET') headers.set('content-type', 'application/json');

  let body: ArrayBuffer | undefined;
  if (request.body) {
    const max = 3 * 1024 * 1024;
    const reader = request.body.getReader();
    const bytes = new Uint8Array(max);
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (size + chunk.value.length > max) {
        await reader.cancel();
        return Response.json({ message: 'Tệp nhập quá lớn.' }, { status: 413 });
      }
      bytes.set(chunk.value, size);
      size += chunk.value.length;
    }
    body = bytes.buffer.slice(0, size);
  }
  const upstream = new URL(`/api/admin/${path}`, process.env.CV_API_ORIGIN ?? 'http://127.0.0.1:3001');
  upstream.search = new URL(request.url).search;
  try {
    const result = await fetch(upstream, { method: request.method, headers, body, cache: 'no-store', redirect: 'error' });
    const output = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (result.ok && (path === 'login' || path === 'logout')) {
      const { session } = await result.json() as { session: string };
      output.set('set-cookie', session);
      return Response.json({ ok: true }, { headers: output });
    }
    for (const name of ['content-type', 'content-disposition']) {
      const value = result.headers.get(name);
      if (value) output.set(name, value);
    }
    return new Response(result.body, { status: result.status, headers: output });
  } catch {
    return Response.json({ message: 'Không kết nối được dịch vụ quản trị.' }, { status: 503 });
  }
}

export { forward as GET, forward as POST, forward as PUT };
