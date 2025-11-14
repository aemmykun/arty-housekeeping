const fs = require('fs');
const path = require('path');

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

module.exports = { loadMapping, transform };
