import fs from 'fs'
import path from 'path'

const INTEGRATIONS_DIR = path.join(process.cwd(), '..', 'integrations')
const HISTORY_DIR = path.join(INTEGRATIONS_DIR, 'history')

function readJsonSafe(full) {
  try { return JSON.parse(fs.readFileSync(full, 'utf8')) } catch (e) { return null }
}

export default function handler(req, res) {
  const { vendor } = req.query
  if (!vendor) return res.status(400).json({ error: 'vendor-required' })

  if (req.method === 'GET') {
    // return current adapter and history list
    try {
      if (!/^[a-z0-9_-]+$/i.test(vendor)) return res.status(400).json({ error: 'invalid-vendor' })
      const file = path.join(INTEGRATIONS_DIR, `${vendor}_adapter.json`)
      const current = readJsonSafe(file)
      const versions = []
      if (fs.existsSync(HISTORY_DIR)) {
        const files = fs.readdirSync(HISTORY_DIR).filter(f => f.startsWith(`${vendor}_adapter_`) && f.endsWith('.json'))
        for (const f of files.sort().reverse()) {
          const full = path.join(HISTORY_DIR, f)
          const content = readJsonSafe(full)
          versions.push({ file: f, meta: content && content._meta ? content._meta : null })
        }
      }
      return res.json({ vendor, current, versions })
    } catch (e) {
      return res.status(500).json({ error: 'read-failed', message: e.message })
    }
  }

  if (req.method === 'POST') {
    // actions: rollback
    const body = req.body || {}
    const { action, versionFile, author } = body
    // Require admin auth to perform write actions (rollback)
    try {
      const auth = req.headers.authorization || ''
      const token = auth.startsWith('Bearer ') ? auth.split(' ')[1] : null
      const jwt = require('jsonwebtoken')
      const secret = process.env.JWT_SECRET || 'dev-secret'
      let payload = null
      try {
        payload = token ? jwt.verify(token, secret) : null
      } catch (e) {
        payload = null
      }
      if (payload) {
        if (payload.role !== 'admin') return res.status(403).json({ error: 'admin-required' })
      } else {
        // fallback: verify Supabase token by calling /auth/v1/user
        const SUPABASE_URL = process.env.SUPABASE_URL || null
        const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || null
        if (SUPABASE_URL && SUPABASE_ANON && token) {
          try {
            const fetch = require('node-fetch')
            const uresp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
              headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON }
            })
            const ujson = await uresp.json()
            if (!uresp.ok) return res.status(401).json({ error: 'supabase-token-invalid', details: ujson })
            const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(s=>s.trim()).filter(Boolean)
            const userRole = ujson?.user_metadata?.role || ujson?.app_metadata?.role || null
            const userEmail = ujson?.email || ujson?.user?.email || null
            if (userRole === 'admin' || (userEmail && adminEmails.includes(userEmail))) {
              // allowed
            } else {
              return res.status(403).json({ error: 'admin-required' })
            }
          } catch (se) {
            return res.status(401).json({ error: 'supabase-verify-failed', message: se.message })
          }
        } else {
          return res.status(401).json({ error: 'unauthorized' })
        }
      }
    } catch (e) {
      return res.status(401).json({ error: 'invalid-token' })
    }
    if (action === 'rollback') {
      if (!versionFile) return res.status(400).json({ error: 'versionFile-required' })
      // sanitize filename
      const safeName = path.basename(versionFile)
      const src = path.join(HISTORY_DIR, safeName)
      const dest = path.join(INTEGRATIONS_DIR, `${vendor}_adapter.json`)
      if (!fs.existsSync(src)) return res.status(404).json({ error: 'version-not-found' })
      try {
        const content = readJsonSafe(src)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '')
        // write current to history as rollback record
        const rollbackMeta = Object.assign({}, content || {}, { _meta: { author: author || 'unknown', timestamp, action: 'rollback' } })
        fs.writeFileSync(dest, JSON.stringify(rollbackMeta, null, 2), 'utf8')
        const historyName = `${vendor}_adapter_${timestamp}_rollback.json`
        const historyFull = path.join(HISTORY_DIR, historyName)
        fs.writeFileSync(historyFull, JSON.stringify(rollbackMeta, null, 2), 'utf8')
        return res.json({ status: 'rolled-back', vendor, file: historyName })
      } catch (e) {
        return res.status(500).json({ error: 'rollback-failed', message: e.message })
      }
    }
    return res.status(400).json({ error: 'unknown-action' })
  }

  res.setHeader('Allow', 'GET, POST')
  res.status(405).end('Method Not Allowed')
}
