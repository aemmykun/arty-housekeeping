#!/bin/bash

# ARTY™ PMS Add-On Quick Deploy Script
# Usage: ./deploy.sh [web|bubble|flutter|docker]

set -e

DEPLOY_TYPE=${1:-web}
PROJECT_NAME="arty-housekeeping"

echo "🚀 Deploying ARTY™ PMS Add-On - Type: $DEPLOY_TYPE"

# Common setup
setup_common() {
    echo "📋 Setting up common components..."
    
    # Validate schemas
    if command -v python3 &> /dev/null; then
        echo "✅ Validating CSV schemas..."
        python3 tools/csv_sanity_check.py data/processed/hotel_rooms.csv schemas/rooms.schema.csv
        python3 tools/csv_sanity_check.py data/processed/hotel_tasks.csv schemas/tasks.schema.csv
        python3 tools/csv_sanity_check.py data/processed/hotel_staff.csv schemas/staff.schema.csv
        python3 tools/csv_sanity_check.py data/processed/hotel_inventory.csv schemas/inventory.schema.csv
        echo "✅ Schema validation passed!"
    else
        echo "⚠️  Python not found - skipping schema validation"
    fi
    
    # Create deployment directory
    mkdir -p deploy/$PROJECT_NAME
    
    # Copy essential files
    cp -r schemas deploy/$PROJECT_NAME/
    cp -r integrations deploy/$PROJECT_NAME/
    cp -r ui deploy/$PROJECT_NAME/
    cp -r prompts deploy/$PROJECT_NAME/
    cp -r data deploy/$PROJECT_NAME/
    cp apps/housekeeping-dashboard/index.stub.html deploy/$PROJECT_NAME/dashboard.html
    
    echo "✅ Common setup complete!"
}

# Web deployment
deploy_web() {
    echo "🌐 Setting up web deployment..."
    
    cd deploy/$PROJECT_NAME
    
    # Create package.json
    cat > package.json << EOF
{
  "name": "arty-housekeeping",
  "version": "1.0.0",
  "description": "ARTY™ PMS Add-On Housekeeping Management",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "multer": "^1.4.5",
    "csv-parser": "^3.0.0",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0"
  }
}
EOF

    # Create basic Express server
    cat > server.js << EOF
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// CSV upload endpoint
app.post('/api/upload/csv', (req, res) => {
    // TODO: Implement CSV processing using tools/html_to_csv.py
    res.json({ message: 'CSV upload endpoint ready for implementation' });
});

// PMS webhook endpoints
app.post('/webhooks/:vendor', (req, res) => {
    const vendor = req.params.vendor;
    console.log(\`Received webhook from \${vendor}:\`, req.body);
    
    // TODO: Implement webhook processing using integrations/\${vendor}/MAPPING.md
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(\`🏨 ARTY™ Housekeeping server running on port \${PORT}\`);
    console.log(\`📊 Dashboard: http://localhost:\${PORT}\`);
    console.log(\`🔌 Webhooks: http://localhost:\${PORT}/webhooks/{vendor}\`);
});
EOF

    # Create environment template
    cat > .env.example << EOF
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/arty

# PMS Integration Credentials  
CLOUDBEDS_TOKEN=your_cloudbeds_token
OPERA_USERNAME=your_opera_user
OPERA_PASSWORD=your_opera_pass
MEWS_CLIENT_TOKEN=your_mews_client_token
MEWS_ACCESS_TOKEN=your_mews_access_token

# Application Settings
JWT_SECRET=your_jwt_secret_here
ADMIN_EMAIL=admin@hotel.com
WEBHOOK_SECRET=your_webhook_secret

# Feature Flags
ENABLE_QUESTLOGIC_AI=true
ENABLE_REAL_TIME_SYNC=true
EOF

    # Install dependencies
    if command -v npm &> /dev/null; then
        echo "📦 Installing Node.js dependencies..."
        npm install
        echo "✅ Dependencies installed!"
        echo ""
        echo "🎯 Next steps:"
        echo "1. Copy .env.example to .env and configure your settings"
        echo "2. Run: npm run dev"
        echo "3. Open: http://localhost:3000"
    else
        echo "⚠️  npm not found - please install Node.js first"
    fi
    
    cd ../..
}

# Bubble deployment
deploy_bubble() {
    echo "🫧 Setting up Bubble.io deployment..."
    
    cd deploy/$PROJECT_NAME
    
    # Create Bubble setup guide
    cat > BUBBLE_SETUP.md << EOF
# Bubble.io Setup for ARTY™ Housekeeping

## 1. Data Types Setup
Create these data types in your Bubble app:

### Room
- room_number (text)
- room_type (option set: 1BR, 2BR, 3BR, STUDIO, TWIN, SOFA, ROLLAWAY)  
- status (option set: DIRTY, CLEAN, IN_PROGRESS, INSPECT)
- occupancy (number)
- notes (text)

### Task
- room_number (text)
- service_date (date)
- service_type (option set: DAILY, FULL, WEEKLY, DEPARTURE, ARRIVAL)
- estimated_minutes (number)
- assigned_staff (text)
- status (option set: NEW, IN_PROGRESS, DONE, INSPECT)
- notes (text)

### Staff  
- staff_id (text)
- name (text)
- role (option set: RA, HM, CA, SUP)
- availability (option set: AVAILABLE, ON_BREAK, SICK_LEAVE)
- max_minutes_per_day (number)

## 2. Import Sample Data
Use the CSV Uploader plugin or manual entry:
- Upload: data/processed/hotel_rooms.csv
- Upload: data/processed/hotel_tasks.csv  
- Upload: data/processed/hotel_staff.csv

## 3. AI Assistant Implementation
Copy prompts/bubble_arty_dashboard_prompt.txt and paste to Bubble AI

## 4. Theme Setup  
Configure your app's color variables from ui/themes/tokens.json:
- Primary: #4A90E2 (Quest blue)
- Accent: #FF6B35 (Quest coral)
- Success: #2ECC71
- Warning: #F39C12

## 5. Page Structure
Create main page with:
- Hero metrics (repeating group with Room data)
- Rooms grid (repeating group with drag-drop to Staff)
- Staff assignment board (repeating group by Staff)
- Mobile responsive groups for RA interface
EOF

    echo "✅ Bubble.io setup guide created!"
    echo "📖 See deploy/$PROJECT_NAME/BUBBLE_SETUP.md for detailed instructions"
    
    cd ../..
}

# Flutter deployment  
deploy_flutter() {
    echo "📱 Setting up Flutter deployment..."
    
    cd deploy
    
    # Create Flutter project
    if command -v flutter &> /dev/null; then
        flutter create $PROJECT_NAME
        cd $PROJECT_NAME
        
        # Copy assets
        mkdir -p assets/data
        cp ../../data/processed/*.csv assets/data/
        cp -r ../../ui/themes assets/
        
        # Create basic models
        mkdir -p lib/models
        cat > lib/models/room.dart << EOF
enum RoomType { BR1, BR2, BR3, STUDIO, TWIN, SOFA, ROLLAWAY }
enum RoomStatus { DIRTY, CLEAN, IN_PROGRESS, INSPECT }

class Room {
  final String roomNumber;
  final RoomType roomType;
  final RoomStatus status;
  final int? occupancy;
  final String? notes;

  Room({
    required this.roomNumber,
    required this.roomType, 
    required this.status,
    this.occupancy,
    this.notes,
  });

  factory Room.fromCsv(List<String> row) {
    return Room(
      roomNumber: row[0],
      roomType: RoomType.values.byName(row[1].replaceAll('BR', 'BR')),
      status: RoomStatus.values.byName(row[2]),
      occupancy: int.tryParse(row[3] ?? ''),
      notes: row[4].isEmpty ? null : row[4],
    );
  }
}
EOF

        # Update pubspec.yaml
        cat >> pubspec.yaml << EOF
  
  # ARTY™ dependencies
  http: ^1.1.0
  csv: ^5.0.2
  provider: ^6.1.1
  sqflite: ^2.3.0
  
assets:
  - assets/data/
  - assets/themes/
EOF

        echo "✅ Flutter project created!"
        echo "📱 Next steps:"
        echo "1. cd deploy/$PROJECT_NAME"
        echo "2. flutter pub get"
        echo "3. flutter run"
        
    else
        echo "⚠️  Flutter not found - please install Flutter SDK first"
        echo "📖 Visit: https://flutter.dev/docs/get-started/install"
    fi
    
    cd ../..
}

# Docker deployment
deploy_docker() {
    echo "🐳 Setting up Docker deployment..."
    
    cd deploy/$PROJECT_NAME
    
    # Create Dockerfile
    cat > Dockerfile << EOF
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S arty -u 1001
USER arty

EXPOSE 3000

CMD ["npm", "start"]
EOF

    # Create docker-compose.yml
    cat > docker-compose.yml << EOF
version: '3.8'

services:
  arty-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://arty:password@db:5432/arty
    depends_on:
      - db
    restart: unless-stopped
    
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: arty
      POSTGRES_USER: arty
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - arty-api
    restart: unless-stopped

volumes:
  postgres_data:
EOF

    # Create nginx config
    cat > nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    upstream arty {
        server arty-api:3000;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        location / {
            proxy_pass http://arty;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF

    echo "✅ Docker setup complete!"
    echo "🐳 Next steps:"
    echo "1. docker-compose up -d"
    echo "2. Visit: http://localhost"
    
    cd ../..
}

# Main deployment logic
main() {
    setup_common
    
    case $DEPLOY_TYPE in
        "web")
            deploy_web
            ;;
        "bubble")
            deploy_bubble
            ;;
        "flutter")
            deploy_flutter
            ;;
        "docker")
            deploy_web  # Setup web files first
            deploy_docker
            ;;
        *)
            echo "❌ Unknown deployment type: $DEPLOY_TYPE"
            echo "Usage: ./deploy.sh [web|bubble|flutter|docker]"
            exit 1
            ;;
    esac
    
    echo ""
    echo "🎉 ARTY™ PMS Add-On deployment setup complete!"
    echo "📁 Files are in: deploy/$PROJECT_NAME/"
    echo "📖 See DEPLOYMENT.md for detailed instructions"
    echo "🔧 Configure your PMS integration using files in integrations/"
}

main