#!/usr/bin/env bash
set -euo pipefail

# Simple helper to run the local docker-compose one-click dev environment
cd "$(dirname "$0")/.." || exit 1
echo "Starting local compose from $(pwd)"
docker compose up --build
