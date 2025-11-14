Param()
Set-StrictMode -Version Latest
if (-not $env:GHCR_USER -or -not $env:GHCR_TOKEN) {
  Write-Error "GHCR_USER and GHCR_TOKEN are required"
  exit 1
}

$repoOwner = $env:GHCR_USER
$nodeImage = "ghcr.io/$repoOwner/arty-node:latest"
$nextImage = "ghcr.io/$repoOwner/arty-next:latest"

Write-Host "Logging into GHCR..."
docker login ghcr.io -u $env:GHCR_USER --password-stdin <<< $env:GHCR_TOKEN

Write-Host "Building and pushing Node API image..."
docker buildx build --platform linux/amd64 -t $nodeImage ./deploy/arty-housekeeping/node-server --push

Write-Host "Building and pushing Next app image..."
docker buildx build --platform linux/amd64 -t $nextImage ./deploy/arty-housekeeping/next-app --push

if ($env:RENDER_API_KEY -and $env:RENDER_SERVICE_ID) {
  Write-Host "Triggering Render deploy..."
  Invoke-RestMethod -Method Post -Uri "https://api.render.com/deploys/service/$($env:RENDER_SERVICE_ID)" -Headers @{ Authorization = "Bearer $($env:RENDER_API_KEY)" } -Body (@{ clearCache = $true } | ConvertTo-Json)
}

if ($env:VERCEL_TOKEN -and $env:VERCEL_PROJECT_ID) {
  Write-Host "Triggering Vercel deploy..."
  Invoke-RestMethod -Method Post -Uri "https://api.vercel.com/v13/deployments?projectId=$($env:VERCEL_PROJECT_ID)" -Headers @{ Authorization = "Bearer $($env:VERCEL_TOKEN)" } -Body (@{ force = $true } | ConvertTo-Json)
}

if ($env:CF_API_TOKEN -and $env:CF_ZONE_ID -and $env:CF_RECORD_NAME -and $env:CF_TARGET) {
  Write-Host "Updating Cloudflare DNS..."
  $existing = Invoke-RestMethod -Method Get -Uri "https://api.cloudflare.com/client/v4/zones/$($env:CF_ZONE_ID)/dns_records?name=$($env:CF_RECORD_NAME)" -Headers @{ Authorization = "Bearer $($env:CF_API_TOKEN)" }
  $recordId = $existing.result[0].id
  if ($recordId) {
    Write-Host "Updating record $recordId"
    Invoke-RestMethod -Method Put -Uri "https://api.cloudflare.com/client/v4/zones/$($env:CF_ZONE_ID)/dns_records/$recordId" -Headers @{ Authorization = "Bearer $($env:CF_API_TOKEN)" } -Body (@{ type = 'CNAME'; name = $env:CF_RECORD_NAME; content = $env:CF_TARGET; ttl = 1; proxied = $false } | ConvertTo-Json)
  } else {
    Write-Host "Creating DNS record"
    Invoke-RestMethod -Method Post -Uri "https://api.cloudflare.com/client/v4/zones/$($env:CF_ZONE_ID)/dns_records" -Headers @{ Authorization = "Bearer $($env:CF_API_TOKEN)" } -Body (@{ type = 'CNAME'; name = $env:CF_RECORD_NAME; content = $env:CF_TARGET; ttl = 1; proxied = $false } | ConvertTo-Json)
  }
}

Write-Host "Done."
