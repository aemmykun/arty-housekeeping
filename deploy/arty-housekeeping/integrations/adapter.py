import os
import json
import datetime

def load_mapping(vendor):
    """Load the vendor adapter mapping JSON if present."""
    mapping_file = os.path.join('integrations', f"{vendor}_adapter.json")
    if not os.path.exists(mapping_file):
        return None
    with open(mapping_file, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except Exception:
            return None

def transform(vendor, payload):
    """Transform a vendor webhook payload into canonical fields using mapping.

    - Loads `integrations/{vendor}_adapter.json` which should contain a `mappings` object
      mapping vendor field names -> canonical field names.
    - Returns a dict with canonical fields. If no mapping found, returns the original payload
      under the `raw` key.
    """
    mapping_doc = load_mapping(vendor)
    if not mapping_doc or 'mappings' not in mapping_doc:
        return {'raw': payload, 'note': 'no-mapping-found', 'vendor': vendor}

    mappings = mapping_doc['mappings']
    canonical = {}

    # Straight field mapping
    for vendor_field, canonical_field in mappings.items():
        if isinstance(payload, dict) and vendor_field in payload:
            canonical[canonical_field] = payload[vendor_field]

    # Add meta
    canonical['_meta'] = {
        'vendor': vendor,
        'mapped_at': datetime.datetime.now().isoformat()
    }

    # Include any unmapped fields under `raw` for audit
    if isinstance(payload, dict):
        unmapped = {k: v for k, v in payload.items() if k not in mappings.keys()}
        if unmapped:
            canonical['raw_unmapped'] = unmapped

    return canonical
