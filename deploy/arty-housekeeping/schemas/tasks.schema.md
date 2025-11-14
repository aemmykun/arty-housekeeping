# Tasks CSV Schema (Canonical)

Columns:
- `room_number` (string)
- `service_date` (YYYY-MM-DD)
- `service_type` (DAILY|FULL|WEEKLY|DEPARTURE|ARRIVAL)
- `estimated_minutes` (int)
- `assigned_staff` (string, optional)
- `status` (NEW|IN_PROGRESS|DONE|INSPECT)
- `notes` (string, optional)

Rules:
- Dates ISO 8601; no locale formats.
- Service_type is enum; map hotel-specific labels via adapters.
