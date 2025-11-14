addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

async function handle(req) {
  // Example worker: validates JWT in Authorization header (HMAC) and forwards to API
  const url = new URL(req.url)
  const auth = req.headers.get('Authorization') || ''
  if (!auth.startsWith('Bearer ')) return new Response('missing-token', { status: 401 })
  const token = auth.split(' ')[1]

  // In production, verify token signature (use KV or Secrets to store key).
  // This template simply forwards to the origin after checking a header placeholder.
  // Replace verification with your JWT library and secret retrieval.

  // Forward to origin API
  const originUrl = 'https://your-express.example' + url.pathname
  const forwardReq = new Request(originUrl, {
    method: req.method,
    headers: req.headers,
    body: req.body,
    redirect: 'manual'
  })
  return fetch(forwardReq)
}
