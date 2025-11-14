# ARTY™ PMS Add-On Deployment Guide

## Overview
This guide covers deploying ARTY™ Housekeeping Management as a PMS Add-On across different platforms and integration scenarios.

## Deployment Scenarios

### 1. 🌐 **Web Application Deployment**

#### Prerequisites
- Node.js 18+ or Python 3.9+
- Database (PostgreSQL/MySQL recommended)
- Web server (Nginx/Apache)
- SSL certificate for HTTPS

#### Step-by-Step Web Deployment
```bash
# 1. Clone and setup
git clone your-arty-repository
cd artyhospitality-setup-skeleton

# 2. Install dependencies
npm install  # or pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your database, PMS credentials, etc.

# 4. Initialize database
npm run db:migrate  # or python manage.py migrate

# 5. Import schemas
python tools/csv_sanity_check.py data/processed/hotel_rooms.csv schemas/rooms.schema.csv
python tools/csv_sanity_check.py data/processed/hotel_tasks.csv schemas/tasks.schema.csv

# 6. Start application  
npm run start:production  # or gunicorn app:app
```

#### Web Integration Points
- **CSV Upload Handler**: Wire `tools/html_to_csv.py` to file upload endpoint
- **PMS Sync**: Implement webhook endpoints using `/integrations/{vendor}/MAPPING.md`
- **Theme Integration**: Load CSS variables from `ui/themes/tokens.json`
- **Dashboard**: Use `apps/housekeeping-dashboard/index.stub.html` as template

---

### 2. 🫧 **Bubble.io No-Code Deployment**

#### Data Setup
1. **Create Data Types** in Bubble:
   ```
   Room: room_number (text), room_type (option set), status (option set), occupancy (number), notes (text)
   Task: room_number (text), service_date (date), service_type (option set), estimated_minutes (number), assigned_staff (text), status (option set), notes (text)
   Staff: staff_id (text), name (text), role (option set), availability (option set), max_minutes_per_day (number)
   ```

2. **Create Option Sets**:
   - `RoomType`: 1BR, 2BR, 3BR, STUDIO, TWIN, SOFA, ROLLAWAY
   - `ServiceType`: DAILY, FULL, WEEKLY, DEPARTURE, ARRIVAL  
   - `TaskStatus`: NEW, IN_PROGRESS, DONE, INSPECT
   - `RoomStatus`: DIRTY, CLEAN, IN_PROGRESS, INSPECT

3. **CSV Import**:
   - Upload sample CSV files to populate initial data
   - Use CSV uploader plugin or manual data entry

#### UI Implementation
```
Use prompts/bubble_arty_dashboard_prompt.txt:
1. Copy prompt content
2. Paste to Bubble AI or implement manually:
   - Hero metrics with dynamic text
   - Repeating Group for rooms grid
   - Drag-drop functionality for staff assignment
   - Conditional formatting for status colors
   - Mobile-responsive design
```

#### Bubble Workflows
- **Auto-Assignment**: Create workflow triggered by "Auto Assign" button
- **Status Updates**: Workflows for task completion, room status changes
- **Real-time Updates**: Use Bubble's real-time features for live dashboard
- **PMS Integration**: API Connector to sync with external PMS systems

---

### 3. 📱 **Flutter Mobile App Deployment**

#### Setup Flutter Project
```bash
# 1. Create Flutter project
flutter create arty_housekeeping
cd arty_housekeeping

# 2. Add dependencies to pubspec.yaml
dependencies:
  http: ^1.1.0
  csv: ^5.0.2
  provider: ^6.1.1
  sqflite: ^2.3.0
```

#### Data Models (from schemas)
```dart
// lib/models/room.dart
class Room {
  final String roomNumber;
  final RoomType roomType;
  final RoomStatus status;
  final int? occupancy;
  final String? notes;

  Room({required this.roomNumber, required this.roomType, required this.status, this.occupancy, this.notes});
  
  factory Room.fromCsv(List<String> row) {
    return Room(
      roomNumber: row[0],
      roomType: RoomType.values.byName(row[1]),
      status: RoomStatus.values.byName(row[2]),
      occupancy: int.tryParse(row[3]),
      notes: row[4].isEmpty ? null : row[4],
    );
  }
}
```

#### Flutter Deployment Steps
```bash
# Development
flutter run

# Android Production
flutter build apk --release
# Upload to Google Play Store or distribute via MDM

# iOS Production  
flutter build ios --release
# Deploy via Xcode to App Store or enterprise distribution
```

---

### 4. 🔌 **Direct PMS Integration Deployment**

#### Cloudbeds Integration
```javascript
// server/integrations/cloudbeds.js
const CloudbedsSync = {
  async syncRooms() {
    const response = await fetch('https://hotels.cloudbeds.com/api/v1.1/getRooms', {
      headers: { 'Authorization': `Bearer ${process.env.CLOUDBEDS_TOKEN}` }
    });
    
    const rooms = await response.json();
    const adapter = require('./cloudbeds_adapter.csvmap.json');
    
    // Transform using field mappings
    return rooms.map(room => transformFields(room, adapter.rooms_mapping));
  },
  
  async updateRoomStatus(roomNumber, status, notes) {
    return fetch('https://hotels.cloudbeds.com/api/v1.1/putRoom', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${process.env.CLOUDBEDS_TOKEN}` },
      body: JSON.stringify({ roomID: roomNumber, maidStatus: status, maidNotes: notes })
    });
  }
};
```

#### Webhook Endpoints
```javascript
// server/webhooks/pms.js
app.post('/webhooks/cloudbeds', (req, res) => {
  const { event, data } = req.body;
  
  switch(event) {
    case 'room.status_changed':
      updateArtyRoomStatus(data.roomNumber, data.newStatus);
      break;
    case 'reservation.created':
      generateHousekeepingTasks(data);
      break;
  }
  
  res.status(200).send('OK');
});
```

---

### 5. ☁️ **Cloud Platform Deployment**

#### AWS Deployment
```yaml
# docker-compose.yml
version: '3.8'
services:
  arty-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/arty
      - CLOUDBEDS_TOKEN=${CLOUDBEDS_TOKEN}
    depends_on:
      - db
      
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: arty
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# Deploy to AWS ECS/EC2
docker-compose up -d

# Or deploy to AWS Lambda (serverless)
serverless deploy --stage production
```

#### Azure Deployment
```bash
# Deploy to Azure Container Instances
az container create \
  --resource-group arty-rg \
  --name arty-housekeeping \
  --image your-registry/arty:latest \
  --ports 80 443 \
  --environment-variables DATABASE_URL=$DATABASE_URL
```

---

### 6. 🏨 **Hotel Property Deployment**

#### On-Premise Setup
For hotels requiring local deployment:

```bash
# 1. Setup local server (Ubuntu/CentOS)
sudo apt update && sudo apt install docker docker-compose nginx

# 2. Configure local domain
sudo nano /etc/hosts
# Add: 127.0.0.1 arty.hotel.local

# 3. SSL Setup (self-signed for internal use)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# 4. Deploy with local database
docker-compose -f docker-compose.local.yml up -d
```

#### Network Configuration
```nginx
# /etc/nginx/sites-available/arty
server {
    listen 443 ssl;
    server_name arty.hotel.local;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /webhooks/ {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Environment Configuration

### Required Environment Variables
```bash
# .env file
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/arty

# PMS Integration Credentials
CLOUDBEDS_TOKEN=your_cloudbeds_token
OPERA_USERNAME=your_opera_user  
OPERA_PASSWORD=your_opera_pass
MEWS_CLIENT_TOKEN=your_mews_client_token
MEWS_ACCESS_TOKEN=your_mews_access_token

# Application Settings
JWT_SECRET=your_jwt_secret
ADMIN_EMAIL=admin@hotel.com
WEBHOOK_SECRET=your_webhook_secret

# Feature Flags
ENABLE_QUESTLOGIC_AI=true
ENABLE_REAL_TIME_SYNC=true
ENABLE_MOBILE_APP=true
```

### Security Configuration
```javascript
// Security headers and CORS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // For Quest theme
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.mews.com", "https://hotels.cloudbeds.com"]
    }
  }
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
```

---

## Post-Deployment Setup

### 1. Initial Data Import
```bash
# Import hotel room configuration
python tools/html_to_csv.py data/raw/hotel_rooms_export.html data/processed/rooms.csv
python tools/csv_sanity_check.py data/processed/rooms.csv schemas/rooms.schema.csv

# Import staff data
curl -X POST https://your-arty-instance.com/api/staff/import \
  -H "Content-Type: text/csv" \
  --data-binary @data/processed/hotel_staff.csv
```

### 2. PMS Integration Testing
```bash
# Test Cloudbeds connection
curl -X GET https://your-arty-instance.com/api/integrations/cloudbeds/test

# Test webhook delivery
curl -X POST https://your-arty-instance.com/api/integrations/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"event": "room.status_changed", "roomNumber": "101", "newStatus": "CLEAN"}'
```

### 3. User Account Setup
```bash
# Create supervisor account
curl -X POST https://your-arty-instance.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "supervisor@hotel.com",
    "password": "secure_password",
    "role": "SUP",
    "name": "Hotel Supervisor"
  }'
```

### 4. Configure QuestLogic AI
```javascript
// Enable AI features in admin panel
{
  "questlogic_settings": {
    "auto_assignment": true,
    "predictive_analytics": true,
    "performance_insights": true,
    "learning_mode": true,
    "confidence_threshold": 0.85
  }
}
```

---

## Monitoring & Maintenance

### Health Checks
```bash
# Application health
curl https://your-arty-instance.com/health

# Database connectivity  
curl https://your-arty-instance.com/health/db

# PMS integration status
curl https://your-arty-instance.com/health/integrations
```

### Backup Strategy
```bash
# Daily database backup
pg_dump arty_production > backups/arty_$(date +%Y%m%d).sql

# Configuration backup
tar -czf backups/config_$(date +%Y%m%d).tar.gz \
  .env docker-compose.yml nginx.conf integrations/
```

### Log Monitoring
```bash
# Application logs
tail -f logs/arty.log | grep ERROR

# PMS sync logs
tail -f logs/pms_sync.log

# Performance monitoring
curl https://your-arty-instance.com/metrics | grep response_time
```

---

## Troubleshooting

### Common Issues

**CSV Import Failures**
```bash
# Check file format
python tools/csv_sanity_check.py data/upload.csv schemas/rooms.schema.csv

# Fix encoding issues  
iconv -f windows-1252 -t utf-8 input.csv > output.csv
```

**PMS Sync Issues** 
```bash
# Check API credentials
curl -H "Authorization: Bearer $CLOUDBEDS_TOKEN" \
  https://hotels.cloudbeds.com/api/v1.1/getRooms

# Verify webhook delivery
grep "webhook" logs/arty.log | tail -20
```

**Performance Issues**
```bash
# Check database connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

# Monitor memory usage
free -h && docker stats arty-api
```

This deployment guide provides comprehensive coverage for getting ARTY™ PMS Add-On running in production across different platforms and integration scenarios!