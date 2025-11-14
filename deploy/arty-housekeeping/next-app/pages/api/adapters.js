import fs from 'fs'
import path from 'path'

const INTEGRATIONS_DIR = path.join(process.cwd(), '..', 'integrations')
const HISTORY_DIR = path.join(INTEGRATIONS_DIR, 'history')

function readJsonSafe(full) {
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'))
  } catch (e) {
    return null
  }
}

function listHistoryForVendor(vendor) {
  if (!fs.existsSync(HISTORY_DIR)) return []
  const files = fs.readdirSync(HISTORY_DIR).filter(f => f.startsWith(`${vendor}_adapter_`) && f.endsWith('.json'))
  return files.map(f => {
    const full = path.join(HISTORY_DIR, f)
    const content = readJsonSafe(full)
    return {
      file: f,
      metadata: content && content._meta ? content._meta : null
    }
  }).sort((a,b)=> b.file.localeCompare(a.file))
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      if (!fs.existsSync(INTEGRATIONS_DIR)) {
        return res.json({ adapters: [] })
      }
      const files = fs.readdirSync(INTEGRATIONS_DIR).filter(f => f.endsWith('_adapter.json'))
      const adapters = files.map(f => {
        const full = path.join(INTEGRATIONS_DIR, f)
        const content = readJsonSafe(full)
        const vendor = f.replace('_adapter.json', '')
        const versions = listHistoryForVendor(vendor)
        return { vendor, file: f, mappings: content && content.mappings ? content.mappings : {}, raw: content, versions }
      })
      return res.json({ adapters })
    } catch (e) {
      return res.status(500).json({ error: 'read-failed', message: e.message })
    }
  }

  if (req.method === 'POST') {
    // Save adapter mapping with audit/versioning
    const body = req.body || {}
    const { vendor, mappings, author } = body
    if (!vendor || !mappings) return res.status(400).json({ error: 'vendor-and-mappings-required' })

    try {
      // Require auth for saving mappings
      const auth = req.headers.authorization || ''
      const token = auth.startsWith('Bearer ') ? auth.split(' ')[1] : null
      const jwt = require('jsonwebtoken')
      const secret = process.env.JWT_SECRET || 'dev-secret'
      try {
        const payload = token ? jwt.verify(token, secret) : null
        if (payload) {
          if (payload.role !== 'admin') return res.status(403).json({ error: 'admin-required' })
        } else {
          // Attempt Supabase user lookup as fallback if configured
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
              // Check admin role in metadata or email in ADMIN_EMAILS env
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
      if (!fs.existsSync(INTEGRATIONS_DIR)) fs.mkdirSync(INTEGRATIONS_DIR, { recursive: true })
      if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '')
      // Basic validation: vendor should be alphanumeric, mappings should be an object
      if (typeof mappings !== 'object' || Array.isArray(mappings)) return res.status(400).json({ error: 'mappings-must-be-object' })
      if (!/^[a-z0-9_-]+$/i.test(vendor)) return res.status(400).json({ error: 'invalid-vendor' })

      const out = {
        vendor: vendor,
        mappings: mappings,
        updated_at: new Date().toISOString(),
        _meta: { author: author || 'unknown', timestamp }
      }
      const fname = `${vendor}_adapter.json`
      const full = path.join(INTEGRATIONS_DIR, fname)

      // Write current adapter
      fs.writeFileSync(full, JSON.stringify(out, null, 2), 'utf8')

      // Write history entry
      const historyName = `${vendor}_adapter_${timestamp}.json`
      const historyFull = path.join(HISTORY_DIR, historyName)
      fs.writeFileSync(historyFull, JSON.stringify(out, null, 2), 'utf8')

      return res.json({ status: 'saved', vendor, file: fname, history: historyName })
    } catch (e) {
      return res.status(500).json({ error: 'write-failed', message: e.message })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  res.status(405).end('Method Not Allowed')
}
