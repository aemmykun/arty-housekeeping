import fetch from 'node-fetch'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' })
  const vendor = req.query.vendor || 'cloudbeds'
  const payload = req.body || {}

  try {
    const target = `http://localhost:3001/api/adapters/${encodeURIComponent(vendor)}/preview`
    const r = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 5000
    })
    const data = await r.json()
    return res.status(r.status).json(data)
  } catch (e) {
    return res.status(500).json({ error: 'proxy-failed', message: e.message })
  }
}
