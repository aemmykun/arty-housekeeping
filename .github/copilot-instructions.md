# ARTY™ PMS Add-On Housekeeping Management System - AI Coding Instructions

## Project Overview
This is a **deploy-ready scaffolding** for ARTY™ - a PMS Add-On Housekeeping Management System that integrates seamlessly into any Property Management System (RMS, MEWS, Opera, Guesty, Cloudbeds, etc.). The system provides real-time housekeeping operations control including rooms, staff, QC, inventory, forecasting, and training.

**Core Concept**: "Where PMS ends, operations begin" - This module plugs directly into existing PMS systems and activates the housekeeping operation layer without modifying the PMS UI.

## Architecture Patterns

### PMS Integration Layer
- **PMS → ARTY™ Sync**: Reads room status, arrivals/departures, stayovers, guest notes, maintenance flags
- **ARTY™ → PMS Write-Back**: Updates housekeeping status, completion times, QC scores, room readiness ETAs
- **Event-Driven**: PMS sends events, ARTY™ handles operations without modifying PMS UI

### Schema-First Design
- All data structures are defined in `/schemas/*.schema.md` with canonical CSV column definitions
- Room types: `1BR|2BR|3BR|STUDIO|TWIN|SOFA|ROLLAWAY` (fixed enum)
- Service types: `DAILY|FULL|WEEKLY|DEPARTURE|ARRIVAL` (fixed enum)
- Status progression: `NEW|IN_PROGRESS|DONE|INSPECT` or `DIRTY|CLEAN|IN_PROGRESS|INSPECT`

### Data Flow Pattern
1. **Ingest**: PMS data + HTML tables → CSV via `tools/html_to_csv.py` (single-line pandas converter)
2. **Validate**: CSV headers against schemas using `tools/csv_sanity_check.py`
3. **Process**: Apply business logic from `/logic/` modules (QuestLogic™ AI)
4. **Display**: Multi-device experience - Dashboard (supervisors), Mobile (RAs), Analytics (managers)

### Integration Architecture
- **Adapter Pattern**: Each PMS system (Cloudbeds, eZee, RMSCloud, Opera, MEWS) has mapping files in `/integrations/`
- **Field Mapping**: Vendor fields → canonical schema via JSON adapters
- **API Endpoints**: RESTful patterns for PMS read/write operations
- **Real-time Sync**: Event-driven updates with offline-first mobile support

## Key Business Logic

### QuestLogic™ AI Engine
- **Auto Assignment**: Rooms → housekeepers using availability, skill level, zones, linen closet distance
- **Predictive Analytics**: Labor needs, linen consumption, bottleneck floors, room readiness ETAs
- **Performance Insights**: RA analytics, task delays, root cause analysis, training opportunities

### Roster Logic (`/logic/roster/`)
- **Staffing Formula**: `need_hk = ceil(total_minutes/330)` with 360-minute workload warnings
- **Fixed Roles**: 1 Houseman daily, 1 Common Area (Mon-Fri only)
- **Supervisor Rule**: Only add if `total_minutes > 1800` AND weekday AND adequate staff
- **Time Estimates**: `1BR=35m, 2BR=45m, 3BR=60m` (configurable per property)
- **Team Pairing**: Support for 2-person teams with zone optimization

### Linen Logic (`/logic/linen/rules.json`)
- **PMS Integration**: Tracks linen separately from PMS (PMS doesn't handle linen cycles)
- **Cycles**: 3N (default), 5N, 8N with JSON-defined rules
- **Monday Drop Rule**: For 8N cycles, skip Monday changes → Tuesday service
- **Stayover Logic**: Auto-switch to 3N cycle for stays > 5N
- **Forecasting**: Daily calculations based on actual departures/stayovers with auto-order suggestions

## Development Workflows

### File Processing Pipeline
```bash
# Convert HTML exports to CSV (single-line pandas converter)
python tools/html_to_csv.py data/raw/sample.html data/processed/sample.csv

# Validate against schema (checks headers match canonical definitions)
python tools/csv_sanity_check.py data/processed/sample.csv schemas/tasks.schema.csv
```

**Error Handling**: Tools are minimal by design - pandas errors bubble up directly. Add try/catch in your integration layer.

### Integration Adapter Pattern
Create JSON mappers for vendor-specific field translation:
```json
// Example: cloudbeds_adapter.csvmap.json
{
  "roomName": "room_number",
  "cleaningStatus": "status",
  "reservationNights": "occupancy"
}
```
**Usage**: Load adapter → transform vendor data → validate against canonical schema → process

### ARTY™ Brand Integration
- Use tokens from `/ui/themes/tokens.json`: `quest`, `light`, `dark` variants
- Apply via `data-theme="quest"` attributes in HTML
- **Quest Theme**: Royal Blue → Deep Purple gradients, Coral/Mint/Amber highlights, Gold accents
- **Color System**: `ink` (text), `bg` (background), `accent` (highlights)
- **Visual Style**: Glassmorphism components, Inter/Segoe UI fonts, animated transitions
- **Pattern**: Theme switching updates CSS custom properties: `--color-ink`, `--color-bg`, `--color-accent`

### Prompt-Driven Development
- Platform-specific prompts in `/prompts/` (≤400 words each)
- Include schema references and data-binding patterns
- Example: `bubble_dashboard_prompt.txt` for no-code platforms
- **Usage**: Copy prompt → paste to AI → generate platform-specific implementation

### CI/CD Validation (`/automation/ci/`)
- **Header Validation**: GitHub Actions to check CSV schemas on PR
- **Matrix Strategy**: Support multiple hotel CSV formats
- **Linting**: Optional validation for Python tools
- **Structure**: Create `.github/workflows/validate-schemas.yml` based on `/automation/ci/validate_headers.md`

### Multi-Device Experience
1. **Supervisor Dashboard (Desktop/Tablet)**: 3-column grid, live timelines, insights panel
2. **RA Mobile View (Phone)**: Task list, SOP checklists, timer, photo reporting, offline-first
3. **Manager Analytics (Dashboard)**: Trends, performance, cost forecasting, training needs
4. **QC Mode**: Inspection checklists, scorecards, issue flagging, approval workflows

### Deployment Patterns
1. **PMS Add-On Integration**: Event-driven sync with existing PMS systems
2. **Web Integration**: Drop schemas into backend docs, wire HTML converter to upload handler
3. **Bubble Integration**: Upload CSV as data type, use prompts to generate UI
4. **Flutter Integration**: Convert schemas to Dart models, implement CSV parser
5. **API Integration**: Use `/integrations/{vendor}/MAPPING.md` to build PMS webhook handlers

## Critical Conventions

### Data Attributes Pattern
Always preserve `data-*` attributes when editing HTML:
- `data-bind-csv="path/to/file.csv"` - Data source binding
- `data-theme="quest|light|dark"` - Theme selection
- `data-behavior="slide-out-after-auth"` - UI behaviors

### CSV Date Format
- **Always use ISO 8601**: `YYYY-MM-DD` format
- **Never locale formats**: Avoid MM/DD/YYYY or DD/MM/YYYY

### Integration Mapping Files
- Structure: `integrations/{vendor}/MAPPING.md`
- Include endpoint documentation and field mappings
- Suggest adapter JSON: `{vendor}_adapter.csvmap.json`

## Constraint Philosophy
- **No large code dumps**: Keep stubs short and pasteable
- **Schema compliance**: All data must validate against `/schemas/`
- **Platform agnostic**: Support Bubble, web frameworks, and mobile
- **Minimal dependencies**: Python tools use only pandas

## Common Tasks

### Adding Room Types
1. Update enum in `/schemas/rooms.schema.md`: `1BR|2BR|3BR|STUDIO|TWIN|SOFA|ROLLAWAY|NEWTYPE`
2. Add time estimate in `/logic/roster/README.md`: `NEWTYPE=XYm`
3. Update integration mappings in `/integrations/{vendor}/MAPPING.md`
4. Test with sample CSV using `csv_sanity_check.py`

### Adding PMS Integrations
1. Create `/integrations/{vendor}/MAPPING.md` with:
   - API endpoints and authentication
   - Field mappings: `vendorField → canonical_field`
   - Rate limits and pagination notes
2. Create `{vendor}_adapter.csvmap.json` for field translation
3. Document webhook patterns if real-time sync needed
4. Add vendor-specific enum mappings (status, service types)

### Modifying Business Logic
1. Update JSON rules in `/logic/` (keep declarative, avoid code)
2. Maintain 2-line pseudo-code examples in README files
3. Keep constraints explicit and testable
4. Update related prompt files in `/prompts/` if UI changes needed

### Testing & Validation
- **Schema Changes**: Run `csv_sanity_check.py` against sample data
- **Logic Changes**: Update pseudo-code examples, document edge cases
- **Integration Changes**: Test field mapping with real vendor data
- **UI Changes**: Verify data attributes remain intact in stub HTML

### Debugging Common Issues
- **CSV Import Fails**: Check date format (must be YYYY-MM-DD)
- **Schema Validation Fails**: Verify column names match exactly (case-sensitive)
- **Enum Errors**: Ensure values match fixed enums in schema files
- **Missing Data Attributes**: Check HTML stubs preserve `data-*` attributes after edits