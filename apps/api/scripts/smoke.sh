#!/bin/bash
#
# Run smoke tests against a deployed API
#
# Usage:
#   ./scripts/smoke.sh                           # Test against localhost:3000
#   ./scripts/smoke.sh https://api.example.com   # Test against a deployed URL
#   API_URL=https://api.example.com AUTH_TOKEN=xxx ./scripts/smoke.sh
#
# Environment variables:
#   API_URL     - Base URL of the API (default: http://localhost:3000)
#   AUTH_TOKEN  - Bearer token for authenticated tests (optional)

set -e

# Use provided URL or default to localhost
export API_URL="${API_URL:-${1:-http://localhost:3000}}"

echo "Running smoke tests against: $API_URL"

if [ -z "$AUTH_TOKEN" ]; then
  echo "Note: AUTH_TOKEN not set - authenticated tests will be skipped"
fi

pnpm vitest run src/__tests__/smoke.test.ts
