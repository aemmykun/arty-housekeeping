#!/usr/bin/env bash
set -euo pipefail

# deploy_prod.sh
# Builds Docker images, pushes to GHCR, triggers Render and Vercel deploys,
# and optionally updates Cloudflare DNS records.
#
# Required environment variables (examples):
#  GHCR_USER - GitHub username or org for GHCR
#  GHCR_TOKEN - Personal access token with write:packages scope (or use GITHUB_TOKEN in GH Actions)
#  RENDER_API_KEY - (optional) Render API key to trigger deploys
#  RENDER_SERVICE_ID - (optional) Render service id to deploy
#  VERCEL_TOKEN - (optional) Vercel API token
#  VERCEL_PROJECT_ID - (optional) Vercel project id
#  CF_API_TOKEN - (optional) Cloudflare API token to update DNS
#  CF_ZONE_ID - (optional) Cloudflare zone id
#  CF_RECORD_NAME - (optional) dns record to create/update (e.g. arty.example.com)
#  CF_TARGET - (optional) target value for the DNS (e.g. cname target)

if [ -z "${GHCR_USER:-}" ] || [ -z "${GHCR_TOKEN:-}" ]; then
  echo "GHCR_USER and GHCR_TOKEN are required to push images to GHCR"
  exit 1
fi

REPO_OWNER=${GHCR_USER}
NODE_IMAGE=ghcr.io/${REPO_OWNER}/arty-node:latest
NEXT_IMAGE=ghcr.io/${REPO_OWNER}/arty-next:latest

echo "Logging into GHCR..."
echo ${GHCR_TOKEN} | docker login ghcr.io -u ${GHCR_USER} --password-stdin

echo "Building and pushing Node API image..."
docker buildx build --platform linux/amd64 -t ${NODE_IMAGE} ./deploy/arty-housekeeping/node-server --push

echo "Building and pushing Next app image..."
docker buildx build --platform linux/amd64 -t ${NEXT_IMAGE} ./deploy/arty-housekeeping/next-app --push

if [ -n "${RENDER_API_KEY:-}" ] && [ -n "${RENDER_SERVICE_ID:-}" ]; then
  echo "Triggering Render deploy for service ${RENDER_SERVICE_ID}..."
  curl -s -X POST \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"clearCache":true}' \
    "https://api.render.com/deploys/service/${RENDER_SERVICE_ID}" | jq . || true
fi

if [ -n "${VERCEL_TOKEN:-}" ] && [ -n "${VERCEL_PROJECT_ID:-}" ]; then
  echo "Triggering Vercel deploy for project ${VERCEL_PROJECT_ID}..."
  curl -s -X POST \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"force": true}' \
    "https://api.vercel.com/v13/deployments?projectId=${VERCEL_PROJECT_ID}" | jq . || true
fi

if [ -n "${CF_API_TOKEN:-}" ] && [ -n "${CF_ZONE_ID:-}" ] && [ -n "${CF_RECORD_NAME:-}" ] && [ -n "${CF_TARGET:-}" ]; then
  echo "Updating Cloudflare DNS ${CF_RECORD_NAME} -> ${CF_TARGET}"
  # find existing record
  EXISTING=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?name=${CF_RECORD_NAME}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json")
  RECORD_ID=$(echo "$EXISTING" | jq -r '.result[0].id // empty')
  if [ -n "$RECORD_ID" ]; then
    echo "Updating existing record id $RECORD_ID"
    curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${RECORD_ID}" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json" \
      -d "{\"type\":\"CNAME\",\"name\":\"${CF_RECORD_NAME}\",\"content\":\"${CF_TARGET}\",\"ttl\":1,\"proxied\":false}" | jq . || true
  else
    echo "Creating new DNS record"
    curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json" \
      -d "{\"type\":\"CNAME\",\"name\":\"${CF_RECORD_NAME}\",\"content\":\"${CF_TARGET}\",\"ttl\":1,\"proxied\":false}" | jq . || true
  fi
fi

echo "Done. Check provider consoles for deploy status."
