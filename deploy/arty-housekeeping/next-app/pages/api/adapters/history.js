import fs from 'fs'
import path from 'path'

const INTEGRATIONS_DIR = path.join(process.cwd(), '..', 'integrations')
const HISTORY_DIR = path.join(INTEGRATIONS_DIR, 'history')

function safeJoin(base, target) {
  const resolved = path.resolve(base, target)
  if (!resolved.startsWith(path.resolve(base))) throw new Error('Invalid path')
  return resolved
}

export default function handler(req, res) {
  const { vendor, file } = req.query
  if (!vendor || !file) return res.status(400).json({ error: 'vendor-and-file-required' })
  if (!/^[a-z0-9_-]+$/i.test(vendor)) return res.status(400).json({ error: 'invalid-vendor' })

  try {
    if (!fs.existsSync(HISTORY_DIR)) return res.status(404).json({ error: 'no-history' })
    // Prevent path traversal by construction
    const filename = path.basename(file)
    const full = safeJoin(HISTORY_DIR, filename)
    if (!fs.existsSync(full)) return res.status(404).json({ error: 'file-not-found' })
    const raw = fs.readFileSync(full, 'utf8')
    // Return parsed JSON when possible, otherwise raw text
    try {
      const parsed = JSON.parse(raw)
      return res.json({ ok: true, file: filename, content: parsed })
    } catch (e) {
      return res.json({ ok: true, file: filename, contentRaw: raw })
    }
  } catch (e) {
    return res.status(500).json({ error: 'read-failed', message: e.message })
  }
}
