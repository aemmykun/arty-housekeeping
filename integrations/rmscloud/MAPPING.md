# RMSCloud Mapping (Outline)

Key endpoints (read-only for sync):
- Reservations: `/api/reservations`
# MEWS Integration - ARTY™ Add-On

## API Overview
**Base URL**: `https://api.mews.com`  
**Authentication**: Bearer token (Client Token + Access Token)  
**Rate Limits**: 100 requests/minute (Enterprise: 300/min)  
**Webhook Support**: Yes (comprehensive event system)  
**API Style**: JSON REST with batch operations support

## Authentication Flow
```javascript
// Step 1: Get Access Token
POST /api/connector/v1/auth/getToken 
{
  "ClientToken": "your_client_token",
  "AccessToken": "your_access_token"
}

// Step 2: Use in subsequent requests
Headers: {
  "Authorization": "Bearer {received_token}",
  "Content-Type": "application/json"
}
```

## Core Endpoints

### Space (Room) Management
```javascript
POST /api/connector/v1/spaces/getAll
{
  "ClientToken": "token",
  "AccessToken": "token", 
  "SpaceIds": ["space-uuid-1", "space-uuid-2"], // Optional filter
  "UpdatedUtc": {
    "StartUtc": "2025-11-14T00:00:00Z",
    "EndUtc": "2025-11-14T23:59:59Z"
  }
}

Response: {
  "Spaces": [
    {
      "Id": "space-uuid-1",
      "Number": "101",
      "ParentSpaceId": null,
      "CategoryId": "category-uuid",
      "State": "Dirty", 
      "Description": "Deluxe room with city view"
    }
  ]
}
```

### Housekeeping Tasks
```javascript  
POST /api/connector/v1/tasks/getAll
{
  "ClientToken": "token",
  "AccessToken": "token",
  "TaskIds": [], // Empty for all
  "StartUtc": "2025-11-14T00:00:00Z",
  "EndUtc": "2025-11-14T23:59:59Z"
}

Response: {
  "Tasks": [
    {
      "Id": "task-uuid-1", 
      "SpaceId": "space-uuid-1",
      "Type": "Cleaning",
      "State": "Pending",
      "AssigneeId": "employee-uuid",
      "Description": "Standard departure cleaning",
      "CreatedUtc": "2025-11-14T08:00:00Z"
    }
  ]
}
```

### Task Updates
```javascript
POST /api/connector/v1/tasks/update
{
  "ClientToken": "token",
  "AccessToken": "token", 
  "Tasks": [
    {
      "Id": "task-uuid-1",
      "State": "Completed",
      "CompletedUtc": "2025-11-14T14:30:00Z",
      "Description": "Completed by Maria Santos - 35min",
      "AssigneeId": "employee-uuid"
    }
  ]
}
```

## Field Mappings
Use `mews_adapter.csvmap.json` for UUID-to-name resolution:

**Spaces → Rooms**:
- `Number` → `room_number`
- `CategoryId` → resolve to `room_type` via SpaceCategories lookup
- `State` → `status` (Dirty→DIRTY, Clean→CLEAN, etc.)
- Calculate `occupancy` from current reservations
- `Description` → `notes`

**Tasks Mapping**:
- `SpaceId` → resolve to `room_number` via Spaces lookup  
- `CreatedUtc.date` → `service_date`
- `Type` → `service_type` (Cleaning→DAILY, Maintenance→FULL)
- Calculate `estimated_minutes` from room category + task type
- `AssigneeId` → resolve to `assigned_staff` via Employees lookup
- `State` → `status` (Pending→NEW, InProgress→IN_PROGRESS, Completed→DONE)

## UUID Resolution Strategy
MEWS uses UUIDs for all entities. Maintain local lookup tables:

```javascript
// Cached lookups (refresh daily)
const lookupTables = {
  spaceCategories: {
    "uuid-1": { name: "Deluxe", type: "1BR", capacity: 2 },
    "uuid-2": { name: "Suite", type: "2BR", capacity: 4 }
  },
  employees: {
    "uuid-1": { name: "Maria Santos", role: "RA" },
    "uuid-2": { name: "John Kim", role: "RA" }
  },
  spaces: {
    "uuid-1": { number: "101", categoryId: "uuid-1" }
  }
}
```

## Webhook Configuration
```javascript
POST /api/connector/v1/webhooks/create
{
  "ClientToken": "token",
  "AccessToken": "token",
  "Url": "https://your-arty-instance.com/webhooks/mews",
  "Events": [
    "SpaceEventCreated",
    "SpaceEventUpdated", 
    "TaskEventCreated",
    "TaskEventUpdated",
    "ReservationEventCreated"
  ]
}

// Webhook payload example
{
  "Events": [
    {
      "Type": "TaskEventUpdated",
      "Id": "event-uuid",
      "CreatedUtc": "2025-11-14T14:30:00Z",
      "Data": {
        "TaskId": "task-uuid-1",
        "PreviousState": "InProgress", 
        "State": "Completed"
      }
    }
  ]
}
```

## Real-Time Sync Architecture
1. **MEWS → ARTY™**: Webhooks for task/space updates → Parse UUID → Update ARTY™ data
2. **ARTY™ → MEWS**: Task completion → POST /tasks/update → MEWS reflects status
3. **Batch Sync**: Hourly full sync to catch missed webhooks

## Performance Optimizations

### Batch Operations
```javascript
// Efficient: Update multiple tasks in one request
POST /api/connector/v1/tasks/update
{
  "Tasks": [
    { "Id": "task-1", "State": "Completed" },
    { "Id": "task-2", "State": "InProgress" },
    { "Id": "task-3", "AssigneeId": "employee-uuid" }
  ]
}
```

### Smart Caching
- **UUID Lookups**: Cache for 24 hours, refresh on 404 errors
- **Space Categories**: Static data, refresh weekly
- **Employees**: Refresh on login or daily
- **Current Reservations**: Cache for 1 hour during peak times

## Error Handling & Recovery

### API Errors
- **401 Unauthorized**: Refresh access token automatically
- **429 Rate Limited**: Exponential backoff (2s, 4s, 8s, 16s)
- **404 Not Found**: Refresh UUID lookup tables
- **500 Server Error**: Retry after 30 seconds, max 3 attempts

### Data Consistency
- **UUID Resolution Failure**: Log missing entity, use fallback display
- **Webhook Delivery Failure**: Fallback to polling mode for 1 hour
- **Duplicate Events**: Use event ID for deduplication
- **Schema Changes**: Version API calls, handle backward compatibility

## Testing & Validation
```bash
# Test authentication
curl -X POST https://api.mews.com/api/connector/v1/auth/getToken \
  -H "Content-Type: application/json" \
  -d '{"ClientToken":"test","AccessToken":"test"}'

# Test space retrieval  
curl -X POST https://api.mews.com/api/connector/v1/spaces/getAll \
  -H "Authorization: Bearer {token}" \
  -d '{"ClientToken":"test","AccessToken":"test"}'
```

## Implementation Checklist
- [ ] Configure MEWS client and access tokens
- [ ] Set up UUID resolution caching system
- [ ] Implement webhook endpoint with event deduplication
- [ ] Test batch operations for performance
- [ ] Configure error handling and retry logic
- [ ] Set up monitoring for webhook delivery failures
- [ ] Implement fallback polling for critical operations
- Housekeeping tasks: `/api/housekeeping/tasks` (if available)
- Webhooks: departures/arrivals/status changes (use if tenant allows)

Field map (example):
- `RoomNumber` → `room_number`
- `StayLength` → for linen cycle logic
- `TaskType` → map to service_type enum
- `ETA/ETD` → prioritization window

Notes:
- Use adapters to normalize names to our schema.
- Respect tenant-specific overrides on time estimates.
