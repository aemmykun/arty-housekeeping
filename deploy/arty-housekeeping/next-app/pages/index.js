import { useState, useEffect } from 'react'
import { createClient as createSb } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || null
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null
const supabase = (SUPABASE_URL && SUPABASE_ANON) ? createSb(SUPABASE_URL, SUPABASE_ANON) : null

export default function Home() {
  const [vendor, setVendor] = useState('cloudbeds')
  const [payload, setPayload] = useState('{
  "reservationId": 123,
  "room": "101",
  "status": "checkout",
  "guestName": "Alice"
}')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [adapters, setAdapters] = useState([])
  const [selectedAdapter, setSelectedAdapter] = useState('cloudbeds')
  const [mappingEditor, setMappingEditor] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)

  useEffect(() => {
    // Restore token from localStorage
    const t = typeof window !== 'undefined' ? window.localStorage.getItem('arty_access_token') : null
    if (t) setAccessToken(t)
    // If supabase client present, try to get user
    if (supabase) {
      supabase.auth.getSession().then(r => {
        if (r?.data?.session) {
          setUser(r.data.session.user)
          setAccessToken(r.data.session.access_token)
          if (typeof window !== 'undefined') window.localStorage.setItem('arty_access_token', r.data.session.access_token)
        }
      }).catch(()=>{})
    }
  }, [])

  async function loadAdapters() {
    try {
      const r = await fetch('/api/adapters')
      const j = await r.json()
      setAdapters(j.adapters || [])
      // If an adapter list has at least one, set mapping editor default
      if ((j.adapters || []).length && !mappingEditor) {
        const first = j.adapters[0]
        setSelectedAdapter(first.vendor)
        setMappingEditor(JSON.stringify(first.mappings || {}, null, 2))
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function doLogin() {
    try {
      if (supabase) {
        const resp = await supabase.auth.signInWithPassword({ email, password })
        if (resp.error) return alert('Login failed: ' + resp.error.message)
        const session = resp.data.session
        if (session) {
          setUser(session.user)
          setAccessToken(session.access_token)
          if (typeof window !== 'undefined') window.localStorage.setItem('arty_access_token', session.access_token)
          alert('Logged in as ' + (session.user.email || 'user'))
          return
        }
      }
      // fallback to dev login via API
      const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: email, password }) })
      const j = await r.json()
      if (!r.ok) return alert('Login failed: ' + (j.error || JSON.stringify(j)))
      const token = j.token || (j.supabase && j.supabase.access_token)
      if (token) {
        setAccessToken(token)
        if (typeof window !== 'undefined') window.localStorage.setItem('arty_access_token', token)
        alert('Logged in (dev)')
      }
    } catch (e) {
      alert('Login error: ' + e.message)
    }
  }

  function doLogout() {
    setUser(null)
    setAccessToken(null)
    if (typeof window !== 'undefined') window.localStorage.removeItem('arty_access_token')
    if (supabase) supabase.auth.signOut().catch(()=>{})
  }

  function onAdapterChange(v) {
    setSelectedAdapter(v)
    const a = adapters.find(x => x.vendor === v)
    if (a && a.mappings) {
      setMappingEditor(JSON.stringify(a.mappings, null, 2))
    } else {
      setMappingEditor('{}')
    }
  }

  async function loadVersion(versionFile) {
    try {
      const resp = await fetch(`/api/adapters/history?vendor=${encodeURIComponent(selectedAdapter)}&file=${encodeURIComponent(versionFile)}`)
      if (!resp.ok) {
        const j = await resp.json().catch(()=>({}));
        throw new Error(j.message || 'failed-to-load')
      }
      const j = await resp.json()
      if (j && j.content) {
        setMappingEditor(JSON.stringify(j.content.mappings || {}, null, 2))
      } else if (j && j.contentRaw) {
        // try to parse raw
        try {
          const parsed = JSON.parse(j.contentRaw)
          setMappingEditor(JSON.stringify(parsed.mappings || {}, null, 2))
        } catch (e) {
          alert('History file is not valid JSON')
        }
      } else {
        alert('No content found in history file')
      }
    } catch (e) {
      alert('Load version failed: ' + e.message)
    }
  }

  async function rollbackTo(versionFile) {
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
      const resp = await fetch(`/api/adapters/${encodeURIComponent(selectedAdapter)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'rollback', versionFile, author: 'web-ui' })
      })
      const j = await resp.json()
      if (!resp.ok) throw new Error(j.message || JSON.stringify(j))
      alert('Rollback applied: ' + (j.file || j.status))
      await loadAdapters()
    } catch (e) {
      alert('Rollback failed: ' + e.message)
    }
  }

  async function saveMapping() {
    try {
      const parsed = JSON.parse(mappingEditor)
      const headers = { 'Content-Type': 'application/json' }
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
      const resp = await fetch('/api/adapters', {
        method: 'POST',
        headers,
        body: JSON.stringify({ vendor: selectedAdapter, mappings: parsed, author: email || 'web-ui' })
      })
      const j = await resp.json()
      if (!resp.ok) throw new Error(j.message || JSON.stringify(j))
      await loadAdapters()
      alert('Saved mapping for ' + selectedAdapter)
    } catch (e) {
      alert('Save failed: ' + e.message)
    }
  }

  async function preview() {
    setLoading(true)
    setError(null)
    setResult(null)
    let parsed
    try {
      parsed = JSON.parse(payload)
    } catch (e) {
      setError('Invalid JSON payload')
      setLoading(false)
      return
    }

    try {
      const resp = await fetch(`/api/preview?vendor=${encodeURIComponent(vendor)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.message || JSON.stringify(data))
      setResult(data.preview || data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: 24 }}>
      <h1>ARTY Mapping Editor — Preview</h1>

      <div style={{ marginTop: 8, marginBottom: 12 }}>
        {user || accessToken ? (
          <div>
            <strong>Logged in as:</strong> {user?.email || 'token-user'}
            <button onClick={doLogout} style={{ marginLeft: 12 }}>Logout</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
            <input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            <button onClick={doLogin}>Login</button>
          </div>
        )}
      </div>

      <label>Vendor: </label>
      <select value={vendor} onChange={e => setVendor(e.target.value)}>
        <option value="cloudbeds">cloudbeds</option>
        <option value="ezee">ezee</option>
        <option value="rmscloud">rmscloud</option>
      </select>

      <div style={{ marginTop: 12 }}>
        <button onClick={loadAdapters} style={{ marginRight: 8 }}>Load Adapters</button>
        <label>Choose Adapter: </label>
        <select value={selectedAdapter} onChange={e => onAdapterChange(e.target.value)}>
          {['cloudbeds','ezee','rmscloud', ...adapters.map(a=>a.vendor)].filter((v,i,arr)=>arr.indexOf(v)===i).map(v=> <option key={v} value={v}>{v}</option>)}
        </select>
        <button onClick={saveMapping} style={{ marginLeft: 8 }}>Save Mapping</button>
      </div>
      <div style={{ marginTop: 12 }}>
        <label>Author: </label>
        <input value={email || ''} readOnly placeholder="(optional, saved with mapping)" style={{ marginLeft: 8 }} />
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <div style={{ flex: 1 }}>
          <h3>Sample Payload</h3>
          <textarea value={payload} onChange={e => setPayload(e.target.value)} style={{ width: '100%', height: 200 }} />
          <h4 style={{ marginTop: 12 }}>Adapter Mapping (editable JSON)</h4>
          <textarea value={mappingEditor} onChange={e=>setMappingEditor(e.target.value)} style={{ width: '100%', height: 160 }} />
          <div style={{ marginTop: 8 }}>
            <button onClick={preview} disabled={loading} style={{ padding: '8px 12px' }}>{loading ? 'Running...' : 'Preview Mapping'}</button>
          </div>
          {error && <div style={{ color: 'crimson', marginTop: 8 }}>{error}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <h3>Mapping Preview</h3>
          <pre style={{ background: '#f6f8fa', padding: 12, height: 260, overflow: 'auto' }}>{result ? JSON.stringify(result, null, 2) : 'No preview yet'}</pre>

          <h4 style={{ marginTop: 12 }}>Versions</h4>
          <div style={{ maxHeight: 120, overflow: 'auto', background: '#fff', padding: 8 }}>
            {adapters && adapters.find(a=>a.vendor===selectedAdapter) && adapters.find(a=>a.vendor===selectedAdapter).versions.length ? (
              adapters.find(a=>a.vendor===selectedAdapter).versions.map(v => (
                <div key={v.file} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                  <div style={{ fontSize: 12 }}>{v.file} {v.metadata ? `by ${v.metadata.author || 'unknown'}` : ''}</div>
                  <div>
                    <button onClick={() => loadVersion(v.file)} style={{ marginRight: 8 }}>Load</button>
                    <button onClick={() => { if (confirm('Rollback to this version?')) rollbackTo(v.file) }}>Rollback</button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: '#666' }}>No versions available. Save a mapping to create history.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
