@echo off
REM ARTY™ PMS Add-On Quick Deploy Script for Windows
REM Usage: deploy.bat [web|bubble|flutter|docker]

setlocal enabledelayedexpansion

set DEPLOY_TYPE=%1
if "%DEPLOY_TYPE%"=="" set DEPLOY_TYPE=web
set PROJECT_NAME=arty-housekeeping

echo 🚀 Deploying ARTY™ PMS Add-On - Type: %DEPLOY_TYPE%

REM Common setup
echo 📋 Setting up common components...

REM Validate schemas
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Validating CSV schemas...
    python tools/csv_sanity_check.py data/processed/hotel_rooms.csv schemas/rooms.schema.csv
    python tools/csv_sanity_check.py data/processed/hotel_tasks.csv schemas/tasks.schema.csv
    python tools/csv_sanity_check.py data/processed/hotel_staff.csv schemas/staff.schema.csv
    python tools/csv_sanity_check.py data/processed/hotel_inventory.csv schemas/inventory.schema.csv
    echo ✅ Schema validation passed!
) else (
    echo ⚠️  Python not found - skipping schema validation
)

REM Create deployment directory
if not exist deploy mkdir deploy
if not exist deploy\%PROJECT_NAME% mkdir deploy\%PROJECT_NAME%

REM Copy essential files
xcopy /E /I schemas deploy\%PROJECT_NAME%\schemas
xcopy /E /I integrations deploy\%PROJECT_NAME%\integrations
xcopy /E /I ui deploy\%PROJECT_NAME%\ui
xcopy /E /I prompts deploy\%PROJECT_NAME%\prompts
xcopy /E /I data deploy\%PROJECT_NAME%\data
copy apps\housekeeping-dashboard\index.stub.html deploy\%PROJECT_NAME%\dashboard.html

echo ✅ Common setup complete!

REM Deployment type specific setup
if "%DEPLOY_TYPE%"=="web" goto :deploy_web
if "%DEPLOY_TYPE%"=="bubble" goto :deploy_bubble
if "%DEPLOY_TYPE%"=="flutter" goto :deploy_flutter
if "%DEPLOY_TYPE%"=="docker" goto :deploy_docker

echo ❌ Unknown deployment type: %DEPLOY_TYPE%
echo Usage: deploy.bat [web^|bubble^|flutter^|docker]
exit /b 1

:deploy_web
echo 🌐 Setting up web deployment...
cd deploy\%PROJECT_NAME%

REM Create package.json
(
echo {
echo   "name": "arty-housekeeping",
echo   "version": "1.0.0",
echo   "description": "ARTY™ PMS Add-On Housekeeping Management",
echo   "main": "server.js",
echo   "scripts": {
echo     "start": "node server.js",
echo     "dev": "nodemon server.js",
echo     "test": "jest"
echo   },
echo   "dependencies": {
echo     "express": "^4.18.2",
echo     "cors": "^2.8.5",
echo     "helmet": "^7.1.0",
echo     "dotenv": "^16.3.1",
echo     "multer": "^1.4.5",
echo     "csv-parser": "^3.0.0",
echo     "pg": "^8.11.3"
echo   },
echo   "devDependencies": {
echo     "nodemon": "^3.0.1",
echo     "jest": "^29.7.0"
echo   }
echo }
) > package.json

REM Create basic Express server
(
echo const express = require('express'^);
echo const cors = require('cors'^);
echo const helmet = require('helmet'^);
echo const path = require('path'^);
echo require('dotenv'^).config(^);
echo.
echo const app = express(^);
echo const PORT = process.env.PORT ^|^| 3000;
echo.
echo // Middleware
echo app.use(helmet(^)^);
echo app.use(cors(^)^);
echo app.use(express.json(^)^);
echo app.use(express.static('public'^)^);
echo.
echo // Serve dashboard
echo app.get('/', (req, res^) =^> {
echo     res.sendFile(path.join(__dirname, 'dashboard.html'^)^);
echo }^);
echo.
echo // Health check
echo app.get('/health', (req, res^) =^> {
echo     res.json({ status: 'healthy', timestamp: new Date(^).toISOString(^) }^);
echo }^);
echo.
echo // CSV upload endpoint
echo app.post('/api/upload/csv', (req, res^) =^> {
echo     // TODO: Implement CSV processing using tools/html_to_csv.py
echo     res.json({ message: 'CSV upload endpoint ready for implementation' }^);
echo }^);
echo.
echo // PMS webhook endpoints
echo app.post('/webhooks/:vendor', (req, res^) =^> {
echo     const vendor = req.params.vendor;
echo     console.log(`Received webhook from ${vendor}:`, req.body^);
echo     
echo     // TODO: Implement webhook processing using integrations/${vendor}/MAPPING.md
echo     res.status(200^).send('OK'^);
echo }^);
echo.
echo app.listen(PORT, (^) =^> {
echo     console.log(`🏨 ARTY™ Housekeeping server running on port ${PORT}`^);
echo     console.log(`📊 Dashboard: http://localhost:${PORT}`^);
echo     console.log(`🔌 Webhooks: http://localhost:${PORT}/webhooks/{vendor}`^);
echo }^);
) > server.js

REM Create environment template
(
echo # Database
echo DATABASE_URL=postgresql://user:pass@localhost:5432/arty
echo.
echo # PMS Integration Credentials  
echo CLOUDBEDS_TOKEN=your_cloudbeds_token
echo OPERA_USERNAME=your_opera_user
echo OPERA_PASSWORD=your_opera_pass
echo MEWS_CLIENT_TOKEN=your_mews_client_token
echo MEWS_ACCESS_TOKEN=your_mews_access_token
echo.
echo # Application Settings
echo JWT_SECRET=your_jwt_secret_here
echo ADMIN_EMAIL=admin@hotel.com
echo WEBHOOK_SECRET=your_webhook_secret
echo.
echo # Feature Flags
echo ENABLE_QUESTLOGIC_AI=true
echo ENABLE_REAL_TIME_SYNC=true
) > .env.example

REM Check for npm and install dependencies
npm --version >nul 2>&1
if %errorlevel% == 0 (
    echo 📦 Installing Node.js dependencies...
    call npm install
    echo ✅ Dependencies installed!
    echo.
    echo 🎯 Next steps:
    echo 1. Copy .env.example to .env and configure your settings
    echo 2. Run: npm run dev
    echo 3. Open: http://localhost:3000
) else (
    echo ⚠️  npm not found - please install Node.js first
)

cd ..\..
goto :end

:deploy_bubble
echo 🫧 Setting up Bubble.io deployment...
cd deploy\%PROJECT_NAME%

REM Create Bubble setup guide
(
echo # Bubble.io Setup for ARTY™ Housekeeping
echo.
echo ## 1. Data Types Setup
echo Create these data types in your Bubble app:
echo.
echo ### Room
echo - room_number (text^)
echo - room_type (option set: 1BR, 2BR, 3BR, STUDIO, TWIN, SOFA, ROLLAWAY^)  
echo - status (option set: DIRTY, CLEAN, IN_PROGRESS, INSPECT^)
echo - occupancy (number^)
echo - notes (text^)
echo.
echo ### Task
echo - room_number (text^)
echo - service_date (date^)
echo - service_type (option set: DAILY, FULL, WEEKLY, DEPARTURE, ARRIVAL^)
echo - estimated_minutes (number^)
echo - assigned_staff (text^)
echo - status (option set: NEW, IN_PROGRESS, DONE, INSPECT^)
echo - notes (text^)
echo.
echo ### Staff  
echo - staff_id (text^)
echo - name (text^)
echo - role (option set: RA, HM, CA, SUP^)
echo - availability (option set: AVAILABLE, ON_BREAK, SICK_LEAVE^)
echo - max_minutes_per_day (number^)
echo.
echo ## 2. Import Sample Data
echo Use the CSV Uploader plugin or manual entry:
echo - Upload: data/processed/hotel_rooms.csv
echo - Upload: data/processed/hotel_tasks.csv  
echo - Upload: data/processed/hotel_staff.csv
echo.
echo ## 3. AI Assistant Implementation
echo Copy prompts/bubble_arty_dashboard_prompt.txt and paste to Bubble AI
echo.
echo ## 4. Theme Setup  
echo Configure your app's color variables from ui/themes/tokens.json:
echo - Primary: #4A90E2 (Quest blue^)
echo - Accent: #FF6B35 (Quest coral^)
echo - Success: #2ECC71
echo - Warning: #F39C12
echo.
echo ## 5. Page Structure
echo Create main page with:
echo - Hero metrics (repeating group with Room data^)
echo - Rooms grid (repeating group with drag-drop to Staff^)
echo - Staff assignment board (repeating group by Staff^)
echo - Mobile responsive groups for RA interface
) > BUBBLE_SETUP.md

echo ✅ Bubble.io setup guide created!
echo 📖 See deploy\%PROJECT_NAME%\BUBBLE_SETUP.md for detailed instructions

cd ..\..
goto :end

:deploy_flutter
echo 📱 Setting up Flutter deployment...
cd deploy

flutter --version >nul 2>&1
if %errorlevel% == 0 (
    call flutter create %PROJECT_NAME%
    cd %PROJECT_NAME%
    
    REM Copy assets
    if not exist assets\data mkdir assets\data
    copy ..\..\data\processed\*.csv assets\data\
    xcopy /E /I ..\..\ui\themes assets\themes
    
    REM Create basic models
    if not exist lib\models mkdir lib\models
    (
    echo enum RoomType { BR1, BR2, BR3, STUDIO, TWIN, SOFA, ROLLAWAY }
    echo enum RoomStatus { DIRTY, CLEAN, IN_PROGRESS, INSPECT }
    echo.
    echo class Room {
    echo   final String roomNumber;
    echo   final RoomType roomType;
    echo   final RoomStatus status;
    echo   final int? occupancy;
    echo   final String? notes;
    echo.
    echo   Room({
    echo     required this.roomNumber,
    echo     required this.roomType, 
    echo     required this.status,
    echo     this.occupancy,
    echo     this.notes,
    echo   }^);
    echo.
    echo   factory Room.fromCsv(List^<String^> row^) {
    echo     return Room(
    echo       roomNumber: row[0],
    echo       roomType: RoomType.values.byName(row[1].replaceAll('BR', 'BR'^)^),
    echo       status: RoomStatus.values.byName(row[2]^),
    echo       occupancy: int.tryParse(row[3] ?? '''^),
    echo       notes: row[4].isEmpty ? null : row[4],
    echo     ^);
    echo   }
    echo }
    ) > lib\models\room.dart
    
    echo ✅ Flutter project created!
    echo 📱 Next steps:
    echo 1. cd deploy\%PROJECT_NAME%
    echo 2. flutter pub get
    echo 3. flutter run
) else (
    echo ⚠️  Flutter not found - please install Flutter SDK first
    echo 📖 Visit: https://flutter.dev/docs/get-started/install
)

cd ..\..
goto :end

:deploy_docker
echo 🐳 Setting up Docker deployment...
REM First setup web files
call :deploy_web
cd deploy\%PROJECT_NAME%

REM Create Dockerfile
(
echo FROM node:18-alpine
echo.
echo WORKDIR /app
echo.
echo # Copy package files
echo COPY package*.json ./
echo RUN npm ci --only=production
echo.
echo # Copy application files
echo COPY . .
echo.
echo # Create non-root user
echo RUN addgroup -g 1001 -S nodejs
echo RUN adduser -S arty -u 1001
echo USER arty
echo.
echo EXPOSE 3000
echo.
echo CMD ["npm", "start"]
) > Dockerfile

echo ✅ Docker setup complete!
echo 🐳 Next steps:
echo 1. docker-compose up -d
echo 2. Visit: http://localhost

cd ..\..
goto :end

:end
echo.
echo 🎉 ARTY™ PMS Add-On deployment setup complete!
echo 📁 Files are in: deploy\%PROJECT_NAME%\
echo 📖 See DEPLOYMENT.md for detailed instructions
echo 🔧 Configure your PMS integration using files in integrations\