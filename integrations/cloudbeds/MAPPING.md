# Cloudbeds PMS Integration - ARTY™ Add-On

## API Overview
**Base URL**: `https://hotels.cloudbeds.com/api/v1.1`  
**Authentication**: Bearer token via PropertyID + API Key  
**Rate Limits**: 1000 requests/hour per property  
**Webhook Support**: Yes (reservation events, room status changes)

## Core Endpoints

### Room Data Sync
```
GET /getRooms
Headers: Authorization: Bearer {token}
Response: Array of room objects with status, type, occupancy
Frequency: Every 15 minutes or webhook-triggered
```

### Reservation Data
```
GET /getReservations
Params: dateFrom, dateTo, includeDetails=true
Response: Checkins, checkouts, stayovers for labor planning
Frequency: Daily at 6:00 AM and real-time via webhooks
```

### Housekeeping Status Updates
```
PUT /putRoom
Body: {
  "roomID": "101",
  "maidStatus": "Clean|Dirty|Inspected|OutOfOrder",
  "maidNotes": "Completed by Maria Santos - 45min",
  "frontDeskNotes": "Room ready for arrival at 2:30 PM"
}
Response: Confirmation with timestamp
```

## Field Mappings
Use `cloudbeds_adapter.csvmap.json` for automatic field translation:

**Rooms Export**:
- `roomName` → `room_number` 
- `roomType` → `room_type` (requires enum mapping)
- `maidStatus` → `status` (Clean→CLEAN, Dirty→DIRTY, etc.)
- `maxOccupancy` → `occupancy`
- `maidNotes` → `notes`

**Tasks Generation**:
- Create tasks based on reservation checkout/checkin times
- `reservationID` → link to guest data
- Derive `service_type` from reservation status (checkout→DEPARTURE)
- Calculate `estimated_minutes` from room type + service type

## Webhook Configuration
**Events to Subscribe**:
```json
{
  "events": [
    "reservation.created",
    "reservation.updated", 
    "reservation.cancelled",
    "room.status_changed"
  ],
  "endpoint": "https://your-arty-instance.com/webhooks/cloudbeds",
  "authentication": "HMAC-SHA256"
}
```

## Real-Time Sync Pattern
1. **PMS → ARTY™**: Webhook receives room status change → Update ARTY™ room status → Trigger staff notifications
2. **ARTY™ → PMS**: Staff completes room → ARTY™ calls PUT /putRoom → PMS updates front desk display
3. **Conflict Resolution**: PMS timestamp wins, ARTY™ logs override events

## Data Transformation Example
```javascript
// Raw Cloudbeds response
{
  "roomName": "101",
  "roomType": "1 Bedroom", 
  "maidStatus": "Dirty",
  "maxOccupancy": 2,
  "maidNotes": "Late checkout - extra linen"
}

// ARTY™ canonical format
{
  "room_number": "101",
  "room_type": "1BR",
  "status": "DIRTY", 
  "occupancy": 2,
  "notes": "Late checkout - extra linen"
}
```

## Error Handling
- **Rate Limit**: Implement exponential backoff, queue non-urgent requests
- **Auth Failure**: Refresh token, notify admin if persistent
- **Webhook Timeout**: Retry with backoff, fallback to polling mode
- **Data Conflicts**: Log discrepancies, provide admin resolution interface

## Implementation Checklist
- [ ] Configure Cloudbeds API credentials
- [ ] Set up webhook endpoint with HMAC validation
- [ ] Test field mapping with sample property data
- [ ] Implement rate limiting and error handling
- [ ] Configure real-time bi-directional sync
- [ ] Test conflict resolution scenarios
