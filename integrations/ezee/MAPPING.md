# eZee Absolute PMS Integration - ARTY™ Add-On

## API Overview
**Base URL**: `https://live.ipms247.com/pmsinterface/` (SaaS) or on-premise URL  
**Authentication**: Hotel Code + Auth Key via POST or XML headers  
**Rate Limits**: 200 requests/hour (contact eZee for higher limits)  
**Webhook Support**: Limited (mainly for reservations, not housekeeping)  
**Data Format**: XML-based with REST wrappers available

## Core Endpoints

### Room Status Retrieval
```
POST /roomlist
Headers: Content-Type: application/x-www-form-urlencoded
Body: HotelCode={code}&AuthKey={key}&RequestType=RoomList
Response: XML with room details, occupancy, housekeeping status
```

### Housekeeping Status Update
```
POST /updatehkstatus  
Body: HotelCode={code}&AuthKey={key}&RoomNo={room}&HKStatus={status}&Remarks={notes}
Response: <Result>Success</Result> or error details
```

### Daily Arrivals/Departures
```
POST /listofbooking
Body: HotelCode={code}&AuthKey={key}&CheckinDate={date}&CheckoutDate={date}&BookingStatus=Confirmed
Response: XML with guest details, room assignments, timing
```

## Field Mappings
Use eZee-specific adapter for XML parsing and field translation:

**Rooms XML Response**:
```xml
<RoomDetails>
  <Room>
    <RoomNo>101</RoomNo>
    <RoomType>Deluxe</RoomType>
    <HKStatus>Dirty</HKStatus>
    <MaxOccupancy>2</MaxOccupancy>
    <CurrentGuests>0</CurrentGuests>
    <Remarks>Late checkout</Remarks>
  </Room>
</RoomDetails>
```

**ARTY™ Canonical Mapping**:
- `RoomNo` → `room_number`
- `RoomType` → `room_type` (requires custom mapping per property)
- `HKStatus` (Dirty/Clean/Progress/Inspect) → `status` 
- `CurrentGuests` → `occupancy`
- `Remarks` → `notes`

## Room Type Mapping (Hotel-Specific)
eZee uses custom room type names per property:
```json
{
  "room_type_mapping": {
    "Deluxe": "1BR",
    "Superior": "1BR", 
    "Suite": "2BR",
    "Family": "3BR",
    "Studio": "STUDIO",
    "Twin": "TWIN"
  }
}
```

## Polling Strategy
**Frequency**: Every 5-10 minutes (no reliable webhooks)
**Peak Hours** (7AM-9PM): Every 5 minutes
**Off-Peak**: Every 15 minutes
**Error Backoff**: 2min → 5min → 10min intervals

### Sync Workflow
1. **Room Status Sync**: Poll `/roomlist` → Transform XML → Update ARTY™
2. **Reservation Updates**: Poll `/listofbooking` for today/tomorrow → Generate tasks
3. **Status Push**: ARTY™ task completion → POST `/updatehkstatus` → eZee updates

## Task Generation Logic
```javascript
// From eZee reservation data
reservation = {
  CheckinDate: "2025-11-14",
  CheckoutDate: "2025-11-16", 
  RoomNo: "101",
  GuestName: "John Smith",
  BookingStatus: "Confirmed"
}

// Generate ARTY™ tasks
tasks = [
  {
    room_number: "101",
    service_date: "2025-11-14", 
    service_type: "ARRIVAL",
    estimated_minutes: 30,
    notes: "Checkin: John Smith"
  },
  {
    room_number: "101",
    service_date: "2025-11-15",
    service_type: "DAILY", 
    estimated_minutes: 25,
    notes: "Stayover service"
  },
  {
    room_number: "101",
    service_date: "2025-11-16",
    service_type: "DEPARTURE",
    estimated_minutes: 35, 
    notes: "Checkout: John Smith"
  }
]
```

## Error Handling

### Authentication Issues
- **Invalid Auth Key**: Alert admin, prevent further requests
- **Hotel Code Mismatch**: Validate configuration
- **Session Timeout**: Re-authenticate on 401 response

### Data Quality Issues  
- **Missing Room Numbers**: Skip invalid records, log for review
- **Unknown Room Types**: Map to "STUDIO" default, flag for manual mapping
- **Invalid Dates**: Use server date as fallback
- **XML Parse Errors**: Log raw response, attempt partial parsing

### Network & Performance
- **Timeout Handling**: 30-second timeout, retry once
- **Rate Limiting**: Queue requests, spread over time
- **Bulk Operations**: Process in batches of 50 rooms max

## Integration Testing
```bash
# Test room list retrieval
curl -X POST https://live.ipms247.com/pmsinterface/roomlist \
  -d "HotelCode=TEST001&AuthKey=your_key&RequestType=RoomList"

# Test status update
curl -X POST https://live.ipms247.com/pmsinterface/updatehkstatus \
  -d "HotelCode=TEST001&AuthKey=your_key&RoomNo=101&HKStatus=Clean&Remarks=Cleaned by ARTY"
```

## Implementation Checklist
- [ ] Configure eZee hotel code and auth key
- [ ] Map property-specific room types to canonical schema
- [ ] Set up XML parsing and error handling
- [ ] Implement polling scheduler with backoff
- [ ] Test bi-directional sync (read status, update status)
- [ ] Configure monitoring for API failures and data discrepancies
- [ ] Set up manual intervention workflow for unmapped room types
