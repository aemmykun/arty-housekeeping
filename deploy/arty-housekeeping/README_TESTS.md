# ARTY Housekeeping — Local Tests

This file documents simple, zero-cost tests you can run locally against the Python demo server.

Start the server (PowerShell):

```powershell
Start-Process -FilePath (Get-Command python).Source -ArgumentList 'deploy\arty-housekeeping\arty_server.py' -WindowStyle Hidden
```

Health check:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health" | ConvertTo-Json -Depth 4
```

API (CSV-backed endpoints):

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/rooms" | ConvertTo-Json -Depth 6
Invoke-RestMethod -Uri "http://localhost:3000/api/tasks" | ConvertTo-Json -Depth 6
Invoke-RestMethod -Uri "http://localhost:3000/api/staff" | ConvertTo-Json -Depth 6
Invoke-RestMethod -Uri "http://localhost:3000/api/inventory" | ConvertTo-Json -Depth 6
```

Simulate webhooks (Cloudbeds, eZee, RMSCloud):

```powershell
#$payload examples
#$cloudbeds = @{ reservationId = 123; room = "101"; status = "checkout" } | ConvertTo-Json
#$ezee     = @{ reservation_id = 555; room_no = "201"; status = "arrival" } | ConvertTo-Json
#$rms      = @{ event = "reservation_update"; id = 987; room = "301"; state = "checked_out" } | ConvertTo-Json

#POST
#Invoke-RestMethod -Uri "http://localhost:3000/webhooks/cloudbeds" -Method Post -Body $cloudbeds -ContentType "application/json"
#Invoke-RestMethod -Uri "http://localhost:3000/webhooks/ezee" -Method Post -Body $ezee -ContentType "application/json"
#Invoke-RestMethod -Uri "http://localhost:3000/webhooks/rmscloud" -Method Post -Body $rms -ContentType "application/json"
```

Adapter mapping files are in `deploy/arty-housekeeping/integrations/` and contain simple vendor->canonical examples.