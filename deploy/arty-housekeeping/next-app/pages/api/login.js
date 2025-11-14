import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' })

  const { username, password } = req.body || {}
  const ADMIN_USER = process.env.ADMIN_USER || 'admin'
  const ADMIN_PASS = process.env.ADMIN_PASS || 'password'
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
  const SUPABASE_URL = process.env.SUPABASE_URL || null
  const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || null

  if (!username || !password) return res.status(400).json({ error: 'username-and-password-required' })

  // If Supabase is configured, attempt to authenticate via Supabase (email/password)
  if (SUPABASE_URL && SUPABASE_ANON) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON },
        body: JSON.stringify({ email: username, password })
      })
      const data = await resp.json()
      if (!resp.ok) return res.status(resp.status).json({ error: 'supabase-auth-failed', details: data })
      // return Supabase tokens to the client (access_token + refresh_token)
      return res.json({ supabase: data })
    } catch (e) {
      return res.status(500).json({ error: 'supabase-auth-error', message: e.message })
    }
  }

  // Fallback dev login
  if (username !== ADMIN_USER || password !== ADMIN_PASS) return res.status(401).json({ error: 'invalid-credentials' })
  const token = jwt.sign({ sub: username, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' })
  return res.json({ token })
}
