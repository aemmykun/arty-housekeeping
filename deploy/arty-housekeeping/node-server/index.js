require('dotenv').config();
// Sentry init (optional)
if (process.env.SENTRY_DSN) {
  try {
    const Sentry = require('@sentry/node')
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || 'production' })
    // capture startup info
    Sentry.captureMessage('ARTY Node server starting')
  } catch (e) {
    console.warn('Sentry init failed:', e && e.message)
  }
}
const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csvtojson');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const app = express();
// Security headers
app.use(helmet());
// Recommended additional Helmet policies: HSTS and CSP
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }))
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'", 'https:'],
    frameSrc: ["'none'"]
  }
}))
// Basic rate limiting
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 }); // 120 reqs per minute
app.use(apiLimiter);
// Body parsing with size limit
app.use(express.json({ limit: '100kb' }));

const deployDir = path.join(__dirname, '..');
const dataDir = path.join(__dirname, '..', 'data');
const processedDir = path.join(dataDir, 'processed');
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), version: '1.0.0' });
});

app.get('/api/:resource', async (req, res) => {
  const r = req.params.resource;
  const map = {
    rooms: 'hotel_rooms.csv',
    tasks: 'hotel_tasks.csv',
    staff: 'hotel_staff.csv',
    inventory: 'hotel_inventory.csv'
  };
  if (!map[r]) return res.status(404).json({ error: 'Endpoint not found' });
  const csvPath = path.join(__dirname, '..', 'data', map[r]);
  if (!fs.existsSync(csvPath)) return res.status(404).json({ error: `Data file ${map[r]} not found` });
  try {
    const json = await csv().fromFile(csvPath);
    res.json({ data: json, count: json.length, source: `data/${map[r]}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Preview adapter mapping without writing files (dry-run)
app.post('/api/adapters/:vendor/preview',
  // validation: vendor param and body must be an object
  (req, res, next) => {
    const vendor = req.params.vendor;
    if (!vendor || !validator.isAlphanumeric(vendor.replace(/[-_]/g,''))) return res.status(400).json({ error: 'invalid-vendor' });
    next();
  },
  body().custom(v => v === null || typeof v === 'object'),
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ error: 'invalid-payload', details: errors.array() })
    const vendor = req.params.vendor;
    const payload = req.body || {};
    try {
      // use adapter.js if available
      const adapter = require('./adapter');
      const result = adapter.transform(vendor, payload);
      return res.json({ status: 'ok', preview: result });
    } catch (e) {
      return res.status(500).json({ error: 'adapter-preview-failed', message: e.message });
    }
  }
);

// Simple adapter loader (mirrors Python adapter)
const db = require('./db');

function loadMapping(vendor) {
  const file = path.join(__dirname, '..', 'integrations', `${vendor}_adapter.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

function transform(vendor, payload) {
  const mappingDoc = loadMapping(vendor);
  if (!mappingDoc || !mappingDoc.mappings) return { raw: payload, note: 'no-mapping-found', vendor };
  const mappings = mappingDoc.mappings;
  const canonical = {};
  for (const [vendorField, canonicalField] of Object.entries(mappings)) {
    if (payload && Object.prototype.hasOwnProperty.call(payload, vendorField)) {
      canonical[canonicalField] = payload[vendorField];
    }
  }
  canonical._meta = { vendor, mapped_at: new Date().toISOString() };
  const unmapped = {};
  if (payload && typeof payload === 'object') {
    for (const [k, v] of Object.entries(payload)) {
      if (!Object.prototype.hasOwnProperty.call(mappings, k)) unmapped[k] = v;
    }
    if (Object.keys(unmapped).length) canonical.raw_unmapped = unmapped;
  }
  return canonical;
}

// Middleware: require a valid JWT to proceed. If JWT_SECRET is unset and ALLOW_UNAUTH is true, allows through for dev.
function requireAuth(req, res, next) {
  // If environment explicitly allows unauthenticated operations, short-circuit
  if (process.env.ALLOW_UNAUTH === 'true' || process.env.ALLOW_UNAUTH_WEBHOOKS === 'true') return next()

  const auth = req.headers && req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'missing-authorization' })
  const parts = auth.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'invalid-authorization-format' })
  const token = parts[1]
  // Try verification using multiple possible secrets/providers:
  // 1) SUPABASE_JWT_SECRET (if using Supabase access tokens)
  // 2) JWT_SECRET (local/dev or other IdP)
  const supabaseSecret = process.env.SUPABASE_JWT_SECRET || null
  const localSecret = process.env.JWT_SECRET || 'dev-secret'
  try {
    if (supabaseSecret) {
      const payload = jwt.verify(token, supabaseSecret)
      req.user = payload
      req.user.__issuer = 'supabase'
      return next()
    }
  } catch (e) {
    // fallthrough to next method
    console.warn('Supabase JWT verification failed:', e.message)
  }

  try {
    const payload = jwt.verify(token, localSecret)
    req.user = payload
    req.user.__issuer = 'local'
    return next()
  } catch (e) {
    return res.status(401).json({ error: 'invalid-token', message: e.message })
  }
}

app.post('/webhooks/:vendor',
  // vendor param validation
  (req, res, next) => {
    const vendor = req.params.vendor;
    if (!vendor || !validator.isAlphanumeric(vendor.replace(/[-_]/g,''))) return res.status(400).json({ error: 'invalid-vendor' });
    next();
  },
  // require auth for webhooks unless explicitly allowed via env
  (req, res, next) => {
    if (process.env.ALLOW_UNAUTH_WEBHOOKS === 'true') return next();
    return requireAuth(req, res, next);
  },
  // body must be an object (or null) and some optional fields validated if present
  body().custom(v => v === null || typeof v === 'object'),
  body('reservation_id').optional().isString(),
  body('room_number').optional().isString(),
  body('status').optional().isString(),
  async (req, res) => {
    const vendor = req.params.vendor;
    const payload = req.body || {};
    // redacted logging
    console.log(`Received webhook from ${vendor}`);

    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ error: 'invalid-payload', details: errors.array() })

    let canonical = null;
    try {
      canonical = transform(vendor, payload);
    } catch (e) {
      console.warn('Adapter transform failed', e);
    }

  const ts = new Date().toISOString().replace(/[:.]/g, '');
  const outFilename = `${vendor}_webhook_${ts}.json`;
  const outPath = path.join(processedDir, outFilename);
  const toWrite = canonical || { vendor, payload, received_at: new Date().toISOString() };

  try {
    fs.writeFileSync(outPath, JSON.stringify(toWrite, null, 2), 'utf8');
    console.log(`Wrote processed webhook to ${outPath}`);
  } catch (e) {
    console.warn('Failed writing processed webhook:', e);
  }

  // Attempt to persist into Postgres if configured (prefer Supabase service role)
  let dbResult = null;
  try {
    const { supabase } = require('./supabaseClient')
    if (supabase && canonical) {
      try {
        const insert = await supabase.from('canonical_reservations').insert([
          {
            reservation_id: canonical.reservation_id || null,
            room_number: canonical.room_number || null,
            status: canonical.status || null,
            guest_name: canonical.guest_name || null,
            raw_json: toWrite
          }
        ])
        if (insert && insert.error) {
          console.warn('Supabase insert error:', insert.error)
        } else if (insert && insert.data) {
          dbResult = { inserted_rows: insert.data.length }
          console.log('Inserted canonical event into Supabase, rows=', dbResult.inserted_rows)
        }
      } catch (sErr) {
        console.warn('Supabase insert failed, falling back to Postgres or file:', sErr && sErr.message ? sErr.message : sErr)
      }
    } else {
      // fallback to existing Postgres pool if configured
      const pgConfigured = process.env.PGDATABASE || process.env.DATABASE_URL || process.env.PGHOST;
      if (pgConfigured && canonical) {
        const insertText = `INSERT INTO canonical_reservations (reservation_id, room_number, status, guest_name, raw_json, received_at) VALUES ($1,$2,$3,$4,$5,now()) RETURNING id`;
        const insertValues = [
          canonical.reservation_id || null,
          canonical.room_number || null,
          canonical.status || null,
          canonical.guest_name || null,
          JSON.stringify(toWrite)
        ];

        try {
          const r = await db.pool.query(insertText, insertValues);
          dbResult = { inserted_id: r.rows[0].id };
          console.log('Inserted canonical event into Postgres, id=', dbResult.inserted_id);
        } catch (pgErr) {
          console.warn('Postgres insert failed, continuing with file fallback:', pgErr && pgErr.message ? pgErr.message : pgErr);
        }
      }
    }
  } catch (e) {
    console.warn('DB integration check failed:', e && e.message ? e.message : e);
  }

  const response = {
    status: 'received',
    vendor,
    timestamp: new Date().toISOString(),
    processed_file: path.relative(path.join(__dirname, '..'), outPath)
  };
  if (dbResult) response.db = dbResult;

  res.json(response);
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`ARTY Node server listening on http://localhost:${port}`));
